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

test('AC-26b: zwykle otwarte pytanie nie cofa procesu do Interview', () => {
  const req = freshProject();
  append(req, '01-interview/QUESTIONS.md', '| Q-001 | Format? | otwarte | wlasciciel procesu | test spojnosci domeny | | |\n');
  append(req, '01-interview/DECISIONS.md', '\n## D-001 | 2026-09-27 | Cos ustalone\n');
  const p = readProgress(req);
  const iv = stage(p, 'interview');
  assert.strictEqual(iv.status, 'done');
  assert.strictEqual(iv.counts.open, 1);
  assert.notStrictEqual(p.next.key, 'interview');
});

test('AC-27b: etykieta blokujaca liczy sie, zaprzeczona nie', () => {
  let req = freshProject();
  append(req, '01-interview/QUESTIONS.md', '| Q-001 | Kto? | otwarte | sponsor | luka | blokuje go-live | |\n');
  let p = readProgress(req);
  assert.strictEqual(stage(p, 'interview').status, 'active');
  assert.deepStrictEqual(p.blockers.map(b => b.id), ['Q-001']);

  req = freshProject();
  append(req, '01-interview/QUESTIONS.md', '| Q-001 | Kto? | otwarte | sponsor | luka | nie blokuje go-live | |\n');
  p = readProgress(req);
  assert.strictEqual(stage(p, 'interview').status, 'done');
  assert.deepStrictEqual(p.blockers, []);
});

test('AC-29b: interview.questions - wszystkie, do wyjasnienia na poczatku wg priorytetu', () => {
  const req = freshProject();
  append(req, '01-interview/QUESTIONS.md', [
    '| Q-001 | Format? | otwarte | wlasciciel procesu | luka | | |',
    '| Q-002 | Ile dni? | odpowiedziane | sponsor | mail | | D-001 |',
    '| Q-003 | Kto? | otwarte | sponsor | test spojnosci domeny | blokuje go-live | |',
    '| Q-004 | Ktory termin? | sprzeczne | sponsor | mail-a vs mail-b | | |',
    '| Q-005 | Budzet? | zadane (runda 1, 2026-09-27) | sponsor | INDEX | | |',
    '| Q-006 | Pozniej | zaparkowane (nie blokuje go-live) | sponsor | luka | | |',
  ].join('\n') + '\n');
  const qs = stage(readProgress(req), 'interview').questions;
  assert.deepStrictEqual(qs.map(q => q.id), ['Q-004', 'Q-003', 'Q-001', 'Q-005', 'Q-002', 'Q-006']);
  assert.deepStrictEqual(qs.filter(q => q.pending).map(q => q.id), ['Q-004', 'Q-003', 'Q-001', 'Q-005']);
  const q3 = qs.find(q => q.id === 'Q-003');
  assert.deepStrictEqual([q3.text, q3.kind, q3.role, q3.source, q3.blocking], ['Kto?', 'open', 'sponsor', 'test spojnosci domeny', true]);
  assert.strictEqual(qs.find(q => q.id === 'Q-005').kind, 'asked');
  assert.strictEqual(qs.find(q => q.id === 'Q-001').blocking, false);
  const q2 = qs.find(q => q.id === 'Q-002');
  assert.deepStrictEqual([q2.kind, q2.pending, q2.closedBy], ['answered', false, 'D-001']);
  const q6 = qs.find(q => q.id === 'Q-006');
  assert.deepStrictEqual([q6.kind, q6.status, q6.blocking], ['parked', 'zaparkowane (nie blokuje go-live)', false]);
});

test('AC-33: done z zaleglosciami - partial = otwarte + zadane', () => {
  let req = freshProject();
  append(req, '01-interview/QUESTIONS.md', [
    '| Q-001 | A? | otwarte | sponsor | luka | | |',
    '| Q-002 | B? | otwarte | sponsor | luka | | |',
    '| Q-003 | C? | otwarte | sponsor | luka | | |',
    '| Q-004 | D? | zadane (runda 1, 2026-09-27) | sponsor | luka | | |',
    '| Q-005 | E? | odpowiedziane | sponsor | luka | | D-001 |',
  ].join('\n') + '\n');
  let iv = stage(readProgress(req), 'interview');
  assert.strictEqual(iv.status, 'done');
  assert.strictEqual(iv.partial, 4);

  req = freshProject();
  append(req, '01-interview/QUESTIONS.md', '| Q-001 | A? | odpowiedziane | sponsor | luka | | D-001 |\n');
  iv = stage(readProgress(req), 'interview');
  assert.strictEqual(iv.status, 'done');
  assert.strictEqual(iv.partial, 0);
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

test('AC-14: intake.files - nazwa, rozmiar, w spisie, od najnowszego, bez INDEX.md', () => {
  const req = freshProject();
  write(req, '00-intake/stary.md', 'abc');
  write(req, '00-intake/nowy.pdf', '12345');
  const old = new Date(Date.now() - 60000);
  fs.utimesSync(path.join(req, '00-intake/stary.md'), old, old);
  append(req, '00-intake/INDEX.md', '| stary.md | 2026-09-26 | notatka | [B] | x | |\n');
  const files = stage(readProgress(req), 'intake').files;
  assert.deepStrictEqual(files.map(f => [f.name, f.size, f.indexed]), [['nowy.pdf', 5, false], ['stary.md', 3, true]]);
});

test('AC-25: porownanie-*.md to artefakt procesu - nie surowiec, nie zgania do spisu', () => {
  const req = freshProject();
  write(req, '00-intake/zrzut.png', 'x');
  write(req, '00-intake/porownanie-2026-09-26.md', 'czytanie na zimno');
  append(req, '00-intake/INDEX.md', '| zrzut.png | 2026-09-26 | zrzut ekranu | [P] | as-built | aktualne | x | |\n');
  const intake = stage(readProgress(req), 'intake');
  assert.deepStrictEqual(intake.files.map(f => f.name), ['zrzut.png']);
  assert.strictEqual(intake.counts.files, 1);
  assert.strictEqual(intake.counts.unindexed, 0);
  assert.strictEqual(intake.status, 'done');
});

test('AC-17: kazdy etap ma instrukcje howto, Intake: najpierw pliki, potem komenda', () => {
  const { STAGES } = require('../progress');
  for (const s of STAGES) {
    assert.ok(Array.isArray(s.howto) && s.howto.length >= 2 && s.howto.length <= 4, s.key);
  }
  const intake = STAGES.find(s => s.key === 'intake').howto.join(' ');
  assert.match(intake, /wszystkie/i);
  assert.match(intake, /skopiuj/i);
  const p = readProgress(freshProject());
  assert.ok(p.next.howto.length >= 2);
});

// ---- Zmiana 0.15.0: szczegoly licznikow (AC-54..AC-56)
const DEC = [
  '', '## D-001 | 2026-09-20 | Termin platnosci', 'Pytanie: Q-003', 'Decyzja: 14 dni od wystawienia.',
  'Powod: tak jest w umowach', 'Zdecydowal: sponsor', '',
  '## D-002 | 2026-09-21 | Jeden przycisk', 'Pytanie: Q-004', 'Decyzja: Jeden przycisk "Zwieksz limit".', 'Powod:',
  'Zdecydowal: wlasciciel procesu', '',
].join('\n');

test('AC-54: details Interview - decyzje i zalozenia', () => {
  const req = freshProject();
  append(req, '01-interview/DECISIONS.md', DEC);
  append(req, '01-interview/ASSUMPTIONS.md', [
    '| A-001 | Faktura ma jedna walute | potwierdzone | [D] mail | R-001 |',
    '| A-002 | Klient ma NIP | niepotwierdzone | [AI] | R-002 |',
    '| A-003 | Kopia wymaga potwierdzenia | obalone (D-035) | [D] doc | R-001 |',
  ].join('\n') + '\n');
  const d = stage(readProgress(req), 'interview').details;
  assert.strictEqual(d.decisions.file, '01-interview/DECISIONS.md');
  assert.deepStrictEqual(d.decisions.items.map(i => i.id), ['D-001', 'D-002']);
  const [a, b] = d.decisions.items;
  assert.strictEqual(a.title, 'Termin platnosci');
  assert.match(a.status, /sponsor/); assert.match(a.status, /2026-09-20/);
  assert.strictEqual(a.note, '14 dni od wystawienia.');
  assert.ok(!a.warn);
  assert.strictEqual(b.warn, 'brak powodu');
  assert.deepStrictEqual(d.unconfirmed.items.map(i => i.id), ['A-002']);
  assert.strictEqual(d.unconfirmed.items[0].title, 'Klient ma NIP');
  assert.match(d.unconfirmed.items[0].note, /\[AI\]/);
  assert.deepStrictEqual(d.refuted.items.map(i => i.id), ['A-003']);
  assert.strictEqual(d.unconfirmed.file, '01-interview/ASSUMPTIONS.md');
});

test('AC-55: details Domain - hasla, zatwierdzone, role, reguly, encje', () => {
  const req = freshProject();
  append(req, '02-domain/GLOSSARY.md', [
    '| Faktura | Dokument sprzedazy | invoice | FV 1/2026 | [D] mail | zatwierdzone |',
    '| Korekta | Zmiana faktury | | KOR 1 | [D] mail | robocze |',
  ].join('\n') + '\n');
  append(req, '02-domain/ACTORS.md', '| Ksiegowa | Wystawia faktury | Nie zatwierdza | [B] | robocze |\n');
  append(req, '02-domain/RULES.md', '| BR-001 | Jezeli faktura po terminie, to przypomnienie | [B] | | R-003 | robocze |\n');
  append(req, '02-domain/ENTITIES.md', '\n## Faktura\nStany: robocza, wystawiona\n');
  const s = stage(readProgress(req), 'domain');
  const d = s.details;
  assert.deepStrictEqual(d.terms.items.map(i => i.title), ['Faktura', 'Korekta']);
  assert.strictEqual(d.terms.items[0].note, 'Dokument sprzedazy');
  assert.deepStrictEqual(d.approved.items.map(i => i.title), ['Faktura']);
  assert.deepStrictEqual(d.actors.items.map(i => [i.title, i.note]), [['Ksiegowa', 'Wystawia faktury']]);
  assert.deepStrictEqual(d.rules.items.map(i => i.id), ['BR-001']);
  assert.match(d.rules.items[0].note, /R-003/);
  assert.deepStrictEqual(d.entities.items.map(i => i.title), ['Faktura']);
  for (const k of ['terms', 'approved', 'actors', 'rules', 'entities']) assert.strictEqual(d[k].items.length, s.counts[k], k);
  assert.strictEqual(d.terms.file, '02-domain/GLOSSARY.md');
});

test('AC-56: details Spec - wymagania, zatwierdzone, do przegladu z powodem z sekcji 6', () => {
  const req = freshProject();
  const prd = fs.readFileSync(path.join(req, '03-spec/PRD.md'), 'utf8')
    .replace('## 6. Do przegladu', '## 6. Do przegladu\n- R-003: D-036 zmienia przycisk wniosku (AC-003-1)')
    + ['', '### R-002 Eksport faktur', 'Opis:              Ksiegowa eksportuje faktury do CSV.', 'Status:            zatwierdzone (sponsor, 2026-09-27)',
      '', '### R-003 Import', 'Opis:              Import z banku.', 'Status:            do przegladu', ''].join('\n');
  write(req, '03-spec/PRD.md', prd);
  const s = stage(readProgress(req), 'spec');
  const d = s.details;
  assert.deepStrictEqual(d.requirements.items.map(i => i.id), ['R-002', 'R-003']);
  assert.strictEqual(d.requirements.items[0].title, 'Eksport faktur');
  assert.strictEqual(d.requirements.items[0].note, 'Ksiegowa eksportuje faktury do CSV.');
  assert.match(d.requirements.items[0].status, /^zatwierdzone/);
  assert.deepStrictEqual(d.approved.items.map(i => i.id), ['R-002']);
  assert.deepStrictEqual(d.review.items.map(i => i.id), ['R-003']);
  assert.match(d.review.items[0].note, /D-036 zmienia przycisk/);
  for (const k of ['requirements', 'approved', 'review']) assert.strictEqual(d[k].items.length, s.counts[k], k);
  assert.strictEqual(d.requirements.file, '03-spec/PRD.md');
});

// ---------------------------------------------------------------- 0.18.0: walidacja nieaktualna po zmianie wymagan
const { fingerprint } = require('../fingerprint');

test('AC-59: fingerprint - zmienia sie tylko od plikow, ktore sprawdza walidacja', () => {
  const req = freshProject();
  const f0 = fingerprint(req);
  assert.match(f0, /^sha256:[0-9a-f]{64}$/);
  assert.strictEqual(fingerprint(req), f0);
  // bez znaczenia: widok, sesje, historia, raporty, pliki generowane
  write(req, '01-interview/board.json', '{"notes":[]}');
  write(req, '01-interview/session-2026-09-27.md', 'notatka');
  append(req, 'CHANGELOG.md', '2026-09-27 | board | x | y\n');
  write(req, '04-validation/validate-2026-09-27.md', 'gotowosc: 100%\n');
  write(req, '03-spec/agent/limity/spec.md', 'GENEROWANE');
  write(req, '00-intake/mail.md', 'surowiec');
  assert.strictEqual(fingerprint(req), f0);
  // konce linii
  const dec = path.join(req, '01-interview', 'DECISIONS.md');
  const txt = fs.readFileSync(dec, 'utf8');
  fs.writeFileSync(dec, txt.replace(/\r?\n/g, '\r\n'));
  assert.strictEqual(fingerprint(req), f0);
  fs.writeFileSync(dec, txt);
  // zmiana wymagan
  // SDD.yaml: tylko wybrane pola (AC-64)
  for (const rel of ['01-interview/DECISIONS.md', '02-domain/GLOSSARY.md', '03-spec/PRD.md', '00-intake/INDEX.md']) {
    const before = fingerprint(req);
    append(req, rel, '\nzmiana\n');
    assert.notStrictEqual(fingerprint(req), before, rel);
  }
});

test('AC-60: raport z odciskiem - zgodny done, po zmianie wymagan stale', () => {
  const req = freshProject();
  write(req, '04-validation/validate-2026-09-27.md', 'gotowosc: 100%\nOdcisk wymagan: ' + fingerprint(req) + '\n');
  let v = stage(readProgress(req), 'validate');
  assert.strictEqual(v.status, 'done');
  assert.ok(!v.stale);
  append(req, '01-interview/DECISIONS.md', '\n## D-099 | 2026-09-27 | nowa\n');
  const p = readProgress(req);
  v = stage(p, 'validate');
  assert.strictEqual(v.status, 'active');
  assert.strictEqual(v.stale, true);
  assert.strictEqual(v.counts.readiness, 100);
});

test('AC-61: raport bez odcisku - nieaktualny, gdy po wpisie validate w CHANGELOG jest wpis innego etapu', () => {
  const req = freshProject();
  write(req, '04-validation/validate-2026-09-27.md', 'gotowosc: 100%\n');
  append(req, 'CHANGELOG.md', '2026-09-27 | validate | przebieg 1: 100% | 03-spec/PRD.md\n');
  assert.strictEqual(stage(readProgress(req), 'validate').status, 'done');
  append(req, 'CHANGELOG.md', '2026-09-27 | interview | D-099 | x\n');
  const v = stage(readProgress(req), 'validate');
  assert.strictEqual(v.status, 'active');
  assert.strictEqual(v.stale, true);
});

test('AC-62: CLI fingerprint.js wypisuje ten sam odcisk', () => {
  const req = freshProject();
  const out = require('child_process').execFileSync(process.execPath, [path.join(__dirname, '..', 'fingerprint.js'), req]).toString().trim();
  assert.strictEqual(out, fingerprint(req));
});

test('AC-64: fingerprint - z SDD.yaml tylko level, owners i gate_blocking_status', () => {
  const req = freshProject();
  const y = path.join(req, 'SDD.yaml');
  const base = fs.readFileSync(y, 'utf8');
  const f0 = fingerprint(req);
  const same = [t => t.replace(/^backlog: none/m, 'backlog: file'), t => t.replace(/^project: .*$/m, 'project: "inna nazwa"'),
    t => t.replace('# etykieta pytan blokujacych', '# inny komentarz'), t => t + '\n# dopisek\n'];
  same.forEach((fn, i) => { fs.writeFileSync(y, fn(base)); assert.strictEqual(fingerprint(req), f0, 'bez zmiany #' + i); });
  const diff = [t => t.replace(/^level: full/m, 'level: light'), t => t.replace('wlasciciel procesu', 'kierownik'),
    t => t.replace('approves: [BR]', 'approves: [BR, PRD]'), t => t.replace('"blokuje go-live"', '"blokuje start"')];
  diff.forEach((fn, i) => { fs.writeFileSync(y, fn(base)); assert.notStrictEqual(fingerprint(req), f0, 'zmiana #' + i); });
});

// ---------------------------------------------------------------- 0.19.0: handover nieaktualny po zmianie wymagan
function handedOver(req) {
  write(req, '04-validation/validate-2026-09-27.md', 'gotowosc: 100%\nOdcisk wymagan: ' + fingerprint(req) + '\n');
  write(req, '04-validation/TRACEABILITY.md', '# Tabela\nOdcisk wymagan: ' + fingerprint(req) + '\n| R | AC | Zadanie | Test |\n');
}

test('AC-65: handover z odciskiem - zgodny done, po zmianie PRD stale; kolejnosc krokow', () => {
  // kopia demo: etapy do Validate gotowe, wiec widac, ktory krok jest aktualny
  const req = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-handover-')), 'requirements');
  fs.cpSync(path.join(__dirname, '..', '..', 'demo', 'zlecenia', 'requirements'), req, { recursive: true });
  handedOver(req);
  let p = readProgress(req);
  assert.strictEqual(stage(p, 'handover').status, 'done');
  // zmiana PRD po przekazaniu i ponowna walidacja (aktualna) -> krok Handover
  append(req, '03-spec/PRD.md', '\nDoprecyzowanie opisu po przekazaniu.\n');
  write(req, '04-validation/validate-2026-09-28.md', 'gotowosc: 100%\nOdcisk wymagan: ' + fingerprint(req) + '\n');
  p = readProgress(req);
  const h = stage(p, 'handover');
  assert.strictEqual(h.status, 'active');
  assert.strictEqual(h.stale, true);
  assert.strictEqual(p.next.key, 'handover');
  assert.match(p.next.desc, /przekazaniu/);
  // walidacja tez nieaktualna -> krok Validate
  append(req, '03-spec/PRD.md', '\nkolejna zmiana\n');
  p = readProgress(req);
  assert.strictEqual(p.next.key, 'validate');
  assert.strictEqual(stage(p, 'handover').stale, true);
});

test('AC-66: handover bez odcisku - validate po handover nie szkodzi, spec po handover -> stale', () => {
  const req = freshProject();
  write(req, '04-validation/TRACEABILITY.md', '# Tabela\n');
  append(req, 'CHANGELOG.md', '2026-09-27 | handover | backlog | x\n2026-09-27 | validate | przebieg | x\n2026-09-27 | config | backlog: file | x\n');
  assert.strictEqual(stage(readProgress(req), 'handover').status, 'done');
  append(req, 'CHANGELOG.md', '2026-09-28 | spec | R-099 | x\n');
  const h = stage(readProgress(req), 'handover');
  assert.strictEqual(h.status, 'active');
  assert.strictEqual(h.stale, true);
});

// ---- Zmiana 0.24.0: krok "zatwierdz slownik" (AC-71, AC-72)
test('AC-71: Domain z niezatwierdzonymi haslami -> /sdd:domain zatwierdz', () => {
  const req = freshProject();
  write(req, '00-intake/mail.md', 'tresc');
  append(req, '00-intake/INDEX.md', '| mail.md | 2026-10-03 | mail | [Biz] | Proces | |\n');
  append(req, '01-interview/QUESTIONS.md', '| Q-001 | Kto? | odpowiedziane | sponsor | mail | | D-001 |\n');
  append(req, '01-interview/DECISIONS.md', '\n## D-001 | 2026-10-03 | X\nDecyzja: y\nPowod: z\n');
  append(req, '02-domain/GLOSSARY.md', [
    '| Faktura | Dokument | | FV | [Dok] mail | zatwierdzone (sponsor, 2026-10-03) |',
    '| Korekta | Zmiana | | KOR | [Dok] mail | robocze |',
    '| Nota | Obciazenie | | NO | [Dok] mail | robocze |',
  ].join('\n') + '\n');
  let p = readProgress(req), d = stage(p, 'domain');
  assert.strictEqual(d.status, 'active');
  assert.strictEqual(d.command, '/sdd:domain zatwierdz');
  assert.match(d.howto.join(' '), /do zatwierdzenia: 2\b/);
  assert.strictEqual(p.next.key, 'domain');
  assert.strictEqual(p.next.command, '/sdd:domain zatwierdz');
  // wszystkie zatwierdzone -> zwykla komenda, dalej spec
  const g = path.join(req, '02-domain/GLOSSARY.md');
  fs.writeFileSync(g, fs.readFileSync(g, 'utf8').replace(/\| robocze \|/g, '| zatwierdzone |'));
  p = readProgress(req); d = stage(p, 'domain');
  assert.strictEqual(d.status, 'done');
  assert.strictEqual(d.command, '/sdd:domain');
  // brak hasel -> /sdd:domain
  assert.strictEqual(stage(readProgress(freshProject()), 'domain').command, '/sdd:domain');
});

test('AC-72: szablon slownika bez mylacej linii Status, skille spec i domain z krokiem zatwierdzania', () => {
  const tpl = fs.readFileSync(path.join(TEMPLATES, '02-domain', 'GLOSSARY.md'), 'utf8');
  assert.ok(!/^Status:/m.test(tpl), 'linia legendy wygladala jak status pliku');
  const SK = path.join(__dirname, '..', '..', 'skills');
  const spec = fs.readFileSync(path.join(SK, 'spec', 'SKILL.md'), 'utf8');
  const domain = fs.readFileSync(path.join(SK, 'domain', 'SKILL.md'), 'utf8');
  assert.match(spec, /kazde haslo/i);
  assert.match(spec, /\/sdd:domain zatwierdz/);
  assert.match(domain, /\/sdd:domain zatwierdz/);
  assert.match(domain, /nie proponuj \/sdd:spec/i);
});
