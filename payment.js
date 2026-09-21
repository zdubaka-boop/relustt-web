(() => {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const back = new URL('/funnel', location.origin);
  back.searchParams.set('step', 'your-plan');
  back.searchParams.set('cancelled', '1');
  if (params.get('path') === 'performance') back.searchParams.set('path', 'performance');
  $('closeCheckout').href = back.pathname + back.search;
  let checkout, actions, paymentElement, details;
  let loading = false, submitting = false, paymentReady = false, validTotal = false;

  function error(message) {
    $('checkoutError').textContent = message;
    $('checkoutError').hidden = !message;
  }
  function updateButton() {
    $('payButton').disabled = submitting || !paymentReady || !validTotal;
    $('payButtonText').textContent = submitting ? 'Processing…' : 'Unlock my plan';
    $('checkoutPayment').setAttribute('aria-busy', String(loading || submitting));
  }
  function displaySession(session) {
    // Read Stripe's actual total, as required by Checkout, not a query-string price.
    const total = session.total.total;
    $('checkoutTotal').textContent = total.amount;
    validTotal = session.currency.toLowerCase() === 'usd' && total.minorUnitsAmount === details.introAmountCents;
    if (!validTotal) error('The checkout total changed. Return to your plan to verify the price before paying.');
    if (session.status?.type === 'expired') {
      validTotal = false;
      error('This checkout has expired. Return to your plan to start again.');
    }
    if (session.status?.type === 'complete') location.assign(details.activationUrl);
    updateButton();
  }
  async function start() {
    if (loading) return;
    loading = true; paymentReady = false; validTotal = false; actions = null;
    error(''); updateButton();
    $('retryButton').hidden = true;
    $('paymentForm').hidden = true;
    $('checkoutLoading').hidden = false;
    try {
      if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) throw new Error('Return to your plan to start secure checkout.');
      if (!window.Stripe) throw new Error('The secure payment service could not load. Check your connection, then reload this page.');
      const response = await fetch('/api/checkout-details', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ sessionId }),
      });
      details = await response.json();
      if (!response.ok) throw new Error(details.error || 'Your payment form could not load.');
      if (details.status === 'complete') { location.assign(details.activationUrl); return; }
      paymentElement?.destroy();
      const stripe = Stripe(details.publishableKey);
      checkout = stripe.initCheckout({
        clientSecret: details.clientSecret,
        elementsOptions: {
          appearance: {
            theme: 'night', labels: 'above',
            variables: {
              fontFamily: 'Inter, system-ui, sans-serif', fontSizeBase: '16px',
              colorPrimary: '#b59aff', colorBackground: '#1c1532', colorText: '#f5f2ff',
              colorDanger: '#ffc0cd', colorTextPlaceholder: '#a79bbd',
              spacingUnit: '4px', borderRadius: '10px',
            },
            rules: {
              '.Input': { border: '1px solid #b39aff38', padding: '12px 13px', boxShadow: 'none' },
              '.Input:focus': { border: '1px solid #bda6ff', boxShadow: '0 0 0 2px #bda6ff1f' },
              '.Label': { color: '#e0d8ef', fontSize: '14px', fontWeight: '500', marginBottom: '7px' },
              '.Tab': { border: '1px solid #b39aff38', boxShadow: 'none' },
            },
          },
        },
      });
      const result = await checkout.loadActions();
      if (result.type !== 'success') throw new Error(result.error?.message || 'Your payment form could not load.');
      actions = result.actions;
      displaySession(actions.getSession());
      const activeCheckout = checkout;
      checkout.on('change', session => { if (checkout === activeCheckout) displaySession(session); });
      const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: details.currency });
      $('checkoutRenewal').textContent = `${money.format(details.introAmountCents / 100)} today for your first ${details.introDays} days. Then ${money.format(details.renewalAmountCents / 100)} per month until canceled. Cancel before renewal to avoid the next charge.`;
      paymentElement = checkout.createPaymentElement({ layout: 'tabs', wallets: { link: 'never' } });
      paymentElement.on('ready', () => { paymentReady = true; updateButton(); });
      paymentElement.on('loaderror', () => {
        paymentReady = false; updateButton();
        error('The secure card fields could not load. Please check your connection and try again.');
        $('retryButton').hidden = false;
      });
      $('paymentForm').hidden = false;
      paymentElement.mount('#paymentElement');
    } catch (failure) {
      error(failure.message || 'Your payment form could not load. Please try again.');
      $('retryButton').hidden = !sessionId;
    } finally {
      loading = false;
      $('checkoutLoading').hidden = true;
      updateButton();
    }
  }
  $('paymentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting || !actions || !paymentReady || !validTotal || !$('paymentForm').reportValidity()) return;
    submitting = true; error(''); updateButton();
    try {
      const result = await actions.confirm({ email: $('paymentEmail').value.trim() });
      if (result.type === 'error') throw new Error(result.error.message);
      // Never unlock access in the browser. The existing activation endpoint
      // verifies the paid Session and subscription before linking the account.
      location.assign(details.activationUrl);
    } catch (failure) {
      error(failure.message || 'Payment could not be completed. Please check your details and try again.');
      submitting = false; updateButton();
    }
  });
  $('retryButton').addEventListener('click', start);
  start();
})();
