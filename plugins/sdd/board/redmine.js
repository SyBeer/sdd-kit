#!/usr/bin/env node
// Backlog w Redmine dla /sdd:handover (spec: docs/specs/redmine.md, zmiana 0.28.4). REST API Redmine, bez zaleznosci.
// Uzycie:  node redmine.js check [--req requirements]
//          node redmine.js push <zadania.json> [--req requirements] [--dry-run]
// Konfiguracja: SDD.yaml (redmine_url, redmine_project, redmine_tracker). Klucz API: REDMINE_API_KEY albo Pek kluczy
// macOS (usluga "redmine-api-key"). Klucz nigdy nie trafia do plikow ani na wyjscie.
'use strict';
const fs = require('fs');
const path = require('path');
const { yamlField } = require('./info');
const { redmineKey, envFile } = require('./secrets');

const KEY_HELP = 'Brak klucza API Redmine (klucz: Redmine -> Moje konto -> Klucz dostepu do API). Ustaw go raz:\n' +
  '  w panelu sdd-board: Konfiguracja -> Klucz API Redmine -> Zapisz (macOS i Windows),\n' +
  '  albo w pliku ' + envFile() + ': REDMINE_API_KEY="..."\n' +
  '  (macOS: dziala tez Pek kluczy - security add-generic-password -s redmine-api-key -a "$USER" -w).\n' +
  'Nie wklejaj klucza do czatu ani do plikow projektu.';

const UAT_FIELD = 'Link do środowiska UAT';
// Konfiguracja z SDD.yaml (AC-RM1).
function readConfig(yaml) {
  const url = yamlField(yaml, 'redmine_url').replace(/\/+$/, '');
  const project = yamlField(yaml, 'redmine_project');
  if (!url) throw new Error('Brak redmine_url w SDD.yaml (adres Redmine, np. https://redmine.firma.pl).');
  if (!/^https?:\/\/[^\s/]+/.test(url)) throw new Error('redmine_url musi zaczynac sie od http:// albo https:// - jest: ' + url);
  if (!project) throw new Error('Brak redmine_project w SDD.yaml (identyfikator projektu z adresu /projects/<identyfikator>).');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(project)) throw new Error('redmine_project to identyfikator (male litery, cyfry, - i _), nie nazwa - jest: ' + project);
  // Format opisu (AC-RM11): Markdown domyslnie (tabele i obrazy dzialaja), Textile dla starszych instalacji
  const format = yamlField(yaml, 'redmine_format') || 'markdown';
  if (format !== 'markdown' && format !== 'textile') throw new Error('redmine_format: markdown albo textile - jest: ' + format);
  // Link do srodowiska UAT (AC-RM21): wartosc pola wlasnego w kazdym zadaniu; pole domyslnie "Link do srodowiska UAT"
  const uatLink = yamlField(yaml, 'redmine_uat_link');
  if (uatLink && !/^https?:\/\/\S+$/.test(uatLink)) throw new Error('redmine_uat_link musi byc adresem http:// albo https:// - jest: ' + uatLink);
  // Pole wlasne na kryteria akceptacji (AC-RM13): nazwa albo numer; puste = tylko opis
  return { url, project, tracker: yamlField(yaml, 'redmine_tracker'), format, acField: yamlField(yaml, 'redmine_ac_field'),
    statusStart: yamlField(yaml, 'redmine_status_start'), statusDone: yamlField(yaml, 'redmine_status_done'),
    uatLink, uatField: uatLink ? yamlField(yaml, 'redmine_uat_field') || UAT_FIELD : '' };
}

// Tracker: z konfiguracji (nazwa, bez wielkosci liter) albo pierwszy "funkcjonalnosc / zadanie" - zadania z wymagan
// nie moga trafic jako bledy tylko dlatego, ze "Bug" jest w projekcie pierwszy (AC-RM10, prawdziwy Redmine 2026-10-04).
const FEATURE = /feature|funkcjonaln|story|user story|zadanie|task|wymaganie|requirement/i;
const BUG = /bug|b[lł][aą]d|defect|incident/i;
function pickTracker(trackers, name) {
  if (name) return trackers.find(t => t.name.toLowerCase() === String(name).toLowerCase()) || null;
  return trackers.find(t => FEATURE.test(t.name) && !BUG.test(t.name)) || trackers.find(t => !BUG.test(t.name)) || trackers[0] || null;
}

// Tresc zapytania o zadanie (AC-RM2): nowe z projektem i trackerem, aktualizacja tylko temat i opis.
// Dopisek na koncu tresci od AI (AC-RM16, prosba usera); bez dublowania.
const MARK = '_Wygenerowane przez AI [Claude Code]_';
function withMark(text) {
  const t = String(text || '').replace(/\s+$/, '');
  return t.includes('Wygenerowane przez AI [Claude Code]') ? t : (t ? t + '\n\n' : '') + MARK;
}

function issueBody(task, projectId, trackerId, acFieldId, uat) {
  const issue = task.issue ? {} : { project_id: projectId, tracker_id: trackerId };
  issue.subject = task.subject;
  issue.description = withMark(task.description);
  const cf = [];
  if (acFieldId && task.acceptance != null) cf.push({ id: acFieldId, value: task.acceptance });
  if (uat && uat.id && uat.link) cf.push({ id: uat.id, value: uat.link });  // AC-RM21
  if (cf.length) issue.custom_fields = cf;
  return { issue };
}

// Numer pola wlasnego z nazwy: /custom_fields.json wymaga admina, wiec bierzemy go z pola custom_fields zadan projektu
// (najpierw zadania wybranego trackera, potem dowolne) - AC-RM13.
// Pola wlasne widoczne w zadaniach projektu (do podpowiedzi w check, AC-RM18).
async function projectFields(call, projectId) {
  const r = await call('GET', '/issues.json?project_id=' + projectId + '&status_id=*&limit=25');
  const seen = {};
  ((r.data && r.data.issues) || []).forEach(i => (i.custom_fields || []).forEach(c => { seen[c.id] = c.name; }));
  return Object.keys(seen).map(id => ({ id: +id, name: seen[id] }));
}
async function acFieldOf(call, cfg, projectId, trackerId, fields, key) {
  key = key || 'acField';
  const val = cfg[key];
  if (!val) return null;
  if (/^\d+$/.test(val)) return { id: +val, name: '' };
  const want = val.toLowerCase();
  const hit = (fields || []).find(f => f.name.toLowerCase() === want);
  if (hit) return hit;
  for (const q of ['&tracker_id=' + trackerId, '']) {
    const r = await call('GET', '/issues.json?project_id=' + projectId + q + '&status_id=*&limit=25');
    const found = ((r.data && r.data.issues) || []).map(i => (i.custom_fields || []).find(c => c.name.toLowerCase() === want)).find(Boolean);
    if (found) return { id: found.id, name: found.name };
  }
  const yamlKey = key === 'uatField' ? 'redmine_uat_field' : 'redmine_ac_field';
  throw new Error('Nie znalazlem pola "' + val + '" w zadaniach projektu (nazwe pola widac tylko w istniejacych zadaniach). ' +
    'Wpisz w SDD.yaml numer pola zamiast nazwy, np. ' + yamlKey + ': 1 (numer: Administracja -> Pola wlasne, w adresie /custom_fields/<numer>).');
}

// Zalaczniki zadania (AC-RM12): sciezki wzgledem requirements/, tylko pliki wewnatrz tego folderu.
const TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv' };
function attachmentFiles(req, tasks) {
  const root = path.resolve(req) + path.sep;
  return tasks.map(t => (t.attachments || []).map(rel => {
    const f = path.resolve(req, String(rel));
    if (!f.startsWith(root)) throw new Error('Zadanie ' + t.key + ': zalacznik spoza folderu requirements: ' + rel);
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) throw new Error('Zadanie ' + t.key + ': nie ma pliku ' + rel);
    const name = path.basename(f), ext = name.split('.').pop().toLowerCase();
    return { file: f, name, type: TYPES[ext] || 'application/octet-stream' };
  }));
}

// Klucz: zmienna > ~/.sdd-kit/.env > Pek kluczy macOS (secrets.js, AC-S2)
function apiKey(env) { return redmineKey(env).value; }

function client(cfg, key) {
  return async function call(method, p, body, type) {
    let r;
    try {
      r = await fetch(cfg.url + p, { method, headers: { 'X-Redmine-API-Key': key, 'Content-Type': type || 'application/json', Accept: 'application/json' },
        body: body == null ? undefined : type ? body : JSON.stringify(body) });
    } catch (e) { throw new Error('Brak polaczenia z ' + cfg.url + ' (' + (e.cause && e.cause.code || e.message) + ').'); }
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    return { status: r.status, data };
  };
}
const errs = d => (d && d.errors ? d.errors.join('; ') : '');

async function project(call, cfg) {
  const r = await call('GET', '/projects/' + encodeURIComponent(cfg.project) + '.json?include=trackers,issue_custom_fields');
  if (r.status === 401) throw new Error('Redmine odrzucil klucz API (401) - sprawdz klucz i czy REST API jest wlaczone (Administracja -> Ustawienia -> API).');
  if (r.status === 404) throw new Error('Nie ma projektu "' + cfg.project + '" w ' + cfg.url + ' albo nie masz do niego dostepu (404).');
  if (r.status !== 200 || !r.data || !r.data.project) throw new Error('Redmine: ' + r.status + ' ' + errs(r.data));
  const p = r.data.project, trackers = p.trackers || [];
  const tracker = pickTracker(trackers, cfg.tracker);
  if (!tracker) throw new Error(cfg.tracker ? 'Projekt nie ma trackera "' + cfg.tracker + '" - dostepne: ' + trackers.map(t => t.name).join(', ') : 'Projekt nie ma zadnego trackera.');
  // Pola wlasne projektu: Redmine 4.2+ podaje je przy projekcie (bez admina); starsze - z zadan projektu (AC-RM19)
  const fields = Array.isArray(p.issue_custom_fields) ? p.issue_custom_fields.map(f => ({ id: f.id, name: f.name })) : null;
  const acField = await acFieldOf(call, cfg, p.id, tracker.id, fields);
  const uatField = await acFieldOf(call, cfg, p.id, tracker.id, fields, 'uatField');
  return { project: { id: p.id, name: p.name, identifier: p.identifier }, trackers: trackers.map(t => ({ id: t.id, name: t.name })), tracker, acField,
    uatField, fields };
}

// Zadania po kolei, potem relacje "poprzedza" (AC-RM4). Blad -> wyjatek z tym, co juz zalozono (AC-RM5).
async function push(call, cfg, tasks, dry, req) {
  const done = [];
  const files = attachmentFiles(req || '.', tasks);  // bledne sciezki - przed wyslaniem czegokolwiek
  if (dry) return tasks.map((t, n) => ({ key: t.key, id: t.issue || null, url: t.issue ? cfg.url + '/issues/' + t.issue : null,
    action: 'dry-run', subject: t.subject, attachments: files[n].length }));
  const info = await project(call, cfg);
  for (let n = 0; n < tasks.length; n++) {
    const t = tasks[n];
    const body = issueBody(t, info.project.id, info.tracker.id, info.acField && info.acField.id,
      info.uatField && { id: info.uatField.id, link: cfg.uatLink });
    let todo = files[n];
    if (todo.length && t.issue) {  // ponowny handover: pliki, ktore zadanie juz ma, pomijamy
      const g = await call('GET', '/issues/' + t.issue + '.json?include=attachments');
      const have = new Set(((g.data && g.data.issue && g.data.issue.attachments) || []).map(a => a.filename));
      todo = todo.filter(a => !have.has(a.name));
    }
    const uploads = [];
    for (const a of todo) {
      const u = await call('POST', '/uploads.json?filename=' + encodeURIComponent(a.name), fs.readFileSync(a.file), 'application/octet-stream');
      if (u.status !== 201 || !u.data || !u.data.upload) { const e = new Error('Zadanie ' + t.key + ', zalacznik ' + a.name + ': Redmine ' + u.status + ' ' + errs(u.data)); e.done = done; throw e; }
      uploads.push({ token: u.data.upload.token, filename: a.name, content_type: a.type });
    }
    if (uploads.length) body.issue.uploads = uploads;
    const r = t.issue ? await call('PUT', '/issues/' + t.issue + '.json', body) : await call('POST', '/issues.json', body);
    const ok = t.issue ? r.status === 204 || r.status === 200 : r.status === 201;
    if (!ok) { const e = new Error('Zadanie ' + t.key + ': Redmine ' + r.status + ' ' + errs(r.data)); e.done = done; throw e; }
    const id = t.issue || r.data.issue.id;
    done.push({ key: t.key, id, url: cfg.url + '/issues/' + id, action: t.issue ? 'updated' : 'created' });
  }
  const idOf = {};
  done.forEach(d => { idOf[d.key] = d.id; });
  for (const t of tasks) {
    for (const prev of t.after || []) {
      if (!idOf[prev]) continue;
      const r = await call('POST', '/issues/' + idOf[prev] + '/relations.json', { relation: { issue_to_id: idOf[t.key], relation_type: 'precedes' } });
      if (r.status !== 201 && r.status !== 422) { const e = new Error('Relacja ' + prev + ' -> ' + t.key + ': Redmine ' + r.status + ' ' + errs(r.data)); e.done = done; throw e; }
    }
  }
  return done;
}

// Status zadania przez agenta (AC-RM15): start / done z SDD.yaml albo rozpoznane, nigdy zamykajacy.
const START = /w realizacji|w toku|in progress|realizacja/i;
const DONE = /code review|do przegl|review|resolved|rozwi[aą]zan/i;
async function setStatus(call, cfg, id, want, note) {
  const r = await call('GET', '/issue_statuses.json');
  if (r.status !== 200 || !r.data) throw new Error('Nie moge pobrac listy statusow: Redmine ' + r.status);
  const all = r.data.issue_statuses || [];
  let st;
  if (want === 'start' || want === 'done') {
    const name = want === 'start' ? cfg.statusStart : cfg.statusDone;
    st = name ? all.find(s => s.name.toLowerCase() === name.toLowerCase()) : all.find(s => !s.is_closed && (want === 'start' ? START : DONE).test(s.name));
    if (!st) throw new Error('Nie znalazlem statusu "' + (name || want) + '". Wpisz nazwe w SDD.yaml (redmine_status_' + want + '). Statusy: ' + all.map(s => s.name).join(', '));
  } else {
    st = all.find(s => s.name.toLowerCase() === String(want).toLowerCase());
    if (!st) throw new Error('Nie ma statusu "' + want + '". Statusy: ' + all.map(s => s.name).join(', '));
  }
  if (st.is_closed) throw new Error('Status "' + st.name + '" zamyka zadanie - to robi czlowiek (po UAT), nie agent.');
  const body = { issue: { status_id: st.id } };
  if (note) body.issue.notes = withMark(note);
  const u = await call('PUT', '/issues/' + id + '.json', body);
  if (u.status !== 204 && u.status !== 200) {
    // Pole wymagane przy zmianie statusu (przeplyw pracy) - AC-RM18, prawdziwy Redmine usera 2026-10-04
    const e = errs(u.data), req = /nie mo[zż]e by[cć] puste|can'?t be blank|cannot be blank/i.test(e);
    throw new Error('Zadanie #' + id + ': Redmine ' + u.status + ' ' + e + (req ? '. Redmine wymaga tego pola przy zmianie statusu - ' +
      'uzupelnij je w zadaniu albo ustaw redmine_ac_field / redmine_uat_link w SDD.yaml i powtorz /sdd:handover (uzupelni istniejace zadania).' : ''));
  }
  const g = await call('GET', '/issues/' + id + '.json');
  const now = g.data && g.data.issue && g.data.issue.status;
  if (!now || now.id !== st.id) throw new Error('Redmine nie pozwolil na przejscie #' + id + ' do "' + st.name + '" (zostal "' + (now && now.name) + '") - przeplyw pracy Twojej roli w Redmine nie dopuszcza tej zmiany.');
  return { id: +id, url: cfg.url + '/issues/' + id, status: now.name };
}
// Bramka kontraktu (0.31.0, docs/specs/systems.md AC-SY28): w module `kind: service` zadanie realizujace R kontraktu
// (TRACEABILITY.md, kolumna Rodzaj = kontrakt) nie przechodzi do done bez testu kontraktowego w notce.
function contractGate(req, id, want, note) {
  if (want !== 'done') return;
  const rd = f => { try { return fs.readFileSync(path.join(req, f), 'utf8').replace(/\r\n?/g, '\n'); } catch (e) { return ''; } };
  if (!/^kind:\s*"?service"?\s*(#.*)?$/m.test(rd('SDD.yaml'))) return;
  const lines = rd('04-validation/TRACEABILITY.md').split('\n').filter(l => /^\s*\|/.test(l));
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  if (!lines.length) return;
  const head = cells(lines[0]).map(h => h.toLowerCase());
  const kCol = head.indexOf('rodzaj'), tCol = head.indexOf('task'), rCol = head.indexOf('r');
  if (kCol < 0 || tCol < 0) return;
  const hit = lines.slice(1).map(cells).filter(c => /kontrakt/i.test(c[kCol] || '') && new RegExp('#' + id + '(?!\\d)').test(c[tCol] || ''));
  if (hit.length && !/testy? kontraktow/i.test(note || ''))
    throw new Error('Zadanie #' + id + ' realizuje kontrakt (' + hit.map(c => c[rCol] || '?').join(', ') + ') w module serwisu - ' +
      'bez testu kontraktowego nie przechodzi do done. Dopisz do notki: "test kontraktowy: <nazwa testu>".');
}

async function comment(call, cfg, id, note) {
  if (!note) throw new Error('Podaj tresc: redmine.js comment <id> --note "..."');
  const u = await call('PUT', '/issues/' + id + '.json', { issue: { notes: withMark(note) } });
  if (u.status !== 204 && u.status !== 200) throw new Error('Zadanie #' + id + ': Redmine ' + u.status + ' ' + errs(u.data));
  return { id: +id, url: cfg.url + '/issues/' + id };
}

async function main(argv) {
  const opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const dry = argv.includes('--dry-run');
  const req = path.resolve(opt('--req') || 'requirements');
  const note = opt('--note');
  const skip = new Set();
  ['--req', '--note'].forEach(n => { const i = argv.indexOf(n); if (i >= 0) { skip.add(i); skip.add(i + 1); } });
  const args = argv.filter((a, n) => a !== '--dry-run' && !skip.has(n));
  const cfg = readConfig(fs.readFileSync(path.join(req, 'SDD.yaml'), 'utf8').replace(/\r\n?/g, '\n'));
  const cmd = args[0];
  if (['check', 'push', 'status', 'comment'].indexOf(cmd) < 0) throw new Error('Uzycie: redmine.js check | push <zadania.json> [--dry-run] | status <id> <start|done|nazwa> [--note ".."] | comment <id> --note ".." [--req requirements]');
  let tasks = null;
  if (cmd === 'push') {
    if (!args[1]) throw new Error('Podaj plik zadan: redmine.js push <zadania.json>');
    tasks = JSON.parse(fs.readFileSync(path.resolve(args[1]), 'utf8')).tasks || [];
  }
  if ((cmd === 'status' || cmd === 'comment') && !/^\d+$/.test(String(args[1]).replace(/^#/, ''))) throw new Error('Podaj numer zadania, np. redmine.js ' + cmd + ' 123');
  const id = String(args[1] || '').replace(/^#/, '');
  if (cmd === 'comment' && !note) throw new Error('Podaj tresc: redmine.js comment <id> --note "..."');
  if (cmd === 'status') contractGate(req, id, args[2], note);
  const key = dry ? '' : apiKey();
  if (!dry && !key) throw new Error(KEY_HELP);
  const call = client(cfg, key);
  if (cmd === 'check') {
    const info = await project(call, cfg);
    const fields = info.fields || await projectFields(call, info.project.id);
    delete info.fields;
    const out = Object.assign(info, { format: cfg.format, customFields: fields });
    const ac = fields.find(f => /kryteri|acceptance/i.test(f.name));
    const warn = [];
    if (!info.acField && ac) warn.push('Projekt ma pole "' + ac.name + '", a redmine_ac_field nie jest ustawione - zadania beda bez kryteriow w tym polu ' +
      '(Redmine moze wymagac go przy zmianie statusu). Dopisz w SDD.yaml: redmine_ac_field: "' + ac.name + '"');
    const uat = fields.find(f => /uat/i.test(f.name) && /link|adres|url|[sś]rodowisk/i.test(f.name));
    if (!info.uatField && uat) warn.push('Projekt ma pole "' + uat.name + '", a redmine_uat_link nie jest ustawione - zadania beda bez linku do ' +
      'srodowiska UAT (Redmine moze go wymagac w przeplywie). Dopisz w SDD.yaml: redmine_uat_link: "<adres srodowiska UAT>"' +
      (uat.name === UAT_FIELD ? '' : ' i redmine_uat_field: "' + uat.name + '"'));
    if (warn.length) out.warning = warn.join(' ');
    return console.log(JSON.stringify(out, null, 2));
  }
  if (cmd === 'status') return console.log(JSON.stringify(await setStatus(call, cfg, id, args[2], note), null, 2));
  if (cmd === 'comment') return console.log(JSON.stringify(await comment(call, cfg, id, note), null, 2));
  try {
    console.log(JSON.stringify(await push(call, cfg, tasks, dry, req), null, 2));
  } catch (e) {
    console.log(JSON.stringify(e.done || [], null, 2));
    throw e;
  }
}

if (require.main === module) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exit(1); });

module.exports = { contractGate, MARK, withMark, setStatus, readConfig, pickTracker, attachmentFiles, issueBody, apiKey, push, project };
