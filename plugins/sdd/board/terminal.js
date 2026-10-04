// Sesja terminala dla okna Claude Code (spec: docs/specs/claude-dock.md, zmiana 0.25.0).
// pty z Pythona (pty-helper.py) - kit zostaje bez zaleznosci npm. Jedna sesja = jeden proces w jednym folderze.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

const HELPER = path.join(__dirname, 'pty-helper.py');
const PYTHONS = ['/opt/homebrew/bin/python3', '/usr/local/bin/python3', '/usr/bin/python3'];

function python(env) {
  env = env || process.env;
  if (env.SDD_PYTHON) return env.SDD_PYTHON;
  return PYTHONS.find(p => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }) || null;
}
// Windows nie ma pty w Pythonie - tam okno pokazuje komunikat.
function available(env) { return process.platform !== 'win32' && !!python(env); }

// Powloka logowania: PATH z Homebrew i ~/.zprofile, bez aliasow z .zshrc (np. claude=ccs).
function claudeArgv(env) {
  env = env || process.env;
  return [env.SHELL || '/bin/zsh', '-l', '-c', 'exec ' + (env.SDD_CLAUDE_CMD || 'claude')];
}

function childEnv(env) {
  const e = Object.assign({}, env || process.env);
  // Zmienne sesji Claude Code, ktora uruchomila serwer: CLAUDE_CODE_CHILD_SESSION wylacza zapis transkryptu.
  Object.keys(e).forEach(k => { if (/^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID$|CLAUDE_EFFORT$)/.test(k)) delete e[k]; });
  e.TERM = 'xterm-256color';
  e.COLORTERM = 'truecolor';
  return e;
}

const size = (n, d) => { n = parseInt(n, 10); return n > 0 && n < 1000 ? n : d; };

class TermSession extends EventEmitter {
  constructor(opts) {
    super();
    this.limit = (opts && opts.limit) || 512 * 1024;
    this.proc = null; this.chunks = []; this.bytes = 0;
    this.cwd = null; this.startedAt = null; this.exitCode = null; this.size = null;
  }
  state() {
    return { running: !!this.proc, cwd: this.cwd, startedAt: this.startedAt, exitCode: this.exitCode, size: this.size };
  }
  buffer() { return Buffer.concat(this.chunks); }
  push(chunk) {
    this.chunks.push(chunk); this.bytes += chunk.length;
    if (this.bytes > this.limit) {
      const all = this.buffer().subarray(this.bytes - this.limit);
      this.chunks = [Buffer.from(all)]; this.bytes = all.length;
    }
    this.emit('data', chunk);
  }
  start(o) {
    if (this.proc) return false;
    const py = python(o.env);
    if (!py) throw new Error('Brak Pythona 3 - terminal niedostępny.');
    this.chunks = []; this.bytes = 0; this.exitCode = null;
    this.cwd = o.cwd; this.startedAt = new Date().toISOString();
    this.size = { cols: size(o.cols, 80), rows: size(o.rows, 24) };
    const argv = o.argv || claudeArgv(o.env);
    const p = spawn(py, [HELPER, String(size(o.cols, 80)), String(size(o.rows, 24))].concat(argv),
      { cwd: o.cwd, env: childEnv(o.env), stdio: ['pipe', 'pipe', 'pipe', 'pipe'] });
    this.proc = p;
    p.stdout.on('data', c => this.push(c));
    p.stderr.on('data', c => this.push(c));
    [p.stdin, p.stdio[3]].forEach(s => s.on('error', () => {}));
    p.on('error', e => this.push(Buffer.from('\r\n' + e.message + '\r\n')));
    p.on('close', code => {
      if (this.proc !== p) return;
      this.proc = null; this.exitCode = code;
      this.emit('exit', code);
    });
    return true;
  }
  write(data) { if (this.proc) this.proc.stdin.write(data); }
  // Ten sam rozmiar nie idzie drugi raz (kazda zmiana = przerysowanie ekranu Claude); force - po podlaczeniu karty,
  // zeby Claude odrysowal ekran (AC-T10). Zwraca, czy rozmiar wyslano.
  resize(cols, rows, force) {
    if (!this.proc) return false;
    const c = size(cols, 80), r = size(rows, 24);
    if (!force && this.size && this.size.cols === c && this.size.rows === r) return false;
    this.size = { cols: c, rows: r };
    this.proc.stdio[3].write(c + ' ' + r + '\n');
    return true;
  }
  stop() { if (this.proc) this.proc.kill('SIGTERM'); }
}

module.exports = { TermSession, claudeArgv, available, python, childEnv };
