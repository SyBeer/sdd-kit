// Moduly (osobne foldery z requirements/) i zalaczniki do 00-intake/.
// Kryteria: docs/specs/progress-ui.md, zmiana 0.3.0.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

const TEMPLATES = path.join(__dirname, '..', 'templates');
const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function yamlField(text, key) {
  const m = text.match(new RegExp('^' + key + ':\\s*"?([^"#\\n]*?)"?\\s*(#.*)?$', 'm'));
  return m ? m[1].trim() : '';
}

// Modul = folder z requirements/SDD.yaml; null, gdy go nie ma.
function moduleInfo(dir) {
  const yamlFile = path.join(dir, 'requirements', 'SDD.yaml');
  let yaml;
  try { yaml = fs.readFileSync(yamlFile, 'utf8'); } catch (e) { return null; }
  const name = path.basename(dir);
  const project = yamlField(yaml, 'project');
  return {
    name, dir,
    project: /<[^>]+>/.test(project) || !project ? name : project,
    level: yamlField(yaml, 'level') || 'full',
  };
}
const byName = (a, b) => a.name.localeCompare(b.name) || a.dir.localeCompare(b.dir);

function listModules(root) {
  let entries = [];
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (e) { return []; }
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => moduleInfo(path.join(root, e.name)))
    .filter(Boolean)
    .sort(byName);
}

// Moduly z katalogu + dodane recznie spoza niego (zmiana 0.13.0). Ten sam folder raz, znikniete pomijane.
function allModules(root, extra) {
  const mods = listModules(root);
  const seen = new Set(mods.map(m => m.dir));
  (Array.isArray(extra) ? extra : []).forEach(d => {
    if (typeof d !== 'string') return;
    const dir = path.resolve(d);
    if (seen.has(dir)) return;
    const m = moduleInfo(dir);
    if (!m) return;
    seen.add(dir);
    mods.push(Object.assign(m, { external: true }));
  });
  return mods.sort(byName);
}

const q = s => '"' + String(s).replace(/["\\\n]/g, ' ').trim() + '"';

function createModule(root, { name, level, approver, sponsor }, opts = {}) {
  if (!NAME_RE.test(name || '')) throw new Error('Zla nazwa modulu: male litery, cyfry i myslnik, np. "faktury-2026".');
  if (level !== 'full' && level !== 'light') throw new Error('Zly poziom: full albo light.');
  const dir = path.join(root, name);
  if (fs.existsSync(dir)) throw new Error('Folder ' + dir + ' juz istnieje.');

  const req = path.join(dir, 'requirements');
  fs.mkdirSync(dir, { recursive: true });
  fs.cpSync(path.join(TEMPLATES, 'requirements'), req, { recursive: true });
  fs.rmSync(path.join(req, '03-spec', level === 'light' ? 'PRD.md' : 'SPEC.md'), { force: true });
  fs.copyFileSync(path.join(TEMPLATES, 'CLAUDE.md'), path.join(dir, 'CLAUDE.md'));

  let owners = '  - role: ' + q(approver || 'wlasciciel procesu') + '\n    approves: [R, D, GLOSSARY, BR]\n';
  if (sponsor && sponsor.trim()) owners += '  - role: ' + q(sponsor) + '\n    approves: [PRD]\n';
  const yamlFile = path.join(req, 'SDD.yaml');
  const yaml = fs.readFileSync(yamlFile, 'utf8')
    .replace(/^project:.*$/m, 'project: ' + q(name))
    .replace(/^level:\s*\w+/m, 'level: ' + level)
    .replace(/^(owners:.*\n)(?:[ \t]+.*\n)*/m, '$1' + owners);
  fs.writeFileSync(yamlFile, yaml);

  const today = new Date().toISOString().slice(0, 10);
  fs.appendFileSync(path.join(req, 'CHANGELOG.md'), today + ' | init | utworzono strukture, poziom ' + level + ' | panel\n');

  if (opts.git !== false) spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

function cleanName(original) {
  let base = path.basename(String(original || '').replace(/\\/g, '/'));
  base = base.normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}._-]/gu, '_')
    .replace(/^[.\-_]+/, '')
    .slice(0, 120);
  return base || 'plik';
}

const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');

// Plik w 00-intake/ o identycznej tresci (najpierw rozmiar, potem SHA-256). INDEX.md sie nie liczy.
function findSame(dir, buffer) {
  let names = [];
  try { names = fs.readdirSync(dir); } catch (e) { return null; }
  let hash = null;
  for (const n of names.sort()) {
    if (n === 'INDEX.md' || n.startsWith('.')) continue;
    const f = path.join(dir, n);
    let st;
    try { st = fs.statSync(f); } catch (e) { continue; }
    if (!st.isFile() || st.size !== buffer.length) continue;
    hash = hash || sha(buffer);
    if (sha(fs.readFileSync(f)) === hash) return n;
  }
  return null;
}

function saveIntake(reqDir, original, buffer) {
  const dir = path.join(reqDir, '00-intake');
  fs.mkdirSync(dir, { recursive: true });
  const same = findSame(dir, buffer);
  if (same) return { saved: null, duplicate: same };
  const name = cleanName(original);
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  let candidate = name, i = 0;
  while (fs.existsSync(path.join(dir, candidate))) candidate = stem + '-' + (++i) + ext;
  fs.writeFileSync(path.join(dir, candidate), buffer, { flag: 'wx' });
  return { saved: candidate };
}

// Usuniecie pliku czekajacego na spis z 00-intake/ - ostateczne (decyzja usera), bez kopii.
// `name` jak na liscie w panelu: sciezka wzgledem 00-intake/, separator "/".
function removeIntake(reqDir, name) {
  const dir = path.join(reqDir, '00-intake');
  const rel = String(name || '').replace(/\\/g, '/');
  if (rel === 'INDEX.md') throw new Error('INDEX.md to spis surowca - nie usuwam go z panelu.');
  const parts = rel.split('/');
  const file = path.resolve(dir, rel);
  if (!rel || parts.some(p => !p || p === '..' || p.startsWith('.')) || !file.startsWith(dir + path.sep)
      || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error('Nie ma takiego pliku w 00-intake/: ' + rel);
  }
  // Plik ze spisu jest juz zrodlem (moga sie na niego powolywac Q/D) - usuwac mozna tylko czekajace na spis.
  // Ta sama regula "w spisie" co w progress.js: nazwa pliku wystepuje w INDEX.md.
  let index = '';
  try { index = fs.readFileSync(path.join(dir, 'INDEX.md'), 'utf8'); } catch (e) { /* brak spisu */ }
  if (index.includes(path.basename(file))) throw new Error('Plik ' + rel + ' jest już w spisie (INDEX.md) - nie można go usunąć.');
  fs.unlinkSync(file);
  return rel;
}

module.exports = { listModules, allModules, createModule, saveIntake, removeIntake, cleanName, NAME_RE };
