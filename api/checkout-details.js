const { claimCookie, secretsMatch } = require('../server/claims');
const { ConfigurationError, required, siteUrl } = require('../server/env');
const { methodNotAllowed, parseJsonBody, sendJson } = require('../server/http');
const { getClaim } = require('../server/supabase');
const { retrieveCheckoutSession } = require('../server/stripe');

// The Session client secret is sent only to the browser that owns the HttpOnly
// purchase-claim cookie. It never appears in a URL, browser storage or logs.
module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  try {
    const { sessionId } = parseJsonBody(request);
    if (typeof sessionId !== 'string' || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      return sendJson(response, 400, { error: 'Return to your plan to start checkout.' });
    }
    const credentials = claimCookie(request);
    const claim = credentials ? await getClaim(credentials.id) : null;
    if (!claim || claim.stripe_checkout_session_id !== sessionId ||
        !secretsMatch(credentials.secret, claim.secret_hash) ||
        !(Date.parse(claim.expires_at) > Date.now())) {
      return sendJson(response, 403, { error: 'Open checkout in the browser where you built your plan, or return to your plan to try again.' });
    }
    const session = await retrieveCheckoutSession(sessionId, { customUi: true });
    if (session.client_reference_id !== claim.id || session.metadata?.purchase_claim_id !== claim.id) {
      return sendJson(response, 403, { error: 'This checkout does not belong to your plan.' });
    }
    const activationUrl = `${siteUrl()}/activate?session_id=${encodeURIComponent(session.id)}`;
    if (session.status === 'complete') {
      // Activation still checks payment and the subscription on the server.
      return sendJson(response, 200, { status: 'complete', activationUrl });
    }
    if (session.status !== 'open' || session.expires_at * 1000 <= Date.now()) {
      return sendJson(response, 410, { error: 'This checkout has expired. Return to your plan to start a new one.' });
    }
    const introAmountCents = Number(session.metadata?.intro_amount_cents);
    if (session.ui_mode !== 'custom' || !session.client_secret || session.currency !== 'usd' ||
        ![500, 900, 1300, 1767].includes(introAmountCents) || session.amount_total !== introAmountCents) {
      return sendJson(response, 409, { error: 'We could not verify the price. Return to your plan and try again.' });
    }
    const publishableKey = required('STRIPE_PUBLISHABLE_KEY');
    if (!publishableKey.startsWith(session.livemode ? 'pk_live_' : 'pk_test_')) {
      throw new ConfigurationError('STRIPE_PUBLISHABLE_KEY');
    }
    return sendJson(response, 200, {
      status: 'open', clientSecret: session.client_secret, publishableKey,
      introAmountCents, renewalAmountCents: 2950, introDays: 7, currency: 'usd', activationUrl,
    });
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return sendJson(response, 503, { error: 'Secure payment is temporarily unavailable. Please try again shortly.' });
    }
    console.error('checkout-details failed');
    return sendJson(response, 500, { error: 'Your payment form could not load. Please try again.' });
  }
};
