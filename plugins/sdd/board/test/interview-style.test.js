// Styl rozmowy wywiadu BIZ / INZ. Kryteria z docs/specs/interview-style.md (AC-IS1..AC-IS7, zmiana 0.37.0).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const info = require('../info.js');
const { fingerprint } = require('../fingerprint');

const B = path.join(__dirname, '..'), SK = path.join(B, '..', 'skills');
const TPL = path.join(B, '..', 'templates', 'requirements');
const read = f => fs.readFileSync(f, 'utf8');

test('AC-IS1: STYLES i yamlSet interview_style - walidacja, wstawienie pod kind', () => {
  assert.deepStrictEqual(info.STYLES, ['biz', 'inz']);
  const y = read(path.join(TPL, 'SDD.yaml'));
  assert.match(info.yamlSet(y, { interview_style: 'inz' }), /^interview_style: inz\b/m);
  assert.throws(() => info.yamlSet(y, { interview_style: 'luz' }), /interview_style/);
  const old = y.replace(/^interview_style:.*\n/m, '');
  const y2 = info.yamlSet(old, { interview_style: 'inz' });
  assert.match(y2, /^kind:.*\ninterview_style: inz +# biz \| inz/m);
  assert.strictEqual((y2.match(/^interview_style:/gm) || []).length, 1);
});

test('AC-IS2: serwer - interviewStyle w /api/config, zapis dozwolony; odcisk walidacji bez zmian', () => {
  const srv = read(path.join(B, 'server.js'));
  assert.match(srv, /interviewStyle: info\.yamlField\(y, 'interview_style'\) === 'inz' \? 'inz' : 'biz', stylesAllowed: info\.STYLES/);
  assert.match(srv, /allowed = \[[^\]]*'interview_style'/);
  // pole nie zmienia odcisku walidacji
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-is-'));
  fs.cpSync(TPL, path.join(dir, 'requirements'), { recursive: true });
  const req = path.join(dir, 'requirements'), f = path.join(req, 'SDD.yaml');
  const a = fingerprint(req);
  fs.writeFileSync(f, read(f).replace(/^interview_style:.*$/m, 'interview_style: inz'));
  assert.strictEqual(fingerprint(req), a);
});

test('AC-IS3: Konfiguracja - przelacznik #f-style BIZ / INZ z podpowiedzia', () => {
  const h = read(path.join(B, 'info.html'));
  assert.match(h, /seg\('f-style'/);
  assert.match(h, /STYLE_SHORT=\{biz:'BIZ',inz:'INŻ'\}/);
  assert.match(h, /body\.interview_style=\$\('#f-style'\)\.value/);
  assert.match(h, /id="stylehint"/);
});

test('AC-IS4: szablon SDD.yaml - interview_style: biz z komentarzem', () => {
  assert.match(read(path.join(TPL, 'SDD.yaml')), /^interview_style: biz +# biz \| inz - styl wywiadu/m);
});

test('AC-IS5: skill interview - sekcja Styl rozmowy (BIZ domyslnie, argument, przelaczanie, zasady, przyklad)', () => {
  const s = read(path.join(SK, 'interview', 'SKILL.md'));
  assert.match(s, /## Styl rozmowy \(BIZ \/ INZ\)/);
  ['interview_style', 'domyslnie `biz`', '`/sdd:interview live inz`', 'przejdz na BIZ', 'przejdz na INZ',
    'Autor raz na poczatku', 'w jakim stopniu instalacja już się zwróciła'].forEach(t => assert.ok(s.includes(t), t));
  // stary sztywny uklad tylko w INZ, stopka "Zarejestruj kto..." znika
  assert.doesNotMatch(s, /Zarejestruj kto udzielił odpowiedzi na pytanie/);
  assert.match(s, /W stylu INZ[^\n]*`Pytanie X z N \(Q-xxx\): <temat>`/);
});

test('AC-IS6: skill board - tura warsztatu w stylu z SDD.yaml', () => {
  const s = read(path.join(SK, 'board', 'SKILL.md'));
  assert.match(s, /interview_style[^\n]*\/sdd:interview[^\n]*Styl rozmowy/);
});

test('AC-IS7: przewodnik - wariant live inz i zdanie o stylu', () => {
  const g = info.guide();
  const iv = g.skills.find(s => s.command === '/sdd:interview');
  assert.ok(iv.variants.some(v => v.command === '/sdd:interview live inz'), 'wariant live inz');
  const all = g.sections.map(s => s.items.join('\n')).join('\n') + iv.variants.map(v => v.desc).join('\n');
  assert.match(all, /BIZ/);
  assert.match(all, /INŻ/);
});
