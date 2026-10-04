// Backlog w Redmine. Kryteria z docs/specs/redmine.md (AC-RM1..AC-RM8, zmiana 0.28.4).
// Prawdziwego Redmine tu nie ma - lokalny serwer HTTP odpowiada jak REST API Redmine (te same adresy i pola).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const rm = require('../redmine');
const info = require('../info');

const KEY = 'sekretny-klucz-123';
const YAML = 'project: "x"\nbacklog: redmine\nredmine_url: "URL"\nredmine_project: "faktury"\n';

// Udawany Redmine: projekt "faktury" (id 7) z trackerami, zapis zadan i relacji, log zapytan.
function fakeRedmine(opts) {
  opts = opts || {};
  const log = [], state = {};
  let next = 100;
  return new Promise(res => {
    const s = http.createServer((req, rq) => {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        const isJson = /json/.test(req.headers['content-type'] || '');
        log.push({ method: req.method, url: req.url, key: req.headers['x-redmine-api-key'], type: req.headers['content-type'],
          body: body && isJson ? JSON.parse(body) : null, size: body.length });
        const send = (code, obj) => { rq.writeHead(code, { 'Content-Type': 'application/json' }); rq.end(obj ? JSON.stringify(obj) : ''); };
        if (req.headers['x-redmine-api-key'] !== KEY) return send(401);
        if (req.method === 'GET' && req.url.startsWith('/projects/faktury.json'))
          return send(200, { project: Object.assign({ id: 7, name: 'Faktury', identifier: 'faktury', trackers: [{ id: 1, name: 'Bug' }, { id: 2, name: 'Feature' }] },
            opts.projectFields ? { issue_custom_fields: [{ id: 6, name: 'Kryteria akceptacji' }, { id: 8, name: 'Link UAT' }] } : {}) });
        if (req.method === 'GET' && req.url.startsWith('/projects/')) return send(404);
        if (req.method === 'POST' && req.url === '/issues.json') {
          if (opts.failSecond && next === 101) return send(422, { errors: ['Subject cannot be blank'] });
          return send(201, { issue: { id: next++, subject: JSON.parse(body).issue.subject } });
        }
        if (req.method === 'PUT' && opts.statusNeedsField && /^\/issues\/74\.json$/.test(req.url)) return send(422, { errors: ['Kryteria akceptacji nie może być puste'] });
        if (req.method === 'PUT' && /^\/issues\/7\d\.json$/.test(req.url)) {
          const id = +req.url.match(/\d+/)[0], b = JSON.parse(body).issue;
          if (b.status_id && !(opts.blockStatus && b.status_id === opts.blockStatus)) state[id] = b.status_id;
          return send(204);
        }
        if (req.method === 'PUT' && /^\/issues\/\d+\.json$/.test(req.url)) return send(204);
        if (req.method === 'POST' && req.url.startsWith('/uploads.json')) return send(201, { upload: { token: 'tok-' + log.length } });
        if (req.method === 'GET' && req.url === '/issue_statuses.json')
          return send(200, { issue_statuses: [{ id: 1, name: 'Nowy' }, { id: 3, name: 'W realizacji' }, { id: 4, name: 'Code review' },
            { id: 5, name: 'Gotowy do UAT' }, { id: 9, name: 'Zamknięty', is_closed: true }] });
        if (req.method === 'GET' && /^\/issues\/7\d\.json/.test(req.url)) {
          const id = +req.url.match(/\d+/)[0], names = { 1: 'Nowy', 3: 'W realizacji', 4: 'Code review', 5: 'Gotowy do UAT' };
          return send(200, { issue: { id, status: { id: state[id] || 1, name: names[state[id] || 1] } } });
        }
        if (req.method === 'GET' && req.url.startsWith('/issues.json?project_id=7'))
          return send(200, { issues: opts.noIssues ? [] : [{ id: 1, custom_fields: [{ id: 4, name: 'Kryteria akceptacji', value: 'x' }, { id: 5, name: 'Uwagi z UAT', value: null }] }] });
        if (req.method === 'GET' && /^\/issues\/\d+\.json/.test(req.url))
          return send(200, { issue: { id: +req.url.match(/\d+/)[0], attachments: [{ id: 9, filename: 'stary.png' }] } });
        if (req.method === 'POST' && /^\/issues\/\d+\/relations\.json$/.test(req.url)) {
          if (opts.relationExists) return send(422, { errors: ['Related issue has already been taken'] });
          return send(201, { relation: { id: 1 } });
        }
        send(404);
      });
    }).listen(0, '127.0.0.1', () => res({ url: 'http://127.0.0.1:' + s.address().port, log, close: () => s.close() }));
  });
}
function moduleWith(url, extra) {
  const req = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-rm-')), 'requirements');
  fs.mkdirSync(path.join(req, '04-validation'), { recursive: true });
  fs.writeFileSync(path.join(req, 'SDD.yaml'), YAML.replace('URL', url) + (extra || ''));
  return req;
}
function run(args, env) {
  return new Promise(res => {
    const p = spawn(process.execPath, [path.join(__dirname, '..', 'redmine.js')].concat(args),
      { env: Object.assign({}, process.env, { REDMINE_API_KEY: '', SDD_REDMINE_KEYCHAIN: '0',
        SDD_ENV_FILE: path.join(os.tmpdir(), 'sdd-brak-' + process.pid, '.env') }, env) });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { err += d; });
    p.on('close', code => res({ code, out, err }));
  });
}
const TASKS = { tasks: [
  { key: 'T-01', subject: '[R-001] Wpis odczytu', description: 'Opis 1', after: [] },
  { key: 'T-02', subject: '[R-002] Raport miesieczny', description: 'Opis 2', after: ['T-01'] },
  { key: 'T-03', subject: '[R-003] Eksport', description: 'Opis 3', after: ['T-02'], issue: 55 },
] };
function tasksFile(req, t) { const f = path.join(req, '04-validation', 'redmine-test.json'); fs.writeFileSync(f, JSON.stringify(t || TASKS)); return f; }

test('AC-RM1: readConfig - adres, projekt, tracker, walidacja', () => {
  assert.deepStrictEqual(rm.readConfig('redmine_url: "https://rm.firma.pl/"\nredmine_project: "faktury"\nredmine_tracker: "Feature"\n'),
    { url: 'https://rm.firma.pl', project: 'faktury', tracker: 'Feature', format: 'markdown', acField: '', statusStart: '', statusDone: '', uatLink: '', uatField: '' });
  assert.deepStrictEqual(rm.readConfig('redmine_url: http://10.0.0.5:3000\nredmine_project: a_b-1\n'),
    { url: 'http://10.0.0.5:3000', project: 'a_b-1', tracker: '', format: 'markdown', acField: '', statusStart: '', statusDone: '', uatLink: '', uatField: '' });
  assert.throws(() => rm.readConfig('redmine_project: "x"\n'), /redmine_url/);
  assert.throws(() => rm.readConfig('redmine_url: "https://a"\n'), /redmine_project/);
  assert.throws(() => rm.readConfig('redmine_url: "ftp://a"\nredmine_project: "x"\n'), /redmine_url/);
  assert.throws(() => rm.readConfig('redmine_url: "https://a"\nredmine_project: "Zle Id"\n'), /redmine_project/);
});

test('AC-RM10: domyslny tracker - funkcjonalnosc/zadanie, nie blad', () => {
  const T = names => names.map((n, i) => ({ id: i + 1, name: n }));
  assert.strictEqual(rm.pickTracker(T(['Błąd', 'Funkcjonalność', 'Zadanie']), '').name, 'Funkcjonalność');
  assert.strictEqual(rm.pickTracker(T(['Bug', 'Support', 'Feature']), '').name, 'Feature');
  assert.strictEqual(rm.pickTracker(T(['Błąd', 'Wsparcie', 'Zadanie']), '').name, 'Zadanie');
  assert.strictEqual(rm.pickTracker(T(['Bug', 'Story']), '').name, 'Story');
  assert.strictEqual(rm.pickTracker(T(['Błąd', 'Wsparcie']), '').name, 'Wsparcie');
  assert.strictEqual(rm.pickTracker(T(['Bug']), '').name, 'Bug');
  assert.strictEqual(rm.pickTracker(T(['Błąd', 'Funkcjonalność']), 'błąd').name, 'Błąd');
  assert.strictEqual(rm.pickTracker(T(['Bug']), 'Feature'), null);
});

test('AC-RM11: format opisu - markdown domyslnie, textile, inny -> blad', () => {
  assert.strictEqual(rm.readConfig('redmine_url: "https://a"\nredmine_project: "x"\n').format, 'markdown');
  assert.strictEqual(rm.readConfig('redmine_url: "https://a"\nredmine_project: "x"\nredmine_format: textile\n').format, 'textile');
  assert.throws(() => rm.readConfig('redmine_url: "https://a"\nredmine_project: "x"\nredmine_format: html\n'), /redmine_format/);
});

test('AC-RM12: zalaczniki - upload, token w zadaniu, bez dublowania, sciezka tylko w requirements', async () => {
  const s = await fakeRedmine();
  try {
    const req = moduleWith(s.url);
    fs.mkdirSync(path.join(req, '00-intake'));
    fs.writeFileSync(path.join(req, '00-intake', 'ekran.png'), Buffer.from([137, 80, 78, 71, 1, 2, 3]));
    fs.writeFileSync(path.join(req, '00-intake', 'stary.png'), 'x');
    const t = { tasks: [
      { key: 'T-01', subject: 'S1', description: '![ekran](ekran.png)', attachments: ['00-intake/ekran.png'] },
      { key: 'T-02', subject: 'S2', description: 'D2', issue: 55, attachments: ['00-intake/stary.png', '00-intake/ekran.png'] },
    ] };
    let r = await run(['push', tasksFile(req, t), '--req', req, '--dry-run'], {});
    assert.strictEqual(r.code, 0, r.err);
    assert.deepStrictEqual(JSON.parse(r.out).map(x => x.attachments), [1, 2]);
    assert.strictEqual(s.log.length, 0);
    r = await run(['push', tasksFile(req, t), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    const up = s.log.filter(x => x.url.startsWith('/uploads.json'));
    assert.deepStrictEqual(up.map(x => x.url), ['/uploads.json?filename=ekran.png', '/uploads.json?filename=ekran.png']);
    assert.strictEqual(up[0].type, 'application/octet-stream');
    assert.strictEqual(up[0].size, 7);
    const post = s.log.find(x => x.method === 'POST' && x.url === '/issues.json');
    assert.deepStrictEqual(post.body.issue.uploads, [{ token: post.body.issue.uploads[0].token, filename: 'ekran.png', content_type: 'image/png' }]);
    const put = s.log.find(x => x.method === 'PUT');
    assert.deepStrictEqual(put.body.issue.uploads.map(u => u.filename), ['ekran.png'], 'stary.png juz jest w zadaniu');
    // sciezka poza requirements albo brak pliku -> blad, nic nie wyslane
    const n = s.log.length;
    for (const bad of ['../SDD.yaml.bak', '00-intake/nie-ma.png']) {
      r = await run(['push', tasksFile(req, { tasks: [{ key: 'T-09', subject: 'S', description: 'D', attachments: [bad] }] }), '--req', req], { REDMINE_API_KEY: KEY });
      assert.strictEqual(r.code, 1, bad);
      assert.match(r.err, /T-09/);
    }
    assert.strictEqual(s.log.length, n);
  } finally { s.close(); }
});

test('AC-RM13: pole wlasne Kryteria akceptacji - numer z zadan projektu, wartosc przy tworzeniu i aktualizacji', async () => {
  const s = await fakeRedmine();
  try {
    const req = moduleWith(s.url, 'redmine_ac_field: "kryteria AKCEPTACJI"\n');
    let r = await run(['check', '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    assert.deepStrictEqual(JSON.parse(r.out).acField, { id: 4, name: 'Kryteria akceptacji' });
    const t = { tasks: [
      { key: 'T-01', subject: 'S1', description: 'D1', acceptance: '**AC-001-1**\n**Given** a\n**When** b\n**Then** c' },
      { key: 'T-02', subject: 'S2', description: 'D2', issue: 55, acceptance: 'A2' },
      { key: 'T-03', subject: 'S3', description: 'D3' },
    ] };
    r = await run(['push', tasksFile(req, t), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    const post = s.log.filter(x => x.method === 'POST' && x.url === '/issues.json').map(x => x.body.issue);
    assert.deepStrictEqual(post[0].custom_fields, [{ id: 4, value: '**AC-001-1**\n**Given** a\n**When** b\n**Then** c' }]);
    assert.strictEqual(post[1].custom_fields, undefined, 'bez acceptance - bez custom_fields');
    assert.deepStrictEqual(s.log.find(x => x.method === 'PUT').body.issue.custom_fields, [{ id: 4, value: 'A2' }]);
  } finally { s.close(); }
  // numer pola zamiast nazwy - bez szukania; nazwa nieznana albo projekt bez zadan -> blad z prosba o numer
  const s2 = await fakeRedmine({ noIssues: true });
  try {
    let r = await run(['check', '--req', moduleWith(s2.url, 'redmine_ac_field: 9\n')], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    assert.deepStrictEqual(JSON.parse(r.out).acField, { id: 9, name: '' });
    r = await run(['check', '--req', moduleWith(s2.url, 'redmine_ac_field: "Kryteria akceptacji"\n')], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /numer pola/);
  } finally { s2.close(); }
  // bez redmine_ac_field - acceptance ignorowane
  const s3 = await fakeRedmine();
  try {
    const req = moduleWith(s3.url);
    const r = await run(['push', tasksFile(req, { tasks: [{ key: 'T-01', subject: 'S', description: 'D', acceptance: 'A' }] }), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(s3.log.find(x => x.url === '/issues.json').body.issue.custom_fields, undefined);
  } finally { s3.close(); }
});

test('AC-RM15: status start/done, nazwa, odmowa zamkniecia, kontrola przejscia', async () => {
  const s = await fakeRedmine({ blockStatus: 5 });
  try {
    const req = moduleWith(s.url);
    let r = await run(['status', '71', 'start', '--note', 'Zaczynam: R-001', '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    assert.deepStrictEqual(JSON.parse(r.out), { id: 71, url: s.url + '/issues/71', status: 'W realizacji' });
    const put = s.log.find(x => x.method === 'PUT' && x.url === '/issues/71.json');
    assert.strictEqual(put.body.issue.status_id, 3);
    assert.match(put.body.issue.notes, /^Zaczynam: R-001\n\n_Wygenerowane przez AI \[Claude Code\]_$/);
    r = await run(['status', '71', 'done', '--note', 'Commit abc123; AC-001-1', '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(JSON.parse(r.out).status, 'Code review');
    // nazwa z SDD.yaml wygrywa
    const req2 = moduleWith(s.url, 'redmine_status_done: "Gotowy do UAT"\n');
    r = await run(['status', '72', 'done', '--req', req2], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 1, 'przejscie zablokowane w udawanym Redmine');
    assert.match(r.err, /nie pozwoli/);
    r = await run(['status', '72', 'Zamknięty', '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /zamyka/);
    r = await run(['status', '72', 'Nie ma takiego', '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /W realizacji/);
    assert.strictEqual(s.log.filter(x => x.method === 'PUT' && /72/.test(x.url)).length, 1, 'zamkniecie i zla nazwa - bez zapisu');
  } finally { s.close(); }
});

test('AC-RM16: komentarz i opis zadania z dopiskiem AI [Claude Code], bez dublowania', async () => {
  const s = await fakeRedmine();
  try {
    const req = moduleWith(s.url);
    let r = await run(['comment', '73', '--note', 'Testy przechodza', '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    const put = s.log.find(x => x.method === 'PUT' && x.url === '/issues/73.json');
    assert.deepStrictEqual(Object.keys(put.body.issue), ['notes']);
    assert.match(put.body.issue.notes, /Testy przechodza\n\n_Wygenerowane przez AI \[Claude Code\]_$/);
    r = await run(['comment', '73', '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 1, 'komentarz bez tresci');
    const t = { tasks: [{ key: 'T-01', subject: 'S', description: 'Opis' }, { key: 'T-02', subject: 'S2', description: 'Opis2\n\n_Wygenerowane przez AI [Claude Code]_', issue: 55 }] };
    r = await run(['push', tasksFile(req, t), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    const post = s.log.find(x => x.method === 'POST' && x.url === '/issues.json').body.issue.description;
    assert.match(post, /^Opis\n\n_Wygenerowane przez AI \[Claude Code\]_$/);
    const upd = s.log.find(x => x.method === 'PUT' && x.url === '/issues/55.json').body.issue.description;
    assert.strictEqual(upd.match(/Wygenerowane przez AI/g).length, 1);
  } finally { s.close(); }
});

test('AC-RM18: check podpowiada pole na kryteria; 422 przy statusie - wyjasnienie', async () => {
  const s = await fakeRedmine({ statusNeedsField: true });
  try {
    const req = moduleWith(s.url);
    let r = await run(['check', '--req', req], { REDMINE_API_KEY: KEY });
    const j = JSON.parse(r.out);
    assert.deepStrictEqual(j.customFields.map(f => f.name), ['Kryteria akceptacji', 'Uwagi z UAT']);
    assert.match(j.warning, /redmine_ac_field: "Kryteria akceptacji"/);
    r = await run(['check', '--req', moduleWith(s.url, 'redmine_ac_field: "Kryteria akceptacji"\n')], { REDMINE_API_KEY: KEY });
    assert.strictEqual(JSON.parse(r.out).warning, undefined);
    r = await run(['status', '74', 'start', '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /wymaga tego pola przy zmianie statusu/);
  } finally { s.close(); }
});

test('AC-RM19: pola wlasne z projektu (Redmine 4.2+), takze bez zadan', async () => {
  const s = await fakeRedmine({ projectFields: true, noIssues: true });
  try {
    let r = await run(['check', '--req', moduleWith(s.url)], { REDMINE_API_KEY: KEY });
    const j = JSON.parse(r.out);
    assert.deepStrictEqual(j.customFields, [{ id: 6, name: 'Kryteria akceptacji' }, { id: 8, name: 'Link UAT' }]);
    assert.match(j.warning, /redmine_ac_field/);
    r = await run(['check', '--req', moduleWith(s.url, 'redmine_ac_field: "Kryteria akceptacji"\n')], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    assert.deepStrictEqual(JSON.parse(r.out).acField, { id: 6, name: 'Kryteria akceptacji' });
    assert.ok(!s.log.some(x => x.url.startsWith('/issues.json')), 'pola z projektu - bez przegladania zadan');
  } finally { s.close(); }
});

test('AC-RM21: link do srodowiska UAT - redmine_uat_link w nowych i aktualizowanych zadaniach', async () => {
  const LINK = 'http://ha.local:8123/app/fv';
  // pole z projektu (Redmine 4.2+): domyslna nazwa "Link do srodowiska UAT" albo redmine_uat_field (nazwa / numer)
  const s = await fakeRedmine({ projectFields: true, noIssues: true });
  try {
    const req = moduleWith(s.url, 'redmine_ac_field: "Kryteria akceptacji"\nredmine_uat_link: "' + LINK + '"\nredmine_uat_field: "link uat"\n');
    let r = await run(['check', '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    assert.deepStrictEqual(JSON.parse(r.out).uatField, { id: 8, name: 'Link UAT' });
    const t = { tasks: [{ key: 'T-01', subject: 'S1', description: 'D1', acceptance: 'A1' },
      { key: 'T-02', subject: 'S2', description: 'D2', issue: 55 }] };
    r = await run(['push', tasksFile(req, t), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    assert.deepStrictEqual(s.log.find(x => x.method === 'POST' && x.url === '/issues.json').body.issue.custom_fields,
      [{ id: 6, value: 'A1' }, { id: 8, value: LINK }]);
    assert.deepStrictEqual(s.log.find(x => x.method === 'PUT').body.issue.custom_fields, [{ id: 8, value: LINK }]);
    // nazwa pola, ktorej nie ma w projekcie -> blad z prosba o numer
    r = await run(['check', '--req', moduleWith(s.url, 'redmine_uat_link: "' + LINK + '"\nredmine_uat_field: "Brak"\n')], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /redmine_uat_field/);
  } finally { s.close(); }
  // bez redmine_uat_link - bez pola; check podpowiada, gdy projekt ma pole z linkiem UAT
  const s2 = await fakeRedmine({ projectFields: true, noIssues: true });
  try {
    const req = moduleWith(s2.url, 'redmine_ac_field: "Kryteria akceptacji"\n');
    let r = await run(['check', '--req', req], { REDMINE_API_KEY: KEY });
    assert.match(JSON.parse(r.out).warning, /redmine_uat_link/);
    r = await run(['push', tasksFile(req, { tasks: [{ key: 'T-01', subject: 'S', description: 'D' }] }), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(s2.log.find(x => x.url === '/issues.json').body.issue.custom_fields, undefined);
  } finally { s2.close(); }
  assert.throws(() => rm.readConfig('redmine_url: "http://a"\nredmine_project: "p"\nredmine_uat_link: "ftp://x"\n'), /redmine_uat_link/);
});

test('AC-RM2: issueBody - nowe zadanie z projektem i trackerem, aktualizacja bez nich', () => {
  const t = { key: 'T-01', subject: 'S', description: 'D' };
  const D = 'D\n\n' + rm.MARK;
  assert.deepStrictEqual(rm.issueBody(t, 7, 2), { issue: { project_id: 7, tracker_id: 2, subject: 'S', description: D } });
  assert.deepStrictEqual(rm.issueBody(Object.assign({ issue: 5 }, t), 7, 2), { issue: { subject: 'S', description: D } });
});

test('AC-RM3: check - projekt, trackery, wybrany tracker; 401 i 404 po polsku', async () => {
  const s = await fakeRedmine();
  try {
    let r = await run(['check', '--req', moduleWith(s.url)], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    const j = JSON.parse(r.out);
    assert.strictEqual(j.project.name, 'Faktury');
    assert.deepStrictEqual(j.trackers.map(t => t.name), ['Bug', 'Feature']);
    assert.strictEqual(j.tracker.name, 'Feature');
    assert.strictEqual(s.log[0].key, KEY);
    r = await run(['check', '--req', moduleWith(s.url, 'redmine_tracker: "Bug"\n')], { REDMINE_API_KEY: KEY });
    assert.strictEqual(JSON.parse(r.out).tracker.name, 'Bug');
    r = await run(['check', '--req', moduleWith(s.url)], { REDMINE_API_KEY: 'zly' });
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /klucz/i);
    const req404 = moduleWith(s.url); fs.writeFileSync(path.join(req404, 'SDD.yaml'), YAML.replace('URL', s.url).replace('faktury', 'nie-ma'));
    r = await run(['check', '--req', req404], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /projekt/i);
  } finally { s.close(); }
});

test('AC-RM4: push - nowe POST, istniejace PUT, relacje poprzedza, dry-run bez zapisu', async () => {
  const s = await fakeRedmine({ relationExists: false });
  try {
    const req = moduleWith(s.url);
    let r = await run(['push', tasksFile(req), '--req', req, '--dry-run'], {});
    assert.strictEqual(r.code, 0, r.err);
    assert.deepStrictEqual(JSON.parse(r.out).map(x => x.action), ['dry-run', 'dry-run', 'dry-run']);
    assert.strictEqual(s.log.filter(x => x.method !== 'GET').length, 0);
    r = await run(['push', tasksFile(req), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    const out = JSON.parse(r.out);
    assert.deepStrictEqual(out.map(x => [x.key, x.id, x.action]), [['T-01', 100, 'created'], ['T-02', 101, 'created'], ['T-03', 55, 'updated']]);
    assert.strictEqual(out[0].url, s.url + '/issues/100');
    const post = s.log.filter(x => x.method === 'POST' && x.url === '/issues.json');
    assert.deepStrictEqual(post[0].body, { issue: { project_id: 7, tracker_id: 2, subject: '[R-001] Wpis odczytu', description: 'Opis 1\n\n' + rm.MARK } });
    const put = s.log.find(x => x.method === 'PUT');
    assert.strictEqual(put.url, '/issues/55.json');
    assert.deepStrictEqual(put.body, { issue: { subject: '[R-003] Eksport', description: 'Opis 3\n\n' + rm.MARK } });
    const rel = s.log.filter(x => /relations/.test(x.url));
    assert.deepStrictEqual(rel.map(x => [x.url, x.body.relation.issue_to_id, x.body.relation.relation_type]),
      [['/issues/100/relations.json', 101, 'precedes'], ['/issues/101/relations.json', 55, 'precedes']]);
  } finally { s.close(); }
  const s2 = await fakeRedmine({ relationExists: true });
  try {
    const req = moduleWith(s2.url);
    const r = await run(['push', tasksFile(req), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, 'istniejaca relacja nie jest bledem: ' + r.err);
  } finally { s2.close(); }
});

test('AC-RM5: blad przy drugim zadaniu - kod 1, pierwsze zadanie w wyniku', async () => {
  const s = await fakeRedmine({ failSecond: true });
  try {
    const req = moduleWith(s.url);
    const r = await run(['push', tasksFile(req), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 1);
    const out = JSON.parse(r.out);
    assert.deepStrictEqual(out.map(x => [x.key, x.id]), [['T-01', 100]]);
    assert.match(r.err, /T-02/);
    assert.match(r.err, /Subject cannot be blank/);
  } finally { s.close(); }
});

test('AC-RM6: klucz nie trafia na wyjscie; brak klucza - jak go ustawic', async () => {
  const s = await fakeRedmine();
  try {
    const req = moduleWith(s.url);
    let r = await run(['push', tasksFile(req), '--req', req], { REDMINE_API_KEY: KEY });
    assert.ok(!(r.out + r.err).includes(KEY));
    r = await run(['check', '--req', req], {});
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /REDMINE_API_KEY/);
    assert.match(r.err, /redmine-api-key/);
  } finally { s.close(); }
});

test('AC-S4: klucz tylko w ~/.sdd-kit/.env wystarcza; brak klucza - panel w komunikacie', async () => {
  const s = await fakeRedmine();
  try {
    const envFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-envf-')), '.env');
    fs.writeFileSync(envFile, 'REDMINE_API_KEY="' + KEY + '"\n');
    let r = await run(['check', '--req', moduleWith(s.url)], { SDD_ENV_FILE: envFile });
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(s.log[0].key, KEY);
    r = await run(['check', '--req', moduleWith(s.url)], {});
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /panelu sdd-board: Konfiguracja -> Klucz API Redmine/);
  } finally { s.close(); }
});

test('AC-RM7: konfiguracja - backlog redmine, adres i projekt przez yamlSet', () => {
  assert.ok(info.BACKLOGS.includes('redmine'));
  const y = 'project: "x"\nbacklog: none          # none | linear | jira | redmine | file\n';
  const out = info.yamlSet(y, { backlog: 'redmine', redmine_url: 'https://rm.firma.pl/', redmine_project: 'faktury' });
  assert.match(out, /^backlog: redmine/m);
  assert.match(out, /^redmine_url: "https:\/\/rm\.firma\.pl"$/m);
  assert.match(out, /^redmine_project: "faktury"$/m);
  assert.throws(() => info.yamlSet(y, { redmine_url: 'rm.firma.pl' }), /redmine_url/);
  // AC-RM14: wklejony adres projektu i "/projects/x" - panel rozdziela sam (zgloszenie usera 0.28.7)
  const both = info.yamlSet(y, { redmine_url: 'http://192.168.1.4:3001/projects/pilotaz-dev', redmine_project: '/projects/pilotaz-dev' });
  assert.match(both, /^redmine_url: "http:\/\/192\.168\.1\.4:3001"$/m);
  assert.match(both, /^redmine_project: "pilotaz-dev"$/m);
  const onlyUrl = info.yamlSet(y, { redmine_url: 'https://rm.firma.pl/redmine/projects/faktury/issues?x=1' });
  assert.match(onlyUrl, /^redmine_url: "https:\/\/rm\.firma\.pl\/redmine"$/m);
  assert.match(onlyUrl, /^redmine_project: "faktury"$/m);
  assert.match(info.yamlSet(y, { redmine_project: 'projects/abc' }), /^redmine_project: "abc"$/m);
  assert.match(info.yamlSet(y, { redmine_project: 'https://rm.firma.pl/projects/abc-1/issues' }), /^redmine_project: "abc-1"$/m);
  assert.throws(() => info.yamlSet(y, { redmine_project: 'Zle Id' }), /redmine_project/);
});

test('AC-RM8: skill handover opisuje Redmine', () => {
  const sk = fs.readFileSync(path.join(__dirname, '..', '..', 'skills', 'handover', 'SKILL.md'), 'utf8');
  assert.match(sk, /`redmine`/);
  ['redmine.js', 'check', '--dry-run', 'push', 'REDMINE_API_KEY', 'TRACEABILITY'].forEach(w => assert.ok(sk.includes(w), 'brak: ' + w));
  assert.match(sk, /nie pro[sś] o wklejenie klucza/i);
  assert.match(sk, /\| Kryterium \| Given \| When \| Then \|/);
  assert.match(sk, /redmine_format/);
  assert.match(sk, /`attachments`/);
  assert.match(sk, /redmine_ac_field/);
  assert.match(sk, /`acceptance`/);
  // AC-RM17
  assert.match(sk, /\/sdd:handover status/);
  assert.match(sk, /W realizacji|start/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', '..', 'templates', 'CLAUDE.md'), 'utf8'), /\/sdd:handover status/);
});
