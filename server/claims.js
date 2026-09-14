const crypto = require('node:crypto');

const COOKIE_NAME = 'relustt_purchase_claim';

function newClaimCredentials() {
  return {
    id: crypto.randomUUID(),
    secret: crypto.randomBytes(32).toString('base64url'),
  };
}

function hashClaimSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function parseCookies(request) {
  return Object.fromEntries(
    (request.headers.cookie || '')
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf('=');
        if (separator < 0) return [entry, ''];
        return [entry.slice(0, separator), decodeURIComponent(entry.slice(separator + 1))];
      })
  );
}

function claimCookie(request) {
  const value = parseCookies(request)[COOKIE_NAME] || '';
  const separator = value.indexOf('.');
  if (separator < 0) return null;
  return { id: value.slice(0, separator), secret: value.slice(separator + 1) };
}

function serializeClaimCookie(id, secret) {
  const value = encodeURIComponent(`${id}.${secret}`);
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=172800; HttpOnly; Secure; SameSite=Lax`;
}

function clearClaimCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function secretsMatch(candidate, expectedHash) {
  const actual = Buffer.from(hashClaimSecret(candidate));
  const expected = Buffer.from(expectedHash || '');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = {
  claimCookie,
  clearClaimCookie,
  hashClaimSecret,
  newClaimCredentials,
  secretsMatch,
  serializeClaimCookie,
};
