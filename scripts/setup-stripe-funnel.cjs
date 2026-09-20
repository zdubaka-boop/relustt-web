// Safe, explicit product setup. No customers, payments, subscriptions, or
// webhook endpoints are created. The API key is never saved or printed.
// Run: node scripts/setup-stripe-funnel.cjs
const lookupKey = 'relustt_web_monthly_2950_usd_v1';

function readHiddenLine() {
  return new Promise((resolve) => {
    let input = '';
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    function read(chunk) {
      const value = chunk.toString();
      if (value.includes('\u0003')) process.exit(130);
      input += value;
      if (!/[\r\n]/.test(input)) return;
      process.stdin.off('data', read);
      process.stdin.pause();
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      resolve(input.trim());
    }
    process.stdin.on('data', read);
  });
}

async function main() {
  console.log('Provide Stripe key through hidden stdin or STRIPE_SECRET_KEY; no value will be echoed.');
  const apiKey = process.env.STRIPE_SECRET_KEY || await readHiddenLine();
  if (!/^sk_(live|test)_/.test(apiKey)) throw new Error('Expected a Stripe secret API key.');
  async function api(path, form, idempotencyKey, allowMissing = false) {
    const response = await fetch(`https://api.stripe.com/v1${path}`, {
      method: form ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: form ? new URLSearchParams(form).toString() : undefined,
    });
    const payload = await response.json();
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) throw new Error(`Stripe request failed (HTTP ${response.status}); no response body logged.`);
    return payload;
  }
  const account = await api('/account');
  if (process.argv.includes('--readiness')) {
    const endpoints = await api('/webhook_endpoints?limit=100');
    console.log(JSON.stringify({
      accountId: account.id,
      businessName: account.business_profile?.name || account.settings?.dashboard?.display_name || null,
      live: apiKey.startsWith('sk_live_'),
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      capabilities: account.capabilities,
      disabledReason: account.requirements?.disabled_reason || null,
      currentlyDue: account.requirements?.currently_due || [],
      pastDue: account.requirements?.past_due || [],
      pendingVerification: account.requirements?.pending_verification || [],
      relusttWebhooks: endpoints.data.filter(e => {
        try { return new URL(e.url).hostname === 'relustt.site'; } catch { return false; }
      }).map(e => ({ id: e.id, url: e.url, status: e.status, events: e.enabled_events })),
    }));
    return;
  }
  const prices = await api(`/prices?lookup_keys[]=${lookupKey}&limit=10`);
  console.log(JSON.stringify({
    accountId: account.id,
    businessName: account.business_profile?.name || account.settings?.dashboard?.display_name || null,
    live: apiKey.startsWith('sk_live_'),
    existingPriceIds: prices.data.map(p => p.id),
  }));
  let price = prices.data[0];
  if (!price) {
    console.log('No configured funnel Price found. Enter CREATE to create only a RELUSTT product and USD 29.50 monthly Price.');
    if (await readHiddenLine() !== 'CREATE') throw new Error('Creation canceled.');
    const existingProduct = await api('/products/relustt_web_membership_v1', undefined, undefined, true);
    if (existingProduct && (!existingProduct.active || existingProduct.metadata?.integration !== 'relustt_web_funnel')) {
      throw new Error('Existing product is not the active RELUSTT funnel product; nothing modified.');
    }
    const product = existingProduct || await api('/products', {
      id: 'relustt_web_membership_v1', name: 'RELUSTT membership',
      description: 'Full RELUSTT app access while your subscription is active.',
      'metadata[integration]': 'relustt_web_funnel',
    }, 'relustt-web-membership-v1');
    price = await api('/prices', {
      product: product.id, currency: 'usd', unit_amount: '2950',
      'recurring[interval]': 'month', 'recurring[interval_count]': '1',
      'recurring[usage_type]': 'licensed', billing_scheme: 'per_unit',
      lookup_key: lookupKey, 'metadata[integration]': 'relustt_web_funnel',
    }, lookupKey);
  }
  if (!price.active || price.currency !== 'usd' || price.unit_amount !== 2950 ||
    price.recurring?.interval !== 'month' || price.recurring?.interval_count !== 1 ||
    price.recurring?.usage_type !== 'licensed' || price.billing_scheme !== 'per_unit' || price.transform_quantity) {
    throw new Error('The existing Price does not match the confirmed offer; nothing modified.');
  }
  console.log(JSON.stringify({ productId: price.product, STRIPE_PRICE_FUNNEL_MONTHLY: price.id, live: price.livemode }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
