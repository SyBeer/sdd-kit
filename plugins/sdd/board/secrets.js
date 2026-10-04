// Klucze API kitu w ~/.sdd-kit/.env (spec: docs/specs/secrets.md, zmiana 0.28.5).
// Czyta i zapisuje tylko kit (redmine.js, serwer panelu). Claude z zasady nie otwiera tego pliku.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const KNOWN = ['REDMINE_API_KEY'];  // klucze, ktore panel moze zapisac

function envFile(env) {
  env = env || process.env;
  return env.SDD_ENV_FILE || path.join(os.homedir(), '.sdd-kit', '.env');
}

// KLUCZ=wartosc, `export ` dozwolone, cudzyslowy zdjete, # na poczatku linii = komentarz (AC-S1).
function readEnv(text) {
  const out = {};
  String(text || '').replace(/\r\n?/g, '\n').split('\n').forEach(l => {
    const m = l.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || /^\s*#/.test(l)) return;
    let v = m[2];
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    out[m[1]] = v;
  });
  return out;
}
// Podmiana albo dopisanie linii; pusta wartosc usuwa linie. Reszta pliku bez zmian (AC-S1).
function setEnv(text, key, value) {
  const re = new RegExp('^\\s*(?:export\\s+)?' + key + '\\s*=.*$', 'm');
  let t = String(text || '');
  if (!value) return t.replace(new RegExp(re.source + '\\n?', 'm'), '');
  const line = key + '="' + value + '"';
  if (re.test(t)) return t.replace(re, () => line);
  return (t && !/\n$/.test(t) ? t + '\n' : t) + line + '\n';
}

function readFileEnv(env) {
  try { return readEnv(fs.readFileSync(envFile(env), 'utf8')); } catch (e) { return {}; }
}
function writeSecret(key, value, env) {
  if (KNOWN.indexOf(key) < 0) throw new Error('Nieznany klucz: ' + key);
  const v = String(value == null ? '' : value).trim();
  if (/[\r\n"]/.test(v)) throw new Error('Klucz nie moze zawierac nowej linii ani cudzyslowu.');
  const f = envFile(env);
  let t = '';
  try { t = fs.readFileSync(f, 'utf8'); } catch (e) { t = '# Klucze API sdd-kit. Czyta je tylko kit (skrypty, panel) - nie wklejaj ich do czatu ani do repo.\n'; }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, setEnv(t, key, v), { mode: 0o600 });
  if (process.platform !== 'win32') fs.chmodSync(f, 0o600);
}

// Klucz Redmine: zmienna > plik .env > Pek kluczy macOS (AC-S2). Zwraca zrodlo i wartosc.
function redmineKey(env) {
  env = env || process.env;
  if (env.REDMINE_API_KEY) return { source: 'env', value: env.REDMINE_API_KEY };
  const f = readFileEnv(env).REDMINE_API_KEY;
  if (f) return { source: 'file', value: f };
  if (process.platform === 'darwin' && env.SDD_REDMINE_KEYCHAIN !== '0') {
    try {
      const k = execFileSync('security', ['find-generic-password', '-s', 'redmine-api-key', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (k) return { source: 'keychain', value: k };
    } catch (e) { /* brak w Peku kluczy */ }
  }
  return { source: 'none', value: '' };
}

module.exports = { KNOWN, envFile, readEnv, setEnv, writeSecret, redmineKey };
