// Stan procesu SDD liczony z plikow w requirements/. Tylko odczyt.
// Reguly statusu etapow: docs/specs/progress-ui.md
'use strict';
const fs = require('fs');
const path = require('path');
const { fingerprint } = require('./fingerprint');

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
      "AI zamieni wymagania na zadania dla zespołu (plik, Linear, Jira albo Redmine) i zapyta, zanim cokolwiek wyśle.",
      "Powstanie tabela śledzenia: wymaganie → zadanie → test."] },
];

// Konce linii Windows (CRLF, Git na Windows) -> \n: parsery dziela tekst po '\n' (zmiana 0.27.1, AC-W1).
function read(file) {
  try { return fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n'); } catch (e) { return ''; }
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
    // wiersz-wzor z szablonu ma komorke w calosci <opis>; strzalka <-> i tekst z <encja> w srodku zdania (SYSTEMS.md,
    // weryfikacja 0.31.0 na fv-manager) to dane, nie wzor
    .filter(r => !cells(r._raw).some(c => /^<[^<>]*[a-zA-Ząćęłńóśźż][^<>]*>$/.test(c)));
}

// Szczegoly licznikow (zmiana 0.15.0, AC-54..AC-56): lista pozycji z plikiem, z ktorego pochodza.
const list = (file, items) => ({ file, items });
const clean = v => String(v || '').trim();

// DECISIONS.md: sekcje "## D-001 | data | tytul" z polami "Decyzja:", "Powod:", "Zdecydowal:". Szablon D-xxx pominiety.
function parseDecisions(md) {
  const out = [];
  let cur = null;
  md.split('\n').forEach(l => {
    const h = l.match(/^##\s+(D-\d+)\s*(?:\|\s*([^|]*?)\s*)?(?:\|\s*(.*))?$/);
    if (h) { cur = { id: h[1], date: clean(h[2]), title: clean(h[3]), fields: {} }; out.push(cur); return; }
    if (/^#{1,2}\s/.test(l)) { cur = null; return; }
    const f = cur && l.match(/^(Decyzja|Powod|Zdecydowal|Wplyw):\s*(.*)$/);
    if (f && !(f[1] in cur.fields)) cur.fields[f[1]] = clean(f[2]);
  });
  return out.map(d => {
    const who = d.fields.Zdecydowal;
    const item = { id: d.id, title: d.title || d.fields.Decyzja || '', impact: d.fields.Wplyw || '',
      status: [who && 'zdecydował: ' + who, d.date].filter(Boolean).join(' · '), note: d.fields.Decyzja || '' };
    if (!d.fields.Powod || /^\(puste/.test(d.fields.Powod)) item.warn = 'brak powodu';
    return item;
  });
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
  const decisions = parseDecisions(read(path.join(req, '01-interview', 'DECISIONS.md'))).length;
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
  // done z zaleglosciami (zmiana 0.10.1): pytania do wyjasnienia, ktore nie blokuja.
  const partial = status === 'done' ? counts.open + counts.asked : 0;
  const aItem = a => ({ id: a.id, title: a.zalozenie || '', status: clean(a.status),
    note: [a.zrodlo && 'źródło: ' + a.zrodlo, a['wymagania zalezne'] && 'wymagania: ' + a['wymagania zalezne']].filter(Boolean).join(' · ') });
  const aFile = '01-interview/ASSUMPTIONS.md';
  const details = {
    decisions: list('01-interview/DECISIONS.md', parseDecisions(read(path.join(req, '01-interview', 'DECISIONS.md')))),
    unconfirmed: list(aFile, as.filter(a => /niepotwierdzone/i.test(a.status || '')).map(aItem)),
    refuted: list(aFile, as.filter(a => /obalone/i.test(a.status || '')).map(aItem)),
  };
  return { status, partial, counts, blockers, waiting, questions, details };
}

function domain(req) {
  const d = f => path.join(req, '02-domain', f);
  const gl = parseTable(read(d('GLOSSARY.md')));
  const approvedGl = gl.filter(g => /^zatwierdzone/i.test(g.status || ''));
  const approved = approvedGl.length;
  const ents = (read(d('ENTITIES.md')).match(/^##\s+[^<\n]+$/gm) || []).map(h => h.replace(/^##\s+/, '').trim());
  const actors = parseTable(read(d('ACTORS.md'))), rules = parseTable(read(d('RULES.md')));
  // Rejestr systemow (zmiana 0.31.0, docs/specs/systems.md AC-SY11): tylko liczby i lista - status etapu bez zmian
  const systems = parseTable(read(d('SYSTEMS.md'))).filter(s => /^S-\d+/.test(s.id || ''));
  const counts = { terms: gl.length, approved, entities: ents.length, actors: actors.length, rules: rules.length,
    systems: systems.length, critical: systems.filter(s => /^tak/i.test(s.krytyczna || '')).length };
  const status = gl.length === 0 ? 'todo' : approved === gl.length ? 'done' : 'active';
  const term = g => ({ id: '', title: g.pojecie || '', status: clean(g.status), note: g.definicja || '' });
  const details = {
    terms: list('02-domain/GLOSSARY.md', gl.map(term)),
    approved: list('02-domain/GLOSSARY.md', approvedGl.map(term)),
    actors: list('02-domain/ACTORS.md', actors.map(a => ({ id: '', title: a.rola || '', status: clean(a.status), note: a['co robi'] || '' }))),
    rules: list('02-domain/RULES.md', rules.map(r => ({ id: r.id, title: r.regula || '', status: clean(r.status),
      note: r.wymagania ? 'wymagania: ' + r.wymagania : '' }))),
    entities: list('02-domain/ENTITIES.md', ents.map(e => ({ id: '', title: e, status: '', note: '' }))),
    systems: list('02-domain/SYSTEMS.md', systems.map(s => ({ id: s.id, title: s.system || '', status: clean(s.status),
      note: [s.rola, !/^-?$/.test((s['master dla'] || '').trim()) && 'master dla: ' + s['master dla'], s.wymiana, /^tak/i.test(s.krytyczna || '') && 'krytyczna',
        /R-\d+/.test(s.wymagania || '') && 'kontrakt: ' + s.wymagania]
        .filter(x => x && x !== '-').join(' · ') }))),
  };
  return { status, counts, details };
}

function spec(req, level) {
  const file = path.join(req, '03-spec', level === 'light' ? 'SPEC.md' : 'PRD.md');
  const lines = read(file).split('\n');
  const reqs = [], review = {};
  let cur = null, sec6 = false;
  for (const l of lines) {
    const h = l.match(/^#{2,4}\s+(R-\d+)\s*(.*)$/);
    if (h) { cur = /<[^>]+>/.test(h[2]) ? null : { id: h[1], title: h[2].trim(), status: '', desc: '' }; if (cur) reqs.push(cur); sec6 = false; continue; }
    if (/^#{1,4}\s/.test(l)) { cur = null; sec6 = /^##\s+6\.?\s/.test(l); continue; }
    if (sec6) { // sekcja "6. Do przegladu": linie z R-xxx -> powod przegladu
      (l.match(/R-\d+/g) || []).forEach(id => { review[id] = (review[id] ? review[id] + '; ' : '') + l.replace(/^[-*\s]+/, '').trim(); });
      continue;
    }
    const s = cur && l.match(/^Status:\s*(.+)$/);
    if (s && !cur.status) cur.status = s[1].trim();
    const o = cur && l.match(/^Opis:\s*(.+)$/);
    if (o && !cur.desc) cur.desc = o[1].trim();
  }
  const approved = reqs.filter(r => /^zatwierdzone/i.test(r.status)).length;
  const counts = {
    requirements: reqs.length, approved,
    review: reqs.filter(r => /^do przegladu/i.test(r.status)).length,
    agentFiles: listFiles(path.join(req, '03-spec', 'agent')).length,
  };
  const status = reqs.length === 0 ? 'todo' : approved === reqs.length ? 'done' : 'active';
  const rel = '03-spec/' + path.basename(file);  // sciezka do wyswietlenia: zawsze z / (Windows dawal \, AC-W5)
  const rItem = r => ({ id: r.id, title: r.title, status: r.status, note: r.desc });
  const details = {
    requirements: list(rel, reqs.map(rItem)),
    approved: list(rel, reqs.filter(r => /^zatwierdzone/i.test(r.status)).map(rItem)),
    review: list(rel, reqs.filter(r => /^do przegladu/i.test(r.status))
      .map(r => Object.assign(rItem(r), review[r.id] ? { note: 'powód przeglądu: ' + review[r.id] } : {}))),
  };
  return { status, counts, details };
}

function validate(req) {
  const dir = path.join(req, '04-validation');
  let reports = [];
  try { reports = fs.readdirSync(dir).filter(f => /^validate-.*\.md$/.test(f)).sort(); } catch (e) { /* brak */ }
  if (!reports.length) return { status: 'todo', counts: { reports: 0, readiness: null } };
  const last = reports[reports.length - 1];
  const text = read(path.join(dir, last));
  const m = text.match(/gotowo(?:s|ś)(?:c|ć)[^0-9\n]*?(\d{1,3})\s*%/i);
  const readiness = m ? parseInt(m[1], 10) : null;
  const stale = stepStale(req, text, 'validate');
  const counts = { reports: reports.length, readiness, last };
  // nieaktualny raport nigdy nie zamyka etapu, nawet przy 100% (zmiana 0.18.0, AC-60, AC-61)
  if (stale) return { status: 'active', stale: true, counts };
  return { status: readiness === 100 ? 'done' : 'active', counts, missingTerms: missingTerms(text) };
}

// Kontrola 9 walidacji - pojecia w PRD spoza GLOSSARY (zmiana 0.28.13, AC-74). Panel nie widzi pojec, ktorych nie ma
// w slowniku; wynik bierze z wiersza raportu: `| 9 | ... | WARN | „A” (R-1), „B” |`. Zwraca liste pojec albo null.
function missingTerms(text) {
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const row = text.split('\n').filter(l => /^\s*\|/.test(l)).map(cells)
    .find(c => c.length >= 3 && (c[0] === '9' || /GLOSSARY|słownik|slownik/i.test(c[1] || '')) && c.some(x => /^WARN\b/i.test(x)));
  if (!row) return null;
  const at = row.findIndex(x => /^WARN\b/i.test(x));
  const pos = row.slice(at + 1).join(' | ').trim();
  const quoted = (pos.match(/„[^”"\n]+[”"]|"[^"\n]+"|`[^`\n]+`/g) || []).map(q => q.slice(1, -1).trim()).filter(Boolean);
  const terms = quoted.length ? quoted : [pos || 'pojęcia spoza słownika (szczegóły w raporcie)'];
  return terms.filter((t, i) => terms.indexOf(t) === i);
}

// Etap nieaktualny (0.18.0 walidacja, 0.19.0 handover): odcisk w pliku inny niz biezacy; bez odcisku (starsze pliki) -
// po ostatnim wpisie etapu w CHANGELOG jest wpis innego etapu (poza `ignore`). Brak wpisu etapu - nie da sie stwierdzic.
function stepStale(req, text, step, ignore) {
  const fp = text.match(/Odcisk wymaga[nń]:\s*(sha256:[0-9a-f]{64})/i);
  if (fp) return fp[1] !== fingerprint(req);
  const steps = read(path.join(req, 'CHANGELOG.md')).split('\n')
    .map(l => (l.match(/^\d{4}-\d{2}-\d{2}\s*\|\s*([a-z-]+)\s*\|/i) || [])[1]).filter(Boolean);
  const v = steps.lastIndexOf(step);
  return v >= 0 && steps.slice(v + 1).some(x => x !== step && (ignore || []).indexOf(x) < 0);
}

function handover(req) {
  const dir = path.join(req, '04-validation');
  const traceFile = path.join(dir, 'TRACEABILITY.md');
  const trace = fs.existsSync(traceFile);
  let backlogs = 0;
  try { backlogs = fs.readdirSync(dir).filter(f => /^backlog-.*\.md$/.test(f)).length; } catch (e) { /* brak */ }
  const counts = { traceability: trace, backlogs };
  if (!trace) return { status: 'todo', counts };
  // ponowna walidacja i ustawienia panelu po przekazaniu nie zmieniaja wymagan (0.19.0, AC-65, AC-66)
  if (stepStale(req, read(traceFile), 'handover', ['validate', 'config'])) return { status: 'active', stale: true, counts };
  return { status: 'done', counts };
}

function readProgress(reqDir) {
  const req = path.resolve(reqDir);
  if (!fs.existsSync(req)) return { exists: false, dir: req };
  const yaml = read(path.join(req, 'SDD.yaml'));
  const project = yamlField(yaml, 'project');
  const level = yamlField(yaml, 'level') || 'full';
  const kind = yamlField(yaml, 'kind') === 'service' ? 'service' : 'monolith';  // 0.31.0, AC-SY23
  const gate = yamlField(yaml, 'gate_blocking_status');

  const iv = interview(req, gate);
  const results = {
    intake: intake(req), interview: iv, domain: domain(req),
    spec: spec(req, level), validate: validate(req), handover: handover(req),
  };
  const stages = STAGES.map(s => Object.assign({}, s, { status: results[s.key].status, partial: results[s.key].partial || 0, counts: results[s.key].counts },
    results[s.key].files ? { files: results[s.key].files } : {},
    results[s.key].questions ? { questions: results[s.key].questions } : {},
    results[s.key].details ? { details: results[s.key].details } : {},
    results[s.key].stale ? { stale: true } : {}));
  const vs = stages.find(s => s.key === 'validate');
  if (vs && vs.stale) {
    vs.desc = 'Wymagania zmieniły się po ostatniej walidacji - uruchom ją ponownie, zanim przekażesz spec do budowy.';
    vs.howto = ['Skopiuj komendę i wklej ją w Claude Code.', 'AI sprawdzi aktualne wymagania i zapisze nowy raport z odciskiem wymagań.',
      'Gdy gotowość wróci do 100%, etap znów będzie gotowy.'];
  }
  // Slownik niezatwierdzony (zmiana 0.24.0, AC-71): krok zatwierdzania zamiast proponowania /sdd:spec, ktory by odmowil.
  const ds = stages.find(s => s.key === 'domain');
  const waitGl = ds ? ds.counts.terms - ds.counts.approved : 0;
  // Pojecia spoza slownika z aktualnego raportu walidacji (0.28.13, AC-74): pierwszenstwo przed zatwierdzaniem.
  const miss = results.validate.missingTerms;
  if (ds && miss && miss.length) {
    const rel = '04-validation/' + results.validate.counts.last;
    ds.status = 'active';
    ds.counts = Object.assign({}, ds.counts, { missing: miss.length });
    ds.details = Object.assign({}, ds.details, { missing: list(rel, miss.map(t => ({ id: '', title: t, status: 'brak w słowniku',
      note: 'raport walidacji, kontrola 9: pojęcie użyte w PRD, którego nie ma w GLOSSARY' }))) });
    ds.desc = 'Walidacja znalazła pojęcia używane w wymaganiach, których nie ma w słowniku - trzeba je dopisać i zatwierdzić.';
    ds.howto = ['Skopiuj komendę i wklej ją w Claude Code.',
      'Pojęcia spoza słownika (' + miss.length + '): ' + miss.slice(0, 5).join(', ') + (miss.length > 5 ? ' i ' + (miss.length - 5) + ' więcej' : '') +
        ' - AI dopisze je do GLOSSARY jako robocze, z definicją i źródłem.',
      'Potem zatwierdzasz nowe hasła (/sdd:domain zatwierdz) i uruchamiasz ponownie /sdd:validate.'];
  } else if (ds && ds.counts.terms > 0 && waitGl > 0) {
    ds.command = '/sdd:domain zatwierdz';
    ds.desc = 'Słownik pojęć czeka na zatwierdzenie przez biznes - bez tego /sdd:spec nie ruszy.';
    ds.howto = ['Skopiuj komendę i wklej ją w Claude Code.',
      'Hasła do zatwierdzenia: ' + waitGl + ' - AI pokaże je paczkami, z definicją i źródłem.',
      'Zatwierdza rola z SDD.yaml (np. właściciel procesu): „zatwierdzam …” albo poprawka definicji.',
      'Gdy wszystkie hasła są zatwierdzone, następny krok to /sdd:spec.'];
  }
  const hs = stages.find(s => s.key === 'handover');
  if (hs && hs.stale) {
    hs.desc = 'Wymagania zmieniły się po przekazaniu - wygeneruj pliki dla agenta i przekaż zadania ponownie.';
    hs.howto = ['Najpierw w Claude Code: /sdd:spec --agent (pliki dla agenta z aktualnego PRD).',
      'Potem skopiuj komendę /sdd:handover i wklej ją w Claude Code - backlog i tabela śledzenia powstaną od nowa.',
      'Gdy nowa tabela śledzenia ma aktualny odcisk wymagań, etap znów będzie gotowy.'];
  }
  const next = stages.find(s => s.status !== 'done')
    || { key: 'done', name: 'Gotowe', command: '/sdd:status', desc: 'Wszystkie etapy zamknięte.',
      howto: ['Skopiuj komendę i wklej ją w Claude Code, żeby zobaczyć podsumowanie.', 'Nowe materiały wrzucasz jak wcześniej, do karty Intake.'] };

  const changelog = read(path.join(req, 'CHANGELOG.md')).split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#')).slice(-5).reverse();

  return {
    exists: true, dir: req, project: /<[^>]+>/.test(project) ? '' : project, level, kind,
    stages, next: { key: next.key, name: next.name, command: next.command, desc: next.desc, howto: next.howto },
    blockers: iv.blockers, waiting: iv.waiting, changelog,
    updated: new Date().toISOString(),
  };
}

// Pytania dla tablicy (AC-B40): Q-xxx -> tresc, rodzaj statusu, "Zamkniete przez" i powiazane ID R/BR/D/A
// z kolumn "Skad" i "Wplyw" - tablica stawia pytanie obok karteczki z takim ID.
const IDS = /(?<![A-Z])(?:BR|R|D|A)-\d+/g;
function questionIndex(req) {
  const out = {};
  const gate = yamlField(read(path.join(req, 'SDD.yaml')), 'gate_blocking_status');
  // Posrednie ID (AC-B40b): tablica zna glownie R i BR, a pytania "dlaczego" wskazuja D albo A.
  // Decyzja -> ID z jej "Wplyw"; zalozenie -> "Wymagania zalezne" i reguly, ktore na nim stoja.
  const via = {};
  parseDecisions(read(path.join(req, '01-interview', 'DECISIONS.md'))).forEach(d => { via[d.id] = d.impact; });
  parseTable(read(path.join(req, '01-interview', 'ASSUMPTIONS.md'))).forEach(a => { if (a.id) via[a.id.trim()] = a['wymagania zalezne'] || ''; });
  // Wstecz (AC-B40c): regula albo wymaganie, ktore cytuje D/A (zrodlo, zalozenia), stoi na nim.
  const cites = (text, id) => (String(text).match(/(?<![A-Z])(?:D|A)-\d+/g) || []).forEach(x => { via[x] = (via[x] || '') + ' ' + id; });
  parseTable(read(path.join(req, '02-domain', 'RULES.md'))).forEach(r => { if (r.id) cites(r._raw, r.id.trim()); });
  ['PRD.md', 'SPEC.md'].forEach(f => {
    let cur = null;
    read(path.join(req, '03-spec', f)).split('\n').forEach(l => {
      const h = l.match(/^#{2,4}\s+(R-\d+)/);
      if (h) { cur = h[1]; return; }
      if (/^#{1,4}\s/.test(l)) { cur = null; return; }
      if (cur) cites(l, cur);
    });
  });
  parseTable(read(path.join(req, '01-interview', 'QUESTIONS.md'))).forEach(q => {
    const id = (q.id || '').trim();
    if (!/^Q-\d+$/.test(id)) return;
    const refs = [];
    const add = text => String(text || '').replace(IDS, m => { if (refs.indexOf(m) < 0) refs.push(m); return m; });
    add((q['skad'] || '') + ' ' + (q['wplyw'] || ''));
    refs.slice().forEach(r => add(via[r]));
    out[id] = { text: q.pytanie || '', kind: qKind(q.status || ''), status: (q.status || '').trim(),
      closedBy: (q['zamkniete przez'] || '').trim(), refs,
      role: (q['do kogo (rola)'] || q['do kogo'] || '').trim(), blocking: hasGate(q._raw, gate) };
  });
  return out;
}

module.exports = { isProcessFile, readProgress, parseTable, questionIndex, STAGES };
