// Zakladki Modul / Jak to dziala / Konfiguracja. Kryteria z docs/specs/info-config.md (AC-C1..AC-C12, zmiana 0.16.0).
// Uruchom: node --test plugins/sdd/board/test/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const ui = require('../ui');
const info = require('../info');
const { STAGES } = require('../progress');

const BOARD_DIR = path.join(__dirname, '..');
const DEMO_REQ = path.join(BOARD_DIR, '..', 'demo', 'zlecenia', 'requirements');
const TEMPLATES = path.join(BOARD_DIR, '..', 'templates', 'requirements');
const YAML = fs.readFileSync(path.join(TEMPLATES, 'SDD.yaml'), 'utf8');

function tmpModule(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ic-'));
  const req = path.join(root, name || 'm', 'requirements');
  fs.cpSync(TEMPLATES, req, { recursive: true });
  return { root, req };
}

test('AC-C1: tabs - piec zakladek, biezaca zaznaczona, /demo/start: Tablica i Jak to dziala', () => {
  const t = ui.tabs('config');
  assert.deepStrictEqual(t.map(x => x.href), ['/', '/board', '/module', '/guide', '/config']);
  assert.deepStrictEqual(t.map(x => x.current), [false, false, false, false, true]);
  assert.deepStrictEqual(ui.tabs('panel').map(x => x.current), [true, false, false, false, false]);
  assert.deepStrictEqual(ui.tabs('cos').map(x => x.current), [false, false, false, false, false]);
  assert.deepStrictEqual(ui.tabs('module', '/demo').map(x => x.href), ['/demo', '/demo/board', '/demo/module', '/demo/guide', '/demo/config']);
  const s = ui.tabs('board', '/demo/start');
  assert.deepStrictEqual(s.map(x => x.href), ['/demo/start', '/demo/start/guide']);
  assert.deepStrictEqual(s.map(x => x.current), [true, false]);
  t.forEach(x => { assert.ok(x.label); assert.ok(x.short); });
});

test('AC-C3: moduleSummary - sekcje PRD, owners, liczby', () => {
  const m = info.moduleSummary(DEMO_REQ);
  assert.strictEqual(m.level, 'full');
  assert.strictEqual(m.specFile, '03-spec/PRD.md');
  ['cel', 'zakres', 'pozaZakresem', 'aktorzy'].forEach(k => assert.ok(m.sections[k].length > 20, 'pusta sekcja ' + k));
  assert.ok(m.owners.length >= 1 && m.owners[0].role && m.owners[0].approves.length);
  ['requirements', 'approved', 'rules', 'decisions', 'assumptions', 'questions', 'open'].forEach(k =>
    assert.strictEqual(typeof m.counts[k], 'number', 'brak liczby ' + k));
  assert.ok(m.counts.requirements > 0);
  assert.ok(m.board.notes > 0 && m.board.synced <= m.board.notes);
  // pusty modul (szablon): bez bledu, sekcje puste
  const { req } = tmpModule();
  const e = info.moduleSummary(req);
  assert.strictEqual(e.counts.requirements, 0);
  assert.strictEqual(typeof e.sections.cel, 'string');
});

test('AC-C3: moduleSummary - poziom lekki czyta SPEC.md', () => {
  const { req } = tmpModule();
  fs.writeFileSync(path.join(req, 'SDD.yaml'), YAML.replace('level: full', 'level: light'));
  fs.writeFileSync(path.join(req, '03-spec', 'SPEC.md'), '# Spec\n\n## Cel\nSzybsze faktury.\n\n## Aktorzy\nKsiegowa.\n\n## Poza zakresem\nKorekty.\n');
  const m = info.moduleSummary(req);
  assert.strictEqual(m.specFile, '03-spec/SPEC.md');
  assert.strictEqual(m.sections.cel, 'Szybsze faktury.');
  assert.strictEqual(m.sections.aktorzy, 'Ksiegowa.');
  assert.strictEqual(m.sections.pozaZakresem, 'Korekty.');
});

test('AC-C4: guide - etapy z STAGES, skille i foldery', () => {
  const g = info.guide();
  assert.deepStrictEqual(g.stages.map(s => s.command), STAGES.map(s => s.command));
  g.stages.forEach(s => { assert.ok(s.name); assert.ok(s.desc); });
  const skills = g.skills.map(s => s.command);
  ['/sdd:init', '/sdd:intake', '/sdd:interview', '/sdd:domain', '/sdd:spec', '/sdd:validate', '/sdd:handover', '/sdd:board', '/sdd:status']
    .forEach(c => assert.ok(skills.includes(c), 'brak ' + c));
  // kazdy skill z katalogu skills/ jest opisany
  fs.readdirSync(path.join(BOARD_DIR, '..', 'skills')).forEach(d => assert.ok(skills.includes('/sdd:' + d), 'skill bez opisu: ' + d));
  assert.ok(g.folders.length >= 5 && g.sections.length >= 3);
});

test('AC-C6: yamlSet - project i backlog, reszta bez zmian', () => {
  const out = info.yamlSet(YAML, { project: 'faktury "2026"', backlog: 'jira' });
  assert.match(out, /^project: "faktury '2026'"$/m);
  assert.match(out, /^backlog: jira {10}# none \| linear \| jira \| file$/m);
  const strip = t => t.split('\n').filter(l => !/^(project|backlog):/.test(l)).join('\n');
  assert.strictEqual(strip(out), strip(YAML));
  assert.throws(() => info.yamlSet(YAML, { backlog: 'trello' }), /backlog/);
  assert.throws(() => info.yamlSet(YAML, { project: '  ' }), /nazwa/i);
});

test('AC-C7: parseOwners / ownersSet - blok owners podmieniony, reszta bez zmian', () => {
  assert.deepStrictEqual(info.parseOwners(YAML), [
    { role: 'wlasciciel procesu', approves: ['R', 'D', 'GLOSSARY'] },
    { role: 'ksiegowosc', approves: ['BR'] },
  ]);
  const owners = [{ role: 'wlasciciel procesu', approves: ['R', 'D', 'GLOSSARY', 'BR'] }, { role: 'zarzad', approves: ['PRD'] }];
  const out = info.ownersSet(YAML, owners);
  assert.deepStrictEqual(info.parseOwners(out), owners);
  const keep = t => t.split('\n').filter(l => !/^\s+(- role:|approves:)/.test(l)).join('\n');
  assert.strictEqual(keep(out), keep(YAML));
  assert.match(out, /^owners: {16}# role biznesowe/m);
  assert.throws(() => info.ownersSet(YAML, [{ role: 'x', approves: ['R', 'XYZ'] }]), /XYZ/);
  assert.throws(() => info.ownersSet(YAML, [{ role: ' ', approves: ['R'] }]), /rol/i);
  assert.throws(() => info.ownersSet(YAML, []), /rol/i);
});

test('AC-C8: roleChangeBlocked - usunieta albo przemianowana rola uzywana w plikach', () => {
  const { req } = tmpModule();
  fs.appendFileSync(path.join(req, '01-interview', 'DECISIONS.md'), '\nZdecydowal: ksiegowosc\n');
  const old = info.parseOwners(YAML);
  const renamed = [old[0], { role: 'dzial finansow', approves: ['BR'] }];
  assert.deepStrictEqual(info.roleChangeBlocked(req, old, renamed), [{ role: 'ksiegowosc', files: ['01-interview/DECISIONS.md'] }]);
  // wlasciciel procesu nie wystepuje w plikach szablonu poza SDD.yaml - mozna go zmienic
  const other = [{ role: 'wlasciciel', approves: ['R'] }, old[1]];
  assert.deepStrictEqual(info.roleChangeBlocked(req, old, other), []);
  // nazwa z polskimi znakami znajduje zapis bez ogonkow w plikach (i odwrotnie)
  fs.appendFileSync(path.join(req, '01-interview', 'QUESTIONS.md'), '\n| Q-901 | ? | otwarte | wlasciciel procesu | luka | - | |\n');
  const pl = [{ role: 'właściciel procesu', approves: ['R'] }];
  assert.deepStrictEqual(info.roleChangeBlocked(req, pl, []).map(x => x.files), [['01-interview/QUESTIONS.md']]);
  // sama zmiana approves nie blokuje
  assert.deepStrictEqual(info.roleChangeBlocked(req, old, [old[0], { role: 'ksiegowosc', approves: ['BR', 'PRD'] }]), []);
});

test('AC-C11: rootPreview - moduly, ktore znikna z listy', () => {
  const mods = [
    { name: 'a', dir: '/x/a' }, { name: 'b', dir: '/y/b' }, { name: 'c', dir: '/z/c', external: true },
  ];
  assert.deepStrictEqual(info.rootPreview(mods, '/y'), ['a']);
  assert.deepStrictEqual(info.rootPreview(mods, '/x'), ['b']);
});

test('AC-C15: guide - zrodla [Biz], [App], [Dok], [AI] w kolejnosci hierarchii', () => {
  const text = JSON.stringify(info.guide());
  const at = ['[Biz]', '[App]', '[Dok]', '[AI]'].map(t => text.indexOf(t));
  assert.deepStrictEqual(at.slice().sort((a, b) => a - b), at, 'kolejnosc hierarchii');
  ['[Biz]', '[App]', '[Dok]', '[AI]'].forEach(t => assert.ok(text.includes(t), 'brak ' + t));
  assert.ok(!['[B]', '[D]', '[P]'].some(t => text.includes(t)), 'stare oznaczenia w przewodniku');
});

test('AC-C16: w sdd-kit nie ma starych oznaczen [B], [D], [P]', () => {
  const PLUGIN = path.join(BOARD_DIR, '..');
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) return e.name === 'test' || e.name === 'node_modules' ? [] : walk(f);
    return /\.(md|js|html|json|ya?ml)$/.test(e.name) && e.name !== 'CHANGELOG.md' ? [f] : [];
  });
  const hits = [];
  walk(PLUGIN).forEach(f => fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    if (['[B]', '[D]', '[P]'].some(t => l.includes(t)) && !/dawniej/.test(l)) hits.push(path.relative(PLUGIN, f) + ':' + (i + 1));
  }));
  assert.deepStrictEqual(hits, []);
});

// ---------------------------------------------------------------- serwer
function freePort() {
  return new Promise(res => {
    const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}
function call(port, method, url, body) {
  return new Promise((res, rej) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: url,
      headers: { 'x-sdd': '1', Host: 'localhost:' + port, 'Content-Type': 'application/json' } }, resp => {
      let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => res({ code: resp.statusCode, body: d, type: resp.headers['content-type'] || '' }));
    });
    r.on('error', rej);
    if (body !== undefined) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}
async function startServer() {
  const port = await freePort();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ics-'));
  ['a', 'b'].forEach(n => fs.cpSync(TEMPLATES, path.join(root, n, 'requirements'), { recursive: true }));
  const ext = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ext-'));
  fs.cpSync(TEMPLATES, path.join(ext, 'requirements'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config.json'), JSON.stringify({ modules: [ext, path.join(root, 'nie-ma')] }));
  const proc = spawn(process.execPath, [path.join(BOARD_DIR, 'server.js'), path.join(root, 'a', 'requirements', '01-interview', 'board.json'), String(port)],
    { cwd: root, env: Object.assign({}, process.env, { SDD_CONFIG: path.join(root, 'config.json'), SDD_MODULES_ROOT: '' }) });
  await new Promise((res, rej) => {
    let out = '';
    proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
    proc.on('exit', code => rej(new Error('serwer zakonczyl sie: ' + code + ' ' + out)));
  });
  return { port, proc, root, ext };
}

test('AC-C2, AC-C5: strony i GET /api/config, /api/module, /api/guide', async () => {
  const { port, proc, root, ext } = await startServer();
  try {
    for (const pg of ['/module', '/guide', '/config', '/demo/module', '/demo/guide', '/demo/config', '/demo/start/guide']) {
      const r = await call(port, 'GET', pg);
      assert.strictEqual(r.code, 200, pg);
      assert.match(r.type, /text\/html/, pg);
    }
    assert.strictEqual((await call(port, 'GET', '/nie-ma-strony')).code, 404);
    const c = JSON.parse((await call(port, 'GET', '/api/config')).body);
    assert.strictEqual(c.modulesRoot, root);
    assert.strictEqual(c.rootSource, 'project');
    assert.deepStrictEqual(c.modules.map(m => [m.dir, m.exists]), [[ext, true], [path.join(root, 'nie-ma'), false]]);
    assert.strictEqual(c.sdd.level, 'full');
    assert.strictEqual(c.sdd.gate, 'blokuje go-live');
    assert.strictEqual(c.sdd.backlog, 'none');
    assert.strictEqual(c.sdd.owners.length, 2);
    assert.match(c.server.version, /^\d+\.\d+\.\d+$/);
    assert.strictEqual(c.server.port, port);
    assert.strictEqual(c.server.board, path.join(root, 'a', 'requirements', '01-interview', 'board.json'));
    assert.strictEqual(c.server.config, path.join(root, 'config.json'));
    const m = JSON.parse((await call(port, 'GET', '/api/module')).body);
    assert.strictEqual(m.name, 'a');
    const g = JSON.parse((await call(port, 'GET', '/api/guide')).body);
    assert.strictEqual(g.stages.length, STAGES.length);
    const p = JSON.parse((await call(port, 'GET', '/api/root/preview?path=' + encodeURIComponent(path.join(os.tmpdir(), 'inny')))).body);
    assert.deepStrictEqual(p.hidden.sort(), ['a', 'b']);
  } finally { proc.kill(); }
});

test('AC-C9: PUT /api/config - SDD.yaml, CHANGELOG, level i gate zablokowane', async () => {
  const { port, proc, root } = await startServer();
  const req = path.join(root, 'a', 'requirements');
  try {
    let r = await call(port, 'PUT', '/api/config', { project: 'faktury', backlog: 'file' });
    assert.strictEqual(r.code, 200, r.body);
    const y = fs.readFileSync(path.join(req, 'SDD.yaml'), 'utf8');
    assert.match(y, /^project: "faktury"$/m);
    assert.match(y, /^backlog: file/m);
    const log = fs.readFileSync(path.join(req, 'CHANGELOG.md'), 'utf8').trim().split('\n').pop();
    assert.match(log, /^\d{4}-\d{2}-\d{2} \| config \| zmiana SDD\.yaml: project, backlog \| panel$/);
    r = await call(port, 'PUT', '/api/config', { level: 'light' });
    assert.strictEqual(r.code, 400);
    r = await call(port, 'PUT', '/api/config', { gate: 'x' });
    assert.strictEqual(r.code, 400);
    assert.match(fs.readFileSync(path.join(req, 'SDD.yaml'), 'utf8'), /^level: full/m);
    // AC-C8 przez serwer: rola uzywana w plikach -> 409
    fs.appendFileSync(path.join(req, '01-interview', 'QUESTIONS.md'), '\n| Q-900 | ? | otwarte | ksiegowosc | luka | - | |\n');
    r = await call(port, 'PUT', '/api/config', { owners: [{ role: 'wlasciciel procesu', approves: ['R', 'D', 'GLOSSARY', 'BR'] }] });
    assert.strictEqual(r.code, 409);
    assert.match(JSON.parse(r.body).error, /ksiegowosc/);
    r = await call(port, 'PUT', '/api/config', { owners: [{ role: 'wlasciciel procesu', approves: ['R'] }, { role: 'ksiegowosc', approves: ['BR', 'PRD'] }] });
    assert.strictEqual(r.code, 200, r.body);
    assert.match(fs.readFileSync(path.join(req, 'SDD.yaml'), 'utf8'), /approves: \[BR, PRD\]/);
  } finally { proc.kill(); }
});

test('AC-C10: DELETE /api/modules - tylko wpis w config.json, folder zostaje', async () => {
  const { port, proc, root, ext } = await startServer();
  try {
    const r = await call(port, 'DELETE', '/api/modules?dir=' + encodeURIComponent(ext));
    assert.strictEqual(r.code, 200, r.body);
    const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
    assert.ok(!cfg.modules.includes(ext));
    assert.ok(fs.existsSync(path.join(ext, 'requirements', 'SDD.yaml')));
    assert.strictEqual((await call(port, 'DELETE', '/api/modules?dir=' + encodeURIComponent('/nie/ma'))).code, 404);
  } finally { proc.kill(); }
});

test('AC-C12: demo - konfiguracja tylko do odczytu, bez sciezek usera', async () => {
  const { port, proc, root } = await startServer();
  try {
    assert.strictEqual((await call(port, 'PUT', '/demo/api/config', { project: 'x' })).code, 403);
    assert.strictEqual((await call(port, 'DELETE', '/demo/api/modules?dir=x')).code, 403);
    const r = await call(port, 'GET', '/demo/api/config');
    assert.strictEqual(r.code, 200);
    assert.ok(!r.body.includes(root), 'sciezka usera w demo');
    assert.ok(!r.body.includes(os.homedir()), 'katalog domowy w demo');
    const c = JSON.parse(r.body);
    assert.strictEqual(c.demo, 'wynik');
    assert.ok(c.sdd.owners.length > 0);
  } finally { proc.kill(); }
});

test('AC-C19: guide - dwa punkty startu i sekcja Tablica i panel', () => {
  const g = info.guide();
  assert.strictEqual(g.starts.length, 2);
  assert.match(g.starts[0].title, /materiał/i); assert.match(g.starts[1].title, /tablic/i);
  for (const st of g.starts) assert.ok(st.steps.length >= 3, st.title);
  assert.match(JSON.stringify(g.starts[1]), /\/sdd:board sync/);
  const sync = g.sections.find(s => /Tablica i panel/.test(s.title));
  assert.ok(sync, 'sekcja Tablica i panel');
  assert.match(sync.items.join(' '), /Claude Code/);
});

test('AC-C20: guide - warianty komend istnieja w plikach skilli', () => {
  const g = info.guide();
  const SK = path.join(__dirname, '..', '..', 'skills');
  const withVariants = g.skills.filter(s => s.variants && s.variants.length).map(s => s.command);
  for (const c of ['/sdd:board', '/sdd:interview', '/sdd:spec', '/sdd:intake', '/sdd:init', '/sdd:status']) assert.ok(withVariants.includes(c), c);
  for (const s of g.skills) {
    assert.ok(Array.isArray(s.variants), s.command);
    const name = s.command.replace('/sdd:', '');
    const text = fs.readFileSync(path.join(SK, name, 'SKILL.md'), 'utf8');
    for (const v of s.variants) {
      assert.ok(v.command.startsWith(s.command), v.command);
      assert.ok(v.desc && v.desc.length > 10, v.command);
      const arg = v.command.slice(s.command.length).trim();
      if (arg) assert.ok(text.includes(arg), s.command + ': argumentu "' + arg + '" nie ma w SKILL.md');
    }
  }
});

test('AC-C23: zrodla jako [X], identyfikatory pogrubione bez nawiasow, jeden na punkt', () => {
  const g = info.guide();
  const bare = t => new RegExp('(^|[^\\[\\w*ąćęłńóśźż-])(' + t + ')(?![\\wąćęłńóśźż\\]*-])');
  const src = g.sections.find(x => x.title === 'Źródła i wiarygodność');
  assert.ok(src);
  for (const t of ['Biz', 'App', 'Dok', 'AI']) assert.ok(src.items.some(i => i.startsWith('[' + t + ']')), '[' + t + ']');
  for (const it of src.items) assert.ok(!bare('Biz|App|Dok|AI').test(it), 'goły skrót w „' + it + '”');
  const ids = g.sections.find(x => x.title === 'Identyfikatory i statusy');
  assert.ok(ids);
  for (const t of ['Q', 'D', 'A', 'BR', 'R', 'AC', 'PRD']) {
    assert.strictEqual(ids.items.filter(i => i.startsWith('**' + t + '** – ')).length, 1, 'punkt dla **' + t + '**');
  }
  for (const it of ids.items) assert.ok(!bare('Q|D|A|BR|R|AC|PRD').test(it), 'goły skrót w „' + it + '”');
  assert.ok(!/\[(Q|D|A|BR|R|AC|PRD)\]/.test(ids.items.join(' ')), 'identyfikator w nawiasie');
});

test('AC-C23: SddUI.marks pogrubia zrodla w nawiasach i **tekst**', () => {
  assert.strictEqual(ui.marks('[App] i [XYZ], **D** – decyzja'), '<strong>[App]</strong> i [XYZ], <strong>D</strong> – decyzja');
});

test('AC-C22: sekcje przewodnika jako lista punktowana z pogrubionymi skrotami', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'info.html'), 'utf8');
  assert.match(html, /\.list\.bullets\{[^}]*list-style:\s*disc/);
  assert.match(html, /g\.sections\.forEach[^\n]*class="list bullets"[^\n]*SddUI\.marks\(esc\(i\)\)/);
});
