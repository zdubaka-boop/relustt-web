// Run through agent-browser eval --stdin in a dedicated LOCAL preview session.
// This exercises real page handlers and restores the test session's quiz storage.
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
    for (let i = 0; i < 100; i++) {
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
  const firstAnswer = async next => {
    const label = doc().querySelector('[data-answer]').dataset.answer;
    await answer(label, next);
  };
  const sharedQuestions = async () => {
    await answer('Daily', 'motivation');
    await answer('Sexual pleasure', 'urge-context');
    await answer('It varies', 'watch-control');
    await answer('Rarely', 'main-priority');
    await answer('Confidence in intimacy', 'intimacy');
    assert(stored().changePriority === 'Confidence in intimacy', 'Shared goal saved before the fork');
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
  const setupBlocker = async next => {
    assert(step() === 'blocker-introduction', 'Blocker introduction appears at correct stage');
    await info('safe-word');
    input('#safeWordInput', safeWord);
    await click('#safeWordContinue', 'blocker-ready');
    await info(next);
    assert(!sessionStorage.getItem('relustt_web_funnel_v1').includes(safeWord), 'Safe word is not persisted');
    assert(!JSON.stringify(win().history.state).includes(safeWord), 'Safe word is not in browser history');
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
  const finish = async (pathway, goal) => {
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
    if (pathway === 'performance') {
      assert(stored().performanceGoal === goal, 'Performance goal retained for archetype scoring');
      assert(['confidence', 'reconnect'].includes(doc().querySelector('.archetype-result').dataset.archetype), 'Performance answers lead to a relevant archetype');
    } else {
      assert(doc().querySelector('.archetype-result').dataset.archetype === 'confidence' && /confidence/i.test(doc().querySelector('.archetype-clues').textContent), 'Shared answers personalize the identity result');
      assert(stored().reclaimedTime === 'Create a business', 'Reclaimed activity retained');
    }
  };
  try {
    for (const pathway of ['identity', 'performance']) {
      for (const triedQuit of ['Yes', 'No']) {
        await open('start=1');
        await click('#beginFunnel', 'frequency');
        await sharedQuestions();
        const score = triedQuit === 'Yes' ? 3 : 8;
        if (pathway === 'identity') {
          await answer('No', 'identity-goal');
          await answer('More confident', 'obstacles');
          await answer("Honestly, I haven't tried", 'build-your-system');
          await info('content-intensity');
          await answer('A little', 'quit-history');
          await answer(triedQuit, triedQuit === 'Yes' ? 'quit-progress' : 'quit-feedback');
          if (triedQuit === 'Yes') {
            await answer('On and off', 'quit-feedback');
            await info('setback-trigger');
            await answer('One setback makes me give up', 'identity-impact');
          } else await info('blocker-introduction');
          if (triedQuit === 'No') await setupBlocker('identity-impact');
          assert(doc().querySelector('h1').textContent.includes('confidence'), 'A5 is personalized');
          await firstAnswer('support');
          await answer(triedQuit === 'Yes' ? 'One person' : 'No one', triedQuit === 'Yes' ? 'habit-trend' : 'shared-support');
          if (triedQuit === 'No') await info('habit-trend');
          await answer('Worse', 'reclaim-your-time');
          await answer('Create a business', 'support-preference');
          await answer('Someone I trust', triedQuit === 'Yes' ? 'blocker-introduction' : 'identity-commitment');
          if (triedQuit === 'Yes') await setupBlocker('identity-commitment');
          await commitment(score, 'progress');
          await features('recommitment-check');
          assert(doc().querySelector('h1').textContent.includes(`${score}/10`), 'Recommitment recalls slider value');
          await answer(triedQuit === 'Yes' ? 'Honestly, not sure' : 'Yes', triedQuit === 'Yes' ? 'start-with-uncertainty' : 'your-name');
          if (triedQuit === 'Yes') await info('your-name');
          await finish(pathway);
        } else {
          await answer('Yes', 'relationship-impact');
          await firstAnswer('porn-connection');
          await answer('Yes', 'brain-conditioning');
          await info('performance-content-intensity');
          await answer('A little', 'arousal-threshold');
          await info('performance-quit-history');
          await answer(triedQuit, triedQuit === 'Yes' ? 'performance-quit-progress' : 'quit-feedback');
          if (triedQuit === 'Yes') {
            await answer("Good, I've made real progress", 'quit-feedback');
            await info('setback-trigger');
            await answer("I haven't returned to it", 'performance-trend');
          } else await info('blocker-introduction');
          if (triedQuit === 'No') await setupBlocker('performance-trend');
          assert(!doc().querySelector('#trendAvoidance'), 'Removed alternative is absent');
          input('#trendRange', triedQuit === 'No' ? '4' : '0');
          await click('#continueButton', 'performance-priority');
          assert(stored().performanceTrendScore === (triedQuit === 'No' ? 'worse' : 'better'), 'B9 scores the selected slider value');
          const goal = 'Feel closer to my partner';
          await answer(goal, 'support-preference');
          await answer('Someone I trust', triedQuit === 'No' ? 'blocker-reminder' : 'blocker-introduction');
          if (triedQuit === 'Yes') await setupBlocker('progress');
          else {
            assert(doc().querySelector('.safe-word-reminder').textContent === safeWord, 'B E1 recalls in-memory safe word');
            await info('progress');
          }
          await features('performance-commitment');
          await commitment(score, 'your-name');
          await finish(pathway, goal);
        }
        results.push(`${pathway}: tried quitting ${triedQuit}, commitment ${score} — passed`);
      }
    }
    await open('start=1');
    await click('#beginFunnel', 'frequency');
    await sharedQuestions();
    await answer("I haven't been intimate with a partner yet", 'intimacy-concern');
    await answer('Yes', 'intimacy-worry');
    assert(win().history.state.relustt.pathway === 'identity', 'Worry alone stays on the regular path');
    assert(stored().intimacyConcern === 'Yes', 'Concern answer is saved');
    await click('#continueButton', 'identity-goal');
    results.push('Intimacy worry shows reassurance, then continues the regular path — passed');
    return { passed: results.length, results };
  } finally {
    frame.remove();
    if (previousStorage === null) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, previousStorage);
  }
})()
