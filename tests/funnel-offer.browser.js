// Run with agent-browser eval --stdin in a dedicated localhost session.
// Uses an iframe and restores the previous quiz state. Checkout is mocked: no payment or navigation.
(async () => {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Local preview only');
  const storageKey = 'relustt_web_funnel_v1';
  const previousStorage = sessionStorage.getItem(storageKey);
  const frame = document.createElement('iframe');
  frame.width = '390'; frame.height = '844';
  document.body.append(frame);
  const results = [];
  const win = () => frame.contentWindow;
  const doc = () => win().document;
  const stored = () => JSON.parse(sessionStorage.getItem(storageKey) || '{}');
  const step = () => new URL(win().location.href).searchParams.get('step');
  const assert = (condition, message) => { if (!condition) throw new Error(`${step()}: ${message}`); };
  const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  const wait = async predicate => {
    for (let attempt = 0; attempt < 160; attempt++) {
      if (predicate()) return;
      await delay(25);
    }
    throw new Error(`Timed out at ${step()}`);
  };
  const open = async query => {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Iframe load timed out')), 7000);
      frame.onload = () => { clearTimeout(timer); resolve(); };
      frame.src = `/funnel.html?${query}`;
    });
    if (step() === 'your-plan') await wait(() => doc().querySelector('.offer-revealed'));
  };
  const seed = overrides => sessionStorage.setItem(storageKey, JSON.stringify({
    screen: 'price', pathway: 'identity', history: [], name: 'Alex', frequency: 'Daily',
    identityGoal: 'More productive', obstacle: "The habit's stronger than my willpower",
    reclaimedTime: 'Create a business', identityImpact: 'I lose focus for hours afterward', support: 'No one', triedQuit: 'Yes', quitProgress: 'On and off',
    selectedPrice: '9', offerStartedAt: 0, ...overrides,
  }));
  const answer = async (label, destination) => {
    const option = [...doc().querySelectorAll('[data-answer]')].find(item => item.dataset.answer === label);
    assert(option && !option.disabled, `Answer available: ${label}`);
    option.click();
    await wait(() => step() === destination);
  };
  const verifyPrice = price => {
    assert(doc().querySelector('.intro-price').textContent === `$${price}`, 'Selected introductory price');
    assert(doc().querySelector('.plan-price-row.total strong:last-child').textContent === `$${price}`, 'Total today matches selection');
    assert(doc().querySelector('.offer-final button').textContent.includes(`Unlock my plan · $${price}`), 'Final CTA section has selected price');
    assert(!doc().querySelector('.plan-price-renewal, .offer-final-price, .offer-benefits'), 'Removed redundant notes and benefits grid');
    assert(doc().querySelector('.subscription-copy').textContent.includes('monthly at the crossed-out price shown above'), 'Monthly billing references labeled rate');
    assert(!/[0-9]/.test(doc().querySelector('.subscription-copy').textContent), 'Subscription prose contains no digits');
    assert(!doc().querySelector('.subscription-copy strong, .subscription-copy b'), 'No bold subscription prose');
    assert(!doc().querySelector('.renewal-reference'), 'No separate monthly-price row');
    assert(doc().querySelector('.plan-price-row.bonus s').textContent === '$29.50', 'Previous price is beside the included course price');
    assert(doc().querySelector('.plan-price-row.bonus strong').textContent === '$0.00', 'Bonus has no extra charge');
    assert(!/free trial|7 DAYS FREE|every 3 months/i.test(doc().body.textContent), 'No stale free or quarterly terms');
  };
  try {
    for (const price of ['5', '9', '13', '17.67']) {
      seed({ selectedPrice: '9' });
      await open('step=choose-price');
      doc().querySelector(`[data-price="${price}"]`).click();
      assert(stored().selectedPrice === price, 'Price choice saved before continuing');
      doc().querySelector('#priceContinue').click();
      await wait(() => step() === 'your-plan' && doc().querySelector('.offer-revealed'));
      verifyPrice(price);
      assert(doc().querySelector('.archetype-for span').textContent === 'Alex', 'Saved name appears');
      assert(doc().querySelector('.archetype-result').dataset.archetype === 'focus', 'Multiple identity answers select focus archetype');
      assert(doc().querySelector('.archetype-clues').textContent.includes('business'), 'Reclaimed time appears as profile evidence');
      assert(!doc().querySelector('.roadmap, .offer-challenge'), 'Timeline and extra-support sections removed');
      assert(!doc().querySelector('#paywallBack, #backButton'), 'Offer has no back button');
      results.push(`Selected $${price}: offer, paid week, monthly renewal, saved identity answers passed`);
    }

    seed({ pathway: 'performance', triedQuit: 'No', quitProgress: '', name: 'Sam', performanceGoal: 'Feeling normal again', anxietyTrigger: "Comparing the moment to what I've watched", selectedPrice: '13' });
    await open('step=your-plan&path=performance');
    verifyPrice('13');
    assert(doc().querySelector('.archetype-result').dataset.archetype === 'confidence', 'Current performance answers select confidence profile');
    assert(!doc().querySelector('.offer-hero').textContent.includes('building your business'), 'Stale identity answers do not leak into performance hero');
    assert(doc().querySelector('.archetype-clues').textContent.includes('Feeling like yourself again'), 'Performance goal is evidence');
    assert(!doc().querySelector('#roadmapTitle, .offer-challenge'), 'No roadmap or extra-support section on performance path');
    assert(doc().querySelectorAll('.testimonial-grid blockquote').length === 3, 'Three existing reviews');
    assert(!doc().querySelector('.review-avatar'), 'Review avatars removed');
    results.push('Performance personalization and branch isolation passed');

    const startedAt = stored().offerStartedAt;
    assert(startedAt > Date.now() - 4000 && startedAt <= Date.now(), 'Timer starts on first offer visit');
    const elapsedStart = Date.now() - 120000;
    sessionStorage.setItem(storageKey, JSON.stringify({ ...stored(), offerStartedAt: elapsedStart }));
    await open('step=your-plan&path=performance');
    const remainingBefore = doc().querySelector('#offerCountdown').textContent;
    assert(/^0[45]:\d\d$/.test(remainingBefore), 'Timer reflects elapsed time');
    const colorBefore = doc().querySelector('#offerTimerLine').style.getPropertyValue('--timer-color');
    await delay(1100);
    await open('step=your-plan&path=performance');
    assert(stored().offerStartedAt === elapsedStart, 'Reload does not restart timer');
    assert(doc().querySelector('#offerCountdown').textContent < remainingBefore, 'Countdown continues after reload');
    sessionStorage.setItem(storageKey, JSON.stringify({ ...stored(), offerStartedAt: Date.now() - 421000 }));
    await open('step=your-plan&path=performance');
    assert(doc().querySelector('#offerCountdown').textContent === '00:00', 'Expired timer stops at zero');
    const expiredBar = doc().querySelector('#offerTimerLine');
    assert(expiredBar.style.getPropertyValue('--timer-remaining') === '0', 'Expired line finishes');
    assert(expiredBar.style.getPropertyValue('--timer-color').startsWith('hsl(0 ') && expiredBar.style.getPropertyValue('--timer-color') !== colorBefore, 'Line turns red');
    await delay(1100);
    assert(doc().querySelector('#offerCountdown').textContent === '00:00', 'Expired timer remains zero');
    verifyPrice('13');
    assert(!doc().querySelector('#checkoutFromFunnel').disabled, 'Expiry does not block checkout');
    results.push('Timer persists through reload, changes color, and stops at zero without changing price');

    const questions = [...doc().querySelectorAll('.offer-faq details')];
    assert(questions.length >= 4, 'FAQ contains expected questions');
    for (const item of questions) {
      assert(!item.open, 'FAQ starts collapsed');
      item.querySelector('summary').click();
      assert(item.open && item.querySelector('p').textContent.length > 20, 'FAQ opens and has an answer');
      item.querySelector('summary').click();
      assert(!item.open, 'FAQ closes');
    }
    const currentUrl = win().location.href;
    const finalButton = doc().querySelector('.offer-final [data-offer-scroll]');
    finalButton.scrollIntoView({ behavior: 'instant', block: 'center' });
    await delay(100);
    const scrollBefore = win().scrollY;
    finalButton.click();
    await wait(() => Math.abs(doc().querySelector('#planOffer').getBoundingClientRect().top - 80) < 10);
    assert(win().scrollY < scrollBefore, 'Bottom CTA scrolls upward to primary offer');
    assert(win().location.href === currentUrl, 'Scroll CTA leaves route unchanged');
    assert(doc().activeElement.id === 'planOfferTitle', 'Scroll target receives accessible focus');
    results.push('FAQ toggles and final CTA scroll/focus passed');

    const checkoutRequests = [];
    win().fetch = async (url, options) => {
      checkoutRequests.push({ url, options });
      return { ok: false, json: async () => ({ error: 'Test checkout unavailable' }) };
    };
    const checkout = doc().querySelector('#checkoutFromFunnel');
    checkout.click();
    assert(checkout.disabled && checkout.textContent.includes('Opening secure checkout'), 'Checkout has a pending state');
    await wait(() => !checkout.disabled);
    assert(checkoutRequests.length === 1, 'Only one mocked checkout request');
    assert(checkoutRequests[0].url === '/api/create-checkout-session' && checkoutRequests[0].options.method === 'POST', 'Expected checkout endpoint');
    assert(JSON.parse(checkoutRequests[0].options.body).plan === 'tier_13', 'Selected tier sent to checkout');
    assert(JSON.parse(checkoutRequests[0].options.body).pathway === 'performance', 'Current branch sent to checkout for the return route');
    assert(doc().querySelector('#checkoutError').textContent === 'Test checkout unavailable', 'Error is shown');
    assert(checkout.textContent.includes('Reveal my 90-day plan'), 'CTA is restored for retry');
    assert(win().location.href === currentUrl, 'Failed checkout never navigates');
    results.push('Mocked checkout error, selected tier, and retry state passed without payment');

    win().fetch = async () => ({ ok: false, json: async () => { throw new SyntaxError('Unexpected token < in JSON'); } });
    checkout.click();
    await wait(() => !checkout.disabled);
    assert(doc().querySelector('#checkoutError').textContent === 'Checkout could not be started.', 'Non-JSON response has a friendly fallback');
    assert(checkout.textContent.includes('Reveal my 90-day plan'), 'Invalid response restores CTA');
    assert(win().location.href === currentUrl, 'Invalid response never navigates');
    results.push('Non-JSON checkout failure shows a friendly error and restores retry');

    let resolveCheckout;
    win().fetch = () => new Promise(resolve => { resolveCheckout = resolve; });
    checkout.click();
    assert(checkout.disabled && typeof resolveCheckout === 'function', 'Delayed checkout is in progress');
    doc().querySelector('#startOver').click();
    await wait(() => step() === 'welcome');
    const welcomeUrl = win().location.href;
    const welcomeScreen = doc().querySelector('.welcome-screen');
    resolveCheckout({ ok: true, json: async () => ({ url: '/funnel.html?step=your-plan&checkout-test-unexpected=1' }) });
    await delay(300);
    assert(win().location.href === welcomeUrl && step() === 'welcome', 'Late successful checkout response does not navigate after leaving');
    assert(doc().querySelector('.welcome-screen') === welcomeScreen, 'Late response preserves the restarted screen');
    assert(sessionStorage.getItem(storageKey) === null, 'Late response does not restore the old quiz state');
    results.push('Late checkout success after Start over is ignored without navigation');

    const unsafeName = '<img src=x onerror="window.__nameInjected=1">';
    const safeWord = 'transient-local-test-phrase';
    seed({ name: unsafeName, safeWord });
    await open('step=your-plan');
    assert(doc().querySelector('.archetype-for span').textContent === unsafeName, 'Name renders literally');
    assert(!doc().querySelector('.archetype-for img') && !win().__nameInjected, 'Name cannot inject markup or execute');
    assert(!sessionStorage.getItem(storageKey).includes(safeWord), 'Safe word removed from persisted state');
    assert(!win().location.href.includes(safeWord) && !JSON.stringify(win().history.state).includes(safeWord), 'Safe word absent from navigation');
    results.push('Name escaping and safe-word exclusion passed');

    for (const concern of ['Yes', 'No']) {
      seed({ screen: 'forkConcern', forkAnswer: "I haven't been intimate with a partner yet" });
      await open('step=intimacy-concern');
      await answer(concern, concern === 'Yes' ? 'intimacy-worry' : 'quit-feedback');
      assert(stored().intimacyConcern === concern, 'Explicit concern answer saved');
      await open('step=intimacy-concern');
      assert(doc().querySelector('.option.is-selected')?.dataset.answer === concern, 'Concern answer restored on revisit');
    }
    results.push('Both intimacy-concern answers persist and restore');
    return { passed: results.length, results };
  } finally {
    frame.remove();
    if (previousStorage === null) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, previousStorage);
  }
})()
