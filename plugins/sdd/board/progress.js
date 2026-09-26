// Stan procesu SDD liczony z plikow w requirements/. Tylko odczyt.
// Reguly statusu etapow: docs/specs/progress-ui.md
'use strict';
const fs = require('fs');
const path = require('path');

const STAGES = [
  { key: 'intake', name: 'Intake', command: '/sdd:intake',
    desc: 'Wrzucasz surowe materiały (maile, notatki, zrzuty), AI robi z nich spis i wskazuje sprzeczności.',
    howto: ["Przeciągnij na kartę Intake wszystkie materiały: maile, notatki, PDF-y, zrzuty ekranu.",
      "Gdy wrzucisz już wszystko, skopiuj komendę i wklej ją w Claude Code.",
      "AI zrobi spis źródeł i wskaże sprzeczności. Status plików zmieni się na „dodane”."] },
  { key: 'interview', name: 'Interview', command: '/sdd:interview',
    desc: 'AI zadaje pytania z luk w materiałach, odpowiedzi biznesu stają się decyzjami albo założeniami.',
    howto: ["Skopiuj komendę i wklej ją w Claude Code.",
      "AI pokaże pytania wynikające z luk w materiałach. Odpowiadaj krótko albo wskaż, kogo z biznesu zapytać.",
      "Każdą odpowiedź potwierdzasz „tak” i wtedy staje się decyzją albo założeniem."] },
  { key: 'domain', name: 'Domain', command: '/sdd:domain',
    desc: 'Słownik pojęć, kto jest kim, obiekty i reguły. Biznes zatwierdza słownik.',
    howto: ["Skopiuj komendę i wklej ją w Claude Code.",
      "AI zbuduje słownik pojęć, role, obiekty i reguły biznesowe.",
      "Przejrzyj słownik i zatwierdź hasła. Braki wrócą jako nowe pytania."] },
  { key: 'spec', name: 'Spec', command: '/sdd:spec',
    desc: 'Wymagania R-xxx ze źródłem i kryteriami akceptacji. Właściciel roli zatwierdza.',
    howto: ["Skopiuj komendę i wklej ją w Claude Code.",
      "AI proponuje wymagania paczkami po 3–5, każde ze źródłem i kryterium akceptacji.",
      "Zatwierdzasz „tak” albo poprawiasz, zanim trafią do dokumentu."] },
  { key: 'validate', name: 'Validate', command: '/sdd:validate',
    desc: 'Automatyczna kontrola kompletności i procent gotowości do budowy.',
    howto: ["Skopiuj komendę i wklej ją w Claude Code.",
      "AI sprawdzi kompletność i poda procent gotowości do budowy.",
      "To, co blokuje, pojawi się w „Blokuje dev”. Popraw i uruchom ponownie, aż będzie 100%."] },
  { key: 'handover', name: 'Handover', command: '/sdd:handover',
    desc: 'Zamiana specu na zadania dla zespołu, z tabelą śledzenia R → zadanie → test.',
    howto: ["Skopiuj komendę i wklej ją w Claude Code.",
      "AI zamieni wymagania na zadania dla zespołu (plik, Linear albo Jira) i zapyta, zanim cokolwiek wyśle.",
      "Powstanie tabela śledzenia: wymaganie → zadanie → test."] },
];

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { return ''; }
}

// Pierwsza tabela markdown w tekscie -> wiersze jako obiekty kluczowane naglowkiem (male litery).
function parseTable(md) {
  const lines = md.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 2) return [];
  const cells = l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const head = cells(lines[0]).map(h => h.toLowerCase());
  return lines.slice(1)
    .filter(l => !/^\|[\s|:-]+\|$/.test(l))
    .map(l => {
      const c = cells(l), row = { _raw: l };
      head.forEach((h, i) => { row[h] = c[i] || ''; });
      return row;
    })
    .filter(r => !/<[^>]+>/.test(r._raw));
}

function yamlField(text, key) {
  const m = text.match(new RegExp('^' + key + ':\\s*"?([^"#\\n]*?)"?\\s*(#.*)?$', 'm'));
  return m ? m[1].trim() : '';
}

function listFiles(dir) {
  let out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listFiles(full));
    else out.push(full);
  }
  return out;
}

function qKind(status) {
  const s = status.toLowerCase();
  if (s.startsWith('zadane')) return 'asked';
  if (s.startsWith('otwarte')) return 'open';
  if (s.startsWith('sprzeczne')) return 'conflicting';
  if (s.startsWith('odpowiedziane')) return 'answered';
  if (s.startsWith('zaparkowane')) return 'parked';
  return 'other';
}

// INDEX.md to spis, porownanie-*.md to zapis porownania nowego zrodla z modelem.
// Oba sa artefaktami procesu, nie surowcem - nie licz ich i nie zganiaj do spisu.
function isProcessFile(name) {
  return name === 'INDEX.md' || /^porownanie-.*\.md$/.test(name);
}

function intake(req) {
  const index = read(path.join(req, '00-intake', 'INDEX.md'));
  const rows = parseTable(index);
  const files = listFiles(path.join(req, '00-intake')).filter(f => !isProcessFile(path.basename(f)));
  const list = files.map(f => {
    let st = { size: 0, mtimeMs: 0 };
    try { st = fs.statSync(f); } catch (e) { /* plik zniknal */ }
    const name = path.relative(path.join(req, '00-intake'), f).split(path.sep).join('/');
    return { name, size: st.size, mtime: st.mtimeMs, indexed: index.includes(path.basename(f)) };
  }).sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name));
  const unindexed = list.filter(f => !f.indexed).length;
  const status = unindexed > 0 ? 'active' : rows.length > 0 ? 'done' : 'todo';
  return { status, counts: { sources: rows.length, files: files.length, unindexed }, files: list };
}

// Etykieta blokujaca w wierszu pytania, ale nie zaprzeczona ("nie blokuje go-live").
function hasGate(raw, gate) {
  if (!gate) return false;
  const text = raw.toLowerCase(), g = gate.toLowerCase();
  for (let i = text.indexOf(g); i >= 0; i = text.indexOf(g, i + 1)) {
    if (!/(^|[^a-ząćęłńóśźż])nie\s+$/.test(text.slice(Math.max(0, i - 8), i))) return true;
  }
  return false;
}

function interview(req, gate) {
  const qs = parseTable(read(path.join(req, '01-interview', 'QUESTIONS.md')));
  const as = parseTable(read(path.join(req, '01-interview', 'ASSUMPTIONS.md')));
  const decisions = (read(path.join(req, '01-interview', 'DECISIONS.md')).match(/^##\s+D-\d+/gm) || []).length;
  const by = k => qs.filter(q => qKind(q.status || '') === k).length;
  const counts = {
    questions: qs.length, open: by('open'), asked: by('asked'), conflicting: by('conflicting'),
    answered: by('answered'), parked: by('parked'), decisions,
    assumptions: as.length,
    unconfirmed: as.filter(a => /niepotwierdzone/i.test(a.status || '')).length,
    refuted: as.filter(a => /obalone/i.test(a.status || '')).length,
  };
  const blockers = qs.filter(q => {
    const k = qKind(q.status || '');
    if (k === 'conflicting') return true;
    return (k === 'open' || k === 'asked') && hasGate(q._raw, gate);
  }).map(q => ({ id: q.id, text: q.pytanie || '', reason: qKind(q.status) === 'conflicting' ? 'sprzeczne' : gate }));
  // Tylko blokery trzymaja etap w toku - zwykle otwarte pytania powstaja na kazdym etapie
  // i nie cofaja procesu (zmiana 0.9.0); widac je w licznikach i w "Czeka na biznes".
  const status = counts.questions === 0 && decisions === 0 ? 'todo' : blockers.length > 0 ? 'active' : 'done';

  // Lista do wyjasnienia na karcie Interview (zmiana 0.9.0): kolejnosc jak priorytet wywiadu.
  // "Wszystkie" tez widac (odpowiedziane, zaparkowane) - po pytaniach do wyjasnienia.
  const rank = q => !q.pending ? 3 : q.kind === 'conflicting' ? 0 : q.blocking ? 1 : 2;
  const questions = qs.map(q => {
    const kind = qKind(q.status || '');
    const pending = kind === 'open' || kind === 'asked' || kind === 'conflicting';
    return { id: q.id, text: q.pytanie || '', kind, status: (q.status || '').trim(), pending,
      role: q['do kogo (rola)'] || q['do kogo'] || '', source: q['skad'] || '',
      closedBy: (q['zamkniete przez'] || '').trim(),
      blocking: (kind === 'open' || kind === 'asked') && hasGate(q._raw, gate) };
  }).sort((a, b) => rank(a) - rank(b) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));

  const roles = new Map();
  qs.filter(q => qKind(q.status || '') === 'asked').forEach(q => {
    const role = q['do kogo (rola)'] || q['do kogo'] || '?';
    if (!roles.has(role)) roles.set(role, []);
    roles.get(role).push(q.id);
  });
  const waiting = [...roles].map(([role, ids]) => ({ role, count: ids.length, ids }));
  return { status, counts, blockers, waiting, questions };
}

function domain(req) {
  const d = f => path.join(req, '02-domain', f);
  const gl = parseTable(read(d('GLOSSARY.md')));
  const approved = gl.filter(g => /^zatwierdzone/i.test(g.status || '')).length;
  const entities = (read(d('ENTITIES.md')).match(/^##\s+[^<\n]+$/gm) || []).length;
  const counts = {
    terms: gl.length, approved, entities,
    actors: parseTable(read(d('ACTORS.md'))).length,
    rules: parseTable(read(d('RULES.md'))).length,
  };
  const status = gl.length === 0 ? 'todo' : approved === gl.length ? 'done' : 'active';
  return { status, counts };
}

function spec(req, level) {
  const file = path.join(req, '03-spec', level === 'light' ? 'SPEC.md' : 'PRD.md');
  const lines = read(file).split('\n');
  const reqs = [];
  let cur = null;
  for (const l of lines) {
    const h = l.match(/^#{2,4}\s+(R-\d+)\s*(.*)$/);
    if (h) { cur = /<[^>]+>/.test(h[2]) ? null : { id: h[1], status: '' }; if (cur) reqs.push(cur); continue; }
    if (/^#{1,4}\s/.test(l)) { cur = null; continue; }
    const s = cur && l.match(/^Status:\s*(.+)$/);
    if (s && !cur.status) cur.status = s[1].trim();
  }
  const approved = reqs.filter(r => /^zatwierdzone/i.test(r.status)).length;
  const counts = {
    requirements: reqs.length, approved,
    review: reqs.filter(r => /^do przegladu/i.test(r.status)).length,
    agentFiles: listFiles(path.join(req, '03-spec', 'agent')).length,
  };
  const status = reqs.length === 0 ? 'todo' : approved === reqs.length ? 'done' : 'active';
  return { status, counts };
}

function validate(req) {
  const dir = path.join(req, '04-validation');
  let reports = [];
  try { reports = fs.readdirSync(dir).filter(f => /^validate-.*\.md$/.test(f)).sort(); } catch (e) { /* brak */ }
  if (!reports.length) return { status: 'todo', counts: { reports: 0, readiness: null } };
  const last = reports[reports.length - 1];
  const m = read(path.join(dir, last)).match(/gotowo(?:s|ś)(?:c|ć)[^0-9\n]*?(\d{1,3})\s*%/i);
  const readiness = m ? parseInt(m[1], 10) : null;
  return { status: readiness === 100 ? 'done' : 'active', counts: { reports: reports.length, readiness, last } };
}

function handover(req) {
  const dir = path.join(req, '04-validation');
  const trace = fs.existsSync(path.join(dir, 'TRACEABILITY.md'));
  let backlogs = 0;
  try { backlogs = fs.readdirSync(dir).filter(f => /^backlog-.*\.md$/.test(f)).length; } catch (e) { /* brak */ }
  return { status: trace ? 'done' : 'todo', counts: { traceability: trace, backlogs } };
}

function readProgress(reqDir) {
  const req = path.resolve(reqDir);
  if (!fs.existsSync(req)) return { exists: false, dir: req };
  const yaml = read(path.join(req, 'SDD.yaml'));
  const project = yamlField(yaml, 'project');
  const level = yamlField(yaml, 'level') || 'full';
  const gate = yamlField(yaml, 'gate_blocking_status');

  const iv = interview(req, gate);
  const results = {
    intake: intake(req), interview: iv, domain: domain(req),
    spec: spec(req, level), validate: validate(req), handover: handover(req),
  };
  const stages = STAGES.map(s => Object.assign({}, s, { status: results[s.key].status, counts: results[s.key].counts },
    results[s.key].files ? { files: results[s.key].files } : {},
    results[s.key].questions ? { questions: results[s.key].questions } : {}));
  const next = stages.find(s => s.status !== 'done')
    || { key: 'done', name: 'Gotowe', command: '/sdd:status', desc: 'Wszystkie etapy zamknięte.',
      howto: ['Skopiuj komendę i wklej ją w Claude Code, żeby zobaczyć podsumowanie.', 'Nowe materiały wrzucasz jak wcześniej, do karty Intake.'] };

  const changelog = read(path.join(req, 'CHANGELOG.md')).split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#')).slice(-5).reverse();

  return {
    exists: true, dir: req, project: /<[^>]+>/.test(project) ? '' : project, level,
    stages, next: { key: next.key, name: next.name, command: next.command, desc: next.desc, howto: next.howto },
    blockers: iv.blockers, waiting: iv.waiting, changelog,
    updated: new Date().toISOString(),
  };
}

module.exports = { isProcessFile, readProgress, parseTable, STAGES };
