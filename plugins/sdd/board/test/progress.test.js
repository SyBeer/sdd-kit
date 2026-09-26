// Testy widoku postepu. Kryteria z docs/specs/progress-ui.md (AC-1..AC-7).
// Uruchom: node --test plugins/sdd/board/test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readProgress } = require('../progress');

const TEMPLATES = path.join(__dirname, '..', '..', 'templates', 'requirements');

function freshProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-progress-'));
  const req = path.join(dir, 'requirements');
  fs.cpSync(TEMPLATES, req, { recursive: true });
  fs.rmSync(path.join(req, '03-spec', 'SPEC.md'));
  return req;
}
const append = (req, rel, text) => fs.appendFileSync(path.join(req, rel), text);
const write = (req, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(req, rel)), { recursive: true });
  fs.writeFileSync(path.join(req, rel), text);
};
const stage = (p, key) => p.stages.find(s => s.key === key);

test('AC-1: swiezy init -> wszystko todo, nastepny Intake', () => {
  const p = readProgress(freshProject());
  assert.strictEqual(p.exists, true);
  assert.deepStrictEqual(p.stages.map(s => s.status), ['todo', 'todo', 'todo', 'todo', 'todo', 'todo']);
  assert.strictEqual(p.next.key, 'intake');
  assert.strictEqual(p.next.command, '/sdd:intake');
});

test('AC-2: nieskatalogowany plik -> active, po wpisie -> done', () => {
  const req = freshProject();
  write(req, '00-intake/mail-klient.md', 'tresc');
  let p = readProgress(req);
  assert.strictEqual(stage(p, 'intake').status, 'active');
  assert.strictEqual(stage(p, 'intake').counts.unindexed, 1);

  append(req, '00-intake/INDEX.md', '| mail-klient.md | 2026-09-26 | mail | [B] | Klient opisuje proces | |\n');
  p = readProgress(req);
  assert.strictEqual(stage(p, 'intake').status, 'done');
  assert.strictEqual(stage(p, 'intake').counts.sources, 1);
  assert.strictEqual(p.next.key, 'interview');
});

test('AC-3: liczniki Q i blokery', () => {
  const req = freshProject();
  append(req, '01-interview/QUESTIONS.md', [
    '| Q-001 | Kto zatwierdza? | otwarte | wlasciciel procesu | INDEX | blokuje go-live | |',
    '| Q-002 | Ktory termin? | sprzeczne | sponsor | mail-a, mail-b | R-001 | |',
    '| Q-003 | Ile dni? | odpowiedziane | sponsor | mail | | D-001 |',
    '| Q-004 | Format? | otwarte | wlasciciel procesu | mail | | |',
  ].join('\n') + '\n');
  const p = readProgress(req);
  const iv = stage(p, 'interview');
  assert.strictEqual(iv.status, 'active');
  assert.strictEqual(iv.counts.questions, 4);
  assert.strictEqual(iv.counts.open, 2);
  assert.strictEqual(iv.counts.conflicting, 1);
  assert.strictEqual(iv.counts.answered, 1);
  assert.deepStrictEqual(p.blockers.map(b => b.id).sort(), ['Q-001', 'Q-002']);
});

test('AC-4: czeka na biznes pogrupowane po roli', () => {
  const req = freshProject();
  append(req, '01-interview/QUESTIONS.md',
    '| Q-001 | Budzet? | zadane (runda 1, 2026-09-26) | sponsor | INDEX | | |\n');
  const p = readProgress(req);
  assert.deepStrictEqual(p.waiting, [{ role: 'sponsor', count: 1, ids: ['Q-001'] }]);
});

test('AC-5: R z placeholderem ignorowane, statusy R liczone', () => {
  const req = freshProject();
  append(req, '03-spec/PRD.md', [
    '', '### R-002 Eksport faktur', 'Status:            zatwierdzone',
    '', '### R-003 Import', 'Status:            do przegladu', '',
  ].join('\n'));
  const p = readProgress(req);
  const sp = stage(p, 'spec');
  assert.strictEqual(sp.counts.requirements, 2);
  assert.strictEqual(sp.counts.approved, 1);
  assert.strictEqual(sp.status, 'active');
});

test('AC-6: gotowosc z najnowszego raportu validate', () => {
  const req = freshProject();
  write(req, '04-validation/validate-2026-09-01.md', 'gotowosc: 20%\n');
  write(req, '04-validation/validate-2026-09-20.md', '## Wynik\nGotowosc: 60 %\n');
  const p = readProgress(req);
  const v = stage(p, 'validate');
  assert.strictEqual(v.counts.readiness, 60);
  assert.strictEqual(v.status, 'active');
});

test('AC-7: brak requirements/ -> exists false', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-empty-'));
  const p = readProgress(path.join(dir, 'requirements'));
  assert.strictEqual(p.exists, false);
});

test('domain: done gdy wszystkie hasla zatwierdzone', () => {
  const req = freshProject();
  append(req, '02-domain/GLOSSARY.md', '| Zlecenie | Prosba klienta | order | Z-1 | [B] | zatwierdzone |\n');
  assert.strictEqual(stage(readProgress(req), 'domain').status, 'done');
  append(req, '02-domain/GLOSSARY.md', '| Faktura | Dokument | | FV-1 | [D] | robocze |\n');
  assert.strictEqual(stage(readProgress(req), 'domain').status, 'active');
});

test('meta: projekt, poziom i changelog z plikow', () => {
  const req = freshProject();
  fs.writeFileSync(path.join(req, 'SDD.yaml'),
    fs.readFileSync(path.join(req, 'SDD.yaml'), 'utf8').replace('<nazwa projektu>', 'horizon'));
  append(req, 'CHANGELOG.md', '2026-09-26 | init | utworzono strukture, poziom full | -\n');
  const p = readProgress(req);
  assert.strictEqual(p.project, 'horizon');
  assert.strictEqual(p.level, 'full');
  assert.deepStrictEqual(p.changelog, ['2026-09-26 | init | utworzono strukture, poziom full | -']);
});
