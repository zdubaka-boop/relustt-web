/* Shared, credential-free tracking contract. Change VERSION when questions/scoring change. */
((root, factory) => {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.RelusttQuizSchema = value;
})(typeof window === 'object' ? window : globalThis, () => {
  const VERSION = 'relustt-2026-09-20-v1';
  const options = {
    frequency: ['Daily', 'A few times a week', 'A few times a month', 'Already trying to cut back'],
    motivation: ['Sexual pleasure', 'Relieving stress', 'Escaping difficult feelings', 'Filling time when bored', 'It feels automatic', 'Something else or not sure'],
    triedQuit: ['Yes', 'No'],
    quitProgress: ["Good, I've made real progress", 'Not great, I keep relapsing', 'On and off'],
    urgeContext: ['Alone at night', 'While scrolling on my phone', 'When putting off a task', 'After a difficult day', 'It varies', 'Not sure'],
    obstacle: ["The habit's stronger than my willpower", "I don't know where to start", "I've tried and failed before", "Honestly, I haven't tried"],
    watchControl: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often', "I haven't watched in the past month"],
    changePriority: ['Control over the habit', 'More time and focus', 'Feeling better about myself', 'Closer relationships', 'Confidence in intimacy'],
    forkAnswer: ['Yes', 'No', "I haven't been intimate with a partner yet"],
    intimacyConcern: ['Yes', 'No'], contentIntensity: ['Yes', 'A little', 'No'],
    setbackTrigger: ['Stress or difficult feelings', 'Easy access in the moment', 'Not knowing what to do instead', "I haven't returned to it"],
    supportPreference: ['Seeing my progress in real time', 'Talking to people who get it', 'Support 24/7, whenever an urge hits', 'Understanding why this happens', 'Blocking adult sites automatically'],
    selectedPrice: ['5', '9', '13', '17.67'],
  };
  // Stable slugs, answer keys, labels: no user data in this versioned catalog.
  const steps = [
    ['welcome', null, 'Welcome'], ['frequency', 'frequency', 'Viewing frequency'],
    ['motivation', 'motivation', 'Main motivation'], ['quit-history', 'triedQuit', 'Previous attempts'],
    ['quit-progress', 'quitProgress', 'Progress so far'], ['quit-feedback', null, 'Quit feedback'],
    ['urge-context', 'urgeContext', 'Urge context'], ['obstacles', 'obstacle', 'Main obstacle'],
    ['build-your-system', null, 'Obstacle insight'], ['personalizing', null, 'Personalizing'],
    ['watch-control', 'watchControl', 'Watching longer than intended'], ['main-priority', 'changePriority', 'Main priority'],
    ['intimacy', 'forkAnswer', 'Intimacy experience'], ['intimacy-concern', 'intimacyConcern', 'Intimacy concern'],
    ['intimacy-worry', null, 'Reassurance'], ['brain-conditioning', null, 'Brain conditioning'],
    ['performance-content-intensity', 'contentIntensity', 'Content intensity'], ['arousal-threshold', null, 'Arousal threshold'],
    ['setback-trigger', 'setbackTrigger', 'Setback trigger'], ['support-preference', 'supportPreference', 'Preferred support'],
    ['good-news', null, 'Support introduction'], ['your-support', null, 'Support feature'], ['one-more-thing', null, 'Blocker introduction bridge'],
    ['blocker-introduction', null, 'Blocking preview'], ['safe-word', null, 'Safe word setup (value excluded)'],
    ['blocker-ready', null, 'Blocker ready'], ['blocker-reminder', null, 'Blocker reminder'],
    ['performance-commitment', 'commitment', 'Commitment'], ['identity-commitment', 'commitment', 'Commitment'],
    ['your-name', 'name', 'Name'], ['pledge', null, 'Vow (signature excluded)'],
    ['analyzing-answers', null, 'Analysis'], ['choose-price', 'selectedPrice', 'Trial price'], ['your-plan', null, 'Personal offer'],
  ];
  const stepIds = new Set(steps.map(s => s[0]));
  const answerKey = step => steps.find(s => s[0] === step)?.[1];
  function answers(input = {}) {
    const result = {};
    for (const [key, allowed] of Object.entries(options)) {
      if (typeof input[key] === 'string' && allowed.includes(input[key])) result[key] = input[key];
    }
    if (Number.isInteger(input.commitment) && input.commitment >= 1 && input.commitment <= 10) result.commitment = input.commitment;
    if (typeof input.name === 'string') result.name = input.name.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80);
    if (result.triedQuit !== 'Yes') { delete result.quitProgress; delete result.setbackTrigger; }
    if (result.forkAnswer !== 'Yes') delete result.contentIntensity;
    if (result.forkAnswer !== "I haven't been intimate with a partner yet") delete result.intimacyConcern;
    return result;
  }
  return Object.freeze({ VERSION, options, steps, stepIds, answerKey, answers });
});
