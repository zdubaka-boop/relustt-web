// Local browser regression for personalized analysis, routing, and timer cleanup.
(async () => {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw Error('Local preview only');
  const key = 'relustt_web_funnel_v1';
  const saved = sessionStorage.getItem(key);
  const frame = document.createElement('iframe');
  frame.width = '390'; frame.height = '844'; document.body.append(frame);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const open = query => new Promise(resolve => { frame.onload = resolve; frame.src = '/funnel.html?' + query; });
  const assert = (value, message) => { if (!value) throw Error(message); };
  const results = [];
  try {
    for (const pathway of ['identity', 'performance']) {
      sessionStorage.setItem(key, JSON.stringify({
        screen: 'planAnalysis', pathway, history: ['pledge'],
        identityGoal: 'More confident', reclaimedTime: 'Create a business',
        performanceGoal: 'Feeling normal again', anxietyTrigger: 'Stress or pressure in the moment',
        ...(pathway === 'performance' ? { performanceGoal: '', changePriority: 'More time and focus', urgeContext: 'When putting off a task' } : {}),
        safeWord: 'never-display-this-secret',
      }));
      await open('step=analyzing-answers&path=' + pathway);
      const win = frame.contentWindow, doc = frame.contentDocument;
      const seen = [doc.querySelector('#analysisStatus').textContent];
      const observer = new MutationObserver(() => seen.push(doc.querySelector('#analysisStatus')?.textContent || ''));
      observer.observe(doc.querySelector('#analysisStatus'), { childList: true, subtree: true });
      assert(!doc.body.textContent.includes('never-display-this-secret'), 'No safe word in analysis');
      assert(!doc.querySelector('#backButton'), 'No back button on analysis');
      const historyLength = win.history.length;
      const started = performance.now();
      assert(!doc.querySelector('.analysis-core'), 'Central orb removed');
      const cards = Array.from(doc.querySelectorAll('.assembly-sheet'));
      const cardCopy = cards.map(card => card.innerHTML);
      assert(cards.length === 7, 'Seven real cards for six changes');
      const stages = new Set();
      assert(!doc.querySelector('.brain-scan'), 'Brain replaced');
      assert(doc.querySelectorAll('.analysis-track').length === 1, 'One continuous timeline');
      let typed = [];
      for (let i = 0; i < 420; i++) {
        if (new URL(win.location.href).searchParams.get('step') === 'choose-price') break;
        typed.push(doc.querySelector('#analysisMessage')?.textContent.length || 0);
        stages.add(doc.querySelector('.assembly-sheet[data-slot="0"]')?.dataset.card);
        assert(cards.every(card => card.isConnected), 'Whole cards stay mounted');
        assert(cards.every((card, i) => card.innerHTML === cardCopy[i]), 'Card content stays unchanged while deck rotates');
        assert(doc.documentElement.scrollWidth <= win.innerWidth, 'No horizontal overflow');
        await pause(75);
      }
      observer.disconnect();
      assert(performance.now() - started >= 15500 && performance.now() - started < 18000, 'Analysis completes in about 16 seconds');
      assert(new URL(win.location.href).searchParams.get('step') === 'choose-price', 'Automatically advances to price');
      assert(stages.size === 7, 'Each whole card reaches the front');
      assert(win.history.length === historyLength, 'Analysis replaces history instead of adding a replay loop');
      assert(win.history.state.relustt.pathway === pathway, 'Branch preserved');
      assert(seen.some(text => text.includes(pathway === 'identity' ? 'More confident' : 'More time and focus')), 'Shared goal personalizes analysis; legacy sessions still work');
      assert(seen.some(text => text.includes(pathway === 'identity' ? 'Create a business' : 'When putting off a task')), 'Second message uses trigger context when available');
      assert(typed.some((length, i) => i && length < typed[i - 1]), 'Message erases before retyping');
      results.push(pathway + ': personalized messages and automatic routing passed');
    }
    await open('step=analyzing-answers');
    frame.contentWindow.history.pushState(null, '', '/funnel.html?step=frequency');
    frame.contentWindow.dispatchEvent(new frame.contentWindow.PopStateEvent('popstate', { state: null }));
    await pause(10000);
    assert(new URL(frame.contentWindow.location.href).searchParams.get('step') === 'frequency', 'Leaving cancels analysis timers');
    results.push('Leaving analysis cancels timers');
    return { passed: results.length, results };
  } finally {
    frame.remove();
    if (saved === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, saved);
  }
})()
