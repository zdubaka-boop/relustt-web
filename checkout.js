(() => {
  let selectedPlan = 'yearly';
  const checkoutButton = document.getElementById('checkoutButton');
  const message = document.getElementById('checkoutMessage');
  const options = [...document.querySelectorAll('[data-plan]')];

  function showMessage(text) {
    message.textContent = text;
    message.classList.toggle('is-visible', Boolean(text));
  }

  options.forEach((option) => {
    option.addEventListener('click', () => {
      selectedPlan = option.dataset.plan;
      options.forEach((candidate) => {
        candidate.classList.toggle('is-selected', candidate === option);
      });
      showMessage('');
    });
  });

  async function loadPlanLabels() {
    try {
      const response = await fetch('/api/public-config');
      if (!response.ok) return;
      const config = await response.json();
      document.getElementById('monthlyLabel').textContent = config.plans.monthly;
      document.getElementById('yearlyLabel').textContent = config.plans.yearly;
    } catch {}
  }

  checkoutButton.addEventListener('click', async () => {
    checkoutButton.disabled = true;
    checkoutButton.textContent = 'Opening checkout…';
    showMessage('');
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be started.');
      window.location.assign(payload.url);
    } catch (error) {
      showMessage(error.message || 'Checkout could not be started.');
      checkoutButton.disabled = false;
      checkoutButton.textContent = 'Continue to secure checkout →';
    }
  });

  if (new URLSearchParams(window.location.search).get('cancelled') === '1') {
    showMessage('Checkout was cancelled. Your plan has not been activated.');
  }
  loadPlanLabels();
})();
