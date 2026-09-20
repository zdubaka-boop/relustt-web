const {
  hashClaimSecret,
  newClaimCredentials,
  serializeClaimCookie,
} = require('../server/claims');
const { ConfigurationError, required, siteUrl } = require('../server/env');
const { methodNotAllowed, parseJsonBody, sendJson } = require('../server/http');
const { insertClaim, updateClaim } = require('../server/supabase');
const { createCheckoutSession } = require('../server/stripe');

const PRICE_ENV_BY_PLAN = Object.freeze({
  monthly: 'STRIPE_PRICE_MONTHLY',
  yearly: 'STRIPE_PRICE_YEARLY',
});
// Amounts are cents and are selected on the server, never supplied by the client.
const INTRO_AMOUNT_BY_PLAN = Object.freeze({
  tier_5: 500,
  tier_9: 900,
  tier_13: 1300,
  tier_1767: 1767,
});

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);

  try {
    const { plan, pathway } = parseJsonBody(request);
    const isIntroductoryPlan = typeof plan === 'string' && Object.hasOwn(INTRO_AMOUNT_BY_PLAN, plan);
    const isLegacyPlan = typeof plan === 'string' && Object.hasOwn(PRICE_ENV_BY_PLAN, plan);
    if (!isIntroductoryPlan && !isLegacyPlan) {
      return sendJson(response, 400, { error: 'Choose a valid plan.' });
    }

    const priceId = required(isIntroductoryPlan ? 'STRIPE_PRICE_FUNNEL_MONTHLY' : PRICE_ENV_BY_PLAN[plan]);
    const returnPathway = pathway === 'performance' ? '&path=performance' : '';
    const claim = newClaimCredentials();
    await insertClaim({
      id: claim.id,
      secret_hash: hashClaimSecret(claim.secret),
    });

    const origin = siteUrl();
    const checkoutSession = await createCheckoutSession({
      priceId,
      ...(isIntroductoryPlan ? { introAmountCents: INTRO_AMOUNT_BY_PLAN[plan] } : {}),
      claimId: claim.id,
      successUrl: `${origin}/activate?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: isIntroductoryPlan
        ? `${origin}/funnel.html?step=your-plan${returnPathway}&cancelled=1`
        : `${origin}/checkout?cancelled=1`,
    });

    await updateClaim(claim.id, {
      stripe_checkout_session_id: checkoutSession.id,
    });

    response.setHeader('Set-Cookie', serializeClaimCookie(claim.id, claim.secret));
    return sendJson(response, 200, { url: checkoutSession.url });
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return sendJson(response, 503, {
        error: 'Secure checkout is being connected. Please try again shortly.',
      });
    }
    console.error('create-checkout-session failed');
    return sendJson(response, 500, { error: 'Checkout could not be started.' });
  }
};
