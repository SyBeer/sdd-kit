// Systemy i integracje (SYSTEMS.md). Kryteria: docs/specs/systems.md (AC-SY1..AC-SY18, zmiana 0.31.0).
// Uruchom: node --test plugins/sdd/board/test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readProgress } = require('../progress');
const { moduleSummary, guide } = require('../info');
const { fingerprint } = require('../fingerprint');

const ROOT = path.join(__dirname, '..', '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const TEMPLATES = path.join(ROOT, 'templates', 'requirements');
const DEMO_REQ = path.join(ROOT, 'demo', 'zlecenia', 'requirements');
const stage = (p, key) => p.stages.find(s => s.key === key);

function freshProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-systems-'));
  const req = path.join(dir, 'requirements');
  fs.cpSync(TEMPLATES, req, { recursive: true });
  fs.rmSync(path.join(req, '03-spec', 'SPEC.md'));
  return req;
}
const SYS = '# Systemy\n\n| ID | System | Rola | Wlasciciel | Master dla | Wymiana | Przy awarii | Krytyczna | Status | Zrodlo |\n' +
  '|----|--------|------|------------|------------|---------|-------------|-----------|--------|--------|\n' +
  '| S-001 | Aplikacja | nasz | wlasciciel procesu | - | - | - | - | robocze | [Biz] s.md |\n' +
  '| S-002 | NBP | zewnetrzny | dzial finansow | Sredni kurs NBP | -> my, raz dziennie | komunikat „Brak kursu <waluta>” | tak | robocze | [Biz] s.md |\n' +  // <waluta> w zdaniu to nie wzor
  '| S-003 | Excel limitow | reczny | DR | Limit kredytowy | <-> na zadanie | brak importu | nie | zatwierdzone | [App] x.md |\n';  // <-> to nie wzor <...>

// ---- Szablon i domena
test('AC-SY1: szablon SYSTEMS.md z kolumnami i mapa systemow', () => {
  const t = read('templates/requirements/02-domain/SYSTEMS.md');
  ['ID', 'System', 'Rola', 'Wlasciciel', 'Master dla', 'Wymiana', 'Przy awarii', 'Krytyczna', 'Status', 'Zrodlo']
    .forEach(c => assert.match(t, new RegExp('\\| ' + c + ' \\|'), c));
  assert.match(t, /^## Mapa systemow/m);
  assert.match(t, /nasz/);
  assert.match(t, /reczny/);
  assert.match(read('skills/init/SKILL.md'), /templates\/requirements\//);  // init kopiuje caly katalog
});

test('AC-SY2..AC-SY4: skill domain - krok SYSTEMS, spojnosc mastera, zmiany za zgoda', () => {
  const s = read('skills/domain/SKILL.md');
  assert.match(s, /\*\*SYSTEMS\.md\*\*/);
  assert.match(s, /`Master dla`/);
  assert.match(s, /flowchart LR/);
  assert.match(s, /sequenceDiagram/);
  assert.match(s, /`Krytyczna = tak`/);
  assert.match(s, /dwoch masterow[^\n]*`sprzeczne`/);
  assert.match(s, /`Master dla`, `Przy awarii` albo `Krytyczna`[^\n]*PYTASZ/);
});

// ---- Interview
test('AC-SY5, AC-SY6: interview - luka integracji, przy awarii poza akceptacja as-built', () => {
  const s = read('skills/interview/SKILL.md');
  assert.match(s, /\*\*Luka integracji\*\*/);
  assert.match(s, /Piec regul/);
  assert.match(s, /`Przy awarii`[^\n]*(nie obejmuje|NIE obejmuje|zawsze osobne)/i);
});

// ---- Validate
test('AC-SY7..AC-SY10: validate - kontrole 17-19, brak pliku = INFO, numery 1-16 bez zmian', () => {
  const v = read('skills/validate/SKILL.md');
  assert.match(v, /^17\. BLOCK:[^\n]*dw(a|och) (systemy|systemow)[^\n]*master/im);
  assert.match(v, /^18\. WARN:[^\n]*`Przy awarii`[^\n]*`Wlasciciel`/m);
  assert.match(v, /^19\. WARN:[^\n]*`Krytyczna = tak`[^\n]*Proces systemowy/m);
  assert.match(v, /[Bb]rak `SYSTEMS\.md`[^\n]*INFO/);
  assert.match(v, /^16\. BLOCK: D/m);
  assert.match(v, /^9\. WARN: pojecie uzyte w PRD/m);
});

// ---- Panel
test('AC-SY11: etap Domain liczy systemy i pokazuje liste, status bez zmian', () => {
  const req = freshProject();
  assert.strictEqual(stage(readProgress(req), 'domain').counts.systems, 0);  // wiersz-wzor z <...> nie liczy sie
  fs.writeFileSync(path.join(req, '02-domain', 'SYSTEMS.md'), SYS);
  const d = stage(readProgress(req), 'domain');
  assert.strictEqual(d.counts.systems, 3);
  assert.strictEqual(d.counts.critical, 1);
  assert.deepStrictEqual(d.details.systems.items.map(i => i.id), ['S-001', 'S-002', 'S-003']);
  assert.strictEqual(d.details.systems.items[1].title, 'NBP');
  assert.match(d.details.systems.items[1].note, /zewnetrzny/);
  assert.doesNotMatch(d.details.systems.items[0].note, /master dla: -/);
  assert.strictEqual(d.details.systems.file, '02-domain/SYSTEMS.md');
  assert.strictEqual(d.status, 'todo');  // slownik pusty - systemy nie zmieniaja statusu etapu
  assert.match(read('board/progress.html'), /\['systems','systemów'\]/);
});

test('AC-SY12: zakladka Modul - liczba systemow i integracji krytycznych', () => {
  const req = freshProject();
  fs.writeFileSync(path.join(req, '02-domain', 'SYSTEMS.md'), SYS);
  const m = moduleSummary(req);
  assert.strictEqual(m.counts.systems, 3);
  assert.strictEqual(m.counts.critical, 1);
  const h = read('board/info.html');
  assert.match(h, /c\.systems/);
  assert.match(h, /c\.critical/);
});

test('AC-SY13: zmiana SYSTEMS.md zmienia odcisk wymagan', () => {
  const req = freshProject();
  const before = fingerprint(req);
  fs.writeFileSync(path.join(req, '02-domain', 'SYSTEMS.md'), SYS);
  assert.notStrictEqual(fingerprint(req), before);
});

// ---- Handover, dokumentacja
test('AC-SY14: handover - zadanie integracyjne z wierszem SYSTEMS i AC przy awarii', () => {
  const s = read('skills/handover/SKILL.md');
  assert.match(s, /SYSTEMS\.md/);
  assert.match(s, /[Pp]rzy awarii[^\n]*osobne (AC|kryterium)/);
});

test('AC-SY15: przewodnik - SYSTEMS w 02-domain, S w identyfikatorach, mapa i proces systemowy', () => {
  const g = JSON.stringify(guide());
  assert.match(g, /systemy \(SYSTEMS\)/);
  assert.match(g, /\*\*S\*\* – system/);
  assert.match(g, /[Mm]apa systemów/);
  assert.match(g, /[Pp]roces systemowy/);
});

test('AC-SY16: CLAUDE.md - S-xxx w identyfikatorach', () => {
  assert.match(read('templates/CLAUDE.md'), /`S-xxx` system/);
});

test('AC-SY18: intake porownuje z SYSTEMS, spec --agent wskazuje SYSTEMS w plan.md', () => {
  assert.match(read('skills/intake/SKILL.md'), /`02-domain\/SYSTEMS\.md`/);
  assert.match(read('skills/spec/SKILL.md'), /plan\.md[^\n]*SYSTEMS/);
});

// ---- Demo
test('AC-SY17: demo - SYSTEMS.md, raport z wierszami 17-19, nadal 100% i aktualny', () => {
  const d = stage(readProgress(DEMO_REQ), 'domain');
  assert.ok(d.counts.systems >= 3, 'systemy w demo: ' + d.counts.systems);
  const rep = fs.readFileSync(path.join(DEMO_REQ, '04-validation', 'validate-2026-09-27.md'), 'utf8');
  ['17', '18', '19'].forEach(n => assert.match(rep, new RegExp('^\\| ' + n + ' \\|', 'm'), 'wiersz ' + n));
  const p = readProgress(DEMO_REQ);
  const v = stage(p, 'validate');
  assert.strictEqual(v.counts.readiness, 100);
  assert.ok(!v.stale, 'raport demo nieaktualny - przelicz odcisk');
  assert.strictEqual(p.next.key, 'handover');
});

// ======== Czesc B: rodzaj modulu (kind) i kontrakt jako wymaganie (AC-SY19..AC-SY30)
const info = require('../info');
const redmine = require('../redmine');
const setYaml = (req, fn) => { const f = path.join(req, 'SDD.yaml'); fs.writeFileSync(f, fn(fs.readFileSync(f, 'utf8'))); };

test('AC-SY19: szablon SDD.yaml ma kind: monolith z komentarzem', () => {
  const y = read('templates/requirements/SDD.yaml');
  assert.match(y, /^kind: monolith\s+# monolith \| service/m);
  assert.ok(y.indexOf('kind:') > y.indexOf('level:'), 'kind pod level');
});

test('AC-SY20: init pyta o rodzaj modulu pytaniem rozstrzygajacym, podpowiedz tylko jako sugestia', () => {
  const s = read('skills/init/SKILL.md');
  assert.match(s, /wdrazana osobno/);
  assert.match(s, /`kind: monolith`|`kind`/);
  assert.match(s, /podpowiedz[^\n]*`\[AI\]`[^\n]*wybiera czlowiek/i);
});

test('AC-SY21: Konfiguracja zapisuje kind; panel i Modul pokazuja rodzaj po polsku', () => {
  const req = freshProject();
  let y = fs.readFileSync(path.join(req, 'SDD.yaml'), 'utf8');
  const y2 = info.yamlSet(y, { kind: 'service' });
  assert.match(y2, /^kind: service\s+# monolith \| service/m);
  assert.throws(() => info.yamlSet(y, { kind: 'mikro' }), /kind/);
  // brak linii kind (projekt sprzed 0.31.0) -> wstawiona pod level
  const old = y.replace(/^kind:.*\n/m, '');
  const y3 = info.yamlSet(old, { kind: 'service' });
  assert.match(y3, /^level:.*\nkind: service/m);
  assert.deepStrictEqual(info.KINDS, ['monolith', 'service']);
  const srv = read('board/server.js');
  assert.match(srv, /allowed = \[[^\]]*'kind'/);
  assert.match(srv, /kind: info\.yamlField\(y, 'kind'\)/);
  const h = read('board/info.html');
  assert.match(h, /f-kind/);
  assert.match(h, /KIND=\{monolith:'monolit/);
  assert.match(read('board/progress.html'), /KIND\[p\.kind\]/);
});

test('AC-SY22: odcisk obejmuje kind: service; monolith jawny = brak pola (stare raporty aktualne)', () => {
  const req = freshProject();
  const base = fingerprint(req);
  setYaml(req, t => t.replace(/^kind:.*\n/m, ''));
  assert.strictEqual(fingerprint(req), base, 'brak pola = monolith');
  setYaml(req, t => t.replace(/^(level:.*\n)/m, '$1kind: service\n'));
  assert.notStrictEqual(fingerprint(req), base);
});

test('AC-SY23: readProgress i moduleSummary zwracaja kind (domyslnie monolith)', () => {
  const req = freshProject();
  setYaml(req, t => t.replace(/^kind:.*\n/m, ''));
  assert.strictEqual(readProgress(req).kind, 'monolith');
  assert.strictEqual(moduleSummary(req).kind, 'monolith');
  setYaml(req, t => t.replace(/^(level:.*\n)/m, '$1kind: service\n'));
  assert.strictEqual(readProgress(req).kind, 'service');
  assert.strictEqual(moduleSummary(req).kind, 'service');
});

test('AC-SY24: SYSTEMS.md - kolumna Wymagania i rola konsument; panel pokazuje R kontraktu', () => {
  const t = read('templates/requirements/02-domain/SYSTEMS.md');
  assert.match(t, /\| Krytyczna \| Wymagania \| Status \|/);
  assert.match(t, /konsument/);
  assert.match(t, /wpisem recznym[^\n]*zwykle `R`/);
  const req = freshProject();
  fs.writeFileSync(path.join(req, '02-domain', 'SYSTEMS.md'),
    '| ID | System | Rola | Wlasciciel | Master dla | Wymiana | Przy awarii | Krytyczna | Wymagania | Status | Zrodlo |\n|--|--|--|--|--|--|--|--|--|--|--|\n' +
    '| S-002 | NBP | zewnetrzny | DR | Kurs | -> my | ostatni kurs | tak | R-020 | robocze | [Biz] s.md |\n');
  const it = stage(readProgress(req), 'domain').details.systems.items[0];
  assert.match(it.note, /kontrakt: R-020/);
});

test('AC-SY25: spec - rodzaj wymagania kontrakt z obowiazkowymi AC, bez schematu technicznego', () => {
  const s = read('skills/spec/SKILL.md');
  assert.match(s, /`Rodzaj: kontrakt - wejscie\|wyjscie`/);
  assert.match(s, /`System: S-xxx`/);
  assert.match(s, /dopuszczalne opoznienie/);
  assert.match(s, /zmiana wersji/);
  assert.match(s, /[Bb]ez schematu technicznego|nie wchodzi do PRD/);
  assert.match(read('templates/requirements/03-spec/PRD.md'), /^Rodzaj:/m);
});

test('AC-SY26: validate - kontrola 20 WARN przy monolith, BLOCK przy service; 1-19 bez zmian', () => {
  const v = read('skills/validate/SKILL.md');
  assert.match(v, /^20\. WARN \(`monolith`\) \/ BLOCK \(`service`\):/m);
  assert.match(v, /bez zadnego `R` kontraktu wyjscia[^\n]*BLOCK/);
  assert.match(v, /`reczny` z wpisem recznym[^\n]*nie potrzebuje kontraktu/);
  assert.match(v, /wymiana plikow/);
  assert.match(v, /^19\. WARN:/m);
  assert.match(v, /^17\. BLOCK:/m);
});

test('AC-SY27: interview - przy service pytania o konsumentow i obietnice', () => {
  const s = read('skills/interview/SKILL.md');
  assert.match(s, /`kind: service`[^\n]*konsument/);
  assert.match(s, /zmian(ie|a) wersji/);
});

test('AC-SY28: handover - test kontraktowy w TRACEABILITY; status done odmawia przy service bez testu', () => {
  const s = read('skills/handover/SKILL.md');
  assert.match(s, /R \| AC \| Rodzaj \| task \| test/);
  assert.match(s, /test kontraktowy/);
  const req = freshProject();
  write(req, '04-validation/TRACEABILITY.md', '# Sledzenie\n\n| R | AC | Rodzaj | task | test |\n|---|---|---|---|---|\n' +
    '| R-020 | AC-020-1 | kontrakt - wyjscie | #41 | |\n| R-001 | AC-001-1 | - | #42 | |\n');
  // monolith: bez bramki
  assert.doesNotThrow(() => redmine.contractGate(req, '41', 'done', 'Commit abc'));
  setYaml(req, t => t.replace(/^kind:.*$/m, 'kind: service'));
  assert.throws(() => redmine.contractGate(req, '41', 'done', 'Commit abc; testy: AC-020-1'), /test kontraktow/);
  assert.doesNotThrow(() => redmine.contractGate(req, '41', 'done', 'Commit abc; test kontraktowy: pact-limity'));
  assert.doesNotThrow(() => redmine.contractGate(req, '42', 'done', 'Commit abc'));   // nie-kontrakt
  assert.doesNotThrow(() => redmine.contractGate(req, '41', 'start', ''));            // tylko done
});

test('AC-SY29: przewodnik i CLAUDE.md - rodzaj modulu, kontrakt jako wymaganie', () => {
  const g = JSON.stringify(guide());
  assert.match(g, /[Rr]odzaj modułu/);
  assert.match(g, /monolit/);
  assert.match(g, /serwis/);
  assert.match(g, /[Kk]ontrakt[^"]*wymagani/);
  const c = read('templates/CLAUDE.md');
  assert.match(c, /`kind`/);
  assert.match(c, /[Kk]ontrakt[^\n]*`R`/);
});

test('AC-SY30: demo jest monolith, raport z wierszem 20, nadal 100% i aktualny', () => {
  assert.strictEqual(readProgress(DEMO_REQ).kind, 'monolith');
  const rep = fs.readFileSync(path.join(DEMO_REQ, '04-validation', 'validate-2026-09-27.md'), 'utf8');
  assert.match(rep, /^\| 20 \|/m);
  const v = stage(readProgress(DEMO_REQ), 'validate');
  assert.strictEqual(v.counts.readiness, 100);
  assert.ok(!v.stale);
});

function write(req, rel, text) {
  fs.mkdirSync(path.dirname(path.join(req, rel)), { recursive: true });
  fs.writeFileSync(path.join(req, rel), text);
}
