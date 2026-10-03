// Pliki z koncami linii Windows (CRLF) - Git na Windows domyslnie tak je zapisuje (core.autocrlf=true).
// Kryteria: docs/specs/windows.md (AC-W1..AC-W4, zmiana 0.27.1). Panel liczy to samo co dla LF.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readProgress } = require('../progress');
const { fingerprint } = require('../fingerprint');
const { createModule, moduleInfo } = require('../modules');
const { moduleSummary } = require('../info');

const BOARD = path.join(__dirname, '..');
const DEMO_REQ = path.join(BOARD, '..', 'demo', 'zlecenia', 'requirements');
const TEMPLATES = path.join(BOARD, '..', 'templates');

// Kopia folderu z wszystkimi plikami tekstowymi przerobionymi na CRLF.
function crlfCopy(src) {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-crlf-'));
  fs.cpSync(src, dst, { recursive: true });
  (function walk(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
      const f = path.join(d, e.name);
      if (e.isDirectory()) return walk(f);
      if (/\.(md|ya?ml)$/.test(e.name)) fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/\r?\n/g, '\r\n'));
    });
  })(dst);
  return dst;
}
// rozmiar i data pliku roznia sie z natury (CRLF ma wiecej bajtow) - poza porownaniem
// Lista plikow Intake idzie od najnowszego, a kopia ma inne daty - porownanie bez kolejnosci (Windows w Actions).
const strip = p => JSON.parse(JSON.stringify(p, (k, v) => (k === 'dir' || k === 'size' || k === 'mtime' ? undefined
  : k === 'files' && Array.isArray(v) ? v.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))) : v)));

test('AC-W1: postep modulu z CRLF taki sam jak z LF', () => {
  const lf = readProgress(DEMO_REQ), cr = readProgress(crlfCopy(DEMO_REQ));
  assert.deepStrictEqual(cr.stages.map(s => s.status), lf.stages.map(s => s.status));
  assert.deepStrictEqual(strip(cr.stages), strip(lf.stages));
  assert.strictEqual(cr.next && cr.next.key, lf.next && lf.next.key);
});

test('AC-W2: odcisk wymagan niezalezny od koncow linii (takze SDD.yaml)', () => {
  assert.strictEqual(fingerprint(crlfCopy(DEMO_REQ)), fingerprint(DEMO_REQ));
});

test('AC-W3: nowy modul z szablonow CRLF - role i poziom wpisane', () => {
  const tpl = crlfCopy(TEMPLATES);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-crlf-mod-'));
  const dir = createModule(root, { name: 'faktury', level: 'light', approver: 'kierownik' }, { git: false, templates: tpl });
  const y = fs.readFileSync(path.join(dir, 'requirements', 'SDD.yaml'), 'utf8');
  assert.match(y, /role: "kierownik"\r?\n\s+approves: \[R, D, GLOSSARY, BR\]/);
  assert.match(y, /^level: light/m);
  assert.doesNotMatch(y, /wlasciciel procesu/);
  assert.strictEqual(moduleInfo(dir).level, 'light');
});

test('AC-W4: opis modulu (zakladka Modul) z CRLF taki sam jak z LF', () => {
  const lf = moduleSummary(DEMO_REQ), cr = moduleSummary(crlfCopy(DEMO_REQ));
  assert.ok(cr.counts.requirements > 0);
  assert.deepStrictEqual(cr.counts, lf.counts);
});
