const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('published and source privacy copy disclose the same quiz storage', () => {
  for (const file of ['privacy.html', 'pages/src/privacy.md']) {
    const text = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.match(text, /saved in your browser tab and in our Supabase database/);
    assert.match(text, /it does not delete earlier server records/);
    assert.match(text, /safe word and drawn signature stay in page memory/);
    assert.doesNotMatch(text, /quiz does not send these answers to our server/);
  }
});
