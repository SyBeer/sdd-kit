// Katalog produktow (modulow) wskazany przez uzytkownika, nigdy w folderze aplikacji.
// Kryteria: docs/specs/progress-ui.md, zmiana 0.8.0.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const KIT_DIR = path.resolve(__dirname, '..', '..', '..');

const configPath = (env = process.env) => env.SDD_CONFIG || path.join(os.homedir(), '.sdd-kit', 'config.json');

const inside = (p, parent) => p === parent || p.startsWith(parent + path.sep);

function readRoot(file) {
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8')).modulesRoot;
    return typeof v === 'string' && v ? v : null;
  } catch (e) { return null; }
}

function saveRoot(file, dir) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ modulesRoot: dir }, null, 2) + '\n');
}

const expand = (p, home) => (p === '~' || p.startsWith('~/')) ? path.join(home, p.slice(1)) : p;

// Podfoldery do okna "Przeglądaj…" (zmiana 0.8.0). Tylko nazwy folderow, bez ukrytych.
function listDirs(input, { kitDir = KIT_DIR, home = os.homedir() } = {}) {
  const raw = String(input || '').trim();
  const dir = path.resolve(raw ? expand(raw, home) : home);
  let st = null;
  try { st = fs.statSync(dir); } catch (e) { /* brak */ }
  if (!st || !st.isDirectory()) throw new Error('Nie ma folderu ' + dir);
  const kit = path.resolve(kitDir);
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { /* brak dostepu - pusta lista */ }
  const dirs = entries
    .filter(e => !e.name.startsWith('.'))
    .filter(e => e.isDirectory() || (e.isSymbolicLink() && (() => { try { return fs.statSync(path.join(dir, e.name)).isDirectory(); } catch (x) { return false; } })()))
    .map(e => {
      const p = path.join(dir, e.name);
      return { name: e.name, path: p, kit: inside(p, kit), module: fs.existsSync(path.join(p, 'requirements', 'SDD.yaml')) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const parent = path.dirname(dir);
  return { path: dir, parent: parent === dir ? null : parent, inKit: inside(dir, kit), dirs };
}

// Sprawdza sciezke wpisana przez uzytkownika; zaklada brakujacy folder. Zwraca sciezke bezwzgledna.
function checkRoot(input, { kitDir = KIT_DIR, home = os.homedir() } = {}) {
  let p = expand(String(input || '').trim(), home);
  if (!p || !path.isAbsolute(p)) throw new Error('Podaj ścieżkę bezwzględną, np. ' + path.join(home, 'wymagania') + ' albo ~/wymagania.');
  p = path.resolve(p);
  if (inside(p, path.resolve(kitDir))) throw new Error('To folder aplikacji sdd-kit (' + kitDir + '). Wymagania trzymaj poza nim.');
  if (fs.existsSync(p) && !fs.statSync(p).isDirectory()) throw new Error(p + ' nie jest folderem.');
  fs.mkdirSync(p, { recursive: true });
  return p;
}

// Kolejnosc: SDD_MODULES_ROOT -> config -> rodzic istniejacego requirements/ projektu.
function resolveRoot({ env = process.env, configFile = configPath(env), project = null, kitDir = KIT_DIR, exists = fs.existsSync } = {}) {
  const kit = path.resolve(kitDir);
  const moduleDir = project && exists(project) ? path.dirname(path.resolve(project)) : null;
  const candidates = [
    ['env', env.SDD_MODULES_ROOT ? path.resolve(env.SDD_MODULES_ROOT) : null],
    ['config', readRoot(configFile)],
    // projekt w aplikacji (ktos zrobil /sdd:init w folderze kitu) tez nie wyznacza katalogu
    ['project', moduleDir, moduleDir],
  ];
  for (const [source, dir, guard = dir] of candidates) {
    if (!dir) continue;
    if (inside(guard, kit)) return { root: null, source: null, rejected: guard };
    return { root: source === 'project' ? path.dirname(dir) : dir, source, rejected: null };
  }
  return { root: null, source: null, rejected: null };
}

module.exports = { KIT_DIR, configPath, inside, readRoot, saveRoot, checkRoot, resolveRoot, listDirs };
