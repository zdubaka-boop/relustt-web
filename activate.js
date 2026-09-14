import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const message = document.getElementById('activationMessage');
const form = document.getElementById('activationForm');
const success = document.getElementById('activationSuccess');
const providerButtons = [...document.querySelectorAll('[data-provider]')];
const params = new URLSearchParams(window.location.search);
const checkoutSessionId = params.get('session_id');
const isOAuthCallback = params.has('code');

function showMessage(text, isSuccess = false) {
  message.textContent = text;
  message.classList.toggle('is-visible', Boolean(text));
  message.classList.toggle('is-success', isSuccess);
}

function setBusy(isBusy) {
  providerButtons.forEach((button) => { button.disabled = isBusy; });
}

async function activate() {
  if (!checkoutSessionId) {
    showMessage('This activation page is missing its checkout session. Return to the browser where you completed payment.');
    return;
  }

  const configResponse = await fetch('/api/public-config');
  const config = await configResponse.json();
  if (!configResponse.ok) throw new Error(config.error || 'Login is not configured yet.');

  const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  async function claimPurchase(session) {
    setBusy(true);
    showMessage('Connecting your purchase…', true);
    const response = await fetch('/api/claim-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ sessionId: checkoutSessionId }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Access could not be connected.');
    if (!payload.active) throw new Error('The subscription is not active yet. Please retry in a moment.');

    form.classList.add('is-hidden');
    success.classList.add('is-visible');
    showMessage('Your active subscription is now linked to this login.', true);
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('code');
    window.history.replaceState({}, '', cleanUrl);
  }

  providerButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      setBusy(true);
      showMessage('');
      const redirectTo = `${window.location.origin}/activate?session_id=${encodeURIComponent(checkoutSessionId)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: button.dataset.provider,
        options: { redirectTo },
      });
      if (error) {
        setBusy(false);
        showMessage(error.message);
      }
    });
  });

  // Only attach a purchase after the user deliberately returns from OAuth.
  // An unrelated session left in a shared browser must never silently receive
  // the new subscription on the first visit to this page.
  if (isOAuthCallback) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('Login did not finish. Please choose Apple or Google again.');
    await claimPurchase(data.session);
  }
}

activate().catch((error) => {
  setBusy(false);
  showMessage(error.message || 'Activation could not be completed.');
});
