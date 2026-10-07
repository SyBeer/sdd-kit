// Dyktowanie systemowe z okna czatu. Kryteria z docs/specs/claude-chat.md (AC-CH6, AC-CH7, zmiana 0.38.0).
// Wycofanie: usun dictate.js, ten plik i bloki "DYKTOWANIE (0.38.0)" w server.js i ui.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const B = path.join(__dirname, '..');
let d; try { d = require('../dictate'); } catch (e) { d = null; }

test('AC-CH6: dictateCommand - Windows Win+H, macOS menu Dyktowanie PL/EN, inne - brak; SDD_DICTATE=0 wylacza', () => {
  assert.ok(d, 'brak dictate.js');
  const w = d.dictateCommand('win32');
  assert.strictEqual(w.cmd, 'powershell.exe');
  const enc = w.args[w.args.indexOf('-EncodedCommand') + 1];
  const ps = Buffer.from(enc, 'base64').toString('utf16le');
  assert.match(ps, /keybd_event/); assert.match(ps, /0x5B/); assert.match(ps, /0x48/);
  const m = d.dictateCommand('darwin');
  assert.strictEqual(m.cmd, 'osascript');
  const as = m.args.join('\n');
  ['Rozpocznij dyktowanie', 'Start Dictation', 'Edycja', 'Edit', 'frontmost'].forEach(t => assert.ok(as.includes(t), t));
  assert.strictEqual(d.dictateCommand('linux'), null);
  assert.strictEqual(d.enabled({}, 'darwin'), true);
  assert.strictEqual(d.enabled({ SDD_DICTATE: '0' }, 'darwin'), false);
  assert.strictEqual(d.enabled({}, 'linux'), false);
  assert.match(d.hint('darwin', 'not allowed assistive access'), /Dostępność/);
  assert.match(d.hint('win32', 'x'), /Pisanie głosowe|Win\+H/);
});

test('AC-CH7: kod dyktowania tylko w dictate.js i w blokach DYKTOWANIE (0.38.0) - da sie go wycofac', () => {
  for (const f of ['server.js', 'ui.js']) {
    const s = fs.readFileSync(path.join(B, f), 'utf8');
    const starts = s.split('// DYKTOWANIE (0.38.0) start').length - 1, ends = s.split('// DYKTOWANIE (0.38.0) koniec').length - 1;
    assert.ok(starts >= 1 && starts === ends, f + ': bloki');
    const outside = s.replace(/\/\/ DYKTOWANIE \(0\.38\.0\) start[\s\S]*?\/\/ DYKTOWANIE \(0\.38\.0\) koniec/g, '');
    assert.doesNotMatch(outside, /dictat|dyktow|cd-mic/i, f + ': kod dyktowania poza blokami');
  }
});
