#!/usr/bin/env node
'use strict';
// Wersja skilli w sesjach Claude Code (zmiana 0.32.0, docs/specs/session-version.md).
// Hooki pluginu SessionStart/SessionEnd uruchamiaja ten plik z kopii pluginu, ktora sesja zaladowala - wiec
// version z ../.claude-plugin/plugin.json to dokladnie wersja skilli tej sesji. Znacznik: ~/.sdd-kit/sessions/<id>.json.
// Hook nigdy nie psuje startu sesji: zero wyjscia (stdout SessionStart trafia do kontekstu), zawsze kod 0.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const H = 3600e3;
const sessionsDir = (env = process.env) => env.SDD_SESSIONS_DIR || path.join(os.homedir(), '.sdd-kit', 'sessions');
function ownVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.claude-plugin', 'plugin.json'), 'utf8')).version || ''; }
  catch (e) { return ''; }
}

// PID procesu Claude Code (0.36.1, AC-SV9..AC-SV12): na Windows zamkniecie okna nie uruchamia SessionEnd, znacznik
// zostawal i panel liczyl sesje jako otwarta. Start zapisuje PID Claude Code; lista sprawdza, czy proces zyje.
// Claude = pierwszy przodek hooka, ktory nie jest samym hookiem ani jego powloka, a w poleceniu ma "claude".
const SELF = /session-mark\.js/i;
const CLAUDE = /(^|[\\/\s"'])claude(\.exe)?(["'\s]|$)|claude-code[\\/]cli\.js/i;
function claudePid(chain) {
  for (const p of chain || []) {
    const c = String((p && p.cmd) || '');
    if (!c || SELF.test(c)) continue;
    if (CLAUDE.test(c)) return p.pid;
  }
  return null;
}
// "pid ppid polecenie" w kazdej linii (ps albo PowerShell z tabulatorami)
function parseChain(text) {
  return String(text || '').split(/\r?\n/).map(l => l.match(/^\s*(\d+)\s+(\d+)\s+(.*?)\s*$/))
    .filter(Boolean).map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), cmd: m[3] }));
}
// Przodkowie tego procesu (najblizszy pierwszy), najwyzej 8 poziomow; blad - pusta lista
function ancestors(start = process.pid) {
  try {
    if (process.platform === 'win32') {
      const ps = '$p=' + start + ';for($i=0;$i -lt 8 -and $p -gt 0;$i++){$x=Get-CimInstance Win32_Process -Filter "ProcessId=$p";' +
        'if(-not $x){break};$c=$x.CommandLine;if(-not $c){$c=$x.Name};"$($x.ProcessId)`t$($x.ParentProcessId)`t$c";$p=$x.ParentProcessId}';
      return parseChain(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps],
        { encoding: 'utf8', timeout: 5000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }));
    }
    const out = [];
    let p = start;
    for (let i = 0; i < 8 && p > 1; i++) {
      const row = parseChain(execFileSync('ps', ['-o', 'pid=,ppid=,command=', '-p', String(p)], { encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] }))[0];
      if (!row) break;
      out.push(row); p = row.ppid;
    }
    return out;
  } catch (e) { return []; }
}
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }  // EPERM = proces jest, nie nasz
}

function mark(cmd, input, dir = sessionsDir(), opts = {}) {
  let h;
  try { h = JSON.parse(input); } catch (e) { return; }
  const id = h && String(h.session_id || '');
  if (!ID.test(id)) return;
  const file = path.join(dir, id + '.json');
  if (cmd === 'start') {
    fs.mkdirSync(dir, { recursive: true });
    let pid = null;
    try { pid = claudePid((opts.chain || ancestors)()); } catch (e) { pid = null; }
    const m = { version: ownVersion(), cwd: String(h.cwd || ''), started: new Date().toISOString(), transcript: String(h.transcript_path || '') };
    if (Number.isInteger(pid) && pid > 0) m.pid = pid;
    fs.writeFileSync(file, JSON.stringify(m));
  } else if (cmd === 'end') {
    fs.rmSync(file, { force: true });
    return copyAtEnd(String(h.cwd || ''));
  }
}

// Kopia wymagan na koniec sesji (0.41.0, docs/specs/repo-copy.md AC-RC9): gdy sesja pracowala w module
// (cwd z requirements/SDD.yaml) - kopia, a przy copy: remote takze wysylka. Cisza, bez bledow; hook czeka na wynik.
function copyAtEnd(cwd) {
  try {
    if (!cwd || process.env.SDD_COPY === '0') return null;
    const yaml = path.join(cwd, 'requirements', 'SDD.yaml');
    if (!fs.existsSync(yaml)) return null;
    const rc = require('./repo-copy');
    return rc.copyOnce(cwd, rc.copyMode(fs.readFileSync(yaml, 'utf8'))).catch(() => null);
  } catch (e) { return null; }
}

// Zywe sesje: znacznik z PID - proces Claude Code dziala (AC-SV11; martwy -> znacznik usuniety);
// starszy znacznik bez PID (AC-SV4): transkrypt zmieniony w ciagu 12 h, bez transkryptu - znacznik z ostatnich 12 h.
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
      if (Number.isInteger(m.pid) && m.pid > 0) {
        if (!alive(m.pid)) { fs.rmSync(file, { force: true }); return; }
        out.push({ version: String(m.version || ''), cwd: String(m.cwd || ''), started: String(m.started || ''),
          stale: !!plugin && !!m.version && m.version !== plugin });
        return;
      }
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
    process.stdin.on('end', () => {
      let p = null;
      try { p = mark(cmd, Buffer.concat(chunks).toString('utf8')); } catch (e) { /* cisza */ }
      Promise.resolve(p).catch(() => null).then(() => process.exit(0));
    });
    process.stdin.on('error', () => process.exit(0));
  } catch (e) { process.exit(0); }
}

module.exports = { mark, listSessions, sessionsDir, claudePid, parseChain, ancestors };
