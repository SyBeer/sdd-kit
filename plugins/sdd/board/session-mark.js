#!/usr/bin/env node
'use strict';
// Wersja skilli w sesjach Claude Code (zmiana 0.32.0, docs/specs/session-version.md).
// Hooki pluginu SessionStart/SessionEnd uruchamiaja ten plik z kopii pluginu, ktora sesja zaladowala - wiec
// version z ../.claude-plugin/plugin.json to dokladnie wersja skilli tej sesji. Znacznik: ~/.sdd-kit/sessions/<id>.json.
// Hook nigdy nie psuje startu sesji: zero wyjscia (stdout SessionStart trafia do kontekstu), zawsze kod 0.
const fs = require('fs');
const os = require('os');
const path = require('path');

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const H = 3600e3;
const sessionsDir = (env = process.env) => env.SDD_SESSIONS_DIR || path.join(os.homedir(), '.sdd-kit', 'sessions');
function ownVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.claude-plugin', 'plugin.json'), 'utf8')).version || ''; }
  catch (e) { return ''; }
}

function mark(cmd, input, dir = sessionsDir()) {
  let h;
  try { h = JSON.parse(input); } catch (e) { return; }
  const id = h && String(h.session_id || '');
  if (!ID.test(id)) return;
  const file = path.join(dir, id + '.json');
  if (cmd === 'start') {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ version: ownVersion(), cwd: String(h.cwd || ''),
      started: new Date().toISOString(), transcript: String(h.transcript_path || '') }));
  } else if (cmd === 'end') {
    fs.rmSync(file, { force: true });
  }
}

// Zywe sesje (AC-SV4): transkrypt zmieniony w ciagu 12 h, bez transkryptu - znacznik z ostatnich 12 h.
// Znaczniki starsze niz 7 dni albo z nazwa spoza wzoru usuwane przy odczycie. stale = inna wersja niz plugin.
function listSessions({ dir = sessionsDir(), plugin = '', now = Date.now() } = {}) {
  let names = [];
  try { names = fs.readdirSync(dir).filter(n => n.endsWith('.json')); } catch (e) { return []; }
  const out = [];
  names.forEach(n => {
    const file = path.join(dir, n);
    try {
      const age = now - fs.statSync(file).mtimeMs;
      if (!ID.test(n.slice(0, -5)) || age > 7 * 24 * H) { fs.rmSync(file, { force: true }); return; }
      const m = JSON.parse(fs.readFileSync(file, 'utf8'));
      let seen = age;
      if (m.transcript) { try { seen = now - fs.statSync(m.transcript).mtimeMs; } catch (e) { seen = age; } }
      if (seen > 12 * H) return;
      out.push({ version: String(m.version || ''), cwd: String(m.cwd || ''), started: String(m.started || ''),
        stale: !!plugin && !!m.version && m.version !== plugin });
    } catch (e) { /* uszkodzony znacznik - pomijamy */ }
  });
  return out;
}

if (require.main === module) {
  const cmd = process.argv[2];
  const chunks = [];
  try {
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () => { try { mark(cmd, Buffer.concat(chunks).toString('utf8')); } catch (e) { /* cisza */ } process.exit(0); });
    process.stdin.on('error', () => process.exit(0));
  } catch (e) { process.exit(0); }
}

module.exports = { mark, listSessions, sessionsDir };
