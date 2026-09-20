const { claimCookie, clearClaimCookie, hashClaimSecret, secretsMatch } = require('../server/claims');
const { methodNotAllowed, parseJsonBody, sendJson } = require('../server/http');
const {
  getAuthenticatedUser, getBillingSubscription, getClaim, getClaimByCheckoutSession, syncStripeSubscription, updateClaim,
} = require('../server/supabase');
const { hasActiveSubscription, normalizeSubscription, retrieveCheckoutSession, subscriptionId } = require('../server/stripe');

function accessResponse(response, subscription) {
  return sendJson(response, 200, {
    active: hasActiveSubscription(subscription),
    status: subscription.status,
    expiresAt: subscription.current_period_end,
  });
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user?.id) return sendJson(response, 401, { error: 'Sign in to activate access.' });
    const { sessionId, checkOnly = false } = parseJsonBody(request);
    if (typeof sessionId !== 'string' || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      return sendJson(response, 400, { error: 'Missing or invalid checkout session.' });
    }

    // A reload may show an already-owned purchase, never silently attach a new
    // purchase to a leftover browser login.
    const existingClaim = await getClaimByCheckoutSession(sessionId);
    if (existingClaim?.claimed_by === user.id && existingClaim.stripe_subscription_id) {
      const existing = await getBillingSubscription(existingClaim.stripe_subscription_id);
      if (existing?.user_id === user.id) return accessResponse(response, existing);
    }
    if (checkOnly) return sendJson(response, 404, { error: 'Purchase is not connected to this login.' });

    const cookieClaim = claimCookie(request);
    const claim = cookieClaim ? await getClaim(cookieClaim.id) : null;
    if (!claim || claim.stripe_checkout_session_id !== sessionId ||
      !secretsMatch(cookieClaim.secret, claim.secret_hash) ||
      !(Date.parse(claim.expires_at) > Date.now()) ||
      (claim.claimed_by && claim.claimed_by !== user.id)) {
      return sendJson(response, 403, { error: 'This activation link is invalid or expired. Return to the browser where you completed payment.' });
    }

    const observedAt = new Date().toISOString();
    const checkout = await retrieveCheckoutSession(sessionId);
    if (checkout.status !== 'complete' || checkout.client_reference_id !== claim.id ||
      !['paid', 'no_payment_required'].includes(checkout.payment_status) ||
      (checkout.metadata?.intro_amount_cents && checkout.payment_status !== 'paid')) {
      return sendJson(response, 409, { error: 'Payment has not completed yet.' });
    }
    const subscription = checkout.subscription;
    if (!subscriptionId(subscription) || typeof subscription !== 'object' ||
      subscription.metadata?.purchase_claim_id !== claim.id) {
      return sendJson(response, 409, { error: 'Subscription details are still processing.' });
    }
    // Only server-verified payment can turn a quiz into a purchased app profile.
    if (checkout.payment_status === 'paid' && claim.funnel_session_id && !claim.paid_at) {
      await updateClaim(claim.id, { paid_at: observedAt });
    }
    const billing = await syncStripeSubscription(normalizeSubscription(subscription), observedAt, {
      id: claim.id, userId: user.id, secretHash: hashClaimSecret(cookieClaim.secret), sessionId,
    });
    response.setHeader('Set-Cookie', clearClaimCookie());
    return accessResponse(response, billing);
  } catch (error) {
    if (error?.payload?.code === 'P0001') {
      return sendJson(response, 409, { error: 'This purchase cannot be connected to this account. It may already be linked to another login.' });
    }
    console.error('claim-subscription activation failed');
    return sendJson(response, 500, { error: 'We could not activate the purchase yet. Please retry.' });
  }
};
