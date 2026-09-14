const { methodNotAllowed, readRawBody, sendJson } = require('../server/http');
const {
  getBillingSubscription,
  getClaim,
  getClaimBySubscription,
  getWebhookEvent,
  insertWebhookEvent,
  updateClaim,
  updateWebhookEvent,
  upsertBillingSubscription,
} = require('../server/supabase');
const {
  normalizeSubscription,
  retrieveSubscription,
  subscriptionId,
  verifyWebhookSignature,
} = require('../server/stripe');

module.exports.config = { api: { bodyParser: false } };

async function syncSubscription(subscription) {
  const claimId = subscription.metadata?.purchase_claim_id || null;
  const claim = claimId
    ? await getClaim(claimId)
    : await getClaimBySubscription(subscription.id);
  const existing = await getBillingSubscription(subscription.id);
  const userId = existing?.user_id || claim?.claimed_by || null;
  await upsertBillingSubscription(normalizeSubscription(subscription, userId));

  if (claim) {
    await updateClaim(claim.id, {
      stripe_customer_id:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id || null,
      stripe_subscription_id: subscription.id,
    });
  }
}

async function processStripeEvent(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const claimId = session.metadata?.purchase_claim_id || session.client_reference_id;
    const stripeSubscriptionId = subscriptionId(session.subscription);
    if (claimId) {
      await updateClaim(claimId, {
        stripe_checkout_session_id: session.id,
        stripe_customer_id:
          typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
        stripe_subscription_id: stripeSubscriptionId,
        purchaser_email: session.customer_details?.email || null,
      });
    }
    if (stripeSubscriptionId) {
      await syncSubscription(await retrieveSubscription(stripeSubscriptionId));
    }
    return;
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await syncSubscription(event.data.object);
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);

  const rawBody = await readRawBody(request);
  if (!verifyWebhookSignature(rawBody, request.headers['stripe-signature'])) {
    return sendJson(response, 400, { error: 'Invalid webhook signature.' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return sendJson(response, 400, { error: 'Invalid webhook payload.' });
  }

  try {
    const previous = await getWebhookEvent(event.id);
    if (previous?.processed_at) return sendJson(response, 200, { received: true });
    if (!previous) await insertWebhookEvent(event.id, event.type);

    await processStripeEvent(event);
    await updateWebhookEvent(event.id, {
      processed_at: new Date().toISOString(),
      processing_error: null,
    });
    return sendJson(response, 200, { received: true });
  } catch (error) {
    console.error('stripe-webhook failed', error?.message || error);
    try {
      await updateWebhookEvent(event.id, { processing_error: String(error?.message || error) });
    } catch {}
    return sendJson(response, 500, { error: 'Webhook processing failed.' });
  }
};
