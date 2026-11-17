// Krotsze skille - rzadkie sekcje w references/ (0.46.2, docs/specs/skill-bodies.md AC-SB1..AC-SB8).
// Przeglad /doctor 2026-10-25: nowe modele wykonuja polecenia doslownie i zle znosza rozdete cialo skilla.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { SK } = require('./skill-text');

const body = name => fs.readFileSync(path.join(SK, name, 'SKILL.md'), 'utf8');
const ref = (name, file) => fs.readFileSync(path.join(SK, name, 'references', file), 'utf8');
const allFiles = (dir => {
  const out = [];
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.md')) out.push(p);
  });
  walk(dir);
  return out;
})(SK);

test('AC-SB1: pliki referencyjne istnieja, SKILL.md wskazuje kazdy', () => {
  [['interview', 'style.md'], ['handover', 'redmine.md'], ['board', 'tidy.md'], ['board', 'processes.md'],
    ['spec', 'contract.md'], ['validate', 'report-format.md']].forEach(([s, f]) => {
    assert.ok(ref(s, f).length > 200, s + '/' + f);
    assert.ok(body(s).includes('`references/' + f + '`'), s + ' nie wskazuje ' + f);
  });
});

test('AC-SB2: bez docs/specs/ i znacznikow wersji w skillach', () => {
  allFiles.forEach(f => {
    const t = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(t, /docs\/specs\//, f);
    assert.doesNotMatch(t, /\(0\.\d+\.\d+/, f);
  });
});

test('AC-SB3: interview - jedna tabela zapis/parafraza, jeden przyklad, cel dodatni', () => {
  const s = body('interview'), st = ref('interview', 'style.md');
  const k3 = s.slice(s.indexOf('## Krok 3'));
  assert.match(k3, /\| Odpowiedz \| BIZ \| INZ/);
  assert.doesNotMatch(s + st, /Czekaj na "tak"/);
  const all = s + st;
  assert.strictEqual((all.match(/fv-manager/g) || []).length, 1, 'jeden przyklad z fv-manager');
  assert.match(all, /\(Q-027\)/);
  ['Q-048', 'Q-049', 'Q-053'].forEach(q => assert.ok(!all.includes(q), q));
  assert.doesNotMatch(s, /nigdy nie sugeruj/);
});

test('AC-SB4: board - bez "6a", tidy i processes w references', () => {
  const s = body('board');
  assert.doesNotMatch(s + ref('board', 'processes.md'), /^\s*6a\./m);
  assert.ok(!s.includes('## Porzadek na tablicy'), 'tidy wyniesione');
  assert.ok(!s.includes('## Procesy z dzialajacej aplikacji'), 'processes wyniesione');
});

test('AC-SB5: spec - zwykle "zaproponuj", kontrakt w references', () => {
  const s = body('spec');
  assert.ok(!s.includes('ZAPROPONUJ'));
  assert.ok(!s.includes('Bez schematu technicznego'), 'kontrakt wyniesiony');
  assert.match(ref('spec', 'contract.md'), /Bez schematu technicznego/);
});

test('AC-SB6: init - liczba pytan zgodna z lista, "Nie rob" z powodem', () => {
  const s = body('init');
  const m = s.match(/Zapytaj o (\w+) rzeczy[^\n]*\n((?:   - [^\n]*\n(?:     [^\n]*\n)*)+)/);
  assert.ok(m, 'sekcja pytan');
  const n = { dwie: 2, trzy: 3, cztery: 4 }[m[1]];
  assert.strictEqual((m[2].match(/^   - /gm) || []).length, n);
  const nr = s.slice(s.indexOf('## Nie rob')).split('\n').filter(l => l.startsWith('- '));
  assert.ok(nr.length >= 2);
  nr.forEach(l => assert.match(l, / - |, bo /, l));
});

test('AC-SB7: validate - wyjasnione "odtwarzalny"', () => {
  assert.match(body('validate'), /odtwarzalny[^\n]*ten sam stan plikow[^\n]*ten sam raport/);
});

test('AC-SB8: szesc SKILL.md razem najwyzej 444 linie (25% mniej niz 592)', () => {
  const n = ['interview', 'handover', 'board', 'spec', 'init', 'validate']
    .reduce((a, s) => a + body(s).split('\n').length, 0);
  assert.ok(n <= 444, 'linii: ' + n);
});

test('AC-SB10 (AC-014-4): kaskada ustawia Status R "do przegladu" i wpisuje R do sekcji 6', () => {
  const { skillText } = require('./skill-text');
  const tpl = fs.readFileSync(path.join(__dirname, '..', '..', 'templates', 'CLAUDE.md'), 'utf8');
  const six = tpl.slice(tpl.indexOf('## 6. Kaskada wplywu'), tpl.indexOf('## 6a.'));
  const re = /Status: do przegladu \(<powod>, <data>\)/;
  assert.match(six, re, 'szablon CLAUDE.md');
  for (const s of ['interview', 'intake', 'spec']) assert.match(skillText(s), re, s);
});

test('AC-SB11 (AC-036-2): handover Linear/Jira - po jednym, numery od razu w TRACEABILITY, awaria -> stop', () => {
  const { skillText } = require('./skill-text');
  const k = skillText('handover');
  const l = k.split('\n').filter(x => /`linear` \/ `jira`/.test(x)).join(' ') + ' ' + k.slice(k.indexOf('`linear` / `jira`'), k.indexOf('`redmine`: REST API'));
  assert.match(l, /po jednym/i);
  assert.match(l, /od razu[^.]*TRACEABILITY\.md/);
  assert.match(l, /nie odpowiada[^.]*zatrzymaj/i);
  assert.match(l, /bez ponawiania/i);
  assert.match(l, /niezalozonych/i);
});
