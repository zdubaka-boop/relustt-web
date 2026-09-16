const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ window: {} });
vm.runInContext(readFileSync(join(__dirname, '../funnel-archetypes.js'), 'utf8'), context);
const { resolve, emblem } = context.window.RelusttArchetypes;

const examples = [
  ['reconnect', { pathway: 'performance', performanceGoal: 'Confidently satisfying my partner and feeling proud of it', anxietyTrigger: "Comparing the moment to what I've watched", relationshipImpact: "Yes, it's affected a relationship" }],
  ['confidence', { pathway: 'performance', performanceGoal: 'Performing with confidence', triedQuit: 'Yes', quitProgress: "Good, I've made real progress" }],
  ['cycle', { pathway: 'identity', frequency: 'Daily', obstacle: "The habit's stronger than my willpower", triedQuit: 'Yes', quitProgress: 'On and off' }],
  ['quiet', { pathway: 'identity', identityGoal: 'More disciplined', support: "I'm hiding it", identityImpact: 'A quiet sense of shame lingers' }],
  ['focus', { pathway: 'identity', identityGoal: 'More productive', reclaimedTime: 'Create a business', identityImpact: 'I lose focus for hours afterward' }],
  ['starter', { pathway: 'identity', identityGoal: 'More confident', obstacle: "I don't know where to start", triedQuit: 'No' }],
];
for (const [expected, answers] of examples) {
  const profile = resolve(answers);
  assert.equal(profile.key, expected);
  assert.ok(profile.hasEvidence);
  assert.ok(profile.clues.length >= 2 && profile.clues.length <= 3);
  assert.equal(profile.steps.length, 3);
  assert.match(emblem(profile.motif), /<svg/);
  assert.equal(resolve({ ...answers, name: 'Another name', selectedPrice: '17.67', commitment: 10 }).key, expected, 'Price/name/readiness must not change the profile');
}
// Evidence from an inactive branch must not override the actual current answers.
for (const [performanceGoal, expected] of [
  ['Feel confident during intimacy', 'confidence'],
  ['Feel closer to my partner', 'reconnect'],
  ['Stop falling back into the same habit', 'cycle'],
  ['Get my focus and energy back', 'focus'],
]) {
  const answers = { pathway: 'performance', performanceGoal };
  assert.equal(resolve(answers).key, expected, 'Each priority contributes distinct evidence');
  assert.deepEqual(resolve({ ...answers, anxietyTrigger: 'Stress or pressure in the moment' }), resolve(answers), 'The removed anxiety question must not affect the result');
  assert.deepEqual(resolve({ ...answers, confidenceSpill: 'Yes, it bleeds into everything' }), resolve(answers), 'The removed confidence question must not affect the result');
  assert.equal(resolve({ ...answers, pathway: 'identity' }).hasEvidence, false, 'Performance priorities only count on the active performance branch');
}
assert.equal(resolve({ pathway: 'performance', performanceGoal: 'Feel confident during intimacy', triedQuit: 'Yes', quitProgress: 'Not great, I keep relapsing', frequency: 'Daily' }).key, 'cycle', 'The full answer pattern can outweigh a single priority');
assert.equal(resolve({ ...examples[1][1], support: "I'm hiding it", identityGoal: 'More productive', reclaimedTime: 'Create a business', identityImpact: 'I lose focus for hours afterward' }).key, 'confidence');
assert.equal(resolve({ ...examples[4][1], performanceGoal: 'Performing with confidence', anxietyTrigger: 'Stress or pressure in the moment', confidenceSpill: 'Yes, it bleeds into everything' }).key, 'focus');
// A second relevant answer can change the profile; it is not a single-question label.
assert.equal(resolve({ identityGoal: 'More confident' }).key, 'confidence');
assert.equal(resolve({ identityGoal: 'More confident', support: "I'm hiding it", identityImpact: 'A quiet sense of shame lingers' }).key, 'quiet');
// Cleared quit history must ignore stale prior progress.
assert.equal(resolve({ triedQuit: 'No', quitProgress: 'Not great, I keep relapsing', obstacle: "I don't know where to start" }).key, 'starter');
assert.equal(resolve({}).hasEvidence, false);
assert.equal(resolve({}).key, 'starter');
assert.equal(resolve({ pathway: 'performance' }).hasEvidence, false);
assert.equal(resolve({ identityGoal: '<script>bad</script>', support: 'invented' }).hasEvidence, false);
// Shared evidence makes every profile reachable on both completed paths.
const sharedBase = {
  frequency: 'A few times a month', motivation: 'Sexual pleasure', urgeContext: 'It varies',
  watchControl: 'Rarely', changePriority: 'Control over the habit', supportPreference: "I'm not sure yet",
  triedQuit: 'Yes', quitProgress: "Good, I've made real progress", setbackTrigger: "I haven't returned to it",
};
const sharedExamples = [
  ['confidence', { changePriority: 'Confidence in intimacy' }],
  ['reconnect', { changePriority: 'Closer relationships' }],
  ['cycle', { motivation: 'It feels automatic', watchControl: 'Often', setbackTrigger: 'Easy access in the moment' }],
  ['quiet', { motivation: 'Escaping difficult feelings', supportPreference: 'Support 24/7, whenever an urge hits', setbackTrigger: 'Stress or difficult feelings' }],
  ['focus', { changePriority: 'More time and focus', urgeContext: 'When putting off a task' }],
  ['starter', { triedQuit: 'No' }],
];
for (const pathway of ['identity', 'performance']) for (const [expected, overrides] of sharedExamples) {
  const answers = { ...sharedBase, ...overrides, pathway };
  const actual = resolve(answers);
  assert.equal(actual.key, expected, `${expected} reachable on ${pathway}`);
  assert.equal(actual.evidenceMode, 'shared');
  assert.ok(actual.hasEvidence);
  assert.equal(resolve({ ...answers, performanceGoal: 'Performing with confidence', anxietyTrigger: 'Stress or pressure in the moment', confidenceSpill: 'Yes, it bleeds into everything', identityGoal: 'More productive', support: "I'm hiding it" }).key, expected, 'Branch questions do not double count shared evidence');
}
const patternAnswers = { ...sharedBase, motivation: 'It feels automatic', watchControl: 'Very often', quitProgress: 'Not great, I keep relapsing' };
assert.equal(resolve({ ...patternAnswers, pathway: 'performance', changePriority: 'Confidence in intimacy', performanceGoal: 'Feeling normal again' }).key, 'cycle', 'Strong habit evidence can outweigh an intimacy goal');
assert.equal(resolve({ ...sharedBase, triedQuit: 'No', quitProgress: 'Not great, I keep relapsing', setbackTrigger: 'Easy access in the moment' }).key, 'starter', 'Stale setbacks ignored after changing quit history');
assert.equal(resolve({ changePriority: 'More time and focus' }).hasEvidence, false, 'One new answer does not claim completed analysis');
assert.equal(resolve({ motivation: 'Something else or not sure', urgeContext: 'Not sure', supportPreference: "I'm not sure yet", triedQuit: 'Yes' }).hasEvidence, false, 'Uncertain answers do not satisfy the evidence minimum');
assert.equal(resolve({ pathway: 'performance' }).key, 'starter', 'No automatic confidence points for a route');
assert.equal(resolve({ ...sharedBase, motivation: 'Something else or not sure', urgeContext: 'Not sure', supportPreference: "I'm not sure yet" }).clues.some(clue => /not sure/i.test(clue)), false, 'Unknown answers are not evidence');
process.stdout.write('Legacy and shared archetypes, all six profiles on both paths, stale answers and sparse evidence passed.\n');
