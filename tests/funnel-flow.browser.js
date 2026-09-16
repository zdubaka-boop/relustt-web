// Run through agent-browser eval --stdin in a dedicated LOCAL preview session.
// This exercises real page handlers and restores the test session's quiz storage.
// Covers the 2026-09-16 question cut: one shared spine, obstacle doubles as quit
// history, quit feedback before the setback question, support info for everyone,
// commitment before features on both paths, and the intimacy-worry route.
(async () => {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Run on a local preview only.');
  const storageKey = 'relustt_web_funnel_v1';
  const previousStorage = sessionStorage.getItem(storageKey);
  const frame = document.createElement('iframe');
  frame.width = '390'; frame.height = '844';
  document.body.append(frame);
  const results = [];
  const safeWord = 'local-test-phrase-only';
  const win = () => frame.contentWindow;
  const doc = () => win().document;
  const step = () => new URL(win().location.href).searchParams.get('step');
  const stored = () => JSON.parse(sessionStorage.getItem('relustt_web_funnel_v1') || '{}');
  const assert = (condition, message) => { if (!condition) throw new Error(`${step()}: ${message}`); };
  const wait = async (predicate) => {
    // Long enough for the self-advancing bridge screen.
    for (let i = 0; i < 400; i++) {
      if (predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error(`Timed out at ${step()}`);
  };
  const open = async (query) => {
    await new Promise(resolve => { frame.onload = resolve; frame.src = '/funnel.html?' + query; });
  };
  const click = async (selector, next) => {
    const button = doc().querySelector(selector);
    assert(button && !button.disabled, `Enabled control ${selector}`);
    button.click();
    await wait(() => step() === next);
  };
  const answer = async (label, next) => {
    const button = [...doc().querySelectorAll('[data-answer]')].find(item => item.dataset.answer === label);
    assert(button, `Answer exists: ${label}`);
    button.click();
    await wait(() => step() === next);
  };
  const input = (selector, value) => {
    const field = doc().querySelector(selector);
    field.value = value;
    field.dispatchEvent(new (win().Event)('input', { bubbles: true }));
  };
  const info = async next => {
    assert(!doc().querySelector('#backButton'), 'Information screens have no Back control');
    await click('#continueButton', next);
  };
  const questionsInARow = () => {
    // Longest run of consecutive question screens in the recorded history.
    const questionScreens = new Set(['frequency', 'motivation', 'urgeContext', 'obstacle', 'watchControl', 'changePriority', 'fork', 'forkConcern', 'bRelationshipImpact', 'bIntensity', 'quitProgress', 'setbackTrigger', 'supportPreference']);
    let longest = 0, run = 0;
    for (const screen of stored().history) { run = questionScreens.has(screen) ? run + 1 : 0; longest = Math.max(longest, run); }
    return longest;
  };
  const sharedSpine = async (obstacle) => {
    await answer('Daily', 'motivation');
    await answer('Sexual pleasure', 'urge-context');
    await answer('It varies', 'obstacles');
    await answer(obstacle, 'build-your-system');
    assert(stored().obstacle === obstacle, 'Obstacle saved');
    await info('personalizing');
    await wait(() => step() === 'watch-control');
    assert(!doc().querySelector('#backButton') || stored().history.at(-1) !== 'obstacleBridge', 'Bridge replaces its own route');
    await answer('Rarely', 'main-priority');
    await answer('Confidence in intimacy', 'intimacy');
    assert(stored().changePriority === 'Confidence in intimacy', 'Shared goal saved before the fork');
  };
  const quitBlock = async (triedQuit) => {
    if (triedQuit === 'Yes') {
      await answer('On and off', 'quit-feedback');
      await info('setback-trigger');
      await answer('One setback makes me give up', 'support-preference');
    } else {
      assert(doc().querySelector('h1').textContent.includes('This is where you start'), 'First attempt gets the starting-point feedback');
      await info('blocker-introduction');
      await setupBlocker('support-preference');
    }
  };
  const setupBlocker = async next => {
    assert(step() === 'blocker-introduction', 'Blocker introduction appears at correct stage');
    await info('safe-word');
    input('#safeWordInput', safeWord);
    await click('#safeWordContinue', 'blocker-ready');
    await info(next);
    assert(!sessionStorage.getItem('relustt_web_funnel_v1').includes(safeWord), 'Safe word is not persisted');
    assert(!JSON.stringify(win().history.state).includes(safeWord), 'Safe word is not in browser history');
  };
  const supportAndBlocker = async (pathway, triedQuit, commitmentSlug) => {
    await answer('Someone I trust', 'shared-support');
    assert(doc().querySelector('h1').textContent.includes('Shared weight'), 'Support info reflects trusted-person preference');
    if (triedQuit === 'Yes') {
      await info('blocker-introduction');
      await setupBlocker(commitmentSlug);
    } else if (pathway === 'performance') {
      await info('blocker-reminder');
      assert(doc().querySelector('.safe-word-reminder').textContent === safeWord, 'Reminder recalls in-memory safe word');
      await info(commitmentSlug);
    } else {
      await info(commitmentSlug);
    }
  };
  const features = async next => {
    const carousel = doc().querySelector('[data-feature-carousel]');
    const header = doc().querySelector('.feature-meta');
    const button = doc().querySelector('#continueButton');
    const initialTop = button.getBoundingClientRect().top;
    for (const destination of ['community', 'ai-support', 'lessons']) {
      await info(destination);
      assert(doc().querySelector('[data-feature-carousel]') === carousel, 'Features share one mounted carousel');
      assert(doc().querySelector('.feature-meta') === header, 'Feature header stays mounted');
      assert(doc().querySelector('#continueButton') === button, 'Feature action stays mounted');
      assert(Math.abs(button.getBoundingClientRect().top - initialTop) < 1, 'Feature action position stays fixed');
      assert(doc().querySelectorAll('.feature-slide[aria-hidden="false"]').length === 1, 'Only current slide exposed');
    }
    assert(doc().querySelectorAll('.course-tile').length === 20, 'Twenty lesson cards present');
    await info(next);
  };
  const commitment = async (score, next) => {
    input('#commitmentRange', String(score));
    await click('#continueButton', score >= 7 ? 'confirm-commitment' : next);
    if (score >= 7) {
      assert(!doc().querySelector('#backButton'), 'Confirmation has no Back control');
      const screen = doc().querySelector('.recommitment-page');
      const lock = doc().querySelector('.recommit-lock');
      const notYet = doc().querySelector('.not-yet-button');
      notYet.click();
      assert(doc().querySelector('.recommitment-page') === screen, 'Not yet preserves the screen');
      assert(doc().querySelector('.recommit-lock') === lock, 'Not yet preserves the animation');
      assert(doc().querySelector('.not-yet-button') === notYet, 'Not yet preserves the button');
      await click('#confirmCommitment', next);
    }
  };
  const finish = async (pathway) => {
    input('#nameInput', 'Test Person');
    await click('#nameContinue', 'pledge');
    assert(doc().querySelector('.vow-copy').textContent.includes('I, Test Person, commit to taking back control starting today.'), 'Pledge uses entered name');
    assert(doc().querySelector('#holdButton').disabled, 'Signing required before hold action');
    // Signing mechanics are unchanged; inspect the remaining screens directly.
    await open(`step=choose-price&path=${pathway}`);
    doc().querySelector('[data-price="17.67"]').click();
    await click('#priceContinue', 'your-plan');
    const text = doc().body.textContent;
    assert(doc().querySelector('.archetype-for span').textContent === 'Test Person', 'Paywall uses entered name');
    assert(doc().querySelector('.plan-price-row.total').textContent.includes('$17.67'), 'Selected amount is due today');
    assert(text.includes('one-week paid trial') && text.includes('monthly at the crossed-out price shown above') && doc().querySelector('.plan-price-row.bonus s').textContent === '$29.50', 'Paid week and referenced renewal price displayed');
    assert(!text.includes('$0 today') && !text.includes('7 DAYS FREE') && !text.includes('free trial'), 'No free-trial claims');
    assert(doc().querySelector('#checkoutFromFunnel').textContent.includes('Reveal my 90-day plan'), 'Paid plan CTA');
    assert(doc().querySelector('.archetype-result').dataset.archetype === 'confidence' && /confidence/i.test(doc().querySelector('.archetype-clues').textContent), 'Shared answers personalize the result on either route');
  };
  try {
    for (const pathway of ['identity', 'performance']) {
      for (const triedQuit of ['Yes', 'No']) {
        await open('start=1');
        await click('#beginFunnel', 'frequency');
        await sharedSpine(triedQuit === 'Yes' ? "I've tried and failed before" : "Honestly, I haven't tried");
        assert(stored().triedQuit === triedQuit, 'Obstacle answer sets quit history');
        const score = triedQuit === 'Yes' ? 3 : 8;
        const commitmentSlug = pathway === 'identity' ? 'identity-commitment' : 'performance-commitment';
        if (pathway === 'identity') {
          await answer('No', triedQuit === 'Yes' ? 'quit-progress' : 'quit-feedback');
        } else {
          await answer('Yes', 'relationship-impact');
          await answer("Yes, it's affected a relationship", 'brain-conditioning');
          await info('performance-content-intensity');
          await answer('A little', 'arousal-threshold');
          await info(triedQuit === 'Yes' ? 'quit-progress' : 'quit-feedback');
        }
        assert(win().history.state.relustt.pathway === pathway, 'Pathway follows the intimacy answer');
        await quitBlock(triedQuit);
        await supportAndBlocker(pathway, triedQuit, commitmentSlug);
        await commitment(score, 'progress');
        await features('your-name');
        assert(questionsInARow() <= 4, `No more than four questions in a row (saw ${questionsInARow()})`);
        await finish(pathway);
        results.push(`${pathway}: tried quitting ${triedQuit}, commitment ${score} — passed`);
      }
    }
    await open('start=1');
    await click('#beginFunnel', 'frequency');
    await sharedSpine("I don't know where to start");
    assert(stored().triedQuit === 'No', 'Not knowing where to start counts as no previous attempt');
    await answer("I haven't been intimate with a partner yet", 'intimacy-concern');
    await answer('Yes', 'intimacy-worry');
    assert(win().history.state.relustt.pathway === 'identity', 'Worry alone stays on the regular path');
    assert(stored().intimacyConcern === 'Yes', 'Concern answer is saved');
    await info('quit-feedback');
    results.push('Intimacy worry shows reassurance, then continues the regular path — passed');
    await open('step=identity-goal');
    assert(step() === 'obstacles', 'Removed identity-goal link lands on the obstacle question');
    await open('step=performance-priority&path=performance');
    assert(step() === 'support-preference', 'Removed performance-priority link lands on support preference');
    sessionStorage.setItem(storageKey, JSON.stringify({ screen: 'aTimeUse', pathway: 'identity', history: ['fork', 'aIdentityGoal', 'aTrend'] }));
    await open('');
    assert(step() === 'support-preference' && !stored().history.some(screen => screen.startsWith('a')), 'Removed saved screens migrate');
    results.push('Legacy links and saved screens migrate — passed');
    return { passed: results.length, results };
  } finally {
    frame.remove();
    if (previousStorage === null) sessionStorage.removeItem(storageKey); else sessionStorage.setItem(storageKey, previousStorage);
  }
})();
