const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class ConfigurationError extends Error {}
const validPrice = {
  active: true, currency: 'usd', unit_amount: 2950, type: 'recurring',
  billing_scheme: 'per_unit', transform_quantity: null,
  recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
};
const checkoutArgs = {
  priceId: 'price_monthly_test', claimId: 'claim_test',
  successUrl: 'http://localhost/success', cancelUrl: 'http://localhost/cancel',
};

function stripeHarness(price = validPrice) {
  const requests = [];
  const sandbox = {
    module: { exports: {} }, URLSearchParams,
    require: name => name === './env'
      ? { required: () => 'test-only', ConfigurationError }
      : require(name),
    fetch: async (url, options) => {
      requests.push({ url, method: options.method, form: new URLSearchParams(options.body) });
      return { ok: true, json: async () => options.method === 'GET' ? price : { id: 'cs_test' } };
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../server/stripe.js'), 'utf8'), sandbox);
  return { stripe: sandbox.module.exports, requests };
}

for (const introAmountCents of [500, 900, 1300, 1767]) {
  test(`paid week collects ${introAmountCents} cents once, with $29.50 monthly starting after 7 days`, async () => {
    const { stripe, requests } = stripeHarness();
    await stripe.createCheckoutSession({ ...checkoutArgs, introAmountCents });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, 'https://api.stripe.com/v1/prices/price_monthly_test');
    const { form } = requests[1];
    assert.equal(form.get('mode'), 'subscription');
    assert.equal(form.get('line_items[0][price]'), 'price_monthly_test');
    assert.equal(form.get('line_items[0][quantity]'), '1');
    assert.equal(form.get('subscription_data[trial_period_days]'), '7');
    assert.equal(form.get('line_items[1][price_data][unit_amount]'), String(introAmountCents));
    assert.equal(form.get('line_items[1][price_data][currency]'), 'usd');
    assert.equal(form.get('line_items[1][quantity]'), '1');
    assert.equal([...form.keys()].some(key => key.startsWith('line_items[1]') && key.includes('recurring')), false);
    assert.equal(form.get('payment_method_collection'), 'always');
    assert.equal(form.get('payment_method_types[0]'), 'card');
    assert.equal(form.get('allow_promotion_codes'), 'false');
    assert.equal(form.get('subscription_data[metadata][purchase_claim_id]'), 'claim_test');
    assert.equal(form.get('subscription_data[metadata][intro_amount_cents]'), String(introAmountCents));
    assert.equal(form.get('custom_text[submit][message]'), `$${(introAmountCents / 100).toFixed(2)} today for 7 days, then $29.50 every month until canceled.`);
  });
}

test('rejects arbitrary introductory amounts before contacting Stripe', async () => {
  for (const introAmountCents of [0, -500, 499, 1499, 2999, '900', null]) {
    const { stripe, requests } = stripeHarness();
    await assert.rejects(stripe.createCheckoutSession({ ...checkoutArgs, introAmountCents }), /Invalid introductory amount/);
    assert.equal(requests.length, 0);
  }
});

test('rejects renewal price mismatches before creating a Checkout Session', async () => {
  for (const mismatch of [
    { active: false }, { currency: 'eur' }, { unit_amount: 900 }, { type: 'one_time' },
    { billing_scheme: 'tiered' }, { transform_quantity: { divide_by: 2, round: 'up' } },
    { recurring: { ...validPrice.recurring, interval: 'year' } },
    { recurring: { ...validPrice.recurring, interval_count: 3 } },
    { recurring: { ...validPrice.recurring, usage_type: 'metered' } },
  ]) {
    const { stripe, requests } = stripeHarness({ ...validPrice, ...mismatch });
    await assert.rejects(stripe.createCheckoutSession({ ...checkoutArgs, introAmountCents: 900 }), ConfigurationError);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, 'GET');
  }
});

test('legacy direct plans keep their existing billing without an introductory period', async () => {
  const { stripe, requests } = stripeHarness();
  await stripe.createCheckoutSession(checkoutArgs);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].form.get('line_items[0][price]'), 'price_monthly_test');
  assert.equal(requests[0].form.get('allow_promotion_codes'), 'true');
  assert.equal([...requests[0].form.keys()].some(key => key.includes('trial') || key.startsWith('line_items[1]')), false);
});

function handlerHarness() {
  const checkoutCalls = [];
  const configReads = [];
  const claims = [];
  const dependencies = {
    '../server/claims': {
      hashClaimSecret: () => 'hash_test',
      newClaimCredentials: () => ({ id: 'claim_test', secret: 'secret_test' }),
      serializeClaimCookie: () => 'claim=test',
    },
    '../server/env': {
      ConfigurationError,
      required: name => { configReads.push(name); return 'price_monthly_test'; },
      siteUrl: () => 'https://example.test',
    },
    '../server/http': {
      parseJsonBody: request => request.body,
      sendJson: (response, status, body) => { response.status = status; response.body = body; },
      methodNotAllowed: response => { response.status = 405; },
    },
    '../server/supabase': {
      insertClaim: async claim => { claims.push(claim); },
      updateClaim: async () => {},
    },
    '../server/stripe': {
      createCheckoutSession: async args => {
        checkoutCalls.push(args);
        return { id: 'cs_test', url: 'https://checkout.stripe.com/test' };
      },
    },
  };
  const sandbox = { module: { exports: {} }, require: name => dependencies[name], console };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../api/create-checkout-session.js'), 'utf8'), sandbox);
  return { handler: sandbox.module.exports, checkoutCalls, configReads, claims };
}

test('API maps each allowed funnel plan to a server-owned amount and the single monthly Price', async () => {
  for (const [plan, amount] of [['tier_5', 500], ['tier_9', 900], ['tier_13', 1300], ['tier_1767', 1767]]) {
    const { handler, checkoutCalls, configReads } = handlerHarness();
    const response = { setHeader() {} };
    await handler({ method: 'POST', body: { plan, introAmountCents: 1, priceId: 'untrusted' } }, response);
    assert.equal(response.status, 200);
    assert.deepEqual(configReads, ['STRIPE_PRICE_FUNNEL_MONTHLY']);
    assert.equal(checkoutCalls[0].introAmountCents, amount);
    assert.equal(checkoutCalls[0].priceId, 'price_monthly_test');
    assert.equal(checkoutCalls[0].cancelUrl, 'https://example.test/funnel.html?step=your-plan&cancelled=1');
  }
});

test('API rejects unknown, retired and prototype plan keys without creating a claim', async () => {
  for (const plan of ['tier_1499', 'tier_2999', 'tier_1', '__proto__', 'constructor', 'toString', ['tier_9'], null]) {
    const { handler, checkoutCalls, claims } = handlerHarness();
    const response = { setHeader() {} };
    await handler({ method: 'POST', body: { plan } }, response);
    assert.equal(response.status, 400);
    assert.equal(checkoutCalls.length, 0);
    assert.equal(claims.length, 0);
  }
});

test('checkout cancellation preserves performance routing and ignores untrusted pathway values', async () => {
  for (const pathway of ['performance', 'identity', undefined, 'performance&redirect=https://evil.test', ['performance'], null]) {
    const { handler, checkoutCalls } = handlerHarness();
    const response = { setHeader() {} };
    await handler({ method: 'POST', body: { plan: 'tier_9', pathway } }, response);
    assert.equal(response.status, 200);
    assert.equal(checkoutCalls[0].cancelUrl, pathway === 'performance'
      ? 'https://example.test/funnel.html?step=your-plan&path=performance&cancelled=1'
      : 'https://example.test/funnel.html?step=your-plan&cancelled=1');
  }
});
