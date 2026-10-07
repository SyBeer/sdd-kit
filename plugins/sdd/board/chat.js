'use strict';
// Okno Claude jako czat (0.38.0, docs/specs/claude-chat.md): Claude Code w trybie wymiany wiadomosci (stream-json).
// Ten sam folder modulu i ta sama rozmowa co w terminalu (--continue); styl rozmowy z widoku: czat = BIZ, terminal = INZ.
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const terminal = require('./terminal');

// Instrukcja dopisywana przy starcie (--append-system-prompt) - ma pierwszenstwo przed interview_style z SDD.yaml (AC-CH5)
const STYLE_PROMPT = {
  biz: 'Ta rozmowa toczy sie w oknie czatu panelu sdd-board. Wywiad i warsztat prowadzisz w stylu BIZ (sekcja "Styl rozmowy ' +
    '(BIZ / INZ)" w skillu /sdd:interview) - niezaleznie od interview_style w SDD.yaml. Piszesz zwyklym tekstem: akapity, ' +
    'pogrubienie, listy; bez blokow kodu, tabel i ramek. Piszesz tylko po polsku. Nie opisuj swoich krokow (czytanie, ' +
    'szukanie, zapisywanie plikow) - panel pokazuje je sam. Do szukania w plikach uzywaj narzedzi Grep i Read. Polecenia ' +
    'powloki inne niz odczyt sa tu zablokowane - gdy sa potrzebne, powiedz jednym zdaniem, ze trzeba przelaczyc okno na ' +
    'terminal (ikona </>).',
  inz: 'Ta rozmowa toczy sie w terminalu panelu sdd-board. Wywiad i warsztat prowadzisz w stylu INZ (sekcja "Styl rozmowy ' +
    '(BIZ / INZ)" w skillu /sdd:interview) - niezaleznie od interview_style w SDD.yaml.',
};
// Zgody w czacie: bez pytan - odczyt, zapis w folderze modulu, skille; reszta odrzucana (AC-CH2)
const ALLOWED = ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Skill', 'Task', 'TodoWrite',
  'Bash(date:*)', 'Bash(ls:*)', 'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)',
  // odczyt prostymi poleceniami (0.38.1, AC-CH9) - Claude czesto szuka tak w plikach modulu
  'Bash(cd:*)', 'Bash(grep:*)', 'Bash(cat:*)', 'Bash(head:*)', 'Bash(tail:*)', 'Bash(wc:*)'];

function chatArgs(o) {
  o = o || {};
  return ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--permission-mode', 'dontAsk', '--allowedTools'].concat(ALLOWED,
    ['--append-system-prompt', STYLE_PROMPT[o.style === 'inz' ? 'inz' : 'biz']]);
}

// Jedna linia stream-json -> zdarzenia dla okna czatu; nie-JSON -> null
function parseEvent(line) {
  let e;
  try { e = JSON.parse(line); } catch (err) { return null; }
  if (!e || typeof e !== 'object') return null;
  const out = [];
  if (e.type === 'system' && e.subtype === 'init') out.push({ kind: 'init', session: String(e.session_id || '') });
  else if (e.type === 'result') out.push({ kind: 'done', ok: e.subtype === 'success' && !e.is_error });
  else if ((e.type === 'assistant' || e.type === 'user') && e.message && Array.isArray(e.message.content)) {
    e.message.content.forEach(b => {
      if (!b) return;
      if (e.type === 'assistant' && b.type === 'text' && String(b.text || '').trim()) out.push({ kind: 'text', text: String(b.text) });
      else if (e.type === 'assistant' && b.type === 'tool_use') {
        const i = b.input || {};
        const f = i.file_path || i.path || i.notebook_path;
        out.push({ kind: 'tool', name: String(b.name || ''), target: f ? path.basename(String(f)) : String(i.command || i.pattern || i.skill || i.description || '').slice(0, 120) });
      } else if (e.type === 'user' && b.type === 'tool_result' && b.is_error) {
        const t = Array.isArray(b.content) ? b.content.map(x => x && x.text || '').join(' ') : String(b.content || '');
        out.push({ kind: 'denied', text: t.slice(0, 300) });
      }
    });
  }
  return out;
}

const LOG_MAX = 600;
class ChatSession extends EventEmitter {
  constructor() { super(); this.proc = null; this.entries = []; this.busy = false; this.exitCode = null; this.cwd = null; this.buf = ''; }
  state() { return { running: !!this.proc, busy: this.busy, cwd: this.cwd, exitCode: this.exitCode, startedAt: this.startedAt || null }; }
  log() { return this.entries.slice(); }
  add(ev) {
    this.entries.push(ev);
    if (this.entries.length > LOG_MAX) this.entries.splice(0, this.entries.length - LOG_MAX);
    this.emit('event', ev);
  }
  // o: {cwd, env, resume, style} albo {cwd, argv} (testy)
  start(o) {
    if (this.proc) return false;
    let p;
    const env = terminal.childEnv(o.env || process.env);
    if (o.argv) p = spawn(o.argv[0], o.argv.slice(1), { cwd: o.cwd, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    else if (process.platform === 'win32') {
      const w = terminal.windowsClaude(o.env || process.env, null, { resume: o.resume, args: chatArgs(o) });
      p = w.argv ? spawn(w.argv[0], w.argv.slice(1), { cwd: o.cwd, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
        : spawn(w.line, { cwd: o.cwd, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: true });
    } else {
      const a = terminal.claudeArgv(o.env || process.env, { resume: o.resume, args: chatArgs(o) });
      p = spawn(a[0], a.slice(1), { cwd: o.cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    }
    this.proc = p; this.cwd = o.cwd; this.busy = false; this.exitCode = null; this.buf = ''; this.startedAt = new Date().toISOString();
    this.add({ kind: 'start', resume: !!o.resume, style: o.style === 'inz' ? 'inz' : 'biz' });
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', c => {
      this.buf += c;
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i); this.buf = this.buf.slice(i + 1);
        (parseEvent(line) || []).forEach(ev => { if (ev.kind === 'done') this.busy = false; this.add(ev); });
      }
    });
    let err = '';
    p.stderr.on('data', c => { err = (err + c).slice(-2000); });
    p.stdin.on('error', () => {});
    p.on('error', e => this.add({ kind: 'error', text: e.message }));
    p.on('close', code => {
      if (this.proc !== p) return;
      this.proc = null; this.busy = false; this.exitCode = code;
      if (code && err.trim()) this.add({ kind: 'error', text: err.trim().split('\n').slice(-3).join('\n') });
      this.add({ kind: 'exit', code });
      this.emit('exit', code);
    });
    return true;
  }
  send(text) {
    text = String(text || '').trim();
    if (!this.proc || !text) return false;
    this.add({ kind: 'user', text });
    this.busy = true;
    this.proc.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: text } }) + '\n');
    return true;
  }
  stop() { if (this.proc) { try { this.proc.stdin.end(); } catch (e) { /* juz zamkniete */ } this.proc.kill('SIGTERM'); } }
}

module.exports = { ChatSession, chatArgs, parseEvent, STYLE_PROMPT, ALLOWED };
