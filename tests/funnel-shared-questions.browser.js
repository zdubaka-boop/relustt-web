// Run in the dedicated localhost browser. No checkout calls; restore test storage.
(async () => {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw Error('Local preview only');
  const key = 'relustt_web_funnel_v1';
  const saved = sessionStorage.getItem(key);
  const frame = document.createElement('iframe');
  frame.width = '390'; frame.height = '844'; document.body.append(frame);
  const doc = () => frame.contentDocument;
  const win = () => frame.contentWindow;
  const step = () => new URL(win().location.href).searchParams.get('step');
  const stored = () => JSON.parse(sessionStorage.getItem(key) || '{}');
  const check = (condition, message) => { if (!condition) throw Error(`${step()}: ${message}`); };
  const wait = async predicate => {
    for (let n = 0; n < 120; n++) {
      if (predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw Error(`Timeout at ${step()}`);
  };
  const open = async query => {
    await new Promise(resolve => { frame.onload = resolve; frame.src = '/funnel.html?' + query; });
    check(doc().querySelector('h1'), 'Page renders');
  };
  const answer = async (label, destination) => {
    const button = [...doc().querySelectorAll('[data-answer]')].find(button => button.dataset.answer === label);
    check(button, `Answer exists: ${label}`); button.click();
    await wait(() => step() === destination);
  };
  const routes = ['motivation', 'urge-context', 'watch-control', 'main-priority', 'setback-trigger', 'support-preference'];
  const results = [];
  try {
    for (const width of [320, 390, 1440]) {
      frame.style.cssText = `width:${width}px;min-width:${width}px;height:844px;border:0;flex-shrink:0`;
      for (const path of ['identity', 'performance']) {
        sessionStorage.setItem(key, JSON.stringify({ pathway: path, triedQuit: 'Yes' }));
        for (const route of routes) {
          await open(`step=${route}&path=${path}`);
          check(stored().pathway === path, 'Shared direct link keeps pathway');
          check(doc().querySelectorAll('[data-answer]').length >= 4, 'Question offers choices');
          check(!doc().querySelector('[data-answer].is-selected'), 'No answer preselected');
          check(doc().documentElement.scrollWidth <= win().innerWidth + 1, 'No horizontal overflow');
          const progress = doc().querySelector('[role=progressbar]');
          check(progress && Number(progress.getAttribute('aria-valuenow')) <= Number(progress.getAttribute('aria-valuemax')), 'Progress includes new question');
        }
      }
      results.push(`Six direct links on both paths at ${width}px`);
    }
    sessionStorage.removeItem(key);
    await open('step=motivation&path=performance');
    await answer('Relieving stress', 'urge-context');
    await answer('After a difficult day', 'obstacles');
    await answer("I've tried and failed before", 'build-your-system');
    doc().querySelector('#continueButton').click();
    // The bridge after the obstacle screen advances on its own.
    for (let i = 0; i < 400 && step() !== 'watch-control'; i++) await new Promise(resolve => setTimeout(resolve, 20));
    check(step() === 'watch-control', 'Obstacle info and bridge lead to control question');
    await open('step=watch-control&path=performance');
    check(stored().motivation === 'Relieving stress' && stored().urgeContext === 'After a difficult day', 'Answers survive refresh');
    // Continue within the loaded document, then exercise real browser back/forward.
    await answer('Often', 'main-priority');
    doc().querySelector('#backButton').click();
    await wait(() => step() === 'watch-control');
    check(doc().querySelector('[data-answer].is-selected')?.dataset.answer === 'Often', 'Back restores selection');
    win().history.forward();
    await wait(() => step() === 'main-priority');
    await answer('More time and focus', 'intimacy');
    await answer('Yes', 'relationship-impact');
    check(!stored().history.includes('bOccurrence'), 'Removed question absent from history');
    check(!win().location.search.includes('Relieving') && !win().location.search.includes('focus'), 'Answers excluded from URLs');
    results.push('Persistence, back/forward, no duplicate question, private URLs');
    await open('step=performance-experience&path=performance');
    check(step() === 'relationship-impact', 'Old bookmark resolves to next step');
    sessionStorage.setItem(key, JSON.stringify({ screen: 'bOccurrence', pathway: 'performance', history: ['fork', 'bOccurrence'] }));
    await open('');
    check(step() === 'relationship-impact' && !stored().history.includes('bOccurrence'), 'Old saved screen migrates');
    results.push('Legacy bookmark and saved-state migration');
    for (const path of ['identity', 'performance']) {
      sessionStorage.setItem(key, JSON.stringify({ pathway: path, triedQuit: 'Yes', setbackTrigger: 'Easy access in the moment', quitProgress: 'On and off' }));
      await open(`step=obstacles&path=${path}`);
      await answer("Honestly, I haven't tried", 'build-your-system');
      check(stored().triedQuit === 'No' && stored().setbackTrigger === '' && stored().quitProgress === '', 'Changing the obstacle to a first attempt clears stale follow-up answers');
      await open(`step=setback-trigger&path=${path}`);
      check(step() === 'quit-feedback', 'First attempt skips setback direct link');
    }
    results.push('Conditional setback skipping and stale-answer clearing');
    sessionStorage.setItem(key, JSON.stringify({ pathway: 'performance', triedQuit: 'No', motivation: 'Sexual pleasure', urgeContext: 'When putting off a task', watchControl: 'Rarely', changePriority: 'More time and focus', supportPreference: 'Private guidance on my own' }));
    await open('step=your-plan&path=performance');
    check(doc().querySelector('.archetype-result').dataset.archetype === 'focus', 'Performance route can show Focus Reclaimer');
    check(doc().querySelector('.offer-lead').textContent.includes('time and focus'), 'Result intro uses shared goal');
    check(doc().querySelector('.plan-preview').textContent.includes('pleasure is the main reason'), 'Result uses motivation');
    results.push('Shared answers personalize the actual performance result');
    return { passed: results.length, results };
  } finally {
    frame.remove();
    if (saved === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, saved);
  }
})()
