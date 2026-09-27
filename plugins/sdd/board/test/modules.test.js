// Testy modulow i zalacznikow. Kryteria z docs/specs/progress-ui.md (AC-9..AC-12).
// Uruchom: node --test plugins/sdd/board/test/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { listModules, createModule, saveIntake, removeIntake, intakeFile } = require('../modules');
const { readProgress } = require('../progress');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-modules-'));
const opts = { git: false };

test('AC-9: listModules widzi tylko foldery z requirements/SDD.yaml', () => {
  const root = tmp();
  createModule(root, { name: 'horizon', level: 'full' }, opts);
  createModule(root, { name: 'faktury', level: 'light' }, opts);
  fs.mkdirSync(path.join(root, 'inny-projekt'));
  const mods = listModules(root);
  assert.deepStrictEqual(mods.map(m => m.name).sort(), ['faktury', 'horizon']);
  const f = mods.find(m => m.name === 'faktury');
  assert.strictEqual(f.project, 'faktury');
  assert.strictEqual(f.level, 'light');
  assert.strictEqual(f.dir, path.join(root, 'faktury'));
});

test('AC-10: createModule full - struktura, SDD.yaml, CLAUDE.md, CHANGELOG', () => {
  const root = tmp();
  const dir = createModule(root, {
    name: 'horizon', level: 'full',
    approver: 'wlasciciel procesu', sponsor: 'sponsor biznesowy',
  }, opts);
  const req = path.join(dir, 'requirements');
  const yaml = fs.readFileSync(path.join(req, 'SDD.yaml'), 'utf8');
  assert.match(yaml, /^project: "horizon"/m);
  assert.match(yaml, /^level: full/m);
  assert.match(yaml, /role: "wlasciciel procesu"\n\s+approves: \[R, D, GLOSSARY, BR\]/);
  assert.match(yaml, /role: "sponsor biznesowy"\n\s+approves: \[PRD\]/);
  assert.ok(!yaml.includes('ksiegowosc'));
  assert.ok(fs.existsSync(path.join(req, '03-spec', 'PRD.md')));
  assert.ok(!fs.existsSync(path.join(req, '03-spec', 'SPEC.md')));
  assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md')));
  assert.match(fs.readFileSync(path.join(req, 'CHANGELOG.md'), 'utf8'), /\| init \| utworzono strukture, poziom full \|/);
});

test('AC-10: createModule light - SPEC.md zamiast PRD.md, bez sponsora', () => {
  const root = tmp();
  const dir = createModule(root, { name: 'drobne', level: 'light', approver: 'kierownik' }, opts);
  const req = path.join(dir, 'requirements');
  assert.ok(fs.existsSync(path.join(req, '03-spec', 'SPEC.md')));
  assert.ok(!fs.existsSync(path.join(req, '03-spec', 'PRD.md')));
  const yaml = fs.readFileSync(path.join(req, 'SDD.yaml'), 'utf8');
  assert.match(yaml, /role: "kierownik"/);
  assert.ok(!yaml.includes('approves: [PRD]'));
});

test('AC-11: createModule odrzuca zla nazwe i istniejacy folder', () => {
  const root = tmp();
  assert.throws(() => createModule(root, { name: '../zly', level: 'full' }, opts), /nazwa/i);
  assert.throws(() => createModule(root, { name: 'Z Spacja', level: 'full' }, opts), /nazwa/i);
  assert.throws(() => createModule(root, { name: 'ok', level: 'mega' }, opts), /poziom/i);
  createModule(root, { name: 'ok', level: 'full' }, opts);
  assert.throws(() => createModule(root, { name: 'ok', level: 'full' }, opts), /istnieje/i);
});

test('AC-12: saveIntake zapisuje, oczyszcza nazwe, nie nadpisuje', () => {
  const root = tmp();
  const req = path.join(createModule(root, { name: 'm', level: 'full' }, opts), 'requirements');
  const intake = path.join(req, '00-intake');

  const a = saveIntake(req, 'mail od klienta.pdf', Buffer.from('A')).saved;
  assert.strictEqual(a, 'mail-od-klienta.pdf');
  assert.strictEqual(fs.readFileSync(path.join(intake, a), 'utf8'), 'A');

  const b = saveIntake(req, 'mail od klienta.pdf', Buffer.from('B')).saved;
  assert.strictEqual(b, 'mail-od-klienta-1.pdf');
  assert.strictEqual(fs.readFileSync(path.join(intake, a), 'utf8'), 'A');

  const c = saveIntake(req, '../../etc/passwd', Buffer.from('C')).saved;
  assert.strictEqual(path.dirname(path.join(intake, c)), intake);
  assert.ok(!c.includes('/') && !c.includes('..'));

  const d = saveIntake(req, '.ukryty', Buffer.from('D')).saved;
  assert.ok(!d.startsWith('.'));

  const e = saveIntake(req, 'Notatka źródłowa.md', Buffer.from('E')).saved;
  assert.strictEqual(e, 'Notatka-źródłowa.md');
  // INDEX.md katalogu nie wolno nadpisac - obcy plik o tej nazwie dostaje dopisek
  assert.strictEqual(saveIntake(req, 'INDEX.md', Buffer.from('X')).saved, 'INDEX-1.md');
  assert.match(fs.readFileSync(path.join(intake, 'INDEX.md'), 'utf8'), /Indeks surowca/);
});

test('AC-15: saveIntake pomija plik o identycznej tresci', () => {
  const root = tmp();
  const req = path.join(createModule(root, { name: 'm', level: 'full' }, opts), 'requirements');
  const intake = path.join(req, '00-intake');
  assert.deepStrictEqual(saveIntake(req, 'notatka.txt', Buffer.from('tresc')), { saved: 'notatka.txt' });
  const before = fs.readdirSync(intake).length;
  // ta sama tresc, inna nazwa -> duplikat, nic nie powstaje
  assert.deepStrictEqual(saveIntake(req, 'kopia notatki.txt', Buffer.from('tresc')), { saved: null, duplicate: 'notatka.txt' });
  assert.strictEqual(fs.readdirSync(intake).length, before);
  // ta sama dlugosc, inna tresc -> zapis
  assert.deepStrictEqual(saveIntake(req, 'notatka.txt', Buffer.from('TRESC')), { saved: 'notatka-1.txt' });
});

test('AC-21: removeIntake kasuje plik ostatecznie, bez katalogu pomocniczego', () => {
  const root = tmp();
  const req = path.join(createModule(root, { name: 'm', level: 'full' }, opts), 'requirements');
  const intake = path.join(req, '00-intake');
  saveIntake(req, 'notatka.md', Buffer.from('tresc'));
  const before = fs.readdirSync(intake).sort();
  assert.strictEqual(removeIntake(req, 'notatka.md'), 'notatka.md');
  assert.ok(!fs.existsSync(path.join(intake, 'notatka.md')));
  assert.deepStrictEqual(fs.readdirSync(intake).sort(), before.filter(f => f !== 'notatka.md'));
  const st = readProgress(req).stages.find(s => s.key === 'intake');
  assert.deepStrictEqual(st.files, []);
  assert.strictEqual(st.status, 'todo');
});

test('AC-22: removeIntake odrzuca INDEX.md, sciezki poza intake, ukryte i brak pliku', () => {
  const root = tmp();
  const req = path.join(createModule(root, { name: 'm', level: 'full' }, opts), 'requirements');
  const intake = path.join(req, '00-intake');
  assert.throws(() => removeIntake(req, 'INDEX.md'), /spis surowca/);
  assert.throws(() => removeIntake(req, '../SDD.yaml'), /Nie ma/);
  assert.throws(() => removeIntake(req, 'brak.pdf'), /Nie ma/);
  fs.mkdirSync(path.join(intake, '.ukryty'));
  fs.writeFileSync(path.join(intake, '.ukryty', 'x.md'), 'x');
  assert.throws(() => removeIntake(req, '.ukryty/x.md'), /Nie ma/);
  assert.ok(fs.existsSync(path.join(req, 'SDD.yaml')));
  fs.mkdirSync(path.join(intake, 'maile'));
  fs.writeFileSync(path.join(intake, 'maile', 'a.eml'), 'x');
  assert.strictEqual(removeIntake(req, 'maile/a.eml'), 'maile/a.eml');
  assert.ok(!fs.existsSync(path.join(intake, 'maile', 'a.eml')));
});

test('AC-24: removeIntake nie usuwa pliku, ktory jest juz w spisie', () => {
  const root = tmp();
  const req = path.join(createModule(root, { name: 'm', level: 'full' }, opts), 'requirements');
  saveIntake(req, 'spisany.md', Buffer.from('x'));
  fs.appendFileSync(path.join(req, '00-intake', 'INDEX.md'), '| spisany.md | 2026-09-26 | notatka | [B] | opis | |\n');
  assert.throws(() => removeIntake(req, 'spisany.md'), /w spisie/);
  assert.ok(fs.existsSync(path.join(req, '00-intake', 'spisany.md')));
});

// ---------------------------------------------------------------- zmiana 0.13.0
const { allModules } = require('../modules');

test('AC-49: allModules - katalog + dodane, bez duplikatow, pomija znikniete', () => {
  const root = tmp(), other = tmp();
  const a = createModule(root, { name: 'horizon', level: 'full' }, opts);
  const app = createModule(other, { name: 'fv-manager', level: 'light' }, opts);
  const gone = path.join(other, 'nie-ma');
  const bare = path.join(other, 'goly'); fs.mkdirSync(bare);
  const mods = allModules(root, [app, a, gone, bare, app]);
  assert.deepStrictEqual(mods.map(m => [m.name, m.dir, !!m.external]),
    [['fv-manager', app, true], ['horizon', a, false]]);
  assert.strictEqual(mods[0].level, 'light');
  assert.deepStrictEqual(allModules(null, [app]).map(m => m.name), ['fv-manager']);
  assert.deepStrictEqual(allModules(root, undefined).map(m => m.name), ['horizon']);
});

test('AC-68: intakeFile zwraca sciezke pliku z 00-intake/, odrzuca INDEX.md, wyjscie poza folder i ukryte', () => {
  const root = tmp();
  const req = path.join(createModule(root, { name: 'm', level: 'full' }, opts), 'requirements');
  const intake = path.join(req, '00-intake');
  saveIntake(req, 'notatka.md', Buffer.from('tresc'));
  assert.strictEqual(intakeFile(req, 'notatka.md'), path.join(intake, 'notatka.md'));
  // plik "dodane" (w spisie) tez mozna pobrac
  fs.appendFileSync(path.join(intake, 'INDEX.md'), '| S-001 | notatka.md |\n');
  assert.strictEqual(intakeFile(req, 'notatka.md'), path.join(intake, 'notatka.md'));
  fs.mkdirSync(path.join(intake, 'maile'));
  fs.writeFileSync(path.join(intake, 'maile', 'a.eml'), 'x');
  assert.strictEqual(intakeFile(req, 'maile/a.eml'), path.join(intake, 'maile', 'a.eml'));
  fs.mkdirSync(path.join(intake, '.ukryty'));
  fs.writeFileSync(path.join(intake, '.ukryty', 'x.md'), 'x');
  ['INDEX.md', '../SDD.yaml', '.ukryty/x.md', 'brak.pdf', '', 'maile'].forEach(n =>
    assert.throws(() => intakeFile(req, n), /Nie ma|spis surowca/, n));
});
