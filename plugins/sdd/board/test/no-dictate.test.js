// Dyktowanie usuniete w 0.43.0 (docs/specs/claude-chat.md "Wycofanie dyktowania", AC-CH18).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const B = path.join(__dirname, '..');

test('AC-CH18: po dyktowaniu nie ma sladu w kodzie panelu', () => {
  assert.ok(!fs.existsSync(path.join(B, 'dictate.js')), 'dictate.js usuniety');
  assert.ok(!fs.existsSync(path.join(B, 'test', 'dictate.test.js')), 'dictate.test.js usuniety');
  ['server.js', 'ui.js', 'ui.css', 'info.html', 'info.js'].forEach(f => {
    const s = fs.readFileSync(path.join(B, f), 'utf8');
    assert.doesNotMatch(s, /dictat|dyktow|cd-mic|cd-hint2|🎙/i, f);
  });
});
