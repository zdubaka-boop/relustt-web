/* Planning profiles, not diagnostic categories. Recomputed from current answers. */
window.RelusttArchetypes = (() => {
  const profiles = {
    reconnect: {
      name: 'The Reconnector', motif: 'bridge',
      headline: 'Make room for the connection you want.',
      description: 'You want to feel present with someone, without the habit taking up space between you.',
      focus: 'Bring your attention back to real connection.',
      challenge: 'When connection starts to feel like pressure.',
      support: 'Make room for closeness without turning every moment into a test.',
      steps: ['Create space from the screen.', 'Practice being present.', 'Make connection part of your routine.'],
      preview: 'Pulling away can start before you even notice you are doing it.',
      hinge: 'Your plan looks at what happens just before that distance appears, what keeps it there, and',
      continuation: 'the response that helps you stay present instead of withdrawing. Notice the moment, give yourself a pause, and choose a small way to reconnect.',
    },
    confidence: {
      name: 'The Confidence Rebuilder', motif: 'sunrise',
      headline: 'Take back control. Feel like yourself again.',
      description: 'You want to trust yourself again. Your plan turns that goal into actions you can return to.',
      focus: 'Rebuild trust in yourself, one action at a time.',
      challenge: 'When one difficult moment becomes self-doubt.',
      support: 'Have a response ready before pressure takes over.',
      steps: ['Put protection in place.', 'Practice a calmer response.', 'Build on the promises you keep.'],
      preview: 'Pressure can turn a single moment into something you keep replaying.',
      hinge: 'Your plan looks at what sets that spiral off, what keeps it going, and',
      continuation: 'the response you can practice before the next difficult moment. Give yourself a pause, notice the thought, and bring your attention back to what is happening.',
    },
    cycle: {
      name: 'The Pattern Breaker', motif: 'break',
      headline: 'Make this the start that changes the pattern.',
      description: 'You want a different response when the familiar urge arrives. Structure is your starting point.',
      focus: 'Interrupt the habit before it runs on autopilot.',
      challenge: 'The urge that catches you unprepared.',
      support: 'Add friction now, and choose what you will do instead.',
      steps: ['Interrupt easy access.', 'Rehearse your response to urges.', 'Make your new response familiar.'],
      preview: 'The decision to watch can begin long before you open a site.',
      hinge: 'Your plan looks at what sets the urge off, the moment it becomes automatic, and',
      continuation: 'the point where you can add friction and choose a different response. Protect that moment with a simple action you can practice before the next urge.',
    },
    quiet: {
      name: 'The Quiet Fighter', motif: 'shield',
      headline: 'Take back control. Stop carrying it alone.',
      description: 'Support should feel comfortable to use. Your plan gives you a private way to reach for it.',
      focus: 'Build support you feel comfortable turning to.',
      challenge: 'Finding support you feel comfortable using.',
      support: 'Give yourself a private place to reach for support before the urge builds.',
      steps: ['Protect your private space.', 'Build a support routine.', 'Stay connected when it gets hard.'],
      preview: 'Support is easier to use when you decide what feels right before an urge arrives.',
      hinge: 'Your plan looks at the support you would choose, how to make it easy to reach, and',
      continuation: 'a private way to bring support into that moment. Choose somewhere to turn before you need it, and make reaching out part of your routine.',
    },
    focus: {
      name: 'The Focus Reclaimer', motif: 'compass',
      headline: 'Put your energy back into your own life.',
      description: 'You have something you want to build. Your plan helps you make room for it again.',
      focus: 'Turn reclaimed time into something that matters.',
      challenge: 'Losing the time you meant to use differently.',
      support: 'Protect one part of your day for the goal you chose.',
      steps: ['Protect your focus.', 'Replace the automatic routine.', 'Put your energy into your goal.'],
      preview: 'The habit can take more than the time you spend watching.',
      hinge: 'Your plan looks at where your attention gets pulled away, what you keep putting off, and',
      continuation: 'how to protect part of your day for the goals you chose. Give that time a clear purpose and a routine you can return to.',
    },
    starter: {
      name: 'The Fresh Starter', motif: 'door',
      headline: 'Turn “I want to quit” into your next move.',
      description: 'You are looking for a clear way in. Your plan gives you a place to start and a next step to follow.',
      focus: 'Replace uncertainty with a clear first step.',
      challenge: 'Waiting until you feel completely ready.',
      support: 'Start with blocking and one routine you can repeat tomorrow.',
      steps: ['Set up your protection.', 'Find a routine that fits.', 'Keep what works for you.'],
      preview: 'A decision to quit can stall when the next difficult moment has no plan.',
      hinge: 'Your plan looks at where to begin, what could pull you back into the old routine, and',
      continuation: 'the response to practice before that moment arrives. Start with protection, choose a simple alternative, and make it easy to repeat tomorrow.',
    },
  };

  function resolveLegacy(answers) {
    const performance = answers.pathway === 'performance';
    const scores = Object.fromEntries(Object.keys(profiles).map(key => [key, 0]));
    const reasons = Object.fromEntries(Object.keys(profiles).map(key => [key, []]));
    const add = (key, weight, reason) => { scores[key] += weight; if (reason) reasons[key].push({ weight, text: reason }); };
    if (answers.frequency === 'Daily') add('cycle', 2, 'A daily habit');
    if (answers.frequency === 'Already trying to cut back') add('cycle', 1, 'Already cutting back');
    if (answers.contentIntensity === 'Yes') add('cycle', 1, 'A pattern you want to change');
    if (answers.triedQuit === 'Yes') {
      add('cycle', 1, 'You have tried before');
      if (answers.quitProgress === 'Not great, I keep relapsing') add('cycle', 5, 'Repeated setbacks');
      if (answers.quitProgress === 'On and off') add('cycle', 4, 'On-and-off progress');
      if (answers.quitProgress === "Good, I've made real progress") add('confidence', 2, 'Progress to build on');
    }
    if (answers.triedQuit === 'No') add('starter', 3, 'Your first attempt');
    if (performance) {
      if (answers.performanceGoal === 'Feel confident during intimacy') add('confidence', 5, 'Confidence in intimacy');
      if (answers.performanceGoal === 'Feel closer to my partner') add('reconnect', 5, 'Closeness with your partner');
      if (answers.performanceGoal === 'Stop falling back into the same habit') add('cycle', 5, 'Breaking the familiar pattern');
      if (answers.performanceGoal === 'Get my focus and energy back') add('focus', 5, 'Reclaiming focus and energy');
      // Recognize saved goals from earlier versions alongside the current priorities.
      if (answers.performanceGoal === 'Performing with confidence') add('confidence', 4, 'Confidence in intimacy');
      if (answers.performanceGoal === 'Feeling normal again') add('confidence', 4, 'Feeling like yourself again');
      if (answers.performanceGoal === 'Confidently satisfying my partner and feeling proud of it') add('reconnect', 5, 'Closeness with your partner');
      if (answers.relationshipImpact === "Yes, it's affected a relationship") add('reconnect', 3, 'A relationship affected');
      if (answers.relationshipImpact === "I avoid dating or relationships because I'm scared to perform") add('reconnect', 4, 'Pulling away from dating');
      if (answers.performanceExperience === "No, but I'm worried it will happen") add('confidence', 1, 'Worry about future intimacy');
    } else {
      if (answers.identityGoal === 'More disciplined') add('cycle', 3, 'More discipline');
      if (answers.identityGoal === 'More confident') add('confidence', 5, 'More confidence');
      if (answers.identityGoal === 'More present with people') add('reconnect', 5, 'Being present with people');
      if (answers.identityGoal === 'More productive') add('focus', 5, 'More focus and productivity');
      if (answers.obstacle === "The habit's stronger than my willpower") add('cycle', 4, 'Willpower has not felt enough');
      if (answers.obstacle === "I've tried and failed before") add('cycle', 3, 'Previous attempts');
      if (answers.obstacle === "I don't know where to start") add('starter', 5, 'You want a starting point');
      if (answers.obstacle === "Honestly, I haven't tried") add('starter', 3, 'Ready for a first step');
      if (answers.support === 'No one') add('quiet', 5, 'Doing this on your own');
      if (answers.support === "I'm hiding it") add('quiet', 6, 'Keeping this private');
      if (['A quiet sense of shame lingers', "I don't let people get close because of the shame"].includes(answers.identityImpact)) add('quiet', 3, 'Keeping difficult feelings inside');
      if (answers.identityImpact === 'I feel like less of a man') add('confidence', 2, 'Self-confidence affected');
      if (['I feel drained and unmotivated afterward', 'I lose focus for hours afterward'].includes(answers.identityImpact)) add('focus', 3, 'Energy and focus affected');
      if (['I feel like I broke a promise to myself', 'I feel like I let myself down again'].includes(answers.identityImpact)) add('cycle', 2, 'Promises you want to keep');
      if (answers.reclaimedTime === 'Build my body') add('focus', 3, 'Energy for your body');
      if (answers.reclaimedTime === 'Create a business') add('focus', 3, 'Time to build your business');
      if (answers.reclaimedTime === 'Spend time with people who matter') add('reconnect', 3, 'Time for people who matter');
      if (answers.reclaimedTime === 'Create meaningful relationships') add('reconnect', 3, 'Meaningful relationships');
    }
    // Stable tie-break: prefer the strongest individual answer, then the goal-led order.
    const order = performance ? ['confidence', 'reconnect', 'cycle', 'starter', 'quiet', 'focus'] : ['focus', 'reconnect', 'confidence', 'quiet', 'cycle', 'starter'];
    const ranked = order.sort((a, b) => scores[b] - scores[a] || Math.max(0, ...reasons[b].map(r => r.weight)) - Math.max(0, ...reasons[a].map(r => r.weight)));
    const key = scores[ranked[0]] ? ranked[0] : 'starter';
    const clues = [...new Set(reasons[key].sort((a, b) => b.weight - a.weight).map(r => r.text))].slice(0, 3);
    return { key, ...profiles[key], clues, hasEvidence: clues.length > 0 };
  }

  // Shared answers drive new results on either path. Branch-specific goals remain
  // useful context, but no longer count the same confidence concern repeatedly.
  const sharedEvidence = {
    motivation: {
      'Sexual pleasure': [],
      'Relieving stress': [['cycle', 1, 'Turning to porn for stress relief']],
      'Escaping difficult feelings': [['quiet', 1, 'Looking for relief from difficult feelings']],
      'Filling time when bored': [['cycle', 1, 'Watching when bored']],
      'It feels automatic': [['cycle', 2, 'An automatic habit']],
      'Something else or not sure': [],
    },
    urgeContext: {
      'Alone at night': [['cycle', 1, 'Nighttime urges']],
      'While scrolling on my phone': [['cycle', 1, 'Phone scrolling as a trigger']],
      'When putting off a task': [['focus', 2, 'Watching when putting tasks off']],
      'After a difficult day': [['cycle', 1, 'Urges after a difficult day']],
      'It varies': [], 'Not sure': [],
    },
    watchControl: {
      'Never': [], 'Rarely': [],
      'Sometimes': [['cycle', 1, 'Sometimes watching longer than intended']],
      'Often': [['cycle', 3, 'Often watching longer than intended']],
      'Very often': [['cycle', 4, 'Regularly watching longer than intended']],
      "I haven't watched in the past month": [],
    },
    changePriority: {
      'Control over the habit': [['cycle', 2, 'More control over the habit']],
      'More time and focus': [['focus', 4, 'More time and focus']],
      'Feeling better about myself': [['confidence', 4, 'Feeling better about yourself']],
      'Closer relationships': [['reconnect', 4, 'Closer relationships']],
      'Confidence in intimacy': [['confidence', 4, 'Confidence in intimacy']],
    },
    setbackTrigger: {
      'Stress or difficult feelings': [['quiet', 2, 'Difficult feelings behind setbacks']],
      'Easy access in the moment': [['cycle', 2, 'Easy access behind setbacks']],
      'Not knowing what to do instead': [['starter', 3, 'Needing a clear alternative']],
      'One setback makes me give up': [['confidence', 2, 'Rebuilding after a setback']],
      "I haven't returned to it": [], 'Something else or not sure': [],
    },
    supportPreference: {
      'Seeing my progress in real time': [['confidence', 2, 'Wanting to see progress add up']],
      'Talking to people who get it': [['reconnect', 2, 'Wanting people who understand']],
      'Support 24/7, whenever an urge hits': [['quiet', 3, 'A preference for private, on-demand support']],
      'Understanding why this happens': [['starter', 2, 'Wanting to understand the pattern']],
      'Blocking adult sites automatically': [['cycle', 2, 'Wanting friction against easy access']],
      // Earlier wording, kept so sessions saved before 2026-09-17 still score.
      'Private guidance on my own': [['quiet', 2, 'A preference for private guidance']],
      'An anonymous community': [['quiet', 4, 'A preference for anonymous support']],
      'Someone I trust': [], "I'm not sure yet": [],
    },
  };

  function resolve(answers) {
    const shared = Object.entries(sharedEvidence).filter(([field, choices]) =>
      (field !== 'setbackTrigger' || answers.triedQuit === 'Yes') && Object.hasOwn(choices, answers[field]));
    if (!shared.length) return resolveLegacy(answers);
    const scores = Object.fromEntries(Object.keys(profiles).map(key => [key, 0]));
    const reasons = Object.fromEntries(Object.keys(profiles).map(key => [key, []]));
    const add = (key, weight, text) => { scores[key] += weight; reasons[key].push({ weight, text }); };
    for (const [field, choices] of shared) for (const entry of choices[answers[field]]) add(...entry);
    // Frequency is context, not a proxy for loss of control.
    if (answers.frequency === 'Daily') add('cycle', 1, 'A daily habit');
    if (answers.triedQuit === 'No') add('starter', 3, 'Your first attempt');
    if (answers.triedQuit === 'Yes') {
      add('cycle', 1, 'You have tried before');
      if (answers.quitProgress === 'Not great, I keep relapsing') add('cycle', 2, 'Repeated setbacks');
      if (answers.quitProgress === 'On and off') add('cycle', 1, 'On-and-off progress');
    }
    const priority = sharedEvidence.changePriority[answers.changePriority]?.[0]?.[0];
    const ranked = Object.keys(profiles).sort((a, b) => scores[b] - scores[a]
      || Number(b === priority) - Number(a === priority)
      || Math.max(0, ...reasons[b].map(r => r.weight)) - Math.max(0, ...reasons[a].map(r => r.weight)));
    const key = scores[ranked[0]] > 0 ? ranked[0] : 'starter';
    const evidence = reasons[key].sort((a, b) => b.weight - a.weight).map(reason => reason.text);
    const context = [answers.changePriority, answers.urgeContext, answers.supportPreference]
      .filter(value => value && !['Not sure', 'It varies', "I'm not sure yet"].includes(value))
      .filter(value => shared.some(([field]) => answers[field] === value));
    const clues = [...new Set([...evidence, ...context])].slice(0, 3);
    const meaningfulAnswers = shared.filter(([field]) => !['Something else or not sure', 'Not sure', 'It varies', "I'm not sure yet"].includes(answers[field]));
    return { key, ...profiles[key], clues, hasEvidence: evidence.length > 0 && meaningfulAnswers.length >= 3, evidenceMode: 'shared' };
  }

  function emblem(motif) {
    const symbols = {
      bridge: '<path d="M99 184v-53m122 53v-53M100 151c28-63 92-63 120 0M100 163h120M122 151v25m25-32v32m26-32v32m25-25v25"/>',
      sunrise: '<path d="M105 175h110m-88-13a34 34 0 0 1 66 0M160 104v-16m-48 37-12-12m108 12 12-12M93 150H79m148 0h14M121 190h78M143 203h34"/>',
      break: '<path d="m142 117 17-17a25 25 0 0 1 35 35l-15 15m-34 9-15 15a25 25 0 0 0 35 35l18-18M153 144l-15 15m40-27 13-14M109 132l-15-8m111 43 17 7M132 101l-5-15"/>',
      shield: '<path d="M160 92c-14 15-36 22-54 25v47c0 28 25 47 54 62 29-15 54-34 54-62v-47c-18-3-40-10-54-25Z"/><path d="m160 126 8 23 24 8-24 8-8 24-8-24-24-8 24-8Z"/>',
      compass: '<path d="m160 94 21 44 45 22-45 22-21 44-21-44-45-22 45-22Z"/><path d="m160 132 9 19 19 9-19 9-9 19-9-19-19-9 19-9Z"/>',
      door: '<path d="M115 209V102h88v107M140 209V121l63-19M159 156v16M90 220h140M105 233h110"/><path d="m217 110 10-17m-19 6 1-17m18 35 15-8"/>',
    };
    return `<svg class="archetype-emblem" viewBox="0 0 320 320" fill="none" aria-hidden="true"><defs><linearGradient id="archetypeFace" x1="68" y1="38" x2="244" y2="282" gradientUnits="userSpaceOnUse"><stop stop-color="#8960b7"/><stop offset=".48" stop-color="#392552"/><stop offset="1" stop-color="#171024"/></linearGradient><linearGradient id="archetypeEdge" x1="75" y1="58" x2="246" y2="273" gradientUnits="userSpaceOnUse"><stop stop-color="#e0c0ff"/><stop offset=".5" stop-color="#9563ca"/><stop offset="1" stop-color="#30203f"/></linearGradient><linearGradient id="archetypeSymbol" x1="110" y1="96" x2="210" y2="225" gradientUnits="userSpaceOnUse"><stop stop-color="#f0dfff"/><stop offset="1" stop-color="#b484e4"/></linearGradient></defs><path class="emblem-shadow" d="m160 42 106 61v122l-106 61-106-61V103Z" fill="#0f0a19"/><g class="emblem-body"><path d="m160 30 106 61v122l-106 61-106-61V91Z" fill="url(#archetypeFace)" stroke="url(#archetypeEdge)" stroke-width="1.5"/><path d="m160 43 94 54v109l-94 54-94-54V97Z" stroke="#d0a6f8" stroke-opacity=".22"/><path d="m54 91 106 61L266 91M160 152v122" stroke="#d6b5f3" stroke-opacity=".06"/><path d="m160 30 106 61-106 61L54 91Z" fill="#dab7ff" fill-opacity=".035"/><g class="emblem-symbol" stroke="url(#archetypeSymbol)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${symbols[motif] || symbols.door}</g><path d="M151 65h18m-14 173h10" stroke="#d9b5f7" stroke-opacity=".45" stroke-linecap="round"/></g></svg>`;
  }
  return Object.freeze({ resolve, emblem });
})();
