const crypto = require('node:crypto');
const { ConfigurationError, required } = require('./env');

const FUNNEL_INTRO_AMOUNTS = new Set([500, 900, 1300, 1767]);
const FUNNEL_MONTHLY_AMOUNT = 2950;
const FUNNEL_INTRO_DAYS = 7;

async function stripeRequest(path, { method = 'GET', form, apiVersion } = {}) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${required('STRIPE_SECRET_KEY')}`,
      ...(apiVersion ? { 'Stripe-Version': apiVersion } : {}),
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: form ? form.toString() : undefined,
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Stripe request failed (${response.status}).`);
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

async function createCheckoutSession({ priceId, introAmountCents, claimId, successUrl, cancelUrl, customUi = false }) {
  const isIntroductoryPlan = introAmountCents !== undefined;
  if (isIntroductoryPlan) {
    if (!FUNNEL_INTRO_AMOUNTS.has(introAmountCents)) {
      throw new Error('Invalid introductory amount.');
    }
    // Refuse a misconfigured Price rather than charge a different renewal than the offer.
    const price = await stripeRequest(`/prices/${encodeURIComponent(priceId)}`);
    if (
      !price.active || price.currency !== 'usd' || price.unit_amount !== FUNNEL_MONTHLY_AMOUNT ||
      price.type !== 'recurring' || price.billing_scheme !== 'per_unit' || price.transform_quantity ||
      price.recurring?.interval !== 'month' || price.recurring?.interval_count !== 1 ||
      price.recurring?.usage_type !== 'licensed'
    ) {
      const error = new ConfigurationError('STRIPE_PRICE_FUNNEL_MONTHLY');
      error.message = 'STRIPE_PRICE_FUNNEL_MONTHLY must be an active, flat USD 29.50 monthly Price.';
      throw error;
    }
  }
  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('line_items[0][price]', priceId);
  form.set('line_items[0][quantity]', '1');
  if (customUi) {
    // Pin only this request, not the account or existing webhook API version.
    form.set('ui_mode', 'custom');
    form.set('return_url', successUrl);
  } else {
    form.set('success_url', successUrl);
    form.set('cancel_url', cancelUrl);
  }
  form.set('client_reference_id', claimId);
  form.set('metadata[purchase_claim_id]', claimId);
  form.set('subscription_data[metadata][purchase_claim_id]', claimId);
  if (isIntroductoryPlan) {
    // The recurring item is delayed for seven days. This separate one-time item
    // is invoiced immediately, so the introductory week is paid, not free.
    form.set('subscription_data[trial_period_days]', String(FUNNEL_INTRO_DAYS));
    form.set('line_items[1][price_data][currency]', 'usd');
    form.set('line_items[1][price_data][unit_amount]', String(introAmountCents));
    form.set('line_items[1][price_data][product_data][name]', 'RELUSTT: first 7 days');
    form.set('line_items[1][price_data][product_data][description]', 'Full RELUSTT access for your paid introductory week.');
    form.set('line_items[1][quantity]', '1');
    form.set('payment_method_collection', 'always');
    // Card payments settle before the existing synchronous activation flow.
    form.set('payment_method_types[0]', 'card');
    form.set('allow_promotion_codes', 'false');
    if (!customUi) form.set('custom_text[submit][message]', `$${(introAmountCents / 100).toFixed(2)} today for 7 days, then $29.50 every month until canceled.`);
    form.set('metadata[intro_amount_cents]', String(introAmountCents));
    form.set('subscription_data[metadata][intro_amount_cents]', String(introAmountCents));
    form.set('subscription_data[metadata][offer]', 'paid_week_then_monthly');
  } else {
    form.set('allow_promotion_codes', 'true');
  }
  return stripeRequest('/checkout/sessions', {
    method: 'POST', form, ...(customUi ? { apiVersion: '2025-03-31.basil' } : {}),
  });
}

function retrieveCheckoutSession(sessionId, { customUi = false } = {}) {
  const encoded = encodeURIComponent(sessionId);
  return stripeRequest(`/checkout/sessions/${encoded}?expand[]=subscription`,
    customUi ? { apiVersion: '2025-03-31.basil' } : {});
}

function retrieveSubscription(subscriptionId) {
  return stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const fields = String(signatureHeader || '')
    .split(',')
    .map((part) => part.trim().split('='))
    .filter(([key, value]) => key && value);
  const timestamp = Number(fields.find(([key]) => key === 't')?.[1]);
  const signatures = fields.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || signatures.length === 0 || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto
    .createHmac('sha256', required('STRIPE_WEBHOOK_SECRET'))
    .update(signedPayload, 'utf8')
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return signatures.some((signature) => {
    const actualBuffer = Buffer.from(signature, 'hex');
    return (
      actualBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    );
  });
}

function subscriptionId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function normalizeSubscription(subscription, userId = null) {
  const item = subscription.items?.data?.[0] || null;
  const periodEnd = subscription.current_period_end || item?.current_period_end || subscription.trial_end || null;
  return {
    user_id: userId,
    provider: 'stripe',
    provider_customer_id:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id || null,
    provider_subscription_id: subscription.id,
    price_id: item?.price?.id || null,
    status: subscription.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    metadata: subscription.metadata || {},
  };
}

function hasActiveSubscription(subscription, now = Date.now()) {
  return ['active', 'trialing'].includes(subscription?.status)
    && Number.isFinite(Date.parse(subscription.current_period_end))
    && Date.parse(subscription.current_period_end) > now;
}

module.exports = {
  createCheckoutSession,
  normalizeSubscription,
  hasActiveSubscription,
  retrieveCheckoutSession,
  retrieveSubscription,
  subscriptionId,
  verifyWebhookSignature,
};
