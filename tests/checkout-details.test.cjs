const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const claims = require('../server/claims');

function harness({ cookie = true, claimPatch = {}, sessionPatch = {} } = {}) {
  let stripeReads = 0;
  const claim = { id: 'claim_test', stripe_checkout_session_id: 'cs_test_fixture',
    secret_hash: claims.hashClaimSecret('fixture-secret'), expires_at: new Date(Date.now()+60000).toISOString(), ...claimPatch };
  const session = { id: 'cs_test_fixture', client_reference_id: claim.id, ui_mode: 'custom', currency: 'usd',
    status: 'open', expires_at: Date.now()/1000+600, amount_total: 500,
    metadata: { purchase_claim_id: claim.id, intro_amount_cents: '500' }, client_secret: 'fixture-client-secret', ...sessionPatch };
  const deps = {
    '../server/claims': claims,
    '../server/env': { ConfigurationError: class extends Error {}, required: () => 'pk_test_fixture', siteUrl: () => 'https://example.test' },
    '../server/http': require('../server/http'),
    '../server/supabase': { getClaim: async () => claim },
    '../server/stripe': { retrieveCheckoutSession: async () => { stripeReads++; return session; } },
  };
  const sandbox = { module: { exports: {} }, require: name => deps[name], console };
  vm.runInNewContext(fs.readFileSync(require.resolve('../api/checkout-details'),'utf8'),sandbox);
  return { async call(body = { sessionId: 'cs_test_fixture' }, method = 'POST') {
    const response = { headers: {}, setHeader(k,v) { this.headers[k]=v; }, end(v) { this.body=JSON.parse(v); } };
    await sandbox.module.exports({ method, body, headers: { cookie: cookie ? 'relustt_purchase_claim=claim_test.fixture-secret' : '' } },response);
    return { ...response, stripeReads };
  } };
}

test('checkout secret requires the correct unexpired HttpOnly claim, not just the Session ID', async () => {
  for (const options of [ {cookie:false}, {claimPatch:{secret_hash:claims.hashClaimSecret('different')}},
    {claimPatch:{stripe_checkout_session_id:'cs_other'}}, {claimPatch:{expires_at:'2000-01-01'}} ]) {
    const res = await harness(options).call();
    assert.equal(res.statusCode,403); assert.equal(res.stripeReads,0);
    assert.equal(res.body.clientSecret,undefined);
  }
});
test('owned checkout returns only payment configuration, never quiz answers or claim credentials', async () => {
  const res = await harness().call();
  assert.equal(res.statusCode,200);
  assert.equal(res.headers['Cache-Control'],'no-store');
  assert.equal(res.body.clientSecret,'fixture-client-secret');
  assert.equal(res.body.introAmountCents,500);
  assert.equal(res.body.renewalAmountCents,2950);
  assert.equal(res.body.activationUrl,'https://example.test/activate?session_id=cs_test_fixture');
  assert.doesNotMatch(JSON.stringify(res.body),/fixture-secret|secret_hash|answers|service_role/);
});
test('checkout fails closed for expired sessions, mismatched ownership and changed prices', async () => {
  for (const [sessionPatch,status] of [
    [{status:'expired'},410], [{expires_at:1},410], [{client_reference_id:'someone_else'},403],
    [{metadata:{purchase_claim_id:'other',intro_amount_cents:'500'}},403],
    [{currency:'eur'},409], [{amount_total:1},409], [{ui_mode:'hosted'},409], [{client_secret:null},409], [{livemode:true},503],
  ]) assert.equal((await harness({sessionPatch}).call()).statusCode,status);
});
test('completed checkout goes to existing server-verified activation without exposing a secret', async () => {
  const res=await harness({sessionPatch:{status:'complete'}}).call();
  assert.equal(res.statusCode,200); assert.equal(res.body.status,'complete');
  assert.equal(res.body.clientSecret,undefined); assert.equal(res.body.active,undefined);
});
test('rejects invalid methods and Session IDs', async () => {
  assert.equal((await harness().call({},'GET')).statusCode,405);
  for (const sessionId of ['',null,['cs_test_fixture'],'https://evil.test']) {
    const res=await harness().call({sessionId}); assert.equal(res.statusCode,400); assert.equal(res.stripeReads,0);
  }
});
