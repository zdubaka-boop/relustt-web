function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function parseJsonBody(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    return request.body;
  }
  if (typeof request.body === 'string') {
    return JSON.parse(request.body || '{}');
  }
  if (Buffer.isBuffer(request.body)) {
    return JSON.parse(request.body.toString('utf8') || '{}');
  }
  return {};
}

async function readRawBody(request) {
  if (Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === 'string') return Buffer.from(request.body, 'utf8');

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function methodNotAllowed(response, allowed) {
  response.setHeader('Allow', allowed.join(', '));
  sendJson(response, 405, { error: 'Method not allowed.' });
}

module.exports = { sendJson, parseJsonBody, readRawBody, methodNotAllowed };
