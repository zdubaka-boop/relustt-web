(() => {
  const app = document.getElementById('funnelApp');
  const STORAGE_KEY = 'relustt_web_funnel_v1';
  const priceTiers = ['5', '9', '13', '17.67'];
  // Stable, shareable routes. Answers and the safe word never belong in URLs.
  const stepSlugs = {
    welcome: 'welcome', frequency: 'frequency', motivation: 'motivation', urgeContext: 'urge-context',
    obstacle: 'obstacles', obstacleInfo: 'build-your-system', obstacleBridge: 'personalizing',
    watchControl: 'watch-control', changePriority: 'main-priority',
    fork: 'intimacy', forkConcern: 'intimacy-concern', forkConcernInfo: 'intimacy-worry',
    bCauseInfo: 'brain-conditioning',
    bIntensity: 'performance-content-intensity', bGapInfo: 'arousal-threshold',
    triedQuit: 'quit-history', quitProgress: 'quit-progress', quitFeedback: 'quit-feedback', setbackTrigger: 'setback-trigger',
    supportPreference: 'support-preference', supportBridge: 'good-news', featureSpotlight: 'your-support', blockerBridge: 'one-more-thing',
    safeWordIntro: 'blocker-introduction', safeWordEntry: 'safe-word', blockerLive: 'blocker-ready', blockerReminder: 'blocker-reminder',
    commitmentPerformance: 'performance-commitment',
    commitmentIdentity: 'identity-commitment',
    name: 'your-name', pledge: 'pledge', planAnalysis: 'analyzing-answers', price: 'choose-price', paywall: 'your-plan',
  };
  // Screens removed by the 2026-09-16 question cut. Old links and saved sessions land on the nearest live step.
  const legacyScreens = {
    aObstacle: 'obstacle', aObstacleInfo: 'obstacleInfo', aObstacleBridge: 'obstacleBridge',
    aQuitProgress: 'quitProgress', bQuitProgress: 'quitProgress', aTriedQuit: 'triedQuit', bTriedQuit: 'triedQuit',
    aSupportInfo: 'supportPreference', supportInfo: 'supportPreference', bOccurrence: 'bCauseInfo', bRelationshipImpact: 'bCauseInfo', bPornConnection: 'bCauseInfo',
    aIdentityGoal: 'obstacle', aIntensity: 'watchControl',
    aIdentityImpact: 'supportPreference', aSupport: 'supportPreference', aTrend: 'supportPreference', aTimeUse: 'supportPreference',
    bTrend: 'supportPreference', bPriority: 'supportPreference', bAnxietyTrigger: 'supportPreference', bConfidenceSpill: 'supportPreference',
    aRecommitment: 'name', aRecommitmentInfo: 'name', recommitment: 'commitmentIdentity',
    featureProgress: 'name', featureCommunity: 'name', featureSupport: 'name', featureLessons: 'name',
  };
  const legacySlugs = {
    'shared-support': 'supportPreference', 'anxiety-triggers': 'supportPreference', 'confidence-impact': 'supportPreference', 'performance-experience': 'bCauseInfo', 'relationship-impact': 'bCauseInfo',
    'porn-connection': 'bCauseInfo', 'identity-goal': 'obstacle', 'content-intensity': 'watchControl',
    'performance-quit-history': 'triedQuit', 'performance-quit-progress': 'quitProgress',
    'identity-impact': 'supportPreference', 'support': 'supportPreference', 'habit-trend': 'supportPreference',
    'reclaim-your-time': 'supportPreference', 'performance-trend': 'supportPreference', 'performance-priority': 'supportPreference',
    'recommitment-check': 'name', 'start-with-uncertainty': 'name', 'confirm-commitment': 'commitmentIdentity',
    'progress': 'name', 'community': 'name', 'ai-support': 'name', 'lessons': 'name',
  };
  const screensBySlug = new Map([...Object.entries(legacySlugs), ...Object.entries(stepSlugs).map(([screen, slug]) => [slug, screen])]);
  const defaults = {
    screen: 'welcome', history: [], pathway: 'identity', safeWordReturn: 'supportPreference',
    frequency: '', performanceExperience: '', relationshipImpact: '', pornConnection: '',
    contentIntensity: '', triedQuit: '', quitProgress: '', anxietyTrigger: '',
    performanceTrend: '', performanceTrendScale: 2, performanceTrendScore: '', performanceGoal: '', confidenceSpill: '', identityGoal: '', forkAnswer: '',
    obstacle: '', identityImpact: '', support: '', identityTrend: '', reclaimedTime: '',
    commitment: 7, recommitmentAnswer: '', name: '', selectedPrice: '9', notYetAttempts: 0,
    intimacyConcern: '', offerStartedAt: 0,
    motivation: '', urgeContext: '', watchControl: '', changePriority: '', setbackTrigger: '', supportPreference: '',
  };
  let restored = {};
  const pageUrl = new URL(window.location.href);
  const startingOver = pageUrl.searchParams.get('start') === '1';
  if (startingOver) {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  } else {
    try { restored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch {}
  }
  const state = { ...defaults, ...restored, history: Array.isArray(restored.history) ? restored.history : [] };
  const migrateScreen = (screen) => legacyScreens[screen] || screen;
  state.screen = migrateScreen(state.screen);
  state.safeWordReturn = migrateScreen(state.safeWordReturn);
  state.history = state.history.map(migrateScreen)
    .filter((screen, index, list) => Object.hasOwn(stepSlugs, screen) && screen !== list[index - 1]);
  state.selectedPrice = ({ '14.99': '13', '29.99': '17.67' })[state.selectedPrice] || state.selectedPrice;
  if (!priceTiers.includes(state.selectedPrice)) state.selectedPrice = defaults.selectedPrice;
  // The safe word is deliberately memory-only and never written to browser storage.
  state.safeWord = '';
  let activeAnimations = [];
  let activeTimers = [];

  function routeFromUrl() {
    const url = new URL(window.location.href);
    const screen = screensBySlug.get(url.searchParams.get('step')) || 'welcome';
    const fixedPathway = url.searchParams.get('step') === 'confidence-impact' ? 'performance'
      : screen.startsWith('a') || screen === 'commitmentIdentity' ? 'identity'
      : (screen.startsWith('b') && screen !== 'blockerLive') || screen === 'commitmentPerformance' ? 'performance' : null;
    return { screen, pathway: fixedPathway || (url.searchParams.get('path') === 'performance' ? 'performance' : 'identity') };
  }

  function writeRoute(mode = 'replace', canGoBack = false) {
    const url = new URL(window.location.href);
    url.searchParams.delete('start');
    url.searchParams.set('step', stepSlugs[state.screen]);
    if (state.pathway === 'performance') url.searchParams.set('path', 'performance');
    else url.searchParams.delete('path');
    const navigation = { screen: state.screen, history: [...state.history], pathway: state.pathway, safeWordReturn: state.safeWordReturn, canGoBack };
    window.history[mode === 'push' ? 'pushState' : 'replaceState']({ relustt: navigation }, '', url);
  }

  function restoreRoute(navigation) {
    const route = routeFromUrl();
    const matching = navigation?.screen === route.screen;
    state.screen = route.screen;
    state.pathway = route.pathway;
    state.history = matching && Array.isArray(navigation.history)
      ? navigation.history.filter((screen) => Object.hasOwn(stepSlugs, screen)) : [];
    state.safeWordReturn = matching && Object.hasOwn(stepSlugs, navigation.safeWordReturn)
      ? navigation.safeWordReturn : 'supportPreference';
  }

  const initialNavigation = window.history.state?.relustt;
  if (startingOver) {
    Object.assign(state, defaults, { history: [], safeWord: '' });
  } else if (pageUrl.searchParams.has('step')) {
    restoreRoute(initialNavigation?.screen === routeFromUrl().screen ? initialNavigation
      : restored.screen === routeFromUrl().screen ? { ...restored, canGoBack: false } : null);
  } else if (!Object.hasOwn(stepSlugs, state.screen)) {
    Object.assign(state, defaults, { history: [], safeWord: '' });
  }
  writeRoute('replace', !startingOver && initialNavigation?.screen === state.screen && initialNavigation.canGoBack === true);
  persist();
  window.addEventListener('popstate', (event) => {
    restoreRoute(event.state?.relustt);
    writeRoute('replace', event.state?.relustt?.canGoBack === true);
    persist();
    render();
  });

  const lottieFiles = {
    'meditating-brain': 'animations/meditating-brain.json',
    'circle-morph': 'animations/circle-morph.json',
    'animated-plant': 'animations/animated-plant.json',
    'victory-player': 'animations/victory-player.json',
    'progress-graph': 'animations/progress-graph.json',
    'two-friends': 'animations/two-friends.json',
    'flying-books': 'animations/flying-books.json',
  };

  const escapeHTML = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function persist() {
    const { safeWord, ...safeState } = state;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeState)); } catch {}
  }

  function go(destination) {
    state.history.push(state.screen);
    state.screen = destination;
    writeRoute('push', true);
    persist();
    render();
  }

  function goBack() {
    if (window.history.state?.relustt?.canGoBack) return window.history.back();
    state.screen = state.history.pop() || 'welcome';
    writeRoute();
    persist();
    render();
  }

  function resetFunnel() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    Object.assign(state, defaults, { history: [], safeWord: '' });
    writeRoute();
    render();
  }

  function questionProgressScreens() {
    const usedConcernFollowUp = state.screen === 'forkConcern' || state.history.includes('forkConcern');
    const screens = ['frequency', 'motivation', 'triedQuit'];
    // Assume prior attempts until answered, so the total shrinks rather than grows mid-quiz.
    if (state.triedQuit !== 'No') screens.push('quitProgress');
    screens.push('urgeContext', 'obstacle', 'watchControl', 'changePriority', 'fork');
    if (usedConcernFollowUp) screens.push('forkConcern');
    if (state.pathway === 'performance') screens.push('bIntensity');
    if (state.triedQuit !== 'No') screens.push('setbackTrigger');
    screens.push('supportPreference', state.pathway === 'performance' ? 'commitmentPerformance' : 'commitmentIdentity', 'name');
    return screens;
  }

  function topBar(back = true) {
    if (!back) return `<header class="funnel-topbar info-topbar"><span class="funnel-brand">RELUSTT</span></header>`;
    const screens = questionProgressScreens();
    const index = screens.indexOf(state.screen);
    const showProgress = index >= 0;
    const progress = showProgress ? Math.max(0.02, (index + 1) / screens.length) : 0;
    return `<header class="funnel-topbar">
      <button class="back-button" id="backButton" type="button" aria-label="Back">‹</button>
      ${showProgress ? `<div class="top-progress" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="${screens.length}" aria-valuenow="${index + 1}"><span style="width:${progress * 100}%"></span></div><span class="time-label">${index + 1} / ${screens.length}</span>` : '<span class="topbar-spacer"></span>'}
    </header>`;
  }

  function mount(markup, { top = true, back = true, className = '' } = {}) {
    activeAnimations.forEach((animation) => animation.destroy());
    activeTimers.forEach(window.clearTimeout);
    activeAnimations = [];
    activeTimers = [];
    app.innerHTML = `<section class="screen screen-enter ${className}">${top ? topBar(back) : ''}${markup}</section>`;
    document.getElementById('backButton')?.addEventListener('click', goBack);
    mountLottieAnimations();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function lottieVisual(name, label, loop = true) {
    return `<div class="lottie-animation" data-lottie="${name}" data-loop="${loop}" role="img" aria-label="${escapeHTML(label)}"><span class="lottie-fallback" aria-hidden="true">RELUSTT</span></div>`;
  }

  function mountLottieAnimations() {
    if (!window.lottie) return;
    app.querySelectorAll('[data-lottie]').forEach((container) => {
      const path = lottieFiles[container.dataset.lottie];
      if (!path) return;
      const animation = window.lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: container.dataset.loop !== 'false',
        autoplay: true,
        path,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      });
      animation.addEventListener('DOMLoaded', () => container.classList.add('is-loaded'));
      container.relusttAnimation = animation;
      activeAnimations.push(animation);
    });
  }

  function primaryButton(title, id = 'continueButton', icon = '→', enabled = true) {
    return `<button class="primary-button" id="${id}" type="button" ${enabled ? '' : 'disabled'}><span>${escapeHTML(title)}</span><span aria-hidden="true">${icon}</span></button>`;
  }

  function showWelcome() {
    const letters = [...'RELUSTT'].map((letter, index) => {
      const from = index % 2 ? '380px' : '-380px';
      const spin = index % 2 ? '-540deg' : '540deg';
      return `<span style="--i:${index};--from:${from};--spin:${spin}">${letter}</span>`;
    }).join('');
    mount(`<div class="welcome">
      <div class="marble-wordmark" aria-label="RELUSTT">${letters}</div>
      <div class="welcome-copy"><h1>Quit porn for good.<span>Take back control.</span></h1><p>Take the quiz. Build a system beyond willpower.</p><div class="rating" aria-label="Rated 4.8 out of 5">★★★★★ <strong>4.8</strong></div></div>
      <div class="welcome-action"><button class="marble-button" id="beginFunnel" type="button" aria-label="Begin quiz">→</button><small>Tap to begin · About 2 minutes</small></div>
    </div>`, { top: false, className: 'welcome-screen' });
    document.getElementById('beginFunnel').addEventListener('click', () => go('frequency'));
  }

  function showQuestion({ eyebrow = '', title, options, selected = '', helper = '', binary = false }, onSelect) {
    mount(`<div class="question-content">
      ${eyebrow ? `<p class="eyebrow">${escapeHTML(eyebrow)}</p>` : ''}<h1>${escapeHTML(title)}</h1>${helper ? `<p class="question-helper">${escapeHTML(helper)}</p>` : ''}
      <div class="option-list${binary ? ' binary-options' : ''}">${options.map((option, index) => `<button class="option ${selected === option ? 'is-selected' : ''}" type="button" data-answer="${escapeHTML(option)}" style="--i:${index}">${binary ? `<span class="option-emoji" aria-hidden="true">${option === 'Yes' ? '👍' : '👎'}</span><span class="option-label">${escapeHTML(option)}</span>` : `<span class="option-index">${index + 1}</span><span class="option-label">${escapeHTML(option)}</span><span class="option-arrow" aria-hidden="true">↗</span>`}</button>`).join('')}</div>
    </div>`, { className: 'question-screen' });
    app.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => {
      app.querySelectorAll('[data-answer]').forEach((item) => item.disabled = true);
      button.classList.add('is-selected');
      activeTimers.push(window.setTimeout(() => onSelect(button.dataset.answer), 120));
    }));
  }

  function blockedSitesVisual() {
    const sites = [{ name: 'Pornhub', initials: 'PH' }, { name: 'xHamster', initials: 'XH' }];
    return `<div class="blocked-showcase" role="img" aria-label="Blocking preview: Pornhub and xHamster are crossed out and locked. You can also add other sites.">
      <div class="blocked-heading" aria-hidden="true">BLOCKING PREVIEW</div>
      <div class="blocked-sites" aria-hidden="true">${sites.map((site, index) => `<div class="blocked-row" style="--delay:${index * .55}s">
        <span class="blocked-icon">${site.initials}</span>
        <strong class="blocked-site-name">${site.name}</strong>
        <span class="blocked-status"><span class="site-detected">Detected</span><span class="site-locked">🔒<small>Locked</small></span></span>
      </div>`).join('')}</div>
      <p class="blocked-custom" aria-hidden="true">＋ Add any other site you want to block</p>
    </div>`;
  }

  // Animated inline SVG scenes for the obstacle insight. Each one draws the idea in
  // the copy above it: willpower draining while a system holds, a route that maps
  // itself, a climb whose falls are caught, and a first step lighting up.
  function obstacleVisual(kind) {
    const defs = `<defs>
      <linearGradient id="ovStroke" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#a16eff"/><stop offset="1" stop-color="#8cebcf"/></linearGradient>
      <linearGradient id="ovFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d2b6ff"/><stop offset="1" stop-color="#6333eb"/></linearGradient>
      <linearGradient id="ovBeam" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c9a6ff" stop-opacity=".38"/><stop offset="1" stop-color="#c9a6ff" stop-opacity="0"/></linearGradient>
      <radialGradient id="ovAura"><stop stop-color="#b18aff" stop-opacity=".5"/><stop offset="1" stop-color="#8750ef" stop-opacity="0"/></radialGradient>
      <filter id="ovBlur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>`;
    const label = (x, y, text, anchor = 'middle') => `<text class="ov-label" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
    if (kind === 'system') {
      // Two attempts on one chart. Willpower: every try climbs a little less and crashes
      // to the floor, never near the goal. Then it dims and the system line draws over it:
      // it still dips, but it recovers each time and reaches the goal.
      const willpower = 'M30 190C50 170 62 150 74 138L82 190C100 172 112 156 124 146L132 190C148 174 160 162 170 154L178 190C194 176 206 166 214 160L222 190C236 180 250 172 262 168L270 190L330 190';
      const system = 'M30 190C60 176 80 160 100 140L108 156C130 138 150 118 176 100L184 114C210 96 240 74 270 60L276 70C296 58 316 46 330 40';
      const crashes = [82, 132, 178, 222, 270];
      const dips = [[108, 156], [184, 114], [276, 70]];
      return `<svg class="obstacle-visual ov-graph" viewBox="0 0 360 220" aria-hidden="true">${defs}
        <linearGradient id="ovDanger" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ff6a7e"/><stop offset="1" stop-color="#ff9a86"/></linearGradient>
        <ellipse class="ov-aura ov-graph-aura" cx="300" cy="52" rx="96" ry="66" fill="url(#ovAura)"/>
        <g class="ov-graph-grid">${[80, 120, 160].map(y => `<path d="M30 ${y}H330"/>`).join('')}</g>
        <path class="ov-graph-floor" d="M30 190H330"/>
        <path class="ov-graph-goal" d="M30 40H330"/>
        <text class="ov-label ov-graph-goal-label" x="330" y="30" text-anchor="end">GOAL</text>
        <g class="ov-graph-willpower">
          <path class="ov-graph-will-line" d="${willpower}" pathLength="1"/>
          ${crashes.map((x, i) => `<circle class="ov-graph-crash" style="--i:${i}" cx="${x}" cy="190" r="4"/>`).join('')}
          <text class="ov-label ov-graph-will-label" x="30" y="30" text-anchor="start">WILLPOWER</text>
        </g>
        <g class="ov-graph-system">
          <path class="ov-graph-sys-glow" d="${system}" pathLength="1" filter="url(#ovBlur)"/>
          <path class="ov-graph-sys-line" d="${system}" pathLength="1"/>
          ${dips.map(([x, y], i) => `<circle class="ov-graph-dip" style="--i:${i}" cx="${x}" cy="${y}" r="4"/>`).join('')}
          <g class="ov-graph-summit" transform="translate(330 40)"><circle class="ov-ring" r="10"/><circle class="ov-dot" r="6"/></g>
          <text class="ov-label ov-graph-sys-label" x="30" y="30" text-anchor="start">WITH A SYSTEM</text>
        </g>
      </svg>`;
    }
    if (kind === 'path') {
      const route = 'M40 170C90 170 100 110 150 110S210 60 250 60S300 40 320 44';
      const stops = [[150, 110, 1], [250, 60, 2], [320, 44, 3]];
      return `<svg class="obstacle-visual ov-path" viewBox="0 0 360 220" aria-hidden="true">${defs}
        <g class="ov-grid">${[40, 80, 120, 160, 200].map(y => `<path d="M0 ${y}H360"/>`).join('')}${[60, 120, 180, 240, 300].map(x => `<path d="M${x} 0V220"/>`).join('')}</g>
        <ellipse class="ov-aura" cx="290" cy="60" rx="90" ry="60" fill="url(#ovAura)"/>
        <path class="ov-route-ghost" d="${route}"/>
        <path class="ov-route-glow" d="${route}" pathLength="1" filter="url(#ovBlur)"/>
        <path id="ovRoute" class="ov-route" d="${route}" pathLength="1"/>
        <g class="ov-start" transform="translate(40 170)"><circle class="ov-ring" r="9"/><circle class="ov-dot" r="5"/></g>
        ${stops.map(([x, y, n], i) => `<g transform="translate(${x} ${y})"><g class="ov-stop" style="--i:${i}"><circle class="ov-stop-halo" r="18" filter="url(#ovBlur)"/><circle class="ov-stop-disc" r="12"/><text class="ov-stop-number" text-anchor="middle" y="4">${n}</text></g></g>`).join('')}
        <g class="ov-traveller"><circle class="ov-traveller-glow" r="10" filter="url(#ovBlur)"/><circle class="ov-traveller-dot" r="5"/><animateMotion dur="3.2s" begin="0.3s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" keyPoints="0;1"><mpath href="#ovRoute"/></animateMotion></g>
        ${label(40, 196, 'YOU ARE HERE')}${label(320, 24, 'YOUR PLAN')}
      </svg>`;
    }
    if (kind === 'catch') {
      const climb = 'M30 172C60 158 90 128 120 118L128 148C160 132 182 104 210 96L218 126C250 106 292 68 330 42';
      return `<svg class="obstacle-visual ov-catch" viewBox="0 0 360 220" aria-hidden="true">${defs}
        <ellipse class="ov-aura" cx="300" cy="56" rx="90" ry="64" fill="url(#ovAura)"/>
        <path class="ov-floor" d="M20 200H340"/>
        <g class="ov-ghosts"><path class="ov-ghost" d="M120 118L134 200"/><path class="ov-ghost" style="--i:1" d="M210 96L226 200"/></g>
        <g transform="translate(128 148)"><g class="ov-rail" style="--i:0"><rect class="ov-rail-glow" x="-22" y="-4" width="44" height="8" rx="4" filter="url(#ovBlur)"/><rect class="ov-rail-bar" x="-20" y="-2" width="40" height="4" rx="2"/></g></g>
        <g transform="translate(218 126)"><g class="ov-rail" style="--i:1"><rect class="ov-rail-glow" x="-22" y="-4" width="44" height="8" rx="4" filter="url(#ovBlur)"/><rect class="ov-rail-bar" x="-20" y="-2" width="40" height="4" rx="2"/></g></g>
        <path class="ov-climb-glow" d="${climb}" pathLength="1" filter="url(#ovBlur)"/>
        <path class="ov-climb" d="${climb}" pathLength="1"/>
        <g class="ov-summit" transform="translate(330 42)"><circle class="ov-ring" r="10"/><circle class="ov-dot" r="6"/></g>
        ${label(30, 214, 'BEFORE', 'start')}${label(330, 214, 'WITH STRUCTURE', 'end')}
      </svg>`;
    }
    const steps = [[46, 150, 1], [136, 118, .55], [226, 86, .32]];
    return `<svg class="obstacle-visual ov-first-step" viewBox="0 0 360 220" aria-hidden="true">${defs}
      <polygon class="ov-beam" points="66,0 116,0 150,150 32,150" fill="url(#ovBeam)"/>
      <ellipse class="ov-aura" cx="92" cy="150" rx="86" ry="40" fill="url(#ovAura)"/>
      ${steps.map(([x, y, o], i) => `<g transform="translate(${x} ${y})"><g class="ov-step" style="--i:${i};--o:${o}"><path class="ov-riser" d="M0 8V${196 - y}M90 8V${196 - y}"/><rect class="ov-tread" x="0" y="0" width="90" height="16" rx="6"/><rect class="ov-tread-edge" x="0" y="0" width="90" height="4" rx="2"/></g></g>`).join('')}
      <g class="ov-marker" transform="translate(91 150)"><circle class="ov-land-ring" r="14"/><circle class="ov-land-ring" style="--i:1" r="14"/><g class="ov-marker-drop"><circle class="ov-marker-glow" r="12" filter="url(#ovBlur)"/><circle class="ov-dot" r="7"/></g></g>
      <path class="ov-chevrons" d="M176 98l6 6-6 6M266 66l6 6-6 6"/>
      ${label(91, 186, 'STEP ONE')}
    </svg>`;
  }

  function insightVisual(kind) {
    if (kind === 'brain') return lottieVisual('meditating-brain', 'Meditating brain animation');
    if (kind === 'threshold') return lottieVisual('circle-morph', 'Arousal threshold animation');
    if (kind === 'plant') return lottieVisual('animated-plant', 'Growing plant animation', false);
    if (kind === 'trophy') return lottieVisual('victory-player', 'Victory animation');
    if (kind === 'blocker') return blockedSitesVisual();
    if (['system', 'path', 'catch', 'first-step'].includes(kind)) return obstacleVisual(kind);
    const icons = { map: '⌖', retry: '↻', start: '↑', shield: '◆', people: '●●', unlock: '◇' };
    return `<div class="generic-insight-visual" aria-hidden="true">${icons[kind] || '◆'}</div>`;
  }

  function showInsight({ eyebrow = '', title, message, takeaway, visual, accent = 'violet', buttonTitle }, onContinue) {
    mount(`<div class="insight-content accent-${accent}"><div class="insight-visual">${insightVisual(visual)}</div>
      ${eyebrow ? `<p class="eyebrow">${escapeHTML(eyebrow)}</p>` : ''}<h1>${escapeHTML(title)}</h1><p class="insight-copy">${escapeHTML(message)}</p>
      ${takeaway ? `<div class="takeaway"><span aria-hidden="true">◈</span><strong>${escapeHTML(takeaway)}</strong></div>` : ''}${primaryButton(buttonTitle)}</div>`, { back: false, className: `insight-screen${visual === 'blocker' ? ' blocker-intro-screen' : ''}` });
    document.getElementById('continueButton').addEventListener('click', onContinue);
  }

  function obstacleInsight() {
    const content = {
      "I don't know where to start": { visual: 'path', title: "You don't have to figure it out alone.", message: "That's exactly why you're here. You don't need to know where to start, because we already do. Just follow the plan, one step at a time." },
      "I've tried and failed before": { visual: 'catch', title: "You didn't fail. Willpower did.", message: "Willpower alone was never going to be enough, for anyone. This time you get structure built for the moments that broke you before." },
      "Honestly, I haven't tried": { visual: 'first-step', title: "Then let's start now.", message: 'You already know what you want. This is where that actually starts.' },
    }[state.obstacle] || { visual: 'system', title: 'This was never really about willpower.', message: "Willpower runs out. That's not a flaw in you, that's how it works for everyone. What works is a system that prevents the urge before it hits." };
    showInsight({ eyebrow: 'A DIFFERENT WAY FORWARD', ...content, accent: 'violet', buttonTitle: 'Build my system' }, () => go('obstacleBridge'));
  }

  // A short beat between screens. Words settle in on a CSS stagger rather than a
  // per-character timer, then the whole line fades to nothing before the next
  // screen mounts. It replaces its own route, so Back skips it instead of replaying.
  const WORD_STAGGER = 90;
  const WORD_SETTLE = 550;
  // Time a line stays fully settled before it dissolves, scaled to its length.
  const READ_PER_WORD = 170;
  const MIN_READ = 1300;
  const FADE_OUT = 650;
  // A beat between screens. Each line's words settle in on a CSS stagger, hold,
  // then dissolve before the next line or screen. It replaces its own route, so
  // Back skips it instead of replaying.
  function showTypedBridge({ lines, next }) {
    const beats = Array.isArray(lines) ? lines : [lines];
    mount(`<div class="bridge-screen">
      <div class="bridge-stage" id="bridgeStage" aria-hidden="true"></div>
      <div class="analysis-status" role="status" aria-live="polite">${escapeHTML(beats.join(' '))}</div>
    </div>`, { back: false, className: 'bridge-page' });
    const stage = document.getElementById('bridgeStage');
    const origin = state.screen;
    const later = (callback, delay) => activeTimers.push(window.setTimeout(() => {
      if (state.screen === origin && stage.isConnected) callback();
    }, delay));
    const advance = () => {
      state.screen = next;
      writeRoute('replace', window.history.state?.relustt?.canGoBack === true);
      persist();
      render();
    };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const play = (index) => {
      const words = beats[index].split(' ');
      stage.innerHTML = `<p class="bridge-line">${words.map((word, i) => `<span class="bridge-word" style="--i:${i}">${escapeHTML(word)}</span>`).join(' ')}</p>`;
      const lineElement = stage.firstElementChild;
      const hold = Math.max(MIN_READ, words.length * READ_PER_WORD);
      const done = () => (index + 1 < beats.length ? play(index + 1) : advance());
      if (reducedMotion) return later(done, hold + 700);
      const settled = words.length * WORD_STAGGER + WORD_SETTLE;
      later(() => lineElement.classList.add('is-leaving'), settled + hold);
      later(done, settled + hold + FADE_OUT);
    };
    play(0);
  }


  function startSafeWord(returningTo) { state.safeWordReturn = returningTo; go('safeWordIntro'); }
  const setbackEntry = () => state.triedQuit === 'Yes' ? 'setbackTrigger' : 'supportPreference';

  function showBlockerReminder() {
    if (state.safeWord.trim().length < 10) {
      return showInsight({ title: 'Set your safe word before continuing.', message: 'Your safe word is not saved when this page reloads. Create it again to continue your plan.', takeaway: 'Your blocker is activated in the iOS app after checkout.', visual: 'shield', accent: 'mint', buttonTitle: 'Create my safe word' }, () => startSafeWord('commitmentPerformance'));
    }
    mount(`<div class="blocker-ready"><p class="eyebrow mint">YOUR BLOCKER SETUP</p><h1>Your safe word is set.</h1><p>Here is the safe word you created:</p><code class="safe-word-reminder">${escapeHTML(state.safeWord)}</code><p>Our advice: don't save it anywhere. If you can't easily find it, you can't undo your progress on impulse.</p><p class="form-copy">After checkout, activate your blocker in the RELUSTT app.</p>${primaryButton('Continue')}</div>`, { back: false, className: 'blocker-screen' });
    document.getElementById('continueButton').addEventListener('click', () => go('commitmentPerformance'));
  }

  function showSafeWordEntry() {
    mount(`<div class="form-screen centered-form"><p class="eyebrow mint">CREATE FRICTION</p><h1>Set your safe word.</h1>
      <p class="form-copy">Make it long, and don't make it something you'll remember without effort. The goal is friction against the version of you that wants to undo this at 1am.</p>
      <label class="field-label" for="safeWordInput">YOUR SAFE WORD</label><input class="text-field" id="safeWordInput" type="password" autocomplete="new-password" placeholder="A long phrase you won't guess" value="${escapeHTML(state.safeWord)}" />
      <p class="validation-message" id="safeWordValidation">○ &nbsp; Use at least 10 characters</p>${primaryButton('Activate my blocker', 'safeWordContinue', '◆', false)}</div>`, { back: false, className: 'form-page' });
    const input = document.getElementById('safeWordInput');
    const button = document.getElementById('safeWordContinue');
    const validation = document.getElementById('safeWordValidation');
    const update = () => {
      state.safeWord = input.value;
      const valid = state.safeWord.trim().length >= 10;
      button.disabled = !valid;
      validation.classList.toggle('is-valid', valid);
      validation.textContent = valid ? '✓  Long enough to create real friction' : '○  Use at least 10 characters';
    };
    input.addEventListener('input', update);
    button.addEventListener('click', () => { if (state.safeWord.trim().length >= 10) go('blockerLive'); });
    update();
    window.setTimeout(() => input.focus({ preventScroll: true }), 300);
  }

  function showBlockerReady() {
    mount(`<div class="blocker-ready"><div class="lock-animation" aria-hidden="true"><div class="lock-rays">${'<i></i>'.repeat(14)}</div><div class="lock-shackle"></div><div class="lock-body"><span></span></div></div>
      <h1>Your blocker is almost ready.</h1><p>Finish the quiz to complete your plan. Then we’ll guide you through activating your blocker in the app.</p>${primaryButton('Continue')}</div>`, { back: false, className: 'blocker-screen' });
    document.getElementById('continueButton').addEventListener('click', () => go(state.safeWordReturn));
  }

  const featureData = {
    featureProgress: { title: 'See your progress.', message: 'A personal timeline shows what changes, when, and what comes next.', visual: 'progress' },
    featureCommunity: { title: "You're not doing this alone.", message: 'Join people working through the same challenge, without judgment.', visual: 'community' },
    featureSupport: { title: 'Support when urges hit.', message: 'Your private AI coach helps you move through the urge instead of giving in.', visual: 'support' },
    featureLessons: { title: 'Understand the pattern.', message: 'Twenty research-backed lessons show you why it happens and how to break it for good.', visual: 'lessons' },
  };
  // Each support answer leads with one benefit. The blocker has its own screens.
  const supportFeatures = {
    'Seeing my progress in real time': 'featureProgress',
    'Talking to people who get it': 'featureCommunity',
    'Support 24/7, whenever an urge hits': 'featureSupport',
    'Understanding why this happens': 'featureLessons',
    'Blocking adult sites automatically': 'blocker',
  };
  const pickedFeature = () => supportFeatures[state.supportPreference];

  function featureVisual(type) {
    if (type === 'progress') return `<div class="journey-visual" role="img" aria-label="An illustrative progress line grows through small daily steps.">
      <span class="journey-eyebrow">ONE DAY AT A TIME</span>
      <strong>Small steps.<br><em>Real momentum.</em></strong>
      <svg viewBox="0 0 400 175" aria-hidden="true"><defs><linearGradient id="journeyColor" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#a16eff"/><stop offset="1" stop-color="#8cebcf"/></linearGradient></defs>
        <path class="journey-guide" d="M20 145H380 M20 95H380 M20 45H380"/>
        <path class="journey-line" pathLength="1" d="M20 145C50 145 56 120 86 124S120 94 155 102S199 58 228 70S275 41 306 43S351 16 380 18"/>
        <g class="journey-points"><circle cx="20" cy="145" r="5"/><circle cx="155" cy="102" r="5"/><circle cx="306" cy="43" r="5"/><circle class="journey-end" cx="380" cy="18" r="7"/></g>
      </svg><div class="journey-labels"><span>YOUR FIRST STEP</span><span>KEEP SHOWING UP</span></div>
    </div>`;
    if (type === 'community') return lottieVisual('two-friends', 'Two friends supporting each other');
    if (type === 'support') {
      const name = state.name.trim() || 'you';
      return `<div class="chat-visual" data-chat-showcase data-user-name="${escapeHTML(name)}" aria-label="Animated support conversation"></div>`;
    }
    return `<div class="course-visual" role="img" aria-label="Twenty lessons, shown as a collection of course cards."><span class="course-eyebrow">YOUR LEARNING PATH</span><div class="course-grid" aria-hidden="true">${Array.from({ length: 20 }, (_, index) => `<div class="course-tile" style="--lesson:${index}"><span>${String(index + 1).padStart(2, '0')}</span><i></i><i></i></div>`).join('')}</div><p>20 lessons. One step at a time.</p></div>`;
  }

  function startChatShowcase() {
    const container = app.querySelector('[data-chat-showcase]');
    if (!container || container.dataset.started) return;
    container.dataset.started = 'true';
    const rawName = container.dataset.userName === 'you' ? '' : container.dataset.userName.trim();
    const initial = rawName ? rawName.slice(0, 1).toUpperCase() : 'Y';
    const script = [
      { side: 'user', text: "An urge just hit. I don't want to give in." },
      { side: 'bot', text: "Let's slow it down. Take a breath and step away from your screen." },
      { side: 'user', text: 'Okay. What next?' },
      { side: 'bot', text: "Get some water or take a short walk. One small step. I'm here with you." },
    ];
    const row = ({ side, text }) => `<div class="chat-row ${side}">${side === 'bot' ? '<i class="coach-orb" aria-hidden="true"></i>' : ''}<span class="chat-bubble">${escapeHTML(text)}</span>${side === 'user' ? `<i class="user-avatar" aria-hidden="true">${escapeHTML(initial)}</i>` : ''}</div>`;
    const typingRow = (side) => `<div class="chat-row ${side} is-typing" aria-label="Typing">${side === 'bot' ? '<i class="coach-orb" aria-hidden="true"></i>' : ''}<span class="typing-dots" aria-hidden="true"><b></b><b></b><b></b></span></div>`;
    const later = (callback, delay) => activeTimers.push(window.setTimeout(() => {
      if (container.isConnected) callback();
    }, delay));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      container.innerHTML = script.map(row).join('');
      return;
    }
    // Append only the new message. Earlier bubbles keep their DOM and animation state.
    let timing = 350;
    script.forEach((message, index) => {
      if (index) {
        later(() => container.insertAdjacentHTML('beforeend', typingRow(message.side)), timing);
        timing += message.side === 'bot' ? 800 : 500;
      }
      later(() => {
        container.querySelector('.is-typing')?.remove();
        container.insertAdjacentHTML('beforeend', row(message));
      }, timing);
      timing += Math.max(1400, message.text.length * 28);
    });
  }


  // The one benefit the user asked for, shown on its own before the blocker.
  function showFeatureSpotlight() {
    const key = pickedFeature();
    const feature = featureData[key];
    if (!feature) { state.screen = 'blockerBridge'; writeRoute('replace'); persist(); return render(); }
    mount(`<div class="feature-screen feature-spotlight">
      <div class="feature-meta"><span>BUILT INTO YOUR PLAN</span></div>
      <div class="feature-viewport"><div class="feature-track"><article class="feature-slide is-active has-played" data-feature="${key}">
        <div class="feature-visual">${featureVisual(feature.visual)}</div><div class="feature-copy"><h1>${escapeHTML(feature.title)}</h1><p>${escapeHTML(feature.message)}</p></div>
      </article></div></div>
      ${primaryButton('Continue')}
    </div>`, { back: false, className: 'feature-page' });
    document.getElementById('continueButton').addEventListener('click', () => go('blockerBridge'));
    if (feature.visual === 'support') startChatShowcase();
  }

  // One line per step. They grow and shift red -> yellow -> green with the slider.
  const commitmentWords = ['Just curious.', 'Not sure yet.', 'Thinking about it.', 'Warming up.', 'Ready to try.', 'Getting serious.', 'Committed.', 'All in.', 'No going back.', 'Never again.'];
  const commitmentLabel = () => commitmentWords[Math.min(Math.max(state.commitment, 1), 10) - 1];
  function commitmentColor(progress) {
    const channels = (color) => color.match(/[0-9a-f]{2}/gi).map((part) => parseInt(part, 16));
    const [from, to, t] = progress < .5 ? ['#ff6a7e', '#ffcf5a', progress * 2] : ['#ffcf5a', '#4de6ad', (progress - .5) * 2];
    const mixed = channels(from).map((channel, i) => Math.round(channel + (channels(to)[i] - channel) * t));
    return `rgb(${mixed.join(', ')})`;
  }

  // Each tap on "Not yet" nudges it away and shrinks it, until it gives up.
  const notYetOffsets = ['0px,0px', '70px,-8px', '-70px,10px', '58px,16px', '-48px,20px'];
  function showCommitment() {
    mount(`<div class="commitment-screen"><p class="gradient-eyebrow">YOUR COMMITMENT</p><h1>How committed are you to quitting porn forever?</h1>
      <div class="commitment-meter" id="commitmentMeter">
        <div class="commitment-label" id="commitmentLabel">${escapeHTML(commitmentLabel())}</div>
        <div class="commitment-score"><strong id="commitmentNumber">${state.commitment}</strong><span>/ 10</span></div>
      </div>
      <div class="range-wrap"><input id="commitmentRange" type="range" min="1" max="10" step="1" value="${state.commitment}" aria-label="Commitment from 1 to 10" /><div><span>Just curious</span><span>Never again</span></div></div>
      <div class="commitment-actions">${primaryButton('Take the next step')}<div class="dodge-zone"><button class="not-yet-button" type="button">Not yet</button></div></div></div>`, { className: 'commitment-page' });
    const range = document.getElementById('commitmentRange');
    const meter = document.getElementById('commitmentMeter');
    const update = () => {
      const progress = (state.commitment - 1) / 9;
      const color = commitmentColor(progress);
      document.getElementById('commitmentNumber').textContent = state.commitment;
      document.getElementById('commitmentLabel').textContent = commitmentLabel();
      meter.style.setProperty('--commitment-progress', progress);
      meter.style.setProperty('--commitment-color', color);
      range.style.setProperty('--commitment-fill', `${progress * 100}%`);
      range.style.setProperty('--commitment-color', color);
      range.setAttribute('aria-valuetext', `${state.commitment} out of 10. ${commitmentLabel()}`);
    };
    range.addEventListener('input', () => { state.commitment = Number(range.value); update(); persist(); });
    update();
    document.getElementById('continueButton').addEventListener('click', () => go('name'));
    const notYet = app.querySelector('.not-yet-button');
    const dodge = () => {
      const [x, y] = notYetOffsets[Math.min(state.notYetAttempts, notYetOffsets.length - 1)].split(',');
      notYet.style.setProperty('--x', x); notYet.style.setProperty('--y', y);
      notYet.style.setProperty('--scale', Math.max(.44, 1 - state.notYetAttempts * .14));
      notYet.hidden = state.notYetAttempts >= 5;
    };
    notYet.addEventListener('click', () => { state.notYetAttempts += 1; persist(); dodge(); });
    dodge();
  }


  function showName() {
    mount(`<div class="form-screen name-screen"><h1>We haven't gotten your name yet, Warrior.</h1><p class="form-copy">What should we call you?</p>
      <input class="text-field name-field" id="nameInput" type="text" autocomplete="name" autocapitalize="words" aria-label="Your name" placeholder="Your name" maxlength="60" value="${escapeHTML(state.name)}" /><div class="form-spacer"></div>
      ${primaryButton(state.name.trim().length >= 2 ? "That's me" : 'Enter your name', 'nameContinue', '→', state.name.trim().length >= 2)}</div>`, { className: 'name-page' });
    const input = document.getElementById('nameInput');
    const button = document.getElementById('nameContinue');
    input.addEventListener('input', () => {
      state.name = input.value;
      const valid = state.name.trim().length >= 2;
      button.disabled = !valid;
      button.querySelector('span').textContent = valid ? "That's me" : 'Enter your name';
      persist();
    });
    const submit = () => { state.name = input.value.trim(); if (state.name.length >= 2) go('pledge'); };
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') submit(); });
    button.addEventListener('click', submit);
    window.setTimeout(() => input.focus({ preventScroll: true }), 300);
  }

  function showPledge() {
    const today = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()).toUpperCase();
    mount(`<div class="pledge-screen"><div class="pledge-heading"><p>MY 90-DAY VOW</p><h1>Your Vow</h1><span>• &nbsp; ${today} &nbsp; •</span></div>
      <div class="vow-copy"><p>I, <strong>${escapeHTML(state.name || 'Warrior')}</strong>, commit to taking back control starting today.</p><p>For the next <strong>90 days</strong>, I commit to breaking free from porn and reclaiming my <strong>mind, body, and energy</strong>. I will stay disciplined, consistent, and focused, no matter how intense the urges or how tough the challenges get.</p><p><b>RELUSTT</b> is my commitment to rebuild self-control, strengthen confidence, and live with clarity and purpose.</p><p>If I slip, <em>I will not quit</em>. I will rise again with <strong>greater resolve</strong>. These 90 days are the start of the life I have always wanted.</p></div>
      <div class="signature-heading"><span>✍</span> SIGN BELOW TO COMMIT</div><div class="signature-row"><button id="clearSignature" class="clear-signature" type="button" aria-label="Clear signature" disabled>↶</button><div class="signature-pad"><canvas id="signatureCanvas"></canvas><div class="signature-placeholder" id="signaturePlaceholder">✍<span>Sign here</span></div><i></i></div></div>
      <p class="hold-helper" id="holdHelper">Sign above to continue</p><button class="hold-button" id="holdButton" type="button" disabled><i></i><span>🔒 &nbsp; Sign above to continue</span></button></div>`, { top: false, className: 'pledge-page' });
    // Keep the wash outside the animated page so it covers the full viewport.
    app.insertAdjacentHTML('beforeend', `<div class="seal-wash" id="sealWash"><div class="seal-wash-fill" aria-hidden="true"></div><div class="seal-stamp" id="sealStamp" role="status" hidden>✓<span>SEALED</span></div></div>`);
    setupSignature();
  }

  function setupSignature() {
    const canvas = document.getElementById('signatureCanvas');
    const context = canvas.getContext('2d');
    const placeholder = document.getElementById('signaturePlaceholder');
    const clear = document.getElementById('clearSignature');
    const hold = document.getElementById('holdButton');
    const helper = document.getElementById('holdHelper');
    const wash = document.getElementById('sealWash');
    const stamp = document.getElementById('sealStamp');
    let drawing = false, distance = 0, previous = null, holdTimer = null;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = rect.width * scale; canvas.height = rect.height * scale;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.strokeStyle = '#a974ff'; context.lineWidth = 3; context.lineCap = 'round'; context.lineJoin = 'round';
    };
    resize();
    const point = (event) => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
    const updateReady = () => {
      const ready = distance > 28;
      placeholder.hidden = ready; clear.disabled = !ready; hold.disabled = !ready;
      helper.textContent = ready ? 'Press and hold to seal' : 'Sign above to continue';
      hold.querySelector('span').innerHTML = ready ? '✋ &nbsp; Hold to seal your vow' : '🔒 &nbsp; Sign above to continue';
      hold.classList.toggle('is-ready', ready);
    };
    canvas.addEventListener('pointerdown', (event) => { drawing = true; previous = point(event); canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener('pointermove', (event) => {
      if (!drawing) return;
      const current = point(event); context.beginPath(); context.moveTo(previous.x, previous.y); context.lineTo(current.x, current.y); context.stroke();
      distance += Math.hypot(current.x - previous.x, current.y - previous.y); previous = current; updateReady();
    });
    const stopDrawing = () => { drawing = false; previous = null; updateReady(); };
    canvas.addEventListener('pointerup', stopDrawing); canvas.addEventListener('pointercancel', stopDrawing);
    clear.addEventListener('click', () => { context.clearRect(0, 0, canvas.width, canvas.height); distance = 0; updateReady(); });
    const cancelHold = () => {
      if (!hold.classList.contains('is-holding') || hold.classList.contains('is-complete')) return;
      clearTimeout(holdTimer); hold.classList.remove('is-holding'); wash.classList.remove('is-holding'); helper.textContent = 'Press and hold to seal'; hold.querySelector('span').innerHTML = '✋ &nbsp; Hold to seal your vow';
    };
    const startHold = () => {
      if (hold.disabled || hold.classList.contains('is-holding')) return;
      hold.classList.add('is-holding'); wash.classList.add('is-holding'); helper.textContent = 'Keep holding…'; hold.querySelector('span').innerHTML = '🔓 &nbsp; Sealing your vow…';
      holdTimer = window.setTimeout(() => {
        if (!hold.isConnected) return;
        hold.classList.add('is-complete');
        wash.classList.add('is-complete');
        stamp.hidden = false;
        stamp.classList.add('is-visible');
        helper.textContent = 'Your vow is sealed';
        activeTimers.push(window.setTimeout(() => go('planAnalysis'), 1400));
      }, 2000);
      activeTimers.push(holdTimer);
    };
    hold.addEventListener('blur', cancelHold);
    hold.addEventListener('contextmenu', (event) => event.preventDefault());
    hold.addEventListener('pointerdown', (event) => { if (event.button === 0) startHold(); }); hold.addEventListener('pointerup', cancelHold); hold.addEventListener('pointercancel', cancelHold); hold.addEventListener('pointerleave', cancelHold);
    hold.addEventListener('keydown', (event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); startHold(); } });
    hold.addEventListener('keyup', (event) => { if (event.key === ' ' || event.key === 'Enter') cancelHold(); });
    updateReady();
  }

  function showPlanAnalysis() {
    const goal = state.pathway === 'performance' ? state.performanceGoal || state.changePriority : state.changePriority || state.identityGoal;
    const detail = state.urgeContext || (state.pathway === 'performance' ? '' : state.reclaimedTime);
    const messages = [
      goal ? `Your goal: ${String(goal).slice(0, 100)}.` : 'Bringing your answers into focus.',
      detail && !['Not sure', 'It varies'].includes(detail)
        ? `${state.urgeContext ? 'Planning for' : state.pathway === 'performance' ? 'Your focus' : 'Making time for'}: ${String(detail).slice(0, 100)}.`
        : state.triedQuit === 'Yes' ? 'Building on what you have already tried.' : 'Finding a clear place to start.',
      'Bringing your personal system together.',
    ];
    const cardTitles = [
      'A 90-day plan built for you.',
      'Block adult sites automatically.',
      'See your progress, day by day.',
      '20 lessons to understand your habits.',
      'A private community in your corner.',
      'Guided support when urges hit.',
      'Block the sites that trigger you.',
    ];
    const cardSymbols = [
      '<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="10"/><path d="m20 28 4-12 4 12-4-3Z"/>',
      '<path d="M24 5 40 11v12c0 10-16 20-16 20S8 33 8 23V11Z"/><rect x="18" y="21" width="12" height="11" rx="2"/><path d="M20 21v-4a4 4 0 0 1 8 0v4"/>',
      '<path d="m7 35 10-10 8 4 16-19M31 10h10v10"/><path d="M7 42h34"/>',
      '<path d="M24 12c-5-5-13-6-19-3v28c7-3 14-2 19 3 5-5 12-6 19-3V9c-6-3-14-2-19 3Zm0 0v28M11 17l7 2m-7 6 7 2m12-8 7-2m-7 10 7-2"/>',
      '<circle cx="24" cy="15" r="6"/><path d="M12 39v-6a12 12 0 0 1 24 0v6M10 12a5 5 0 0 0 0 10m28-10a5 5 0 0 1 0 10M3 36v-5a8 8 0 0 1 6-8m36 13v-5a8 8 0 0 0-6-8"/>',
      '<path d="M10 8h28a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H20L9 43v-7a5 5 0 0 1-4-5V13a5 5 0 0 1 5-5Z"/><path d="M15 19h18m-18 7h11"/>',
      '<rect x="5" y="8" width="38" height="32" rx="5"/><path d="M5 17h38m-29-5h1m5 0h1M24 23v12m-6-6h12"/>',
    ];
    mount(`<div class="analysis-screen">
      <div class="analysis-scan" aria-hidden="true">
        <div class="scan-halo"></div>
        <div class="plan-assembly" data-stage="0">
          ${cardTitles.map((title, index) => `<div class="assembly-sheet" data-card="${index}" data-slot="${index}" style="--slot:${index};--card-hue:${[270,260,282,254,266,280,268][index]}"><div class="card-engraving"><svg viewBox="0 0 48 48">${cardSymbols[index]}</svg></div><strong class="assembly-title${title.length > 45 ? ' is-long' : ''}">${escapeHTML(title)}</strong><div class="card-pips">${cardTitles.map((_, pip) => `<i class="${pip <= index ? 'is-lit' : ''}"></i>`).join('')}</div></div>`).join('')}
        </div>
      </div>
      <p class="eyebrow">BUILT AROUND YOU</p><h1>Analyzing your answers</h1>
      <div class="analysis-typing" aria-hidden="true"><span id="analysisMessage"></span><i class="analysis-caret"></i></div>
      <div class="analysis-status" id="analysisStatus" role="status" aria-live="polite"></div>
      <div class="analysis-timeline" aria-hidden="true">
        <div class="analysis-phases">${['Your answers', 'Your focus', 'Your plan'].map((label, index) => `<span class="analysis-phase" style="--milestone:${index}"><i>${index + 1}</i><b>${label}</b></span>`).join('')}</div>
        <div class="analysis-track"><i></i><span></span><span></span></div>
      </div>
    </div>`, { back: false, className: 'analysis-page' });
    const output = document.getElementById('analysisMessage');
    const status = document.getElementById('analysisStatus');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const later = (callback, delay) => activeTimers.push(window.setTimeout(() => {
      if (state.screen === 'planAnalysis' && output.isConnected) callback();
    }, delay));
    const finish = () => {
      // Replace the loading route so browser Back does not replay it in a loop.
      state.screen = 'price';
      writeRoute('replace', window.history.state?.relustt?.canGoBack === true);
      persist();
      render();
    };
    const deck = Array.from(app.querySelectorAll('.assembly-sheet'));
    const cycleDeck = () => {
      const outgoing = deck[0];
      const from = new Map(deck.map(card => [card, getComputedStyle(card).transform]));
      deck.push(deck.shift());
      deck.forEach((card, slot) => { card.dataset.slot = String(slot); card.style.setProperty('--slot', slot); });
      if (reducedMotion) return;
      deck.forEach(card => {
        const destination = getComputedStyle(card).transform;
        if (card === outgoing) {
          // Lift the entire front card clear of the deck before sliding it behind.
          card.animate([
            { transform: from.get(card), zIndex: 8, offset: 0 },
            { transform: 'translate(-78%, -22px) rotate(-14deg)', zIndex: 8, offset: .44 },
            { transform: 'translate(-78%, -22px) rotate(-14deg)', zIndex: 0, offset: .45 },
            { transform: destination, zIndex: 0, offset: 1 },
          ], { duration: 680, easing: 'cubic-bezier(.4,0,.2,1)' });
        } else {
          card.animate([{ transform: from.get(card) }, { transform: destination }], {
            duration: 580, easing: 'cubic-bezier(.22,.7,.25,1)',
          });
        }
      });
    };
    const showMessage = (index) => {
      const message = messages[index];
      status.textContent = message;
      app.querySelector('.plan-assembly').dataset.stage = String(index);
      app.querySelectorAll('.analysis-phase').forEach((phase, i) => {
        phase.classList.toggle('is-current', i === index);
        phase.classList.toggle('is-complete', i < index);
        phase.querySelector('i').textContent = i < index ? '✓' : String(i + 1);
      });
      const phaseDuration = 15700 / 3;
      const typeInterval = Math.min(42, 1600 / message.length);
      const typingDuration = message.length * typeInterval;
      const readingDuration = phaseDuration - typingDuration - (index === messages.length - 1 ? 0 : message.length * 14 + 300);
      let length = 0;
      const erase = () => {
        if (length > 0) { output.textContent = message.slice(0, --length); later(erase, 14); }

      };
      const type = () => {
        output.textContent = message.slice(0, ++length);
        if (length < message.length) later(type, typeInterval);
        else if (index < messages.length - 1) later(erase, readingDuration);
      };
      if (reducedMotion) { output.textContent = message; }
      else type();
    };
    later(() => showMessage(1), 15700 / 3);
    later(() => showMessage(2), 15700 * 2 / 3);
    for (let turn = 1; turn <= 6; turn++) later(cycleDeck, turn * 15700 / 7);
    later(() => {
      const phase = app.querySelector('.analysis-phase:last-child');
      phase.classList.remove('is-current');
      phase.classList.add('is-complete');
      phase.querySelector('i').textContent = '✓';
    }, 15700);
    later(finish, 16000);
    showMessage(0);
  }

  const priceDisplay = (price = state.selectedPrice) => `$${Number(price).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  function showPrice() {
    const tiers = priceTiers;
    mount(`<div class="price-screen"><p class="eyebrow">YOUR PERSONAL PLAN IS READY</p><h1>Choose your trial price.</h1>
      <div class="price-message"><h2>BUILT AROUND YOU</h2><p>A personal system to help you take back control, with support at every step.</p></div>
      <div class="price-message"><h2>ACCESSIBLE AT EVERY PRICE</h2><p>Choose the amount that feels right for you. Every option includes the full RELUSTT plan.</p></div>
      <div class="price-grid">${tiers.map((tier) => `<button class="price-choice ${state.selectedPrice === tier ? 'is-selected' : ''}" type="button" data-price="${tier}" aria-pressed="${state.selectedPrice === tier}"><strong>${priceDisplay(tier)}</strong></button>`).join('')}</div>
      <div class="price-support"><span id="priceSupport">Choosing a higher price helps us keep the $5 option affordable for people who need it.</span></div><div class="price-spacer"></div>
      ${primaryButton('Get My Plan', 'priceContinue', '')}</div>`, { back: false, className: 'price-page' });
    app.querySelectorAll('[data-price]').forEach((button) => button.addEventListener('click', () => {
      state.selectedPrice = button.dataset.price; persist();
      app.querySelectorAll('[data-price]').forEach((item) => {
        item.classList.toggle('is-selected', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
    }));
    document.getElementById('priceContinue').addEventListener('click', () => go('paywall'));
  }

  function offerPersonalization() {
    const archetype = window.RelusttArchetypes.resolve(state);
    const performance = state.pathway === 'performance';
    const goal = (performance ? state.performanceGoal || state.changePriority : state.changePriority || state.identityGoal) || '';
    const performanceIntro = performance ? {
      'Feel confident during intimacy': 'Rebuild your confidence in intimacy',
      'Feel closer to my partner': 'Build a closer connection with your partner',
      'Stop falling back into the same habit': 'Break the pattern you keep returning to',
      'Get my focus and energy back': 'Get your focus and energy back',
      'Performing with confidence': 'Rebuild your confidence in intimacy',
      'Feeling normal again': 'Feel like yourself again',
      'Confidently satisfying my partner and feeling proud of it': 'Build a closer connection with your partner',
    }[state.performanceGoal] : '';
    const introFocus = performanceIntro || ({
      'Control over the habit': 'Build a routine that puts you in control',
      'More time and focus': 'Get your time and focus back',
      'Feeling better about myself': 'Rebuild your trust in yourself',
      'Closer relationships': 'Make room for closer relationships',
      'Confidence in intimacy': 'Rebuild your confidence in intimacy',
    }[state.changePriority]) || (performance ? '' : {
      'Build my body': 'Reclaim energy for the body you want',
      'Create a business': 'Reclaim time for your business',
      'Spend time with people who matter': 'Be present with the people who matter',
      'Create meaningful relationships': 'Make room for meaningful relationships',
    }[state.reclaimedTime] || {
      'More disciplined': 'Build discipline you can count on',
      'More confident': 'Rebuild your trust in yourself',
      'More present with people': 'Be more present with the people around you',
      'More productive': 'Get your focus and energy back',
    }[goal]) || (archetype.hasEvidence ? {
      reconnect: 'Make room for real connection',
      confidence: 'Rebuild your confidence',
      cycle: 'Break the pattern you keep returning to',
      quiet: 'Take back control at your own pace',
      focus: 'Get your time and energy back',
      starter: 'Turn your first step into lasting change',
    }[archetype.key] : 'Take your next step');
    const reclaimed = {
      'Build my body': 'taking care of your body',
      'Create a business': 'building your business',
      'Spend time with people who matter': 'the people who matter',
      'Create meaningful relationships': 'meaningful relationships',
    }[state.reclaimedTime];
    let observation = archetype.hasEvidence
      ? `Your answers point to ${archetype.clues[0].toLowerCase()}.`
      : '';
    if (state.triedQuit === 'Yes' && state.quitProgress === 'On and off') observation = 'You told us your progress has been on and off.';
    if (state.triedQuit === 'Yes' && state.quitProgress === 'Not great, I keep relapsing') observation = 'You told us you keep returning to the habit, even after trying to quit.';
    if (!performance && reclaimed && archetype.key === 'focus') observation = `You want your time and energy back for ${reclaimed}.`;
    if (state.triedQuit === 'Yes' && state.quitProgress === "Good, I've made real progress") observation = 'You have already made real progress, and you want to protect it.';
    const motivationObservation = {
      'Sexual pleasure': 'You told us pleasure is the main reason you watch.',
      'Relieving stress': 'You told us you turn to porn to relieve stress.',
      'Escaping difficult feelings': 'You told us you use porn to get away from difficult feelings.',
      'Filling time when bored': 'You told us watching often fills time when you are bored.',
      'It feels automatic': 'You told us watching can feel automatic.',
    }[state.motivation];
    if (motivationObservation) observation = motivationObservation;
    return {
      archetype, goal,
      headline: archetype.headline,
      intro: `${introFocus}, with support beyond willpower.`,
      observation,
      challenge: archetype.challenge,
      challengeCopy: archetype.support,
    };
  }

  function startOfferTimer() {
    const countdown = document.getElementById('offerCountdown');
    const bar = document.getElementById('offerTimerLine');
    const update = () => {
      if (state.screen !== 'paywall' || !countdown.isConnected) return;
      const remaining = Math.max(0, Math.min(420, Math.ceil((state.offerStartedAt + 420000 - Date.now()) / 1000)));
      countdown.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
      bar.style.setProperty('--timer-color', `hsl(${Math.round(remaining / 420 * 145)} 70% 62%)`);
      bar.style.setProperty('--timer-remaining', String(remaining / 420));
      // A presentation timer only: it stays at zero and never changes the agreed price.
      if (remaining > 0) activeTimers.push(window.setTimeout(update, 1000));
    };
    update();
  }

  function revealOffer(copy) {
    const page = app.querySelector('.paywall-page');
    const heading = document.getElementById('offerHeroTitle');
    const typed = heading.querySelector('.offer-heading-typed');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = [page.querySelector('.offer-timer'), ...page.querySelector('.paywall-screen').children]
      .flatMap(item => item.classList.contains('offer-hero') ? Array.from(item.children).filter(child => child !== heading) : [item]);
    items.forEach((item, index) => {
      item.classList.add('offer-reveal-item');
      item.style.setProperty('--reveal-delay', `${Math.min(index * 70, 420)}ms`);
      item.inert = true;
    });
    const box = heading.getBoundingClientRect();
    heading.style.transform = `translateY(${Math.max(0, window.innerHeight / 2 - box.top - box.height / 2)}px)`;
    const later = (callback, delay) => activeTimers.push(window.setTimeout(() => {
      if (state.screen === 'paywall' && page.isConnected) callback();
    }, delay));
    const reveal = () => {
      const from = getComputedStyle(heading).transform;
      heading.textContent = copy;
      heading.style.transform = 'translateY(0)';
      if (!reducedMotion) heading.animate([{ transform: from }, { transform: 'translateY(0)' }], {
        duration: 800, easing: 'cubic-bezier(.22,.8,.25,1)',
      });
      page.classList.remove('offer-intro');
      page.classList.add('offer-revealed');
      items.forEach(item => { item.inert = false; });
      if (!Number.isFinite(state.offerStartedAt) || state.offerStartedAt <= 0) {
        state.offerStartedAt = Date.now(); persist();
      }
      startOfferTimer();
    };
    if (reducedMotion) {
      typed.textContent = copy;
      later(reveal, 500);
      return;
    }
    const letters = Array.from(copy);
    const interval = Math.min(42, 2400 / Math.max(letters.length, 1));
    let length = 0;
    const type = () => {
      typed.textContent = letters.slice(0, ++length).join('');
      if (length < letters.length) later(type, interval);
      else later(reveal, 350);
    };
    later(type, 180);
  }

  function showPaywall() {
    const plan = offerPersonalization();
    const price = priceDisplay();
    const faqs = [
      ['Is this plan personalized to me?', 'Your quiz answers shape the focus, challenges, and suggested steps shown here. Everyone gets the full RELUSTT toolkit; your goals guide how you use it.'],
      ['How soon will I notice a difference?', 'You can begin changing your routine in the first week. The 90-day roadmap gives you a structure to follow, not a deadline for recovery. Progress and results vary from person to person.'],
      ['What happens after I join?', 'Complete your purchase, activate your account, and download RELUSTT on your iPhone. Finish blocker setup in the app, then start your lessons, check-ins, and support.'],
      ['What if I slip up?', 'Return to your next check-in, notice what led to the slip, and adjust your response. Your plan is something to return to, not a test you fail.'],
    ];
    mount(`<div class="offer-timer" aria-live="off"><div id="offerTimerLine" class="offer-timer-line" aria-hidden="true"></div><span aria-hidden="true">⌛</span><span>Your discount expires in</span><strong id="offerCountdown" role="timer">07:00</strong></div>
      <div class="paywall-screen">
        <header class="offer-brand">RELUSTT</header>
        <section class="offer-hero" aria-labelledby="offerHeroTitle"><p class="offer-eyebrow">YOUR PERSONAL PLAN IS READY</p><h1 id="offerHeroTitle" aria-label="${escapeHTML(plan.headline)}"><span class="offer-heading-space" aria-hidden="true">${escapeHTML(plan.headline)}</span><span class="offer-heading-typed" aria-hidden="true"></span></h1><p class="offer-lead">${escapeHTML(plan.intro)}</p></section>
        <section class="archetype-result" data-archetype="${plan.archetype.key}" aria-labelledby="archetypeTitle"><div class="archetype-art"><div class="archetype-aura" aria-hidden="true"></div>${window.RelusttArchetypes.emblem(plan.archetype.motif)}<span class="archetype-spark spark-one" aria-hidden="true">✦</span><span class="archetype-spark spark-two" aria-hidden="true">✧</span></div><p class="offer-eyebrow">${plan.archetype.hasEvidence ? 'YOUR QUIZ ARCHETYPE' : 'YOUR STARTING POINT'}</p><h2 id="archetypeTitle">${escapeHTML(plan.archetype.name)}</h2><p class="archetype-description">${escapeHTML(plan.archetype.description)}</p>${plan.archetype.hasEvidence ? `<div class="archetype-clues" aria-label="Answers behind your archetype">${plan.archetype.clues.map(clue => `<span>${escapeHTML(clue)}</span>`).join('')}</div>` : ''}<p class="archetype-focus">${escapeHTML(plan.archetype.focus)}</p>${state.name ? `<p class="archetype-for">Made for <span>${escapeHTML(state.name)}</span></p>` : ''}</section>
        <section class="offer-purchase" id="planOffer" aria-labelledby="planOfferTitle"><p class="offer-eyebrow">YOUR TICKET TO FREEDOM</p><h2 id="planOfferTitle" tabindex="-1">Your personal<br>90-day plan is ready.</h2><p class="offer-lead">Everything you need to begin, in one place.</p>
          <div class="plan-price-card"><div class="plan-price-banner">YOUR PERSONAL OFFER</div><div class="plan-price-body"><div class="plan-price-row"><span>Personal 90 Days Plan</span><strong class="intro-price">${price}</strong></div><div class="plan-price-row total"><strong>Total today</strong><strong>${price}</strong></div><div class="plan-price-row bonus"><span>Guided course included</span><div><s>$29.50</s><strong>$0.00</strong></div></div></div></div>
          <p class="payment-security"><span aria-hidden="true">🔒</span> Encrypted, secure payment</p><p class="offer-start">Start your RELUSTT journey for just ${price}</p>
          <p class="subscription-copy">Your Relustt plan includes a personal three-month roadmap, adult-site blocking, progress tracking, a private community, and guided support. After your one-week paid trial, your plan automatically renews monthly at the crossed-out price shown above until canceled. You can cancel anytime by emailing <a href="mailto:example@gmail.com">example@gmail.com</a>. Your payment will appear as “RELUSTT.” More information: <button type="button" data-policy="subscription">Subscription Terms</button> and <button type="button" data-policy="refund">Money-Back Policy</button>.</p>
          ${primaryButton('Reveal my 90-day plan', 'checkoutFromFunnel', '→')}<div class="checkout-error" id="checkoutError" role="alert"></div>
        </section>
        <section class="plan-preview" aria-labelledby="previewTitle"><p class="offer-eyebrow">THE PATTERN BEHIND YOUR ANSWERS</p><h2 id="previewTitle">What happens if<br>the pattern stays the same?</h2><p>${escapeHTML(plan.observation)} ${escapeHTML(plan.archetype.preview)} ${escapeHTML(plan.archetype.hinge)}</p><div class="preview-locked"><div class="preview-blur" aria-hidden="true" inert><p>${escapeHTML(plan.archetype.continuation)}</p><p>Use your protection to give that new response room. Return to support when the familiar pull appears. Carry what helps into the next day.</p><p>Notice when the usual response feels automatic. Choose a simple alternative you can reach for in that moment. Practice it before you need it most.</p><p>Give the time you reclaim a purpose. Make room for the people and goals you chose. Bring your attention back when the familiar pull appears.</p><p>Review what helped on the easier days. Notice the routines and support that made a difference. Keep those details close as you shape your next step.</p><p>When a day goes differently than planned, return to one useful action. Adjust what needs changing. Keep building a routine that supports the life you want.</p></div><div class="preview-lock-label"><span aria-hidden="true">🔒</span><span>Your next move is inside your plan.</span></div></div></section>
        <section class="offer-stories" aria-labelledby="storiesTitle"><p class="offer-eyebrow">READ THEIR STORIES</p><h2 id="storiesTitle">They wanted a change, too.</h2><div class="testimonial-grid"><blockquote><span aria-label="5 out of 5 stars">★★★★★</span><h3>“I stopped dreading intimacy.”</h3><p>“The confidence came back slowly, then all at once.”</p><cite>— Marcus <span>· 47 days</span><span class="review-context">A familiar experience</span></cite></blockquote><blockquote><span aria-label="5 out of 5 stars">★★★★★</span><h3>“Enough time to make a better decision.”</h3><p>“The blocker bought me enough time to make a better decision. The lessons made that decision easier.”</p><cite>— Daniel <span>· 91 days</span></cite></blockquote><blockquote><span aria-label="5 out of 5 stars">★★★★★</span><h3>“I finally feel awake.”</h3><p>“38 days into Relustt I finally feel awake. I didn't realize how asleep I was.”</p><cite>— Tyler R. <span>· 38 days</span></cite></blockquote></div><button class="primary-button" type="button" data-offer-scroll><span>Find my next step</span><span aria-hidden="true">↑</span></button></section>
        <section class="offer-faq" aria-labelledby="faqTitle"><p class="offer-eyebrow">QUESTIONS, ANSWERED</p><h2 id="faqTitle">Before you begin.</h2>${faqs.map(([question,answer]) => `<details><summary>${escapeHTML(question)}<span aria-hidden="true">+</span></summary><p>${escapeHTML(answer)}</p></details>`).join('')}</section>
        <section class="offer-final"><p class="offer-eyebrow">THIS CAN BE YOUR TURNING POINT</p><h2>Quit porn for good.<br>Start with your plan.</h2><p>Unlock your personal system, blocking, and support. Put your energy into the life you want.</p><button class="primary-button" type="button" data-offer-scroll><span>Unlock my plan · ${price}</span><span aria-hidden="true">↑</span></button></section>
        <footer class="paywall-links"><a href="privacy.html">Privacy</a><button type="button" data-policy="subscription">Subscription terms</button><button id="startOver" type="button">Start over</button></footer>
        <dialog id="offerPolicy" class="offer-policy" aria-labelledby="offerPolicyTitle"><button id="closeOfferPolicy" class="policy-close" type="button" aria-label="Close">×</button><h2 id="offerPolicyTitle"></h2><p id="offerPolicyText"></p></dialog>
      </div>`, { top: false, className: 'paywall-page offer-intro' });
    revealOffer(plan.headline);
    app.querySelectorAll('[data-offer-scroll]').forEach((button) => button.addEventListener('click', () => {
      document.getElementById('planOffer').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      document.getElementById('planOfferTitle').focus({ preventScroll: true });
    }));
    const policy = document.getElementById('offerPolicy');
    app.querySelectorAll('[data-policy]').forEach((button) => button.addEventListener('click', () => {
      const subscription = button.dataset.policy === 'subscription';
      document.getElementById('offerPolicyTitle').textContent = subscription ? 'Your subscription' : 'Money-back policy';
      document.getElementById('offerPolicyText').textContent = subscription
        ? `Pay ${price} today for seven days of full access. Your subscription then renews at $29.50 per month until canceled. To avoid the next charge, cancel before your renewal by emailing example@gmail.com. Your 90-day plan describes the program; it is not a prepaid 90-day subscription.`
        : 'A money-back guarantee has not been specified for this offer. Contact example@gmail.com with any refund questions before purchasing.';
      policy.showModal();
    }));
    document.getElementById('closeOfferPolicy').addEventListener('click', () => policy.close());
    document.getElementById('startOver').addEventListener('click', resetFunnel);
    document.getElementById('checkoutFromFunnel').addEventListener('click', startCheckout);
  }

  async function startCheckout() {
    const button = document.getElementById('checkoutFromFunnel');
    const error = document.getElementById('checkoutError');
    button.disabled = true; button.querySelector('span').textContent = 'Opening secure checkout…'; error.textContent = '';
    try {
      const plan = `tier_${state.selectedPrice.replace('.', '')}`;
      const response = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, pathway: state.pathway }) });
      const payload = await response.json().catch(() => ({}));
      if (!button.isConnected || state.screen !== 'paywall') return;
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be started.');
      window.location.assign(payload.url);
    } catch (checkoutError) {
      if (!button.isConnected || state.screen !== 'paywall') return;
      error.textContent = checkoutError.message || 'Checkout could not be started.';
      button.disabled = false; button.querySelector('span').textContent = 'Reveal my 90-day plan';
    }
  }


  function render() {
    switch (state.screen) {
      case 'welcome': return showWelcome();
      case 'frequency': return showQuestion({ title: 'How often do you currently watch porn?', options: ['Daily', 'A few times a week', 'A few times a month', 'Already trying to cut back'], selected: state.frequency }, (a) => { state.frequency = a; go('motivation'); });
      case 'motivation': return showQuestion({ title: 'What do you usually turn to porn for?', helper: 'Think about the past month. Choose the main reason.', options: ['Sexual pleasure', 'Relieving stress', 'Escaping difficult feelings', 'Filling time when bored', 'It feels automatic', 'Something else or not sure'], selected: state.motivation }, (a) => { state.motivation = a; go('triedQuit'); });
      case 'urgeContext': return showQuestion({ title: 'When is it hardest to resist?', helper: 'Choose the situation that fits you most often.', options: ['Alone at night', 'While scrolling on my phone', 'When putting off a task', 'After a difficult day', 'It varies', 'Not sure'], selected: state.urgeContext }, (a) => { state.urgeContext = a; go('obstacle'); });
      case 'watchControl': return showQuestion({ title: 'How often do you watch longer than you intended?', helper: 'Think about the past month.', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often', "I haven't watched in the past month"], selected: state.watchControl }, (a) => { state.watchControl = a; go('changePriority'); });
      case 'changePriority': return showQuestion({ title: 'What would you most like to change?', helper: 'Choose your main priority. Your plan can support more than one goal.', options: ['Control over the habit', 'More time and focus', 'Feeling better about myself', 'Closer relationships', 'Confidence in intimacy'], selected: state.changePriority }, (a) => { state.changePriority = a; go('fork'); });
      case 'fork': return showQuestion({ title: 'Have you struggled to get or keep an erection with a partner?', options: ['Yes', 'No', "I haven't been intimate with a partner yet"], selected: state.forkAnswer, helper: 'Answer honestly.' }, (a) => { state.forkAnswer = a; state.performanceExperience = ''; state.intimacyConcern = ''; if (a === 'Yes') { state.pathway = 'performance'; go('bCauseInfo'); } else if (a === 'No') { state.pathway = 'identity'; go(setbackEntry()); } else go('forkConcern'); });
      case 'forkConcern': return showQuestion({ title: "Are you worried this might happen when you're with a partner?", options: ['Yes', 'No'], selected: state.intimacyConcern }, (a) => { state.intimacyConcern = a; state.pathway = 'identity'; go(a === 'Yes' ? 'forkConcernInfo' : setbackEntry()); });
      // Worry without experience gets reassurance, then the regular path. It is not a performance case.
      case 'forkConcernInfo': return showInsight({ eyebrow: 'A COMMON WORRY', title: "That worry is more common than you think.", message: "A lot of guys put off dating or avoid intimacy because they're afraid of how it might go. That fear usually comes from the gap between what porn has trained your brain to expect and what a real moment feels like. As you step away from porn, that gap closes and the confidence comes back.", takeaway: 'The fear is learned. It can be unlearned.', visual: 'unlock', accent: 'cyan', buttonTitle: 'Got it' }, () => go(setbackEntry()));
      case 'bCauseInfo': return showInsight({ title: 'Porn can train your brain to prefer screens.', message: 'Porn can shape what you associate with arousal, which may contribute to anxiety during real-life intimacy.', takeaway: 'What your brain learned, it can relearn.', visual: 'brain', accent: 'violet', buttonTitle: 'That makes sense' }, () => go('bIntensity'));
      case 'bIntensity': return showQuestion({ title: 'Do you need more extreme content to get the same effect?', options: ['Yes', 'A little', 'No'], selected: state.contentIntensity }, (a) => { state.contentIntensity = a; go('bGapInfo'); });
      case 'bGapInfo': return showInsight({ title: 'Your arousal threshold rises.', message: "A gap between porn and real intimacy may contribute to anxiety with a partner. We'll help you work on it.", visual: 'threshold', accent: 'cyan', buttonTitle: 'I understand' }, () => go(setbackEntry()));
      case 'triedQuit': return showQuestion({ title: 'Have you tried to quit or cut back before?', options: ['Yes', 'No'], selected: state.triedQuit, binary: true }, (a) => {
        state.triedQuit = a;
        if (a === 'No') { state.quitProgress = ''; state.setbackTrigger = ''; }
        go(a === 'Yes' ? 'quitProgress' : 'quitFeedback');
      });
      case 'quitProgress': {
        if (state.triedQuit !== 'Yes') { state.screen = 'quitFeedback'; writeRoute('replace'); persist(); return render(); }
        return showQuestion({ title: "How's that been going?", options: ["Good, I've made real progress", 'Not great, I keep relapsing', 'On and off'], selected: state.quitProgress, helper: 'Be honest with yourself.' }, (a) => { state.quitProgress = a; go('quitFeedback'); });
      }
      case 'setbackTrigger': {
        if (state.triedQuit !== 'Yes') { state.screen = 'supportPreference'; writeRoute('replace'); persist(); return render(); }
        return showQuestion({ title: 'What usually brings you back after trying to stop?', helper: 'Choose the biggest obstacle, if you have run into one.', options: ['Stress or difficult feelings', 'Easy access in the moment', 'Not knowing what to do instead', "I haven't returned to it"], selected: state.setbackTrigger }, (a) => { state.setbackTrigger = a; go('supportPreference'); });
      }
      case 'supportPreference': return showQuestion({ title: 'What kind of support would help you most?', options: Object.keys(supportFeatures), selected: state.supportPreference }, (a) => {
        state.supportPreference = a;
        state.safeWordReturn = state.pathway === 'performance' ? 'commitmentPerformance' : 'commitmentIdentity';
        go('supportBridge');
      });
      case 'supportBridge': return showTypedBridge({ lines: ['Good news.'], next: pickedFeature() === 'blocker' ? 'safeWordIntro' : 'featureSpotlight' });
      case 'featureSpotlight': return showFeatureSpotlight();
      // Only people who did not ask for the blocker get it introduced as the extra.
      case 'blockerBridge': return showTypedBridge({ lines: ['One more big thing.'], next: 'safeWordIntro' });
      case 'quitFeedback': {
        const reflection = state.triedQuit === 'No'
          ? { title: 'This is where you start.', message: "Never having tried isn't a disadvantage. It just means you haven't had the right structure yet.", takeaway: 'Build the structure before you need it.', visual: 'plant', accent: 'mint', buttonTitle: 'Build my system' }
          : {
            "Good, I've made real progress": { title: "You've built real momentum.", message: "That's more than most people manage on their own. Now you protect it.", takeaway: 'RELUSTT turns progress into consistency.', visual: 'trophy', accent: 'mint', buttonTitle: 'Protect my progress' },
            'On and off': { title: 'On and off means it already works.', message: 'The effort was never missing. Nothing held the line when your motivation dipped.', takeaway: 'RELUSTT holds the line for you.', visual: 'plant', accent: 'violet', buttonTitle: 'Build my system' },
            'Not great, I keep relapsing': { title: 'This is what willpower alone looks like.', message: 'Nothing stood between you and one tap. That is a structure problem, not a you problem.', takeaway: 'RELUSTT is that structure.', visual: 'plant', accent: 'violet', buttonTitle: 'Build my system' },
          }[state.quitProgress] || { title: "Your willpower isn't the problem.", message: 'Breaking this habit is hard with willpower alone. You need a system for when urges hit.', takeaway: 'RELUSTT is that system.', visual: 'plant', accent: 'violet', buttonTitle: 'Build my system' };
        return showInsight({ eyebrow: 'WHAT WE HEARD', ...reflection }, () => go('urgeContext'));
      }
      case 'obstacle': return showQuestion({ eyebrow: "WHAT'S IN THE WAY", title: "What's stopping you from quitting right now?", options: ["The habit's stronger than my willpower", "I don't know where to start", "I've tried and failed before", "Honestly, I haven't tried"], selected: state.obstacle }, (a) => {
        state.obstacle = a;
        go('obstacleInfo');
      });
      case 'obstacleInfo': return obstacleInsight();
      case 'obstacleBridge': return showTypedBridge({ lines: ["We're almost there.", 'A few more answers so we can build the right system for you.'], next: 'watchControl' });
      case 'safeWordIntro': return showInsight({ title: 'RELUSTT blocks adult sites automatically.', message: 'Adult sites stay out of reach, even when urges hit. Add any other site you want to block.', takeaway: 'Blocking can only be turned off with the safe word you create.', visual: 'blocker', accent: 'mint', buttonTitle: 'Create my safe word' }, () => go('safeWordEntry'));
      case 'safeWordEntry': return showSafeWordEntry();
      case 'blockerLive': return showBlockerReady();
      case 'blockerReminder': return showBlockerReminder();
      case 'commitmentPerformance': case 'commitmentIdentity': return showCommitment();
      case 'name': return showName();
      case 'pledge': return showPledge();
      case 'planAnalysis': return showPlanAnalysis();
      case 'price': return showPrice();
      case 'paywall': return showPaywall();
      default: state.screen = 'welcome'; return showWelcome();
    }
  }

  render();
})();
