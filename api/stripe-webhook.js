const { methodNotAllowed, readRawBody, sendJson } = require('../server/http');
const {
  getBillingSubscription, getClaim, getClaimBySubscription, getWebhookEvent,
  insertWebhookEvent, syncStripeSubscription, updateClaim, updateWebhookEvent,
} = require('../server/supabase');
const {
  normalizeSubscription, retrieveSubscription, subscriptionId, verifyWebhookSignature,
} = require('../server/stripe');

async function syncSubscription(id) {
  // Read current Stripe state: an older event must not resurrect lost access.
  const observedAt = new Date().toISOString();
  const subscription = await retrieveSubscription(id);
  const claimId = subscription.metadata?.purchase_claim_id;
  const claim = claimId ? await getClaim(claimId) : await getClaimBySubscription(id);
  const existing = await getBillingSubscription(id);
  if (!claim && !existing) return; // Other products in the Stripe account.
  await syncStripeSubscription(normalizeSubscription(subscription), observedAt, { id: claim?.id });
}

async function processStripeEvent(event) {
  const object = event.data.object;
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    const claimId = object.metadata?.purchase_claim_id || object.client_reference_id;
    const claim = claimId ? await getClaim(claimId) : null;
    if (!claim) return;
    if (claim.stripe_checkout_session_id && claim.stripe_checkout_session_id !== object.id) {
      throw new Error('Checkout does not match purchase claim.');
    }
    await updateClaim(claim.id, {
      stripe_checkout_session_id: object.id,
      purchaser_email: object.customer_details?.email || null,
      ...(object.payment_status === 'paid' && !claim.paid_at ? { paid_at: new Date().toISOString() } : {}),
    });
    const id = subscriptionId(object.subscription);
    if (id) await syncSubscription(id);
    return;
  }
  if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
    await syncSubscription(object.id);
  } else if (['invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required'].includes(event.type)) {
    const id = subscriptionId(object.subscription || object.parent?.subscription_details?.subscription);
    if (id) await syncSubscription(id);
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  let event;
  try {
    const rawBody = await readRawBody(request);
    if (!verifyWebhookSignature(rawBody, request.headers['stripe-signature'])) {
      return sendJson(response, 400, { error: 'Invalid webhook signature.' });
    }
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return sendJson(response, 400, { error: 'Invalid webhook payload.' });
    }
    if (!event.id || !event.type || !event.data?.object) {
      return sendJson(response, 400, { error: 'Invalid webhook event.' });
    }
    const previous = await getWebhookEvent(event.id);
    if (previous?.processed_at) return sendJson(response, 200, { received: true });
    await insertWebhookEvent(event.id, event.type);
    await processStripeEvent(event);
    await updateWebhookEvent(event.id, { processed_at: new Date().toISOString(), processing_error: null });
    return sendJson(response, 200, { received: true });
  } catch {
    // Never log raw provider responses, bearer tokens, or customer data.
    console.error('stripe-webhook processing failed');
    if (event?.id) {
      try { await updateWebhookEvent(event.id, { processing_error: 'Subscription synchronization failed; retry required.' }); } catch {}
    }
    return sendJson(response, 500, { error: 'Webhook processing failed.' });
  }
};

// Attach after exporting the handler so the raw-body setting is not overwritten.
module.exports.config = { api: { bodyParser: false } };
