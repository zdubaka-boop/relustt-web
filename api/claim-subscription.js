const {
  claimCookie,
  clearClaimCookie,
  secretsMatch,
} = require('../server/claims');
const { methodNotAllowed, parseJsonBody, sendJson } = require('../server/http');
const {
  getAuthenticatedUser,
  getBillingSubscription,
  getClaim,
  updateClaim,
  upsertBillingSubscription,
} = require('../server/supabase');
const {
  normalizeSubscription,
  retrieveCheckoutSession,
  subscriptionId,
} = require('../server/stripe');

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);

  try {
    const user = await getAuthenticatedUser(request);
    if (!user?.id) return sendJson(response, 401, { error: 'Sign in to activate access.' });

    const cookieClaim = claimCookie(request);
    if (!cookieClaim) {
      return sendJson(response, 403, {
        error: 'This purchase link is no longer available in this browser.',
      });
    }

    const { sessionId } = parseJsonBody(request);
    if (!sessionId || typeof sessionId !== 'string') {
      return sendJson(response, 400, { error: 'Missing checkout session.' });
    }

    const claim = await getClaim(cookieClaim.id);
    if (
      !claim ||
      claim.stripe_checkout_session_id !== sessionId ||
      !secretsMatch(cookieClaim.secret, claim.secret_hash) ||
      new Date(claim.expires_at).getTime() < Date.now() ||
      (claim.claimed_by && claim.claimed_by !== user.id)
    ) {
      return sendJson(response, 403, { error: 'This activation link is invalid or expired.' });
    }

    const checkoutSession = await retrieveCheckoutSession(sessionId);
    if (checkoutSession.status !== 'complete' || checkoutSession.client_reference_id !== claim.id) {
      return sendJson(response, 409, { error: 'Payment has not completed yet.' });
    }

    const subscription = checkoutSession.subscription;
    const stripeSubscriptionId = subscriptionId(subscription);
    if (!stripeSubscriptionId || typeof subscription !== 'object') {
      return sendJson(response, 409, { error: 'Subscription details are still processing.' });
    }

    const previous = await getBillingSubscription(stripeSubscriptionId);
    if (previous?.user_id && previous.user_id !== user.id) {
      return sendJson(response, 409, { error: 'This purchase is already linked to another account.' });
    }

    const billingSubscription = await upsertBillingSubscription(
      normalizeSubscription(subscription, user.id)
    );
    await updateClaim(claim.id, {
      stripe_customer_id:
        typeof checkoutSession.customer === 'string'
          ? checkoutSession.customer
          : checkoutSession.customer?.id || null,
      stripe_subscription_id: stripeSubscriptionId,
      purchaser_email: checkoutSession.customer_details?.email || null,
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
    });

    response.setHeader('Set-Cookie', clearClaimCookie());
    return sendJson(response, 200, {
      active: ['active', 'trialing'].includes(billingSubscription.status),
      status: billingSubscription.status,
      expiresAt: billingSubscription.current_period_end,
    });
  } catch (error) {
    console.error('claim-subscription failed', error?.message || error);
    return sendJson(response, 500, { error: 'We could not activate the purchase yet. Please retry.' });
  }
};
