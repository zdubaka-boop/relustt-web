// ============================================================
// Reactive starfield (cursor repulsion)
// ============================================================
(() => {
  const canvas = document.getElementById('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const stars = [];
  const STAR_COUNT = 220;
  const mouse = { x: -9999, y: -9999 };
  const REPULSE_R = 140;
  const REPULSE_STRENGTH = 60;

  function resize() {
    W = canvas.width = window.innerWidth * dpr;
    H = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      ox: 0, oy: 0,
      vx: (Math.random() - .5) * .12 * dpr,
      vy: (Math.random() - .5) * .12 * dpr,
      r: (Math.random() * 1.4 + .2) * dpr,
      a: Math.random() * .6 + .3,
      tw: Math.random() * Math.PI * 2,
    });
  }

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX * dpr;
    mouse.y = e.clientY * dpr;
  });
  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = W; else if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; else if (s.y > H) s.y = 0;

      const dx = s.x + s.ox - mouse.x;
      const dy = s.y + s.oy - mouse.y;
      const dist = Math.hypot(dx, dy);
      const R = REPULSE_R * dpr;
      if (dist < R && dist > 0) {
        const force = (1 - dist / R) * REPULSE_STRENGTH * dpr;
        s.ox += (dx / dist) * force * .04;
        s.oy += (dy / dist) * force * .04;
      }
      s.ox *= .92;
      s.oy *= .92;

      s.tw += .02;
      const alpha = s.a * (.6 + Math.sin(s.tw) * .4);

      ctx.beginPath();
      ctx.arc(s.x + s.ox, s.y + s.oy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// ============================================================
// Entry-triggered word-by-word reveal
// ============================================================
(() => {
  const line1 = "Porn doesn't just steal your time.";
  const line2 = "It steals your focus, your drive, your confidence, and the man you were supposed to become.";
  const el1 = document.getElementById('revealLine1');
  const el2 = document.getElementById('revealLine2');
  const stats = document.getElementById('stats');
  const cta = document.getElementById('revealCta');
  const section = document.getElementById('reveal');
  if (!el1 || !el2 || !section) return;

  function wrap(text) {
    return text.split(' ').map(w => `<span>${w}</span>`).join(' ');
  }
  el1.innerHTML = wrap(line1);
  el2.innerHTML = wrap(line2);

  const allSpans = [...el1.querySelectorAll('span'), ...el2.querySelectorAll('span')];
  const sticky = section.querySelector('.reveal__sticky');
  let counted = false;

  function onScroll() {
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = section.offsetHeight - vh;
    const scrolled = Math.min(Math.max(-r.top, 0), total);
    const p = total > 0 ? scrolled / total : 0;

    // JS-managed pinning — doesn't rely on position:sticky working in any browser
    if (r.top >= 0) {
      // Before pin zone: section hasn't reached top yet
      sticky.classList.remove('is-pinned', 'is-end');
    } else if (-r.top >= total) {
      // After pin zone: park at bottom of section
      sticky.classList.remove('is-pinned');
      sticky.classList.add('is-end');
    } else {
      // In pin zone: fixed to viewport top
      sticky.classList.add('is-pinned');
      sticky.classList.remove('is-end');
    }

    // words reveal across first 70% of pinned scroll
    const revealP = Math.min(p / 0.7, 1);
    const reveal = Math.round(revealP * allSpans.length);
    allSpans.forEach((s, i) => s.classList.toggle('on', i < reveal));

    // stats + CTA appear at the end; text fades out so they don't overlap on mobile
    if (p >= 0.8) {
      stats.classList.add('show');
      if (cta) cta.classList.add('show');
      section.classList.add('is-past');
      if (!counted) { counted = true; setTimeout(runCounters, 250); }
    } else {
      stats.classList.remove('show');
      if (cta) cta.classList.remove('show');
      section.classList.remove('is-past');
    }
  }

  // requestAnimationFrame polling — bulletproof across all browsers
  function tick() {
    onScroll();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function runCounters() {
    document.querySelectorAll('.stat__num').forEach(el => {
      const target = +el.dataset.target;
      const suffix = el.dataset.suffix || '';
      const dur = 2400;
      const t0 = performance.now();
      function step(t) {
        const k = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - k, 3);
        const val = Math.round(target * eased);
        el.textContent = val.toLocaleString() + suffix;
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }
})();

// ============================================================
// Growing trees row (cursor proximity slows drift)
// ============================================================
(() => {
  const row = document.getElementById('treesRow');
  const viewport = document.getElementById('treesViewport');
  if (!row) return;

  const stages = [
    { name: 'Sprout',    n: 1  },
    { name: 'Seedling',  n: 2  },
    { name: 'Sapling',   n: 3  },
    { name: 'Young Oak', n: 4  },
    { name: 'Grove',     n: 5  },
    { name: 'Bloomed',   n: 6  },
    { name: 'Mature',    n: 7  },
    { name: 'Elder',     n: 8  },
    { name: 'Ancient',   n: 9  },
    { name: 'Eternal',   n: 10 },
  ];

  function makeTree(n, name) {
    return `
      <div class="tree">
        <img class="tree__img" src="trees/${n}.png" alt="${name}" loading="lazy" />
        <div class="tree__name">${name}</div>
      </div>`;
  }

  const html = stages.map(s => makeTree(s.n, s.name)).join('');
  row.innerHTML = html + html;

  let offset = 0;
  let speed = 0.6;
  let targetSpeed = 0.6;
  const SLOW = 0.08;
  const FAST = 0.6;
  let half = 0;

  function measure() { half = row.scrollWidth / 2; }
  measure();
  window.addEventListener('resize', measure);

  viewport.addEventListener('mousemove', () => { targetSpeed = SLOW; });
  viewport.addEventListener('mouseleave', () => { targetSpeed = FAST; });

  function loop() {
    speed += (targetSpeed - speed) * 0.08;
    offset -= speed;
    if (-offset >= half) offset += half;
    row.style.transform = `translateX(${offset}px)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

// ============================================================
// Phone slide-up entry animation (chained into floating)
// ============================================================
(() => {
  const phones = document.querySelectorAll('.phone');
  if (!phones.length) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  phones.forEach(p => io.observe(p));

  // Safety net: if a phone hasn't entered view after 5s of being mounted (iOS quirk
  // or Reduce Motion override), force-show it so it's never invisible.
  setTimeout(() => {
    document.querySelectorAll('.phone:not(.in-view)').forEach(p => p.classList.add('in-view'));
  }, 5000);
})();

// ============================================================
// Testimonials horizontal carousel — mobile only
// ============================================================
(() => {
  const grid = document.querySelector('.tgrid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.tcard');
  if (!cards.length) return;

  function isMobile() { return window.innerWidth <= 600; }
  if (!isMobile()) return;

  let idx = 0;
  let lastUserScroll = 0;
  const ROTATE_MS = 4500;
  const PAUSE_AFTER_TOUCH_MS = 6000;

  // Note user interactions so we don't yank the carousel mid-swipe
  ['scroll','touchstart','touchmove','pointerdown'].forEach(ev =>
    grid.addEventListener(ev, () => { lastUserScroll = Date.now(); }, { passive: true })
  );

  // Keep idx synced with whatever card is currently most-visible
  let syncTimer;
  grid.addEventListener('scroll', () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      const center = grid.scrollLeft + grid.offsetWidth / 2;
      let nearest = 0, best = Infinity;
      cards.forEach((c, i) => {
        const cardCenter = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.abs(cardCenter - center);
        if (d < best) { best = d; nearest = i; }
      });
      idx = nearest;
    }, 120);
  }, { passive: true });

  setInterval(() => {
    if (!isMobile()) return;
    if (document.hidden) return;
    if (Date.now() - lastUserScroll < PAUSE_AFTER_TOUCH_MS) return;
    idx = (idx + 1) % cards.length;
    const target = cards[idx];
    grid.scrollTo({
      left: target.offsetLeft - (grid.offsetWidth - target.offsetWidth) / 2,
      behavior: 'smooth'
    });
  }, ROTATE_MS);
})();

// ============================================================
// Benefits vertical marquee
// ============================================================
(() => {
  const benefits = [
    ['💪','Stronger erections'],
    ['⚡','Real, raw energy'],
    ['🔥','Drive that returns'],
    ['🎯','Crystal-clear focus'],
    ['❤️','Real attraction restored'],
    ['😎','Authentic confidence'],
    ['😴','Sleep that actually rests you'],
    ['🧠','Brain fog gone'],
    ['✨','Iron discipline'],
    ['🏆','Self-respect back'],
    ['🌱','Personal growth on tap'],
    ['🕊️','Inner peace'],
    ['🚀','Career momentum'],
    ['👁️','Eye contact, presence'],
    ['🎁','Hours back in your week'],
    ['🌅','Mornings without shame'],
    ['💎','Sober dopamine'],
    ['🛡️','Triggers, blocked'],
  ];
  const target = document.getElementById('benefitsInner');
  if (!target) return;
  const chip = ([e, t]) => `<div class="bchip"><span class="emoji">${e}</span>${t}</div>`;
  const html = benefits.map(chip).join('');
  // duplicate for seamless -50% loop
  target.innerHTML = html + html;
})();
