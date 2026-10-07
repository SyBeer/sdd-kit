'use strict';
// Dyktowanie systemowe z okna czatu (0.38.0, docs/specs/claude-chat.md AC-CH6, AC-CH7).
// Przycisk 🎙 w czacie ustawia kursor w polu wiadomosci, a serwer (ten sam komputer) uruchamia dyktowanie systemu:
// Windows - Win+H (Pisanie glosowe), macOS - menu przegladarki Edycja/Edit -> Rozpocznij dyktowanie / Start Dictation.
// Wycofanie: usun ten plik, test/dictate.test.js i bloki "DYKTOWANIE (0.38.0)" w server.js i ui.js.
// Wylaczenie bez usuwania: SDD_DICTATE=0 przy starcie sdd-board.
const { execFile } = require('child_process');

// Wlasny skrot programu do dyktowania (0.39.1, AC-CH11), np. Superwhisper "option+space"; zapisany w ~/.sdd-kit/config.json
const MODS = { option: 'option', alt: 'option', opt: 'option', control: 'control', ctrl: 'control', command: 'command',
  cmd: 'command', win: 'command', super: 'command', shift: 'shift' };
const MAC_CODES = { space: 49, return: 36, enter: 36, tab: 48, escape: 53, esc: 53,
  f1: 122, f2: 120, f3: 99, f4: 118, f5: 96, f6: 97, f7: 98, f8: 100, f9: 101, f10: 109, f11: 103, f12: 111 };
function parseKeys(text) {
  const parts = String(text || '').toLowerCase().split('+').map(x => x.trim());
  if (parts.length < 1 || parts.some(x => !x)) return null;
  const key = parts.pop(), mods = [];
  for (const m of parts) { if (!MODS[m]) return null; if (mods.indexOf(MODS[m]) < 0) mods.push(MODS[m]); }
  if (!(/^[a-z0-9]$/.test(key) || MAC_CODES[key] !== undefined)) return null;
  return { mods, key };
}
function macKeysScript(k) {
  const using = k.mods.length ? ' using {' + k.mods.map(m => m + ' down').join(', ') + '}' : '';
  return ['tell application "System Events"',
    MAC_CODES[k.key] !== undefined ? '  key code ' + MAC_CODES[k.key] + using : '  keystroke "' + k.key + '"' + using,
    'end tell', 'return "ok"'];
}
const WIN_MOD = { control: 0x11, option: 0x12, shift: 0x10, command: 0x5B };
function winVk(key) {
  if (/^[a-z0-9]$/.test(key)) return key.toUpperCase().charCodeAt(0);
  const f = /^f(\d{1,2})$/.exec(key); if (f) return 0x6F + +f[1];
  return { space: 0x20, return: 0x0D, enter: 0x0D, tab: 0x09, escape: 0x1B, esc: 0x1B }[key];
}
function winKeysPs(k) {
  const hex = v => '0x' + v.toString(16).toUpperCase().padStart(2, '0');
  const down = k.mods.map(m => WIN_MOD[m]).concat([winVk(k.key)]);
  const ev = (v, up) => '[Sdd.Keys]::keybd_event(' + hex(v) + ',0,' + (up ? 2 : 0) + ',[System.UIntPtr]::Zero)';
  return [WIN_PS.split('; ').slice(0, 2).join('; ')].concat(down.map(v => ev(v)), down.slice().reverse().map(v => ev(v, true))).join('; ');
}

const WIN_PS = [
  "$ErrorActionPreference='Stop'",
  "Add-Type -Namespace Sdd -Name Keys -MemberDefinition '[DllImport(\"user32.dll\")] public static extern void keybd_event(byte b, byte s, uint f, System.UIntPtr e);'",
  '[Sdd.Keys]::keybd_event(0x5B,0,0,[System.UIntPtr]::Zero)',   // Win w dol
  '[Sdd.Keys]::keybd_event(0x48,0,0,[System.UIntPtr]::Zero)',   // H w dol
  '[Sdd.Keys]::keybd_event(0x48,0,2,[System.UIntPtr]::Zero)',   // H w gore
  '[Sdd.Keys]::keybd_event(0x5B,0,2,[System.UIntPtr]::Zero)',   // Win w gore
].join('; ');

// Pozycja menu dyktowania w przegladarce na wierzchu (nazwy PL i EN, z wielokropkiem albo trzema kropkami)
const MAC_SCRIPT = [
  'tell application "System Events"',
  '  set p to first application process whose frontmost is true',
  '  tell p',
  '    repeat with mName in {"Edycja", "Edit"}',
  '      try',
  '        set m to menu (mName as text) of menu bar item (mName as text) of menu bar 1',
  '        repeat with iName in {"Rozpocznij dyktowanie…", "Rozpocznij dyktowanie...", "Start Dictation…", "Start Dictation..."}',
  '          try',
  '            click menu item (iName as text) of m',
  '            return "ok"',
  '          end try',
  '        end repeat',
  '      end try',
  '    end repeat',
  '  end tell',
  'end tell',
  'return "nomenu"',
];

function dictateCommand(platform, opts) {
  const k = opts && opts.keys ? parseKeys(opts.keys) : null;
  if (platform === 'win32') return { cmd: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(k ? winKeysPs(k) : WIN_PS, 'utf16le').toString('base64')] };
  if (platform === 'darwin') return { cmd: 'osascript', args: [].concat(...(k ? macKeysScript(k) : MAC_SCRIPT).map(l => ['-e', l])) };
  return null;
}
// Program .app, ktory uruchomil serwer (to jemu macOS daje zgode "Dostepnosc"), z lancucha przodkow (AC-CH12)
function responsibleApp(chain) {
  for (const p of chain || []) { const m = /^(.*?\.app)(\/|$)/.exec(String(p.cmd || '')); if (m) return m[1]; }
  return null;
}
function enabled(env, platform) { return (env || {}).SDD_DICTATE !== '0' && !!dictateCommand(platform); }

// Wskazowka po bledzie - co wlaczyc w systemie
function hint(platform, err, app) {
  const e = String(err || '');
  if (platform === 'darwin') {
    if (/assistive|accessib|1719|25211|1002|not allowed/i.test(e))
      return 'Zezwól na sterowanie: Ustawienia systemowe → Prywatność i ochrona → Dostępność → „+” → Cmd+Shift+G i wklej: ' +
        (app || 'program, który uruchamia sdd-board (Terminal albo HQAI)') + ' - potem spróbuj ponownie.';
    return 'Włącz dyktowanie: Ustawienia systemowe → Klawiatura → Dyktowanie. Możesz też nacisnąć dwa razy klawisz Fn w polu wiadomości.';
  }
  if (platform === 'win32') return 'Nie udało się otworzyć Pisania głosowego - naciśnij Win+H w polu wiadomości (Ustawienia → Prywatność → Mowa: włącz rozpoznawanie mowy online).';
  return 'Dyktowanie systemowe nie jest obsługiwane na tym systemie.';
}

function run(platform, opts) {
  const c = dictateCommand(platform, opts);
  if (!c) return Promise.resolve({ ok: false, error: hint(platform) });
  let app = null;
  try { app = platform === 'darwin' ? responsibleApp(require('./session-mark').ancestors()) : null; } catch (e) { app = null; }
  return new Promise(resolve => {
    execFile(c.cmd, c.args, { timeout: 8000, windowsHide: true }, (err, out, stderr) => {
      const txt = String(out || '').trim();
      if (err || (platform === 'darwin' && txt !== 'ok')) return resolve({ ok: false, error: hint(platform, (stderr || '') + ' ' + (err ? err.message : txt), app) });
      resolve({ ok: true });
    });
  });
}

module.exports = { dictateCommand, enabled, hint, run, parseKeys, responsibleApp };
