'use strict';
// Dyktowanie systemowe z okna czatu (0.38.0, docs/specs/claude-chat.md AC-CH6, AC-CH7).
// Przycisk 🎙 w czacie ustawia kursor w polu wiadomosci, a serwer (ten sam komputer) uruchamia dyktowanie systemu:
// Windows - Win+H (Pisanie glosowe), macOS - menu przegladarki Edycja/Edit -> Rozpocznij dyktowanie / Start Dictation.
// Wycofanie: usun ten plik, test/dictate.test.js i bloki "DYKTOWANIE (0.38.0)" w server.js i ui.js.
// Wylaczenie bez usuwania: SDD_DICTATE=0 przy starcie sdd-board.
const { execFile } = require('child_process');

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

function dictateCommand(platform) {
  if (platform === 'win32') return { cmd: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(WIN_PS, 'utf16le').toString('base64')] };
  if (platform === 'darwin') return { cmd: 'osascript', args: [].concat(...MAC_SCRIPT.map(l => ['-e', l])) };
  return null;
}
function enabled(env, platform) { return (env || {}).SDD_DICTATE !== '0' && !!dictateCommand(platform); }

// Wskazowka po bledzie - co wlaczyc w systemie
function hint(platform, err) {
  const e = String(err || '');
  if (platform === 'darwin') {
    if (/assistive|accessib|1719|25211|not allowed/i.test(e))
      return 'Zezwól na sterowanie: Ustawienia systemowe → Prywatność i ochrona → Dostępność → włącz program, który uruchamia sdd-board (Terminal albo HQAI), potem spróbuj ponownie.';
    return 'Włącz dyktowanie: Ustawienia systemowe → Klawiatura → Dyktowanie. Możesz też nacisnąć dwa razy klawisz Fn w polu wiadomości.';
  }
  if (platform === 'win32') return 'Nie udało się otworzyć Pisania głosowego - naciśnij Win+H w polu wiadomości (Ustawienia → Prywatność → Mowa: włącz rozpoznawanie mowy online).';
  return 'Dyktowanie systemowe nie jest obsługiwane na tym systemie.';
}

function run(platform) {
  const c = dictateCommand(platform);
  if (!c) return Promise.resolve({ ok: false, error: hint(platform) });
  return new Promise(resolve => {
    execFile(c.cmd, c.args, { timeout: 8000, windowsHide: true }, (err, out, stderr) => {
      const txt = String(out || '').trim();
      if (err || (platform === 'darwin' && txt !== 'ok')) return resolve({ ok: false, error: hint(platform, (stderr || '') + ' ' + (err ? err.message : txt)) });
      resolve({ ok: true });
    });
  });
}

module.exports = { dictateCommand, enabled, hint, run };
