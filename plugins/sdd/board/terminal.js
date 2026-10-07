// Sesja terminala dla okna Claude Code (spec: docs/specs/claude-dock.md, zmiana 0.25.0; Windows 0.33.0).
// macOS / Linux: pty z Pythona (pty-helper.py). Windows: ConPTY przez pomocnika w C# (conpty.cs) ladowanego przez
// Windows PowerShell 5.1. Kit zostaje bez zaleznosci npm. Jedna sesja = jeden proces w jednym folderze.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

const HELPER = path.join(__dirname, 'pty-helper.py');
const CONPTY = path.join(__dirname, 'conpty.cs');
const isFile = p => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } };
const W = path.win32;
const PYTHONS = ['/opt/homebrew/bin/python3', '/usr/local/bin/python3', '/usr/bin/python3'];

function python(env) {
  env = env || process.env;
  if (env.SDD_PYTHON) return env.SDD_PYTHON;
  return PYTHONS.find(p => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }) || null;
}

// ---------------------------------------------------------------- Windows (ConPTY, AC-W*)
// "10.0.22631" -> 22631; ConPTY jest od Windows 10 1809 (build 17763).
function windowsBuild(release) { const m = /^\d+\.\d+\.(\d+)/.exec(String(release || '')); return m ? +m[1] : 0; }
function powershell(env, exists) {
  env = env || process.env;
  if (env.SDD_POWERSHELL) return env.SDD_POWERSHELL;
  const p = W.join(env.SystemRoot || env.SYSTEMROOT || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  return (exists || isFile)(p) ? p : null;
}
// Czy terminal zadziala i dlaczego nie (komunikat w oknie i w bledzie 501). sys - do testow: platform, release, exists, python.
function availability(env, sys) {
  env = env || process.env;
  sys = Object.assign({ platform: process.platform, release: os.release(), exists: isFile }, sys);
  if (sys.platform === 'win32') {
    const b = windowsBuild(sys.release);
    if (b && b < 17763) return { ok: false, reason: 'Terminal wymaga Windows 10 w wersji 1809 lub nowszej (pseudokonsola ConPTY). Uruchom Claude Code w osobnym oknie, w folderze modułu.' };
    if (!powershell(env, sys.exists)) return { ok: false, reason: 'Brak Windows PowerShell (powershell.exe) - terminal niedostępny. Uruchom Claude Code w osobnym oknie, w folderze modułu.' };
    return { ok: true, reason: null };
  }
  const py = 'python' in sys ? sys.python : python(env);
  if (!py) return { ok: false, reason: 'Terminal niedostępny: serwer potrzebuje Pythona 3 (macOS / Linux). Uruchom Claude Code w osobnym oknie, w folderze modułu.' };
  return { ok: true, reason: null };
}
function available(env) { return availability(env).ok; }

// Cytowanie jednego argumentu wg CommandLineToArgvW (AC-W7): ukosniki przed cudzyslowem podwojone.
function winQuote(a) {
  a = String(a);
  if (a && !/[\s"]/.test(a)) return a;
  let out = '"', bs = 0;
  for (const ch of a) {
    if (ch === '\\') { bs++; continue; }
    if (ch === '"') { out += '\\'.repeat(bs * 2 + 1) + '"'; bs = 0; continue; }
    out += '\\'.repeat(bs) + ch; bs = 0;
  }
  return out + '\\'.repeat(bs * 2) + '"';
}
const winCommandLine = argv => argv.map(winQuote).join(' ');

// Ramka do pomocnika ConPTY (AC-W8): typ 'd' = bajty do terminala, 'r' = "kolumny wiersze".
function frame(type, data) {
  const body = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
  const head = Buffer.alloc(5);
  head[0] = type.charCodeAt(0); head.writeUInt32BE(body.length, 1);
  return Buffer.concat([head, body]);
}

// Polecenie claude na Windows (AC-W9) -> { line, how }. fsx - do testow: exists(p), read(p).
// Kolejnosc: SDD_CLAUDE_CMD; claude.exe (PATH, ~/.local/bin - instalator natywny); shim npm claude.cmd -> jego cel
// bezposrednio (node cli.js albo claude.exe z paczki: bez pliku wsadowego, bez .ps1 i zasad Restricted); cmd /c claude.
function windowsClaude(env, fsx, opts) {
  env = env || process.env;
  fsx = fsx || { exists: isFile, read: p => fs.readFileSync(p, 'utf8') };
  const resume = !!(opts && opts.resume);
  const args = (opts && opts.args) || [];  // 0.38.0 (AC-CH1): argumenty czatu / stylu
  const extra = (resume ? ['--continue'] : []).concat(args);
  if (env.SDD_CLAUDE_CMD) return { line: env.SDD_CLAUDE_CMD + (extra.length ? ' ' + winCommandLine(extra) : ''), how: 'env', shell: true };
  const pathVar = env.PATH || env.Path || Object.keys(env).filter(k => k.toUpperCase() === 'PATH').map(k => env[k])[0] || '';
  const dirs = String(pathVar).split(';').map(d => d.trim().replace(/^"(.*)"$/, '$1')).filter(Boolean);
  const local = env.USERPROFILE ? [W.join(env.USERPROFILE, '.local', 'bin')] : [];
  const exe = dirs.concat(local).map(d => W.join(d, 'claude.exe')).find(fsx.exists);
  if (exe) return { line: winCommandLine([exe].concat(extra)), argv: [exe].concat(extra), how: 'exe' };
  const shimDir = dirs.find(d => fsx.exists(W.join(d, 'claude.cmd')));
  if (shimDir) {
    let shim = '';
    try { shim = String(fsx.read(W.join(shimDir, 'claude.cmd')) || ''); } catch (e) { shim = ''; }
    const m = /"%dp0%\\([^"]+)"\s+%\*/.exec(shim) || /"%~dp0\\([^"]+)"\s+%\*/.exec(shim);
    if (m) {
      const target = W.join(shimDir, m[1]);
      if (/\.exe$/i.test(target) && fsx.exists(target)) return { line: winCommandLine([target].concat(extra)), argv: [target].concat(extra), how: 'npm' };
      if (/\.m?js$/i.test(target) && fsx.exists(target)) {
        const nodeExe = [W.join(shimDir, 'node.exe')].concat(dirs.map(d => W.join(d, 'node.exe'))).find(fsx.exists);
        if (nodeExe) return { line: winCommandLine([nodeExe, target].concat(extra)), argv: [nodeExe, target].concat(extra), how: 'npm' };
      }
    }
  }
  const comspec = env.ComSpec || env.COMSPEC || 'cmd.exe';
  const cmdArgv = [comspec, '/d', '/s', '/c', 'claude'].concat(extra);
  return { line: winCommandLine([comspec, '/d', '/s', '/c', 'claude' + (resume ? ' --continue' : '')].concat(args)), argv: cmdArgv, how: 'cmd' };
}

// Argumenty powershell.exe dla pomocnika (AC-W10): -EncodedCommand - zasady wykonywania skryptow go nie dotycza;
// -InputFormat None - PowerShell nie czyta stdin (to kanal ramek dla pomocnika).
// Kody: 125 - Constrained Language / AppLocker (Add-Type zablokowany), 126 - kompilacja albo ConPTY, 127 - brak polecenia.
function helperArgs(o) {
  const b = s => Buffer.from(String(s), 'utf8').toString('base64');
  const script = [
    "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue'",
    "if ($ExecutionContext.SessionState.LanguageMode -ne 'FullLanguage') { exit 125 }",
    "function Say($t) { $s = [Console]::OpenStandardError(); $b = [Text.Encoding]::UTF8.GetBytes($t + \"`r`n\"); $s.Write($b, 0, $b.Length); $s.Flush() }",
    "try { $src = [IO.File]::ReadAllText([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + b(o.cs || CONPTY) + "'))); Add-Type -TypeDefinition $src -Language CSharp }",
    "catch { Say ('Nie mogę przygotować terminala Windows (PowerShell + C#): ' + $_.Exception.Message); exit 126 }",
    // wyjatek poza try trafilby na stderr jako #< CLIXML - smieci w terminalu
    "try { $code = [SddConPty]::Run(" + size(o.cols, 80) + ", " + size(o.rows, 24) + ", '" + b(o.line) + "', '" + b(o.cwd) + "') }",
    "catch { Say ('Terminal Windows: ' + $_.Exception.GetBaseException().Message); exit 126 }",
    "exit $code"
  ].join('\n');
  return ['-NoLogo', '-NoProfile', '-NonInteractive', '-InputFormat', 'None', '-OutputFormat', 'Text',
    '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')];
}
const WIN_EXIT = {
  125: 'Zasady bezpieczeństwa Windows (Constrained Language Mode / AppLocker) blokują terminal w panelu. Uruchom Claude Code w osobnym oknie, w folderze modułu.'
};

// Powloka logowania: PATH z Homebrew i ~/.zprofile, bez aliasow z .zshrc (np. claude=ccs).
// opts.resume: --continue - ostatnia rozmowa w folderze modulu (po restarcie serwera, AC-T11).
// args (0.38.0, AC-CH1): dodatkowe argumenty Claude Code (czat, styl) - w pojedynczym cudzyslowie dla powloki
const shq = a => "'" + String(a).replace(/'/g, "'\\''") + "'";
function claudeArgv(env, opts) {
  env = env || process.env;
  const extra = (opts && opts.args || []).map(shq).join(' ');
  const cmd = (env.SDD_CLAUDE_CMD || 'claude') + (opts && opts.resume ? ' --continue' : '') + (extra ? ' ' + extra : '');
  return [env.SHELL || '/bin/zsh', '-l', '-c', 'exec ' + cmd];
}

// Gdzie Claude Code zapisuje rozmowy dla folderu: projects/<sciezka, kazdy znak spoza [A-Za-z0-9] -> '-'>.
function historyDir(cwd, env) {
  env = env || process.env;
  const base = env.CLAUDE_CONFIG_DIR || path.join(require('os').homedir(), '.claude');
  return path.join(base, 'projects', String(cwd).replace(/[^A-Za-z0-9]/g, '-'));
}
function hasHistory(cwd, env) {
  try { return fs.readdirSync(historyDir(cwd, env)).some(f => /\.jsonl$/.test(f)); } catch (e) { return false; }
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
  // o: cwd, cols, rows, resume, env; argv (tablica) albo line (surowa linia polecen Windows) zamiast claude.
  start(o) {
    if (this.proc) return false;
    const win = process.platform === 'win32';
    const cols = size(o.cols, 80), rows = size(o.rows, 24);
    let p;
    if (win) {
      const ps = powershell(o.env);
      if (!ps) throw new Error(availability(o.env).reason);
      const line = o.line || (o.argv ? winCommandLine(o.argv) : windowsClaude(o.env, null, { resume: o.resume, args: o.args }).line);
      // windowsHide: bez migajacego okna konsoli przy kazdym starcie
      p = spawn(ps, helperArgs({ cols, rows, line, cwd: o.cwd }), { cwd: o.cwd, env: childEnv(o.env), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    } else {
      const py = python(o.env);
      if (!py) throw new Error(availability(o.env).reason);
      const argv = o.argv || claudeArgv(o.env, { resume: o.resume, args: o.args });
      p = spawn(py, [HELPER, String(cols), String(rows)].concat(argv),
        { cwd: o.cwd, env: childEnv(o.env), stdio: ['pipe', 'pipe', 'pipe', 'pipe'] });
    }
    this.chunks = []; this.bytes = 0; this.exitCode = null; this.win = win;
    this.cwd = o.cwd; this.startedAt = new Date().toISOString();
    this.size = { cols, rows };
    this.proc = p;
    p.stdout.on('data', c => this.push(c));
    p.stderr.on('data', c => this.push(c));
    [p.stdin, p.stdio[3]].forEach(s => s && s.on('error', () => {}));
    p.on('error', e => this.push(Buffer.from('\r\n' + e.message + '\r\n')));
    p.on('close', code => {
      if (this.proc !== p) return;
      if (win && WIN_EXIT[code]) this.push(Buffer.from('\r\n' + WIN_EXIT[code] + '\r\n'));
      this.proc = null; this.exitCode = code;
      this.emit('exit', code);
    });
    return true;
  }
  write(data) { if (this.proc) this.proc.stdin.write(this.win ? frame('d', data) : data); }
  // Ten sam rozmiar nie idzie drugi raz (kazda zmiana = przerysowanie ekranu Claude); force - po podlaczeniu karty,
  // zeby Claude odrysowal ekran (AC-T10). Zwraca, czy rozmiar wyslano.
  resize(cols, rows, force) {
    if (!this.proc) return false;
    const c = size(cols, 80), r = size(rows, 24);
    if (!force && this.size && this.size.cols === c && this.size.rows === r) return false;
    this.size = { cols: c, rows: r };
    if (this.win) this.proc.stdin.write(frame('r', c + ' ' + r));
    else this.proc.stdio[3].write(c + ' ' + r + '\n');
    return true;
  }
  // Windows: kill = TerminateProcess pomocnika; obiekt zadania (KILL_ON_JOB_CLOSE) konczy cale drzewo claude (AC-W4).
  stop() { if (this.proc) this.proc.kill('SIGTERM'); }
}

module.exports = { TermSession, claudeArgv, historyDir, hasHistory, available, availability, python, childEnv,
  windowsBuild, winQuote, winCommandLine, frame, windowsClaude, helperArgs, powershell };
