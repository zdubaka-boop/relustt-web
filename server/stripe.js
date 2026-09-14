const crypto = require('node:crypto');
const { required } = require('./env');

async function stripeRequest(path, { method = 'GET', form } = {}) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${required('STRIPE_SECRET_KEY')}`,
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

function createCheckoutSession({ priceId, claimId, successUrl, cancelUrl, trialDays = null }) {
  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('line_items[0][price]', priceId);
  form.set('line_items[0][quantity]', '1');
  form.set('success_url', successUrl);
  form.set('cancel_url', cancelUrl);
  form.set('client_reference_id', claimId);
  form.set('metadata[purchase_claim_id]', claimId);
  form.set('subscription_data[metadata][purchase_claim_id]', claimId);
  if (trialDays) form.set('subscription_data[trial_period_days]', String(trialDays));
  form.set('allow_promotion_codes', 'true');
  return stripeRequest('/checkout/sessions', { method: 'POST', form });
}

function retrieveCheckoutSession(sessionId) {
  const encoded = encodeURIComponent(sessionId);
  return stripeRequest(`/checkout/sessions/${encoded}?expand[]=subscription`);
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
  const periodEnd = subscription.current_period_end || item?.current_period_end || null;
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

module.exports = {
  createCheckoutSession,
  normalizeSubscription,
  retrieveCheckoutSession,
  retrieveSubscription,
  subscriptionId,
  verifyWebhookSignature,
};
