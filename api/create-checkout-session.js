const {
  hashClaimSecret,
  newClaimCredentials,
  serializeClaimCookie,
} = require('../server/claims');
const { ConfigurationError, required, siteUrl } = require('../server/env');
const { methodNotAllowed, parseJsonBody, sendJson } = require('../server/http');
const { insertClaim, updateClaim } = require('../server/supabase');
const { createCheckoutSession } = require('../server/stripe');

const PRICE_ENV_BY_PLAN = {
  monthly: 'STRIPE_PRICE_MONTHLY',
  yearly: 'STRIPE_PRICE_YEARLY',
  tier_5: 'STRIPE_PRICE_TIER_5',
  tier_9: 'STRIPE_PRICE_TIER_9',
  tier_1499: 'STRIPE_PRICE_TIER_1499',
  tier_2999: 'STRIPE_PRICE_TIER_2999',
};

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);

  try {
    const { plan } = parseJsonBody(request);
    const priceEnvironmentName = PRICE_ENV_BY_PLAN[plan];
    if (!priceEnvironmentName) {
      return sendJson(response, 400, { error: 'Choose a valid plan.' });
    }

    const priceId = required(priceEnvironmentName);
    const claim = newClaimCredentials();
    await insertClaim({
      id: claim.id,
      secret_hash: hashClaimSecret(claim.secret),
    });

    const origin = siteUrl();
    const checkoutSession = await createCheckoutSession({
      priceId,
      claimId: claim.id,
      successUrl: `${origin}/activate?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/${plan.startsWith('tier_') ? 'funnel' : 'checkout'}?cancelled=1`,
      trialDays: plan.startsWith('tier_') ? 7 : null,
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
    console.error('create-checkout-session failed', error?.message || error);
    return sendJson(response, 500, { error: 'Checkout could not be started.' });
  }
};
