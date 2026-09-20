const crypto = require('node:crypto');
const schema = require('../funnel-schema');
const { resolve } = require('../funnel-archetypes');
const { supabaseAdmin } = require('./supabase');
const { required, siteUrl } = require('./env');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENTS = new Set(['step_view', 'step_exit', 'step_completed', 'answer_changed', 'quiz_completed', 'offer_viewed', 'checkout_clicked', 'checkout_cancelled', 'checkout_error']);
class TrackingError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
function assertOrigin(request) {
  const origin = request.headers?.origin;
  const allowed = new Set([new URL(siteUrl()).origin]);
  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:8000'); allowed.add('http://localhost:3000');
  }
  if (origin && !allowed.has(origin)) throw new TrackingError('Origin is not allowed.', 403);
}
function cleanBatch(input) {
  if (!input || !UUID.test(input.id) || typeof input.secret !== 'string' || !/^[a-f0-9]{64}$/.test(input.secret)) throw new TrackingError('Invalid quiz session proof.');
  if (input.version !== schema.VERSION) throw new TrackingError('Refresh the quiz to use the current version.', 409);
  if (!Number.isSafeInteger(input.sequence) || input.sequence < 1 || input.sequence > 1000000) throw new TrackingError('Invalid sequence.');
  if (!schema.stepIds.has(input.step)) throw new TrackingError('Invalid step.');
  const quizAnswers = schema.answers(input.answers);
  const pathway = quizAnswers.forkAnswer === 'Yes' ? 'performance' : 'identity';
  const result = resolve({ ...quizAnswers, pathway });
  const quizResult = { key: result.key, name: result.name, focus: result.focus, hasEvidence: result.hasEvidence, version: schema.VERSION };
  if (!Array.isArray(input.events) || input.events.length > 40) throw new TrackingError('Invalid event batch.');
  const events = input.events.map(event => {
    if (!event || !UUID.test(event.id) || !EVENTS.has(event.type) || !schema.stepIds.has(event.step)) throw new TrackingError('Invalid event.');
    const properties = {};
    if (schema.stepIds.has(event.nextStep)) properties.next_step = event.nextStep;
    if (['forward', 'back', 'reload', 'hidden'].includes(event.direction)) properties.direction = event.direction;
    const field = schema.answerKey(event.step);
    if (field && event.type === 'answer_changed') properties.answer_key = field;
    if (['apple', 'google'].includes(event.provider)) properties.provider = event.provider;
    return { id: event.id, type: event.type, step: event.step, properties,
      duration_ms: Math.min(3600000, Math.max(0, Number.isFinite(event.duration) ? Math.round(event.duration) : 0)) };
  });
  const context = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    if (typeof input.context?.[key] === 'string') context[key] = input.context[key].replace(/[^a-zA-Z0-9 _.:/-]/g, '').slice(0, 120);
  }
  for (const key of ['locale', 'timezone']) if (typeof input.context?.[key] === 'string') context[key] = input.context[key].replace(/[^a-zA-Z0-9_+/-]/g, '').slice(0, 60);
  if (['mobile', 'tablet', 'desktop'].includes(input.context?.device)) context.device = input.context.device;
  if (typeof input.context?.referrer_host === 'string' && /^[a-z0-9.-]{1,150}$/i.test(input.context.referrer_host)) context.referrer_host = input.context.referrer_host;
  return { id: input.id, proofHash: crypto.createHash('sha256').update(input.secret).digest('hex'), sequence: input.sequence,
    step: input.step, answers: quizAnswers, result: quizResult, pathway, events, context };
}
async function ingest(input, request) {
  assertOrigin(request);
  const batch = cleanBatch(input);
  // Daily HMAC bucket; never store an address or a credential in analytics.
  const address = String(request.headers?.['x-vercel-forwarded-for'] || request.headers?.['x-forwarded-for'] || request.socket?.remoteAddress || 'local').split(',')[0];
  const bucket = crypto.createHmac('sha256', required('SUPABASE_SERVICE_ROLE_KEY'))
    .update(`${new Date().toISOString().slice(0, 10)}:${address}`).digest('hex');
  const rows = await supabaseAdmin('/rest/v1/rpc/relustt_record_quiz', { method: 'POST', body: JSON.stringify({
    p_id: batch.id, p_proof_hash: batch.proofHash, p_sequence: batch.sequence,
    p_version: schema.VERSION, p_step: batch.step, p_answers: batch.answers, p_result: batch.result,
    p_pathway: batch.pathway, p_context: batch.context, p_events: batch.events, p_rate_key: bucket,
  }) });
  return { batch, session: Array.isArray(rows) ? rows[0] : rows };
}
module.exports = { TrackingError, assertOrigin, cleanBatch, ingest };
