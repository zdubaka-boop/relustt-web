// Verify the result reveal against the actual local page.
(async () => {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw Error('Local preview only');
  const key = 'relustt_web_funnel_v1';
  const saved = sessionStorage.getItem(key);
  const frame = document.createElement('iframe'); frame.width = '390'; frame.height = '844'; document.body.append(frame);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const open = query => new Promise(resolve => { frame.onload = resolve; frame.src = '/funnel.html?' + query; });
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const results = [];
  try {
    sessionStorage.setItem(key, JSON.stringify({pathway:'performance', performanceGoal:'Feeling normal again', anxietyTrigger:'Stress or pressure in the moment', selectedPrice:'13', offerStartedAt:0}));
    await open('step=your-plan&path=performance');
    const win = frame.contentWindow, doc = frame.contentDocument;
    const heading = doc.querySelector('#offerHeroTitle');
    const full = heading.getAttribute('aria-label');
    assert(doc.querySelector('.offer-intro'), 'Starts with headline-only reveal');
    assert([...doc.querySelectorAll('.offer-reveal-item')].every(e => e.inert && win.getComputedStyle(e).visibility === 'hidden'), 'Other content hidden and untabbable');
    const box = heading.getBoundingClientRect();
    assert(Math.abs(box.top + box.height / 2 - win.innerHeight / 2) < 3, 'Headline starts centered vertically');
    assert(!JSON.parse(sessionStorage.getItem(key)).offerStartedAt, 'Countdown has not started during typing');
    await pause(700);
    const partial = doc.querySelector('.offer-heading-typed').textContent;
    assert(partial.length > 0 && partial.length < full.length, 'Personalized heading types progressively');
    await pause(3800);
    assert(doc.querySelector('.offer-revealed'), 'Rest of page revealed');
    assert(heading === doc.querySelector('#offerHeroTitle') && heading.textContent === full, 'Same personalized heading remains in place');
    assert([...doc.querySelectorAll('.offer-reveal-item')].every(e => !e.inert && Number(win.getComputedStyle(e).opacity) > .99), 'Content is visible and interactive');
    assert(JSON.parse(sessionStorage.getItem(key)).offerStartedAt > 0, 'Countdown starts with reveal');
    assert(doc.querySelector('.intro-price').textContent === '$13', 'Selected price preserved');
    assert(doc.documentElement.scrollWidth <= win.innerWidth, 'No horizontal overflow');
    results.push('Headline typing, centered layout, staged reveal, and timer passed');
    await open('step=your-plan&path=performance');
    frame.contentWindow.history.pushState(null, '', '/funnel.html?step=frequency');
    frame.contentWindow.dispatchEvent(new frame.contentWindow.PopStateEvent('popstate', {state:null}));
    await pause(4500);
    assert(new URL(frame.contentWindow.location.href).searchParams.get('step') === 'frequency', 'Leaving cancels reveal');
    assert(!frame.contentDocument.querySelector('.offer-revealed'), 'No stale reveal modifies the next screen');
    results.push('Leaving mid-reveal cancels pending work');
    return {passed:results.length,results};
  } finally { frame.remove(); if (saved === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key,saved); }
})()
