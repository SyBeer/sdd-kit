'use strict';
// Spec: docs/specs/install.md (AC-I1..AC-I6). Instalator Windows sprawdzany w PowerShell 7 (pwsh) z atrapami
// claude i git - bez dotykania prawdziwej instalacji. pwsh: PATH albo SDD_PWSH; brak -> testy pwsh pominiete.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const KIT = path.join(__dirname, '..', '..');
const PS1 = path.join(KIT, 'install.ps1');
function findPwsh() {
  if (process.env.SDD_PWSH) return process.env.SDD_PWSH;
  // pelna sciezka - testy podmieniaja PATH na atrapy
  const r = spawnSync('pwsh', ['-NoProfile', '-c', '[Environment]::ProcessPath'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}
const PWSH = findPwsh();
const skip = PWSH ? false : 'brak PowerShell 7 (pwsh)';

const FAKE_CLAUDE = `#!/bin/bash
echo "$*" >> "$CLAUDE_LOG"
case "$*" in
  "--version") echo "2.1.0 (Claude Code)";;
  "plugin --help") echo "plugin help";;
  "plugin marketplace list") [ -f "$STATE/market" ] && echo "  sdd-kit";;
  "plugin marketplace add"*) touch "$STATE/market";;
  "plugin list") [ -f "$STATE/inst" ] && echo "  sdd@sdd-kit";;
  "plugin install"*) if [ -n "$FAIL_INSTALL" ]; then echo "blad: brak dostepu do zrodla" >&2; exit 3; fi; touch "$STATE/inst";;
esac
exit 0
`;
const FAKE_GIT = `#!/bin/bash
echo "git $*" >> "$CLAUDE_LOG"
if [ "$1" = "--version" ]; then echo "git version 2.0"; exit 0; fi
if [ "$1" = "clone" ]; then dest="\${@: -1}"; mkdir -p "$dest"; cp -R "$KIT_SRC/plugins" "$KIT_SRC/START-TUTAJ.md" "$dest/"; exit 0; fi
if [ "$1" = "-C" ] && [ "$3" = "pull" ]; then cp -R "$KIT_SRC/plugins" "$KIT_SRC/START-TUTAJ.md" "$2/"; exit 0; fi
exit 0
`;

function sandbox(env) {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-inst-'));
  ['bin', 'home', 'state'].forEach(d => fs.mkdirSync(path.join(t, d)));
  fs.writeFileSync(path.join(t, 'bin', 'claude'), FAKE_CLAUDE, { mode: 0o755 });
  fs.writeFileSync(path.join(t, 'bin', 'git'), FAKE_GIT, { mode: 0o755 });
  const nodeDir = path.dirname(process.execPath);
  return { t, log: path.join(t, 'log'), env: Object.assign({}, env, {
    PATH: [path.join(t, 'bin'), nodeDir, '/usr/bin', '/bin'].join(':'), HOME: path.join(t, 'home'),
    CLAUDE_LOG: path.join(t, 'log'), STATE: path.join(t, 'state'), KIT_SRC: KIT, SDD_REPO: '' }) };
}
function run(sb, command) {
  return spawnSync(PWSH, ['-NoProfile', '-NonInteractive', '-c', command], { env: sb.env, encoding: 'utf8', timeout: 60000 });
}
const lines = sb => (fs.existsSync(sb.log) ? fs.readFileSync(sb.log, 'utf8') : '');

test('AC-I1: install.ps1 parsuje sie bez bledow, sam ASCII', { skip }, () => {
  assert.ok(!/[^\x00-\x7F]/.test(fs.readFileSync(PS1, 'utf8')), 'znaki spoza ASCII');
  const r = spawnSync(PWSH, ['-NoProfile', '-c',
    `$e=$null; [void][System.Management.Automation.Language.Parser]::ParseFile('${PS1}',[ref]$null,[ref]$e); $e.Count`], { encoding: 'utf8' });
  assert.strictEqual(r.stdout.trim(), '0', r.stdout + r.stderr);
});

test('AC-I2: z folderu kitu, -Update: zrodlo, dodatek, sdd-board.cmd', { skip }, () => {
  const sb = sandbox(process.env);
  const r = run(sb, `& '${PS1}' --update`);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const log = lines(sb);
  assert.match(log, new RegExp('plugin marketplace add ' + KIT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(log, /plugin install sdd@sdd-kit --scope user/);
  assert.match(r.stdout, /GOTOWE/);
  const cmd = fs.readFileSync(path.join(sb.env.HOME, '.sdd-kit', 'bin', 'sdd-board.cmd'), 'utf8');
  assert.match(cmd, /node ".*board.server\.js" "%F%" %P%/);
  assert.match(cmd, /set "P=8012"/);
  // ponownie: zrodlo i dodatek juz sa -> update, bez ponownej instalacji
  const r2 = run(sb, `& '${PS1}' -Update`);
  assert.strictEqual(r2.status, 0, r2.stdout + r2.stderr);
  assert.match(lines(sb), /plugin marketplace update sdd-kit/);
  assert.match(lines(sb), /plugin update sdd@sdd-kit/);
});

test('AC-I3: jako tekst (irm | iex, bez $PSScriptRoot) - pobiera kit z repo domyslnego', { skip }, () => {
  const sb = sandbox(process.env);
  const r = run(sb, `& ([scriptblock]::Create((Get-Content -Raw '${PS1}'))) -Update`);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(lines(sb), /git clone -q -c core.autocrlf=false https:\/\/github.com\/SyBeer\/sdd-kit.git/);
  assert.match(lines(sb), /plugin marketplace add SyBeer\/sdd-kit/);
  assert.ok(fs.existsSync(path.join(sb.env.HOME, '.sdd-kit', 'plugins', 'sdd', '.claude-plugin', 'plugin.json')));
});

test('AC-I3: jako tekst, gdy ~/.sdd-kit juz istnieje (bin z instalacji z ZIP-a) - init + pull zamiast clone', { skip }, () => {
  const sb = sandbox(process.env);
  fs.mkdirSync(path.join(sb.env.HOME, '.sdd-kit', 'bin'), { recursive: true });
  const r = run(sb, `& ([scriptblock]::Create((Get-Content -Raw '${PS1}'))) -Update`);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(lines(sb), /git clone/);
  assert.match(lines(sb), /remote add origin https:\/\/github.com\/SyBeer\/sdd-kit.git/);
  assert.match(lines(sb), /pull -q origin main/);
  assert.ok(fs.existsSync(path.join(sb.env.HOME, '.sdd-kit', 'plugins', 'sdd', '.claude-plugin', 'plugin.json')));
});

test('AC-I4: blad instalacji dodatku - tresc bledu i kod 1', { skip }, () => {
  const sb = sandbox(Object.assign({}, process.env, { FAIL_INSTALL: '1' }));
  const r = run(sb, `& '${PS1}' -Update`);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /Instalacja nie powiodla sie/);
  assert.match(r.stdout, /brak dostepu do zrodla/);
  assert.match(r.stdout, /claude plugin install sdd@sdd-kit --scope user/);
});

test('AC-I5: install.cmd - CRLF, Bypass tylko dla procesu, pause; .gitattributes', () => {
  const b = fs.readFileSync(path.join(KIT, 'install.cmd'), 'latin1');
  assert.ok(b.split('\n').slice(0, -1).every(l => l.endsWith('\r')), 'linie bez CRLF');
  assert.match(b, /powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install\.ps1" %\*/);
  assert.match(b, /\r\npause\r\n/);
  assert.match(b, /set "RC=%ERRORLEVEL%"\r\n[\s\S]*exit \/b %RC%\r\n$/);
  assert.match(fs.readFileSync(path.join(KIT, '.gitattributes'), 'utf8'), /^install\.cmd -text$/m);
});

test('AC-I6: install.sh - repo domyslne SyBeer/sdd-kit, skladnia bash', () => {
  const sh = fs.readFileSync(path.join(KIT, 'install.sh'), 'utf8');
  assert.match(sh, /SDD_REPO="\$\{SDD_REPO:-SyBeer\/sdd-kit\}"/);
  execFileSync('bash', ['-n', path.join(KIT, 'install.sh')]);
});
