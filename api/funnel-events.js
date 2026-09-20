const { methodNotAllowed, parseJsonBody, sendJson } = require('../server/http');
const { ingest, TrackingError } = require('../server/funnel-tracking');
module.exports = async (request, response) => {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  try {
    const body = parseJsonBody(request);
    if (Buffer.byteLength(JSON.stringify(body)) > 32768) return sendJson(response, 413, { error: 'Batch too large.' });
    const { session } = await ingest(body, request);
    return sendJson(response, 200, { saved: true, sequence: session.sequence });
  } catch (error) {
    const status = error instanceof TrackingError ? error.status : error?.payload?.code === '42501' ? 403 : error?.payload?.code === 'P0001' ? 429 : 503;
    return sendJson(response, status, { error: status === 503 ? 'Quiz saving is temporarily unavailable.' : 'Quiz batch rejected.' });
  }
};
module.exports.config = { api: { bodyParser: { sizeLimit: '32kb' } } };
