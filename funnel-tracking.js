/* First-party Supabase telemetry. No pixels, third-party trackers, or credentials. */
(() => {
  const schema = window.RelusttQuizSchema;
  const KEY = 'relustt_quiz_tracking_v1';
  function create(reset = false) {
    let data;
    try { data = reset ? null : JSON.parse(sessionStorage.getItem(KEY)); } catch {}
    if (!data || data.version !== schema.VERSION || Date.now() - data.created > 29 * 86400000) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      data = { id: crypto.randomUUID(), secret: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''),
        version: schema.VERSION, sequence: 0, created: Date.now(), queue: [], answers: {}, step: 'welcome' };
    }
    let state = null, current = '', entered = null, pending = null, timer = null, failures = 0, disposed = false;
    const context = {};
    const url = new URL(location.href);
    for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) if (url.searchParams.has(key)) context[key] = url.searchParams.get(key).slice(0, 120);
    context.locale = navigator.language; context.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    context.device = innerWidth < 768 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop';
    try { context.referrer_host = new URL(document.referrer).hostname; } catch {}
    data.context = { ...(data.context || {}), ...context };
    function store() { try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch {} }
    function event(type, step = current, details = {}) {
      if (!schema.stepIds.has(step)) return;
      data.queue.push({ id: crypto.randomUUID(), type, step, ...details });
      // Bounded to prevent exhausting storage during long offline sessions.
      if (data.queue.length > 4000) data.queue.splice(0, data.queue.length - 4000);
      store();
    }
    function capture() {
      if (!state) return;
      const input = { ...state };
      if (!('commitment' in data.answers)) delete input.commitment;
      if (!('selectedPrice' in data.answers) && !['choose-price','your-plan'].includes(current)) delete input.selectedPrice;
      data.answers = schema.answers(input);
      data.step = current || data.step;
    }
    function payload() {
      capture();
      data.sequence += 1; store();
      return { id: data.id, secret: data.secret, version: data.version, sequence: data.sequence,
        step: data.step, answers: data.answers, context: data.context, events: data.queue.slice(0,40) };
    }
    function schedule(delay = 300) {
      if (disposed) return;
      clearTimeout(timer); timer = setTimeout(() => { void flush(); }, delay);
    }
    async function flush() {
      if (disposed) return;
      if (pending) return pending;
      if (!data.queue.length) return;
      const batch = payload();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      pending = (async () => {
        try {
          const response = await fetch('/api/funnel-events', { method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batch), keepalive: true, signal: controller.signal });
          if (!response.ok) throw new Error('save_unavailable');
          const ids = new Set(batch.events.map(e => e.id));
          data.queue = data.queue.filter(e => !ids.has(e.id)); failures = 0;
          if (!disposed) store();
        } catch { failures += 1; }
        finally {
          clearTimeout(timeout); pending = null;
          if (data.queue.length && document.visibilityState !== 'hidden') schedule(Math.min(30000, 1000 * 2 ** Math.min(failures,5)));
        }
      })();
      return pending;
    }
    function exit(direction) {
      if (entered !== null) {
        event('step_exit', current, { direction, duration: Math.max(0, performance.now() - entered) }); entered = null;
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { exit('hidden'); void flush(); }
      else { entered = performance.now(); schedule(); }
    };
    const onPageHide = () => { exit('hidden'); void flush(); };
    const onOnline = () => schedule(0);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);
    return {
      view(nextState, step) {
        state = nextState;
        if (step !== current) {
          exit('back'); current = step;
          entered = document.visibilityState === 'hidden' ? null : performance.now();
          event('step_view', step); capture();
          if (step === 'your-plan') { event('quiz_completed'); event('offer_viewed'); }
          if (url.searchParams.has('cancelled') && step === 'your-plan' && !data.cancellationSeen) {
            event('checkout_cancelled'); data.cancellationSeen = true;
          }
          schedule();
        }
      },
      advance(nextState, step, nextStep) {
        state = nextState;
        const key = schema.answerKey(step);
        if (key && state[key] !== undefined) {
          if (data.answers[key] !== state[key]) event('answer_changed',step);
          data.answers[key] = state[key];
        }
        capture(); exit('forward');
        event('step_completed',step,{ nextStep, direction:'forward' });
      },
      answer(nextState, step) {
        state = nextState;
        const key = schema.answerKey(step);
        if (key && data.answers[key] !== state[key]) {
          data.answers[key] = state[key]; capture(); event('answer_changed',step); schedule();
        }
      },
      async checkout(nextState) {
        state = nextState; data.answers.selectedPrice = state.selectedPrice;
        event('checkout_clicked'); await flush(); return payload();
      },
      checkoutError() { event('checkout_error'); schedule(); },
      dispose() {
        disposed = true;
        clearTimeout(timer); document.removeEventListener('visibilitychange',onVisibility);
        window.removeEventListener('pagehide',onPageHide); window.removeEventListener('online',onOnline);
      },
    };
  }
  window.RelusttTracking = { create };
})();
