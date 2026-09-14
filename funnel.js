(() => {
  const app = document.getElementById('funnelApp');
  const STORAGE_KEY = 'relustt_web_funnel_v1';
  const defaults = {
    screen: 'welcome', history: [], pathway: 'identity', safeWordReturn: 'aIdentityImpact',
    frequency: '', performanceExperience: '', relationshipImpact: '', pornConnection: '',
    contentIntensity: '', triedQuit: '', quitProgress: '', anxietyTrigger: '',
    performanceTrend: '', performanceTrendScale: 2, confidenceSpill: '', identityGoal: '',
    obstacle: '', identityImpact: '', support: '', identityTrend: '', reclaimedTime: '',
    commitment: 7, name: '', selectedPrice: '9', notYetAttempts: 0,
  };
  let restored = {};
  try { restored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch {}
  const state = { ...defaults, ...restored, history: Array.isArray(restored.history) ? restored.history : [] };
  // The safe word is deliberately memory-only and never written to browser storage.
  state.safeWord = '';
  let activeAnimations = [];
  let activeTimers = [];

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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  }

  function go(destination) {
    state.history.push(state.screen);
    state.screen = destination;
    persist();
    render();
  }

  function goBack() {
    if (!state.history.length) return;
    state.screen = state.history.pop();
    persist();
    render();
  }

  function resetFunnel() {
    sessionStorage.removeItem(STORAGE_KEY);
    Object.assign(state, defaults, { history: [], safeWord: '' });
    render();
  }

  function questionProgressScreens() {
    const usedConcernFollowUp = state.screen === 'forkConcern' || state.history.includes('forkConcern');
    const screens = ['frequency', 'fork'];
    if (usedConcernFollowUp) screens.push('forkConcern');
    if (state.pathway === 'performance') {
      if (!usedConcernFollowUp) screens.push('bOccurrence');
      screens.push('bRelationshipImpact', 'bPornConnection', 'bIntensity', 'bTriedQuit');
      if (state.triedQuit === 'Yes') screens.push('bQuitProgress');
      screens.push('bAnxietyTrigger', 'bTrend', 'bConfidenceSpill', 'commitmentPerformance', 'name');
    } else {
      screens.push('aIdentityGoal', 'aObstacle', 'aIntensity', 'aTriedQuit');
      if (state.triedQuit === 'Yes') screens.push('aQuitProgress');
      screens.push('aIdentityImpact', 'aSupport', 'aTrend', 'aTimeUse', 'commitmentIdentity', 'name');
    }
    return screens;
  }

  function topBar() {
    const screens = questionProgressScreens();
    const index = screens.indexOf(state.screen);
    const showProgress = index >= 0;
    const progress = showProgress ? Math.max(0.02, (index + 1) / screens.length) : 0;
    return `<header class="funnel-topbar">
      <button class="back-button" id="backButton" type="button" aria-label="Back">‹</button>
      ${showProgress ? `<div class="top-progress" aria-label="Quiz progress"><span style="width:${progress * 100}%"></span></div><span class="time-label">2 MIN</span>` : '<span class="topbar-spacer"></span>'}
    </header>`;
  }

  function mount(markup, { top = true, className = '' } = {}) {
    activeAnimations.forEach((animation) => animation.destroy());
    activeTimers.forEach(window.clearTimeout);
    activeAnimations = [];
    activeTimers = [];
    app.innerHTML = `<section class="screen screen-enter ${className}">${top ? topBar() : ''}${markup}</section>`;
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
      <div class="welcome-copy"><h1>Quit porn for good <span>in 90 days.</span></h1><p>Take a 60-second quiz to get your personalized plan.</p><div class="rating" aria-label="Rated 4.8 out of 5">★★★★★ <strong>4.8</strong></div></div>
      <div class="welcome-action"><button class="marble-button" id="beginFunnel" type="button" aria-label="Begin quiz">→</button><small>Tap to begin · 60 seconds</small></div>
    </div>`, { top: false, className: 'welcome-screen' });
    document.getElementById('beginFunnel').addEventListener('click', () => go('frequency'));
  }

  function showQuestion({ eyebrow = '', title, options, selected = '', helper = '' }, onSelect) {
    mount(`<div class="question-content">
      ${eyebrow ? `<p class="eyebrow">${escapeHTML(eyebrow)}</p>` : ''}<h1>${escapeHTML(title)}</h1>${helper ? `<p class="question-helper">${escapeHTML(helper)}</p>` : ''}
      <div class="option-list">${options.map((option, index) => `<button class="option ${selected === option ? 'is-selected' : ''}" type="button" data-answer="${escapeHTML(option)}" style="--i:${index}"><span class="option-index">${index + 1}</span><span class="option-label">${escapeHTML(option)}</span><span class="option-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>
    </div>`, { className: 'question-screen' });
    app.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => {
      app.querySelectorAll('[data-answer]').forEach((item) => item.disabled = true);
      button.classList.add('is-selected');
      window.setTimeout(() => onSelect(button.dataset.answer), 120);
    }));
  }

  function blockedSitesVisual() {
    return `<div class="blocked-showcase"><div class="blocked-heading">◈ &nbsp; BLOCKER ACTIVE</div>
      <div class="blocked-row" style="--delay:.15s"><span class="blocked-icon">◆</span><span><strong>Known adult sites</strong><small>Blocked automatically</small></span><b>✓</b></div>
      <div class="blocked-row" style="--delay:.72s"><span class="blocked-icon">＋</span><span><strong>Any site you add</strong><small>Blocked automatically</small></span><b>✓</b></div>
    </div>`;
  }

  function insightVisual(kind) {
    if (kind === 'brain') return lottieVisual('meditating-brain', 'Meditating brain animation');
    if (kind === 'threshold') return lottieVisual('circle-morph', 'Arousal threshold animation');
    if (kind === 'plant') return lottieVisual('animated-plant', 'Growing plant animation', false);
    if (kind === 'trophy') return lottieVisual('victory-player', 'Victory animation');
    if (kind === 'blocker') return blockedSitesVisual();
    const icons = { map: '⌖', retry: '↻', start: '↑', shield: '◆', people: '●●', unlock: '◇' };
    return `<div class="generic-insight-visual" aria-hidden="true">${icons[kind] || '◆'}</div>`;
  }

  function showInsight({ eyebrow = '', title, message, takeaway, visual, accent = 'violet', buttonTitle }, onContinue) {
    mount(`<div class="insight-content accent-${accent}"><div class="insight-visual">${insightVisual(visual)}</div>
      ${eyebrow ? `<p class="eyebrow">${escapeHTML(eyebrow)}</p>` : ''}<h1>${escapeHTML(title)}</h1><p class="insight-copy">${escapeHTML(message)}</p>
      <div class="takeaway"><span aria-hidden="true">◈</span><strong>${escapeHTML(takeaway)}</strong></div>${primaryButton(buttonTitle)}</div>`, { className: 'insight-screen' });
    document.getElementById('continueButton').addEventListener('click', onContinue);
  }

  function obstacleInsight() {
    const goal = state.identityGoal.toLowerCase().replace('more ', '') || 'fully in control';
    const content = {
      "I don't know where to start": { visual: 'map', title: "You don't have to figure it out alone.", message: "That's exactly why you're here—you don't need to know where to start, because we already do. This is built on real research into how this habit forms and how it's broken, laid out step by step. You don't have to figure it out alone—you just have to follow it." },
      "I've tried and failed before": { visual: 'retry', title: "Failing before isn't a verdict.", message: "Failing before doesn't mean you can't do this—it means willpower alone was never going to be enough, for anyone. The difference this time is structure: something built to catch you in the exact moments that broke you last time." },
      "Honestly, I haven't tried": { visual: 'start', title: "Then let's start now.", message: `You already know what you want—to become ${goal}. This is where that actually starts.` },
    }[state.obstacle] || { visual: 'shield', title: 'This was never really about willpower.', message: `Willpower runs out—that's not a flaw in you, that's how it works for everyone. What works is a system that prevents the urge before it hits and gives you a way to control it when it does. You're building structure that does the heavy lifting so you don't have to rely on force alone to become ${goal}.` };
    showInsight({ eyebrow: 'A DIFFERENT WAY FORWARD', ...content, takeaway: 'This is a learned response—and learned responses can change.', accent: 'violet', buttonTitle: 'Build my system' }, () => go('aIntensity'));
  }

  function identityImpactContent() {
    return {
      'More confident': { title: 'After doing it, how does it affect your confidence?', options: ['I feel like less of a man', 'A quiet sense of shame lingers', "Honestly, I don't think about it"] },
      'More present with people': { title: 'After doing it, how does it affect how present you feel with the people around you?', options: ["I don't let people get close because of the shame", 'I feel less interested in connecting with people', "I don't really notice a difference", "Honestly, I don't think about it"] },
      'More productive': { title: 'After doing it, how does it affect your productivity?', options: ['I feel drained and unmotivated afterward', 'I lose focus for hours afterward', "I don't really notice a difference", "Honestly, I don't think about it"] },
    }[state.identityGoal] || { title: "After doing it, how does it feel like it's affecting your discipline?", options: ['I feel like I broke a promise to myself', 'I feel like I let myself down again', "Honestly, I don't think about it"] };
  }

  function startSafeWord(returningTo) { state.safeWordReturn = returningTo; go('safeWordIntro'); }
  function routeToBlockerCatchUp() {
    const destination = state.pathway === 'performance' ? 'featureProgress' : 'commitmentIdentity';
    state.safeWord.trim().length >= 10 ? go(destination) : startSafeWord(destination);
  }

  function showSafeWordEntry() {
    mount(`<div class="form-screen centered-form"><p class="eyebrow mint">CREATE FRICTION</p><h1>Set your safe word.</h1>
      <p class="form-copy">Make it long, and don't make it something you'll remember without effort—the goal is friction against the version of you that wants to undo this at 1am.</p>
      <label class="field-label" for="safeWordInput">YOUR SAFE WORD</label><input class="text-field" id="safeWordInput" type="password" autocomplete="new-password" placeholder="A long phrase you won't guess" value="${escapeHTML(state.safeWord)}" />
      <p class="validation-message" id="safeWordValidation">○ &nbsp; Use at least 10 characters</p>${primaryButton('Activate my blocker', 'safeWordContinue', '◆', false)}</div>`, { className: 'form-page' });
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
      <h1>Your blocker is ready.</h1><p>After checkout, open RELUSTT and approve the Screen Time prompt to put adult sites behind the friction you created.</p>${primaryButton('Continue')}</div>`, { className: 'blocker-screen' });
    document.getElementById('continueButton').addEventListener('click', () => go(state.safeWordReturn));
  }

  const featureData = {
    featureProgress: { step: 1, title: 'See your progress.', message: 'A personal timeline shows what changes, when—and what comes next.', visual: 'progress', next: 'featureCommunity' },
    featureCommunity: { step: 2, title: "You're not doing this alone.", message: 'Join people working through the same challenge, without judgment.', visual: 'community', next: 'featureSupport' },
    featureSupport: { step: 3, title: 'Support when urges hit.', message: 'Your private AI coach helps you move through the urge instead of giving in.', visual: 'support', next: 'featureLessons' },
    featureLessons: { step: 4, title: 'Understand the pattern.', message: 'Twenty research-backed lessons show you why it happens—and how to break it for good.', visual: 'lessons', next: null },
  };

  function featureVisual(type) {
    if (type === 'progress') return lottieVisual('progress-graph', 'Animated RELUSTT progress graph');
    if (type === 'community') return lottieVisual('two-friends', 'Two friends supporting each other');
    if (type === 'support') {
      const name = state.name.trim() || 'you';
      return `<div class="chat-visual" data-chat-showcase data-user-name="${escapeHTML(name)}" aria-label="Animated support conversation"></div>`;
    }
    return lottieVisual('flying-books', 'Learning and personal growth animation');
  }

  function startChatShowcase() {
    const container = app.querySelector('[data-chat-showcase]');
    if (!container) return;
    const rawName = container.dataset.userName === 'you' ? '' : container.dataset.userName.trim();
    const initial = rawName ? rawName.slice(0, 1).toUpperCase() : 'Y';
    const script = [
      { side: 'bot', text: rawName ? `Stop, ${rawName}. You feel it again, right? That crushing shame when you look in the mirror.` : 'Stop. You feel it again, right? That crushing shame when you look in the mirror.' },
      { side: 'user', text: 'Yes man. I feel like a lying loser and I hate it.' },
      { side: 'bot', text: "That feeling ends now. I'm here to build your final strategy to permanently fix that cycle." },
      { side: 'user', text: 'What is my first step in that strategy?' },
    ];
    let visible = 0;
    let typing = '';
    const row = ({ side, text }) => `<div class="chat-row ${side}">${side === 'bot' ? '<i class="coach-orb"></i>' : '<span class="chat-spacer"></span>'}<span class="chat-bubble">${escapeHTML(text)}</span>${side === 'user' ? `<i class="user-avatar">${escapeHTML(initial)}</i>` : '<span class="chat-spacer"></span>'}</div>`;
    const typingRow = (side) => `<div class="chat-row ${side} is-typing">${side === 'bot' ? '<i class="coach-orb"></i>' : '<span class="chat-spacer"></span>'}<span class="typing-dots"><b></b><b></b><b></b></span>${side === 'user' ? `<i class="user-avatar">${escapeHTML(initial)}</i>` : '<span class="chat-spacer"></span>'}</div>`;
    const draw = () => { container.innerHTML = `${script.slice(0, visible).map(row).join('')}${typing ? typingRow(typing) : ''}`; };
    const later = (callback, delay) => { const timer = window.setTimeout(callback, delay); activeTimers.push(timer); };
    later(() => { visible = 1; draw(); }, 400);
    let timing = 1400;
    script.slice(1).forEach((message, offset) => {
      const index = offset + 1;
      later(() => { typing = message.side; draw(); }, timing);
      timing += message.side === 'bot' ? 1500 : 1200;
      later(() => { typing = ''; visible = index + 1; draw(); }, timing);
      timing += 500;
    });
  }

  function showFeature(screen) {
    const feature = featureData[screen];
    mount(`<div class="feature-screen"><div class="feature-meta"><span>YOUR RELUSTT PLAN</span><span>${feature.step} OF 4</span></div><div class="feature-visual">${featureVisual(feature.visual)}</div>
      <h1>${escapeHTML(feature.title)}</h1><p>${escapeHTML(feature.message)}</p><div class="feature-dots">${[1,2,3,4].map((step) => `<i class="${step === feature.step ? 'active' : ''}"></i>`).join('')}</div>${primaryButton(feature.step === 4 ? 'Continue' : 'Next')}</div>`, { className: 'feature-page' });
    document.getElementById('continueButton').addEventListener('click', () => {
      if (feature.next) return go(feature.next);
      go(state.pathway === 'performance' ? 'commitmentPerformance' : 'name');
    });
    if (feature.visual === 'support') startChatShowcase();
  }

  function commitmentLabel() {
    if (state.commitment <= 3) return "You're curious. That's a start.";
    if (state.commitment <= 6) return 'Part of you is ready.';
    if (state.commitment <= 8) return "You're serious about this.";
    return "You're ready to draw a line.";
  }

  function showCommitment() {
    mount(`<div class="commitment-screen"><p class="gradient-eyebrow">YOUR DECISION</p><h1>How committed are you to changing this?</h1>
      <div class="commitment-dial" id="commitmentDial" style="--value:${state.commitment * 10}"><div><strong id="commitmentNumber">${state.commitment}</strong><span>OUT OF 10</span></div></div>
      <div class="commitment-label" id="commitmentLabel">${escapeHTML(commitmentLabel().toUpperCase())}</div><div class="range-wrap"><input id="commitmentRange" type="range" min="1" max="10" step="1" value="${state.commitment}" aria-label="Commitment from 1 to 10" /><div><span>Just exploring</span><span>All in</span></div></div>${primaryButton("That's my honest answer")}</div>`, { className: 'commitment-page' });
    const range = document.getElementById('commitmentRange');
    range.addEventListener('input', () => {
      state.commitment = Number(range.value);
      document.getElementById('commitmentNumber').textContent = state.commitment;
      document.getElementById('commitmentLabel').textContent = commitmentLabel().toUpperCase();
      document.getElementById('commitmentDial').style.setProperty('--value', state.commitment * 10);
      persist();
    });
    document.getElementById('continueButton').addEventListener('click', () => {
      const next = state.commitment >= 7 ? 'recommitment' : (state.screen === 'commitmentPerformance' ? 'name' : 'featureProgress');
      go(next);
    });
  }

  function showRecommitment() {
    const offsets = ['0px,0px', '86px,-8px', '-92px,10px', '74px,22px', '-58px,28px'];
    mount(`<div class="recommitment-screen"><div class="recommit-lock" aria-hidden="true">🔒</div><h1>Wow—you’re serious about this.</h1><p>Are you sure? Continue, and RELUSTT will lock 🌽 out of reach—even when the urge hits.</p>
      <div class="recommit-actions">${primaryButton('Yes, lock it away', 'confirmCommitment', '🔒')}<div class="dodge-zone" id="dodgeZone"></div></div></div>`, { className: 'recommitment-page' });
    document.getElementById('confirmCommitment').addEventListener('click', () => go(state.pathway === 'performance' ? 'name' : 'featureProgress'));
    const zone = document.getElementById('dodgeZone');
    if (state.notYetAttempts < 5) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'not-yet-button'; button.textContent = 'Not yet';
      const [x, y] = offsets[Math.min(state.notYetAttempts, offsets.length - 1)].split(',');
      button.style.setProperty('--x', x); button.style.setProperty('--y', y);
      button.style.setProperty('--scale', Math.max(.44, 1 - state.notYetAttempts * .14));
      button.addEventListener('click', () => { state.notYetAttempts += 1; persist(); showRecommitment(); });
      zone.appendChild(button);
    }
  }

  function showName() {
    mount(`<div class="form-screen name-screen"><h1>We haven't gotten your name yet.</h1><p class="form-copy">What should we call you?</p>
      <input class="text-field name-field" id="nameInput" type="text" autocomplete="given-name" autocapitalize="words" placeholder="Your first name" maxlength="60" value="${escapeHTML(state.name)}" /><div class="form-spacer"></div>
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
      <div class="vow-copy"><p>For the next <strong>90 days</strong>, I commit to breaking free from porn and reclaiming my <strong>mind, body, and energy</strong>. I will stay disciplined, consistent, and focused, no matter how intense the urges or how tough the challenges get.</p><p><b>RELUSTT</b> is my commitment to rebuild self-control, strengthen confidence, and live with clarity and purpose.</p><p>If I slip, <em>I will not quit</em>. I will rise again with <strong>greater resolve</strong>. These 90 days are the start of the life I have always wanted.</p></div>
      <div class="signature-heading"><span>✍</span> SIGN BELOW TO COMMIT</div><div class="signature-row"><button id="clearSignature" class="clear-signature" type="button" aria-label="Clear signature" disabled>↶</button><div class="signature-pad"><canvas id="signatureCanvas"></canvas><div class="signature-placeholder" id="signaturePlaceholder">✍<span>Sign here</span></div><i></i></div></div>
      <p class="hold-helper" id="holdHelper">Sign above to continue</p><button class="hold-button" id="holdButton" type="button" disabled><i></i><span>🔒 &nbsp; Sign above to continue</span></button><div class="seal-stamp" id="sealStamp">✓<span>SEALED</span></div></div>`, { top: false, className: 'pledge-page' });
    setupSignature();
  }

  function setupSignature() {
    const canvas = document.getElementById('signatureCanvas');
    const context = canvas.getContext('2d');
    const placeholder = document.getElementById('signaturePlaceholder');
    const clear = document.getElementById('clearSignature');
    const hold = document.getElementById('holdButton');
    const helper = document.getElementById('holdHelper');
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
      clearTimeout(holdTimer); hold.classList.remove('is-holding'); helper.textContent = 'Press and hold to seal'; hold.querySelector('span').innerHTML = '✋ &nbsp; Hold to seal your vow';
    };
    const startHold = () => {
      if (hold.disabled || hold.classList.contains('is-holding')) return;
      hold.classList.add('is-holding'); helper.textContent = 'Keep holding…'; hold.querySelector('span').innerHTML = '🔓 &nbsp; Sealing your vow…';
      holdTimer = window.setTimeout(() => { hold.classList.add('is-complete'); document.getElementById('sealStamp').classList.add('is-visible'); window.setTimeout(() => go('price'), 720); }, 2000);
    };
    hold.addEventListener('pointerdown', startHold); hold.addEventListener('pointerup', cancelHold); hold.addEventListener('pointercancel', cancelHold); hold.addEventListener('pointerleave', cancelHold);
    hold.addEventListener('keydown', (event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); startHold(); } });
    hold.addEventListener('keyup', (event) => { if (event.key === ' ' || event.key === 'Enter') cancelHold(); });
    updateReady();
  }

  const priceDisplay = (price = state.selectedPrice) => ['14.99', '29.99'].includes(price) ? `$${price}` : `$${Number(price).toFixed(0)}`;

  function showPrice() {
    const tiers = ['5', '9', '14.99', '29.99'];
    mount(`<div class="price-screen"><p class="eyebrow">CHOOSE YOUR TRIAL PRICE</p><h1>Choose what feels right.</h1><p>Every option unlocks the full RELUSTT plan.</p>
      <div class="price-grid">${tiers.map((tier) => `<button class="price-choice ${state.selectedPrice === tier ? 'is-selected' : ''}" type="button" data-price="${tier}"><strong>${priceDisplay(tier)}</strong><span>TRIAL PRICE</span></button>`).join('')}</div>
      <div class="price-support">♥ <span id="priceSupport">${state.selectedPrice === '5' ? 'You get the same complete experience at every price.' : 'Your choice helps keep the $5 option available to people who need it.'}</span></div><div class="price-spacer"></div>
      ${primaryButton(`Continue with ${priceDisplay()}`, 'priceContinue')}<div class="trial-note">◈ &nbsp; 7 days free · cancel before renewal</div></div>`, { className: 'price-page' });
    app.querySelectorAll('[data-price]').forEach((button) => button.addEventListener('click', () => {
      state.selectedPrice = button.dataset.price; persist();
      app.querySelectorAll('[data-price]').forEach((item) => item.classList.toggle('is-selected', item === button));
      document.querySelector('#priceContinue span').textContent = `Continue with ${priceDisplay()}`;
      document.getElementById('priceSupport').textContent = state.selectedPrice === '5' ? 'You get the same complete experience at every price.' : 'Your choice helps keep the $5 option available to people who need it.';
    }));
    document.getElementById('priceContinue').addEventListener('click', () => go('paywall'));
  }

  function personalizedHeadline() {
    if (state.pathway === 'performance') return 'Built to help you perform with confidence.';
    return { 'Build my body': 'Built to give you your energy back for your body.', 'Create a business': 'Built to get you back to building your business.', 'Spend time with people who matter': 'Built to bring you back to the people who matter.', 'Create meaningful relationships': 'Built to make room for meaningful relationships.' }[state.reclaimedTime] || "Built for the man you're ready to become.";
  }

  function personalizedRecap() {
    if (state.pathway === 'performance') return ['Rebuild real confidence', state.anxietyTrigger ? `Work through: ${state.anxietyTrigger.toLowerCase()}` : 'Close the gap between porn and intimacy', 'Protect progress with your blocker'];
    return [state.identityGoal || 'Become fully in control', state.reclaimedTime || 'Reclaim your time and energy', 'Protect progress with your blocker'];
  }

  function showPaywall() {
    const features = ['System-wide adult-site blocker', 'Personalized progress timeline', 'Private recovery community', 'Guided support chatbot', '20 research-backed lessons'];
    mount(`<div class="paywall-screen"><div class="paywall-nav"><button id="paywallBack" type="button" aria-label="Back">‹</button><a href="/" aria-label="RELUSTT home">RELUSTT</a></div><div class="paywall-shield" aria-hidden="true">◈</div>
      <h1>Your plan, ${escapeHTML(state.name || 'Warrior')}.</h1><h2>${escapeHTML(personalizedHeadline())}</h2><div class="recap-card">${personalizedRecap().map((item) => `<div><span>✓</span>${escapeHTML(item)}</div>`).join('')}</div>
      <div class="offer-card"><span>7 DAYS FREE</span><strong>$0 today</strong><p>Then ${priceDisplay()} every 3 months</p></div><div class="included-card"><span>EVERYTHING INCLUDED</span>${features.map((item) => `<div><b>✓</b>${escapeHTML(item)}</div>`).join('')}</div>
      <div class="testimonial-grid"><blockquote><span>★★★★★</span><p>“I stopped dreading intimacy. The confidence came back slowly, then all at once.”</p><cite>Marcus · 47 days</cite></blockquote><blockquote><span>★★★★★</span><p>“The blocker bought me enough time to make a better decision. The lessons made that decision easier.”</p><cite>Daniel · 91 days</cite></blockquote></div>
      ${primaryButton('Start my 7-day free trial', 'checkoutFromFunnel')}<p class="paywall-fineprint">No charge today. Cancel anytime before your trial ends.</p><div class="checkout-error" id="checkoutError" role="alert"></div><div class="paywall-links"><a href="#">Privacy</a><a href="#">Terms</a><button id="startOver" type="button">Start over</button></div>
    </div>`, { top: false, className: 'paywall-page' });
    document.getElementById('paywallBack').addEventListener('click', goBack);
    document.getElementById('startOver').addEventListener('click', resetFunnel);
    document.getElementById('checkoutFromFunnel').addEventListener('click', startCheckout);
  }

  async function startCheckout() {
    const button = document.getElementById('checkoutFromFunnel');
    const error = document.getElementById('checkoutError');
    button.disabled = true; button.querySelector('span').textContent = 'Opening secure checkout…'; error.textContent = '';
    try {
      const plan = `tier_${state.selectedPrice.replace('.', '')}`;
      const response = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be started.');
      window.location.assign(payload.url);
    } catch (checkoutError) {
      error.textContent = checkoutError.message || 'Checkout could not be started.';
      button.disabled = false; button.querySelector('span').textContent = 'Start my 7-day free trial';
    }
  }

  function showTrend() {
    const responses = [['😄', 'Much better'], ['🙂', 'A little better'], ['😐', 'About the same'], ['😟', 'A little worse'], ['😣', 'Much worse']];
    const value = Math.round(state.performanceTrendScale);
    mount(`<div class="trend-screen"><h1>Has it gotten better, worse, or stayed about the same over time?</h1><div class="trend-response"><div id="trendEmoji">${responses[value][0]}</div><strong id="trendLabel">${responses[value][1]}</strong></div>
      <div class="trend-range"><input id="trendRange" type="range" min="0" max="4" step="1" value="${value}" aria-label="Change over time" /><div><span>BEST</span><span>WORST</span></div></div><div class="trend-spacer"></div>${primaryButton('Continue')}</div>`, { className: 'trend-page' });
    const range = document.getElementById('trendRange');
    range.addEventListener('input', () => { state.performanceTrendScale = Number(range.value); document.getElementById('trendEmoji').textContent = responses[range.value][0]; document.getElementById('trendLabel').textContent = responses[range.value][1]; persist(); });
    document.getElementById('continueButton').addEventListener('click', () => { state.performanceTrend = responses[Math.round(state.performanceTrendScale)][1]; go('bConfidenceSpill'); });
  }

  function render() {
    switch (state.screen) {
      case 'welcome': return showWelcome();
      case 'frequency': return showQuestion({ title: 'How often do you currently watch porn?', options: ['Daily', 'A few times a week', 'A few times a month', 'Already trying to cut back'], selected: state.frequency }, (a) => { state.frequency = a; go('fork'); });
      case 'fork': return showQuestion({ title: 'Have you ever struggled to get hard or stay hard while with a partner?', options: ['Yes', 'No', "I haven't been intimate with a partner yet"], helper: 'Answer honestly.' }, (a) => { if (a === 'Yes') { state.pathway = 'performance'; go('bOccurrence'); } else if (a === 'No') { state.pathway = 'identity'; go('aIdentityGoal'); } else go('forkConcern'); });
      case 'forkConcern': return showQuestion({ title: "Are you worried this might happen when you're with a partner?", options: ['Yes', 'No'] }, (a) => { if (a === 'Yes') { state.pathway = 'performance'; state.performanceExperience = "No, but I'm worried it will happen"; go('bRelationshipImpact'); } else { state.pathway = 'identity'; go('aIdentityGoal'); } });
      case 'bOccurrence': return showQuestion({ title: 'Has this actually happened with a partner, or are you more worried it might?', options: ['Yes, recently', 'Yes, a few months ago', 'Yes, over a year ago', "No, but I'm worried it will happen"], selected: state.performanceExperience }, (a) => { state.performanceExperience = a; go('bRelationshipImpact'); });
      case 'bRelationshipImpact': return showQuestion({ title: 'Has it affected a relationship, or made you avoid intimacy?', options: ["Yes, it's affected a relationship", "No, I'm not in a relationship right now", "I avoid dating or relationships because I'm scared to perform"], selected: state.relationshipImpact }, (a) => { state.relationshipImpact = a; go('bPornConnection'); });
      case 'bPornConnection': return showQuestion({ title: "Do you think it's connected to your porn use?", options: ['Yes', 'No'], selected: state.pornConnection }, (a) => { state.pornConnection = a; go('bCauseInfo'); });
      case 'bCauseInfo': return showInsight({ title: 'Porn can train your brain to prefer screens.', message: 'Over time, real-life intimacy may not trigger the same response—even when you want it to.', takeaway: 'What your brain learned, it can relearn.', visual: 'brain', accent: 'violet', buttonTitle: 'That makes sense' }, () => go('bIntensity'));
      case 'bIntensity': return showQuestion({ title: 'Has the content you watch become more intense over time?', options: ['Yes', 'A little', 'No'], selected: state.contentIntensity }, (a) => { state.contentIntensity = a; go('bGapInfo'); });
      case 'bGapInfo': return showInsight({ title: 'Your arousal threshold rises.', message: 'Your brain adapts to stronger content. A real partner may no longer trigger the same response.', takeaway: 'Getting or staying hard may become difficult.', visual: 'threshold', accent: 'cyan', buttonTitle: 'I understand' }, () => go('bTriedQuit'));
      case 'bTriedQuit': return showQuestion({ title: 'Have you tried to quit or cut back before?', options: ['Yes', 'No'], selected: state.triedQuit }, (a) => { state.triedQuit = a; if (a === 'Yes') go('bQuitProgress'); else { state.quitProgress = ''; go('quitFeedback'); } });
      case 'bQuitProgress': return showQuestion({ title: "How's that been going?", options: ["Good, I've made real progress", 'Not great, I keep relapsing', 'On and off'], selected: state.quitProgress, helper: 'Be honest with yourself.' }, (a) => { state.quitProgress = a; go('quitFeedback'); });
      case 'quitFeedback': {
        const good = state.quitProgress.startsWith('Good');
        return showInsight({ title: good ? "You've built real momentum." : "Your willpower isn't the problem.", message: good ? "Now let's protect it with a system that makes staying on track easier." : "You don't need to try harder. You need a system that blocks access before the urge takes over.", takeaway: good ? 'RELUSTT turns progress into consistency.' : 'RELUSTT is that system.', visual: good ? 'trophy' : 'plant', accent: good ? 'mint' : 'violet', buttonTitle: good ? 'Protect my progress' : 'Build my system' }, () => startSafeWord(state.pathway === 'performance' ? 'bAnxietyTrigger' : 'aIdentityImpact'));
      }
      case 'bAnxietyTrigger': return showQuestion({ title: 'What usually triggers your performance anxiety?', options: ["I'm afraid of disappointing my partner", 'Stress or pressure in the moment', "Comparing the moment to what I've watched", 'Not sure'], selected: state.anxietyTrigger }, (a) => { state.anxietyTrigger = a; go('bTrend'); });
      case 'bTrend': return showTrend();
      case 'bConfidenceSpill': return showQuestion({ title: 'Does this affect your confidence outside the bedroom too?', options: ['Yes, it bleeds into everything', "No, it's just in that situation"], selected: state.confidenceSpill }, (a) => { state.confidenceSpill = a; routeToBlockerCatchUp(); });
      case 'aIdentityGoal': return showQuestion({ eyebrow: 'YOUR FUTURE SELF', title: "Picture the version of you that's fully in control of this—what's different about him?", options: ['More disciplined', 'More confident', 'More present with people', 'More productive'], selected: state.identityGoal }, (a) => { state.identityGoal = a; go('aObstacle'); });
      case 'aObstacle': return showQuestion({ eyebrow: "WHAT'S IN THE WAY", title: "What's stopping you from being him right now?", options: ["The habit's stronger than my willpower", "I don't know where to start", "I've tried and failed before", "Honestly, I haven't tried"], selected: state.obstacle }, (a) => { state.obstacle = a; go('aObstacleInfo'); });
      case 'aObstacleInfo': return obstacleInsight();
      case 'aIntensity': return showQuestion({ eyebrow: 'THE PATTERN', title: 'Do you ever notice yourself needing more intense content to feel the same effect?', options: ['Yes', 'A little', 'No'], selected: state.contentIntensity }, (a) => { state.contentIntensity = a; go('aTriedQuit'); });
      case 'aTriedQuit': return showQuestion({ title: 'Have you tried to quit or cut back before?', options: ['Yes', 'No'], selected: state.triedQuit }, (a) => { state.triedQuit = a; if (a === 'Yes') go('aQuitProgress'); else { state.quitProgress = ''; go('quitFeedback'); } });
      case 'aQuitProgress': return showQuestion({ title: "How's that been going?", options: ["Good, I've made real progress", 'Not great, I keep relapsing', 'On and off'], selected: state.quitProgress, helper: 'Be honest with yourself.' }, (a) => { state.quitProgress = a; go('quitFeedback'); });
      case 'aIdentityImpact': { const content = identityImpactContent(); return showQuestion({ eyebrow: 'AFTER THE MOMENT', ...content, selected: state.identityImpact }, (a) => { state.identityImpact = a; go('aSupport'); }); }
      case 'aSupport': return showQuestion({ eyebrow: 'YOUR SUPPORT', title: "Does anyone know you're trying to change this?", options: ['No one', 'One person', "I'm hiding it"], selected: state.support }, (a) => { state.support = a; go(a === 'One person' ? 'aTrend' : 'aSupportInfo'); });
      case 'aSupportInfo': {
        const alone = state.support === 'No one';
        return showInsight({ eyebrow: "YOU DON'T HAVE TO CARRY IT ALONE", title: alone ? 'Shared weight becomes lighter.' : 'Shame grows in secrecy.', message: alone ? "Consider telling someone you trust. There's an old saying: a joy shared is doubled, a sorrow shared is halved. Carrying this alone makes it heavier than it has to be." : "There's no need to be ashamed of this—a lot of guys are dealing with exactly this, in exactly this kind of secrecy. You're not the only one, even though it feels that way.", takeaway: 'This is a learned response—and learned responses can change.', visual: alone ? 'people' : 'unlock', accent: 'cyan', buttonTitle: 'Continue' }, () => go('aTrend'));
      }
      case 'aTrend': return showQuestion({ eyebrow: 'OVER TIME', title: 'Has it gotten better or worse over time?', options: ['Better', 'Worse', "Haven't really noticed"], selected: state.identityTrend }, (a) => { state.identityTrend = a; go('aTimeUse'); });
      case 'aTimeUse': return showQuestion({ eyebrow: "WHAT YOU'RE RECLAIMING", title: 'If you got back all the time and energy this takes up, what would you actually do with it?', options: ['Build my body', 'Create a business', 'Spend time with people who matter', 'Create meaningful relationships'], selected: state.reclaimedTime }, (a) => { state.reclaimedTime = a; routeToBlockerCatchUp(); });
      case 'safeWordIntro': return showInsight({ title: 'RELUSTT blocks adult sites automatically.', message: 'This keeps 🌽 out of reach—even when an urge hits. If another site triggers you, add it yourself and RELUSTT will block it too.', takeaway: 'Blocking can only be turned off with the safe word you create.', visual: 'blocker', accent: 'mint', buttonTitle: 'Create my safe word' }, () => go('safeWordEntry'));
      case 'safeWordEntry': return showSafeWordEntry();
      case 'blockerLive': return showBlockerReady();
      case 'featureProgress': case 'featureCommunity': case 'featureSupport': case 'featureLessons': return showFeature(state.screen);
      case 'commitmentPerformance': case 'commitmentIdentity': return showCommitment();
      case 'recommitment': return showRecommitment();
      case 'name': return showName();
      case 'pledge': return showPledge();
      case 'price': return showPrice();
      case 'paywall': return showPaywall();
      default: state.screen = 'welcome'; return showWelcome();
    }
  }

  render();
})();
