const { required } = require('./env');

function baseUrl() {
  return required('SUPABASE_URL').replace(/\/$/, '');
}

async function supabaseAdmin(path, options = {}) {
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.msg || `Supabase request failed (${response.status}).`);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function getAuthenticatedUser(request) {
  const authorization = request.headers.authorization || '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!accessToken) return null;

  const publishableKey = required('SUPABASE_PUBLISHABLE_KEY');
  const response = await fetch(`${baseUrl()}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

function encodeFilter(value) {
  return encodeURIComponent(value);
}

async function getClaim(claimId) {
  const rows = await supabaseAdmin(
    `/rest/v1/purchase_claims?id=eq.${encodeFilter(claimId)}&select=*&limit=1`
  );
  return rows?.[0] || null;
}

async function getClaimBySubscription(subscriptionId) {
  const rows = await supabaseAdmin(
    `/rest/v1/purchase_claims?stripe_subscription_id=eq.${encodeFilter(subscriptionId)}&select=*&limit=1`
  );
  return rows?.[0] || null;
}

async function getBillingSubscription(subscriptionId) {
  const rows = await supabaseAdmin(
    `/rest/v1/billing_subscriptions?provider_subscription_id=eq.${encodeFilter(subscriptionId)}&select=*&limit=1`
  );
  return rows?.[0] || null;
}

async function insertClaim(claim) {
  const rows = await supabaseAdmin('/rest/v1/purchase_claims', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(claim),
  });
  return rows?.[0] || null;
}

async function updateClaim(claimId, changes) {
  const rows = await supabaseAdmin(
    `/rest/v1/purchase_claims?id=eq.${encodeFilter(claimId)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(changes),
    }
  );
  return rows?.[0] || null;
}

async function upsertBillingSubscription(subscription) {
  const rows = await supabaseAdmin(
    '/rest/v1/billing_subscriptions?on_conflict=provider_subscription_id',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(subscription),
    }
  );
  return rows?.[0] || null;
}

async function getWebhookEvent(eventId) {
  const rows = await supabaseAdmin(
    `/rest/v1/billing_webhook_events?stripe_event_id=eq.${encodeFilter(eventId)}&select=*&limit=1`
  );
  return rows?.[0] || null;
}

async function insertWebhookEvent(eventId, eventType) {
  return supabaseAdmin('/rest/v1/billing_webhook_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ stripe_event_id: eventId, event_type: eventType }),
  });
}

async function updateWebhookEvent(eventId, changes) {
  return supabaseAdmin(
    `/rest/v1/billing_webhook_events?stripe_event_id=eq.${encodeFilter(eventId)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(changes),
    }
  );
}

module.exports = {
  getAuthenticatedUser,
  getBillingSubscription,
  getClaim,
  getClaimBySubscription,
  getWebhookEvent,
  insertClaim,
  insertWebhookEvent,
  supabaseAdmin,
  updateClaim,
  updateWebhookEvent,
  upsertBillingSubscription,
};
