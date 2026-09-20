const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const crypto = require('node:crypto');
const claims = require('../server/claims');
const stripe = require('../server/stripe');

const future = new Date(Date.now() + 86_400_000).toISOString();
const claim = {
  id: '11111111-1111-4111-8111-111111111111', secret_hash: claims.hashClaimSecret('test-proof'),
  stripe_checkout_session_id: 'cs_test_checkout', expires_at: future, claimed_by: null,
};
const subscription = {
  id: 'sub_test', status: 'trialing', customer: 'cus_test', trial_end: Math.floor(Date.parse(future) / 1000),
  metadata: { purchase_claim_id: claim.id }, items: { data: [{ price: { id: 'price_test' } }] },
};
const checkout = {
  id: 'cs_test_checkout', status: 'complete', payment_status: 'paid', client_reference_id: claim.id,
  metadata: { intro_amount_cents: '900' }, subscription,
};

function harness(file, overrides = {}) {
  const syncs = [];
  const db = {
    getAuthenticatedUser: async () => ({ id: 'user_one' }),
    getClaim: async () => claim, getClaimByCheckoutSession: async () => claim,
    getClaimBySubscription: async () => claim, getBillingSubscription: async () => null,
    syncStripeSubscription: async (...args) => { syncs.push(args); return args[0]; },
    getWebhookEvent: async () => null, insertWebhookEvent: async () => {},
    updateWebhookEvent: async () => {}, updateClaim: async () => {},
    ...overrides.db,
  };
  const dependencies = {
    '../server/claims': claims,
    '../server/http': require('../server/http'),
    '../server/supabase': db,
    '../server/stripe': {
      ...stripe, retrieveCheckoutSession: async () => checkout,
      retrieveSubscription: async () => subscription, verifyWebhookSignature: () => true,
      ...overrides.stripe,
    },
  };
  const sandbox = { module: { exports: {} }, require: n => dependencies[n], Buffer, console: { error() {} } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, `../api/${file}.js`), 'utf8'), sandbox);
  async function invoke(body = { sessionId: checkout.id }, headers = {}) {
    const result = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(v) { this.body = JSON.parse(v); } };
    await sandbox.module.exports({ method: 'POST', headers: {
      cookie: `relustt_purchase_claim=${claim.id}.test-proof`, ...headers,
    }, body }, result);
    return result;
  }
  return { invoke, syncs, handler: sandbox.module.exports };
}

test('web access requires an active status AND a real future expiry', () => {
  for (const status of ['active', 'trialing']) {
    assert.equal(stripe.hasActiveSubscription({ status, current_period_end: future }), true);
    for (const end of [null, undefined, 'invalid', new Date(0).toISOString()]) {
      assert.equal(stripe.hasActiveSubscription({ status, current_period_end: end }), false);
    }
  }
  for (const status of ['past_due', 'unpaid', 'paused', 'canceled', 'incomplete', 'incomplete_expired']) {
    assert.equal(stripe.hasActiveSubscription({ status, current_period_end: future }), false);
  }
});

test('paid purchase claims bind atomically with server-verified identity and proof', async () => {
  const h = harness('claim-subscription');
  const result = await h.invoke({ sessionId: checkout.id, userId: 'attacker' });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.active, true);
  assert.equal(h.syncs[0][2].userId, 'user_one');
  assert.equal(h.syncs[0][2].secretHash, claim.secret_hash);
  assert.match(result.headers['Set-Cookie'], /Max-Age=0/);
});

test('unauthenticated and invalid proof requests cannot claim', async () => {
  const unauth = harness('claim-subscription', { db: { getAuthenticatedUser: async () => null } });
  assert.equal((await unauth.invoke()).statusCode, 401);
  for (const cookie of ['', `relustt_purchase_claim=${claim.id}.wrong-proof`]) {
    const h = harness('claim-subscription');
    assert.equal((await h.invoke(undefined, { cookie })).statusCode, 403);
    assert.equal(h.syncs.length, 0);
  }
});

test('expired or already-owned proof is rejected', async () => {
  for (const mismatch of [{ expires_at: new Date(0).toISOString() }, { claimed_by: 'other_user' }]) {
    const h = harness('claim-subscription', { db: { getClaim: async () => ({ ...claim, ...mismatch }) } });
    assert.equal((await h.invoke()).statusCode, 403);
    assert.equal(h.syncs.length, 0);
  }
});

test('unfinished, unpaid, and mismatched checkouts never grant access', async () => {
  for (const mismatch of [
    { status: 'open' }, { payment_status: 'unpaid' }, { payment_status: 'no_payment_required' },
    { client_reference_id: 'other_claim' },
    { subscription: { ...subscription, metadata: { purchase_claim_id: 'other_claim' } } },
  ]) {
    const h = harness('claim-subscription', { stripe: { retrieveCheckoutSession: async () => ({ ...checkout, ...mismatch }) } });
    assert.equal((await h.invoke()).statusCode, 409);
    assert.equal(h.syncs.length, 0);
  }
});

test('read-only reload can recover only a purchase already owned by that login', async () => {
  const owned = harness('claim-subscription', { db: {
    getClaimByCheckoutSession: async () => ({ ...claim, claimed_by: 'user_one', stripe_subscription_id: 'sub_test' }),
    getBillingSubscription: async () => ({ ...stripe.normalizeSubscription(subscription), user_id: 'user_one' }),
  } });
  assert.equal((await owned.invoke({ sessionId: checkout.id, checkOnly: true }, { cookie: '' })).body.active, true);
  assert.equal(owned.syncs.length, 0);
  const unowned = harness('claim-subscription');
  assert.equal((await unowned.invoke({ sessionId: checkout.id, checkOnly: true })).statusCode, 404);
  assert.equal(unowned.syncs.length, 0);
});

test('claim ownership conflict is a recoverable error, never success', async () => {
  const h = harness('claim-subscription', { db: { syncStripeSubscription: async () => {
    throw Object.assign(new Error('conflict'), { payload: { code: 'P0001' } });
  } } });
  assert.equal((await h.invoke()).statusCode, 409);
});

function event(type, object = subscription) {
  return Buffer.from(JSON.stringify({ id: 'evt_test', type, data: { object } }));
}

test('webhooks use raw body, verify signatures, and skip processed retries', async () => {
  const invalid = harness('stripe-webhook', { stripe: { verifyWebhookSignature: () => false } });
  assert.equal(invalid.handler.config.api.bodyParser, false);
  assert.equal((await invalid.invoke(event('customer.subscription.updated'))).statusCode, 400);
  assert.equal(invalid.syncs.length, 0);
  const retry = harness('stripe-webhook', { db: { getWebhookEvent: async () => ({ processed_at: future }) } });
  assert.equal((await retry.invoke(event('customer.subscription.updated'))).statusCode, 200);
  assert.equal(retry.syncs.length, 0);
});

test('out-of-order active event synchronizes current canceled state, not its stale payload', async () => {
  const h = harness('stripe-webhook', { stripe: { retrieveSubscription: async () => ({ ...subscription, status: 'canceled' }) } });
  assert.equal((await h.invoke(event('customer.subscription.updated'))).statusCode, 200);
  assert.equal(h.syncs[0][0].status, 'canceled');
  assert.equal(h.syncs[0][0].user_id, null); // DB preserves the owner atomically.
});

test('invoice failures refresh subscription state; unrelated Stripe products are ignored', async () => {
  const h = harness('stripe-webhook');
  await h.invoke(event('invoice.payment_failed', { parent: { subscription_details: { subscription: 'sub_test' } } }));
  assert.equal(h.syncs.length, 1);
  const other = harness('stripe-webhook', { db: { getClaim: async () => null, getClaimBySubscription: async () => null } });
  await other.invoke(event('customer.subscription.updated'));
  assert.equal(other.syncs.length, 0);
});

test('signed webhook rejects modified payloads and stale signatures', () => {
  const previous = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'test-only-webhook-key';
  try {
    const raw = event('customer.subscription.updated');
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex');
    assert.equal(stripe.verifyWebhookSignature(raw, `t=${timestamp},v1=${signature}`), true);
    assert.equal(stripe.verifyWebhookSignature(Buffer.from('{}'), `t=${timestamp},v1=${signature}`), false);
    assert.equal(stripe.verifyWebhookSignature(raw, `t=${timestamp - 301},v1=${signature}`), false);
  } finally {
    if (previous === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previous;
  }
});

test('Supabase adapter accepts composite RPC responses without leaking provider payloads', async () => {
  const row = { provider_subscription_id: 'sub_test', status: 'active', current_period_end: future };
  for (const result of [row, [row]]) {
    const sandbox = {
      module: { exports: {} },
      require: () => ({ required: name => name === 'SUPABASE_URL' ? 'https://example.test' : 'test-only-key' }),
      fetch: async () => ({ ok: true, text: async () => JSON.stringify(result) }),
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../server/supabase.js'), 'utf8'), sandbox);
    const actual = await sandbox.module.exports.syncStripeSubscription(row, new Date().toISOString());
    assert.equal(actual.provider_subscription_id, 'sub_test');
    assert.equal(actual.status, 'active');
  }
});
