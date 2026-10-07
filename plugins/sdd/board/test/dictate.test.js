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

// ---------------------------------------------------------------- 0.39.1: wlasny skrot (Superwhisper) i wskazowka z aplikacja
test('AC-CH11: parseKeys i skrot programu do dyktowania (macOS key code, Windows keybd_event)', () => {
  assert.deepStrictEqual(d.parseKeys('option+space'), { mods: ['option'], key: 'space' });
  assert.deepStrictEqual(d.parseKeys(' Ctrl + Alt + D '), { mods: ['control', 'option'], key: 'd' });
  assert.deepStrictEqual(d.parseKeys('cmd+shift+f5'), { mods: ['command', 'shift'], key: 'f5' });
  assert.strictEqual(d.parseKeys('option+'), null);
  assert.strictEqual(d.parseKeys('option+ą'), null);
  assert.strictEqual(d.parseKeys(''), null);
  const m = d.dictateCommand('darwin', { keys: 'option+space' }).args.join('\n');
  assert.match(m, /key code 49 using \{option down\}/);
  assert.doesNotMatch(m, /Rozpocznij dyktowanie/);
  assert.match(d.dictateCommand('darwin', { keys: 'ctrl+alt+d' }).args.join('\n'), /keystroke "d" using \{control down, option down\}/);
  const w = d.dictateCommand('win32', { keys: 'ctrl+alt+d' });
  const ps = Buffer.from(w.args[w.args.indexOf('-EncodedCommand') + 1], 'base64').toString('utf16le');
  assert.match(ps, /0x11/); assert.match(ps, /0x12/); assert.match(ps, /0x44/); assert.doesNotMatch(ps, /0x5B/);
});

test('AC-CH12: wskazowka podaje aplikacje, ktora uruchomila serwer (Dostepnosc)', () => {
  const chain = [{ pid: 3, cmd: 'node /x/server.js' },
    { pid: 2, cmd: '/opt/homebrew/Cellar/python@3.13/3.13.13/Frameworks/Python.framework/Versions/3.13/Resources/Python.app/Contents/MacOS/Python hqai.py' }];
  assert.strictEqual(d.responsibleApp(chain), '/opt/homebrew/Cellar/python@3.13/3.13.13/Frameworks/Python.framework/Versions/3.13/Resources/Python.app');
  assert.strictEqual(d.responsibleApp([{ pid: 1, cmd: 'node x' }]), null);
  assert.match(d.hint('darwin', 'osascript is not allowed assistive access', '/a/Python.app'), /\/a\/Python\.app/);
  assert.match(d.hint('darwin', 'nomenu', null), /Dyktowanie/);
});

test('AC-CH13: skrot zapisywany w ~/.sdd-kit/config.json z Konfiguracji (w blokach do wycofania)', () => {
  const srv = fs.readFileSync(path.join(B, 'server.js'), 'utf8'), info = fs.readFileSync(path.join(B, 'info.html'), 'utf8');
  assert.match(srv, /dictateKeys/);
  assert.match(srv, /\/api\/chat\/dictate-keys/);
  assert.match(info, /id="f-dictate"/);
  // info.html tez tylko w blokach
  const starts = info.split('// DYKTOWANIE (0.38.0) start').length - 1;
  assert.ok(starts >= 1 && starts === info.split('// DYKTOWANIE (0.38.0) koniec').length - 1, 'bloki w info.html');
  const outside = info.replace(/\/\/ DYKTOWANIE \(0\.38\.0\) start[\s\S]*?\/\/ DYKTOWANIE \(0\.38\.0\) koniec/g, '');
  assert.doesNotMatch(outside, /dictat|dyktow|f-dictate/i);
});
