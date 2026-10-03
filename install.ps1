# sdd-kit: pelny instalator (Windows, PowerShell). Spec: docs/specs/install.md
#
# Sposoby uruchomienia:
#   jedna komenda (PowerShell, bez pobierania czegokolwiek recznie):
#     powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/SyBeer/sdd-kit/main/install.ps1 | iex"
#   z rozpakowanego folderu: dwuklik install.cmd   albo   .\install.cmd [--update | --uninstall]
#   bezposrednio:            powershell -ExecutionPolicy Bypass -File install.ps1 [-Update | -Uninstall]
# Plik tylko ASCII: Windows PowerShell 5.1 czyta pliki bez BOM jako ANSI.
[CmdletBinding(PositionalBinding = $false)]
param([switch]$Update, [switch]$Uninstall, [string]$Repo = $env:SDD_REPO, [Parameter(ValueFromRemainingArguments = $true)] $Rest)

# --update / --uninstall z install.cmd
foreach ($a in @($Rest)) { if ($a -eq '--update') { $Update = $true } elseif ($a -eq '--uninstall') { $Uninstall = $true } }
if (-not $Repo) { $Repo = "SyBeer/sdd-kit" }
# Zasady wykonywania skryptow tylko dla tego okna - inaczej Windows blokuje tez claude.ps1 (Claude Code z npm).
try { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction Stop } catch { }
$ErrorActionPreference = "Continue"

$Market = "sdd-kit"; $Plugin = "sdd"
$OnWindows = $env:OS -eq "Windows_NT"
$HomeKit = Join-Path $HOME ".sdd-kit"
$BinDir  = Join-Path $HomeKit "bin"
function Hr  { Write-Host "`n----------------------------------------------------------" }
function Ok  ($m) { Write-Host "  [OK]  $m" -ForegroundColor Green }
function Bad ($m) { Write-Host "  [!!]  $m" -ForegroundColor Yellow }
function Has ($c) { $null -ne (Get-Command $c -ErrorAction SilentlyContinue) }
function IsKit ($d) { $d -and (Test-Path (Join-Path $d "plugins/$Plugin/.claude-plugin/plugin.json")) }

# Folder kitu: obok skryptu (uruchomienie z folderu), inaczej ~\.sdd-kit, inaczej brak (irm | iex).
$KitDir = ""
if (IsKit $PSScriptRoot) { $KitDir = $PSScriptRoot } elseif (IsKit $HomeKit) { $KitDir = $HomeKit }

# claude: najpierw program (.exe / .cmd), potem skrypt .ps1
$Claude = Get-Command claude -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $Claude) { $Claude = Get-Command claude -ErrorAction SilentlyContinue | Select-Object -First 1 }
# Uruchamia claude, zbiera wyjscie (stdout + stderr) jako tekst; kod w $LASTEXITCODE.
function Cl { $out = & $Claude.Source @args 2>&1 | ForEach-Object { "$_" }; return ($out -join "`n") }
function Show ($text) { if ($text) { $text -split "`n" | ForEach-Object { Write-Host "      $_" } } }

if ($Uninstall) {
  Hr; Write-Host "ODINSTALOWANIE sdd-kit"
  if ($Claude) {
    Cl plugin uninstall "$Plugin@$Market" | Out-Null; Ok "Dodatek usuniety (jesli byl)."
    Cl plugin marketplace remove $Market | Out-Null; Ok "Zrodlo usuniete (jesli bylo)."
  }
  Remove-Item (Join-Path $BinDir "sdd-board.cmd") -ErrorAction SilentlyContinue; Ok "Pomocnik sdd-board usuniety."
  Write-Host "  Folder $HomeKit zostawiam. Pliki requirements/ w projektach nietkniete."; Hr; exit 0
}

Hr; Write-Host "INSTALATOR sdd-kit (Windows)"; Write-Host "Zbieranie wymagan biznesowych z AI (Spec-Driven Development)"; Hr
Write-Host "Plan: 1 programy -> 2 kit -> 3 instalacja -> 4 sprawdzenie -> 5 komenda sdd-board -> 6 projekt (opcjonalnie)"
if (-not $Update) { Read-Host "Enter, zeby zaczac (Ctrl+C przerywa)" | Out-Null }

Hr; Write-Host "KROK 1 z 6: programy"; $fail = $false
if ($Claude) {
  $v = Cl --version
  Ok "Claude Code: $(($v -split "`n")[0])"
  Cl plugin --help | Out-Null
  if ($LASTEXITCODE -ne 0) { Bad "Ta wersja Claude Code nie ma komendy 'plugin'. Zaktualizuj: claude update"; $fail = $true }
} else {
  Bad "Brak Claude Code. Instalacja (PowerShell):  irm https://claude.ai/install.ps1 | iex"
  Write-Host "      Opis: https://docs.claude.com/en/docs/claude-code/setup  - potem otworz NOWE okno i uruchom instalator ponownie."
  $fail = $true
}
if (Has node) { Ok "Node.js: $(node --version) (panel i tablica beda dzialac)" } else { Bad "Brak Node.js: panel i tablica (sdd-board) nie zadzialaja, komendy /sdd:... tak. https://nodejs.org (wersja LTS)" }
if (Has git) { Ok "Git: $(git --version)" } elseif (-not $KitDir) { Bad "Brak Git - potrzebny do pobrania kitu z GitHuba. https://git-scm.com/download/win"; $fail = $true } else { Bad "Brak Git (kit jest juz na dysku, wiec instalacja ruszy; Git przyda sie do historii wymagan). https://git-scm.com/download/win" }
if ($fail) { Hr; Write-Host "Uzupelnij brakujace programy i uruchom instalator ponownie."; exit 1 }

Hr; Write-Host "KROK 2 z 6: skad kit"
$ch = "2"
if ($KitDir -and -not $Update) {
  Write-Host "  Znalazlem kit w: $KitDir"; Write-Host "    1. Uzyj tego folderu (najprostsze)"; Write-Host "    2. Pobierz swiezy z GitHuba ($Repo) do $HomeKit"
  $ch = Read-Host "Wybierz [1]"; if (-not $ch) { $ch = "1" }
} elseif ($KitDir) { $ch = "1" }
if ($ch -eq "2") {
  if (-not (Has git)) { Bad "Do pobrania potrzebny jest Git. https://git-scm.com/download/win"; exit 1 }
  if (Test-Path (Join-Path $HomeKit ".git")) {
    git -C $HomeKit pull -q; if ($LASTEXITCODE -ne 0) { Bad "git pull nie powiodl sie."; exit 1 }; Ok "Kit odswiezony z GitHuba."
  } elseif (Test-Path $HomeKit) {
    # folder juz jest (np. bin\ z wczesniejszej instalacji z ZIP-a) - clone odmowilby, wiec init + pull
    git -C $HomeKit init -q; git -C $HomeKit config core.autocrlf false
    git -C $HomeKit remote add origin "https://github.com/$Repo.git" 2>$null
    git -C $HomeKit pull -q origin main
    if ($LASTEXITCODE -ne 0) { Bad "Nie udalo sie pobrac https://github.com/$Repo"; exit 1 }; Ok "Kit pobrany do $HomeKit"
  } else {
    git clone -q -c core.autocrlf=false "https://github.com/$Repo.git" $HomeKit
    if ($LASTEXITCODE -ne 0) { Bad "Nie udalo sie pobrac https://github.com/$Repo"; exit 1 }; Ok "Kit pobrany do $HomeKit"
  }
  $KitDir = $HomeKit; $Source = $Repo
} else { $Source = $KitDir }
$PluginDir = Join-Path $KitDir "plugins/$Plugin"

Hr; Write-Host "KROK 3 z 6: instalacja dodatku"
$o = Cl plugin validate $PluginDir
if ($LASTEXITCODE -eq 0) { Ok "Paczka poprawna." } else { Bad "Kontrola paczki zglosila uwagi:"; Show $o }
$mk = Cl plugin marketplace list
if ($mk -match [regex]::Escape($Market)) {
  $o = Cl plugin marketplace update $Market
  if ($LASTEXITCODE -eq 0) { Ok "Zrodlo '$Market' odswiezone." } else { Ok "Zrodlo '$Market' juz zarejestrowane." }
} else {
  $o = Cl plugin marketplace add $Source
  if ($LASTEXITCODE -ne 0) { Bad "Rejestracja zrodla nie powiodla sie:"; Show $o; Write-Host "      Recznie: claude plugin marketplace add `"$Source`""; exit 1 }
  Ok "Zrodlo '$Market' zarejestrowane."
}
$inst = Cl plugin list
if ($inst -match "$Plugin@$Market") {
  if ($Update) { $o = Cl plugin update "$Plugin@$Market"; if ($LASTEXITCODE -eq 0) { Ok "Dodatek zaktualizowany." } else { Ok "Dodatek juz aktualny." } }
  else { Ok "Dodatek juz zainstalowany." }
} else {
  $o = Cl plugin install "$Plugin@$Market" --scope user
  if ($LASTEXITCODE -ne 0) { Bad "Instalacja nie powiodla sie:"; Show $o; Write-Host "      Recznie: claude plugin install $Plugin@$Market --scope user"; exit 1 }
  Ok "Dodatek zainstalowany dla Twojego uzytkownika."
}

Hr; Write-Host "KROK 4 z 6: czy dziala"
if ((Cl plugin list) -match "$Plugin@$Market") { Ok "'$Plugin' jest na liscie zainstalowanych." } else { Bad "Nie widze '$Plugin'. Sprawdz: claude plugin list" }
if (Test-Path (Join-Path $PluginDir "board/server.js")) { Ok "Pliki panelu i tablicy sa na miejscu." }

Hr; Write-Host "KROK 5 z 6: komenda 'sdd-board'"
New-Item -ItemType Directory -Force $BinDir | Out-Null
$board = Join-Path $PluginDir "board/server.js"
$cmd = @(
  '@echo off',
  'rem sdd-board                 -> requirements\01-interview\board.json, port 8012',
  'rem sdd-board plik.json [port] -> wskazany plik',
  'rem demo zawsze pod http://localhost:8012/demo i /demo/start',
  'set "F=%~1"',
  'if "%F%"=="" set "F=requirements\01-interview\board.json"',
  'if "%F%"=="--demo" set "F=requirements\01-interview\board.json"',
  'set "P=%~2"',
  'if "%P%"=="" set "P=8012"',
  ('node "' + $board + '" "%F%" %P%')
)
Set-Content -Path (Join-Path $BinDir "sdd-board.cmd") -Value $cmd -Encoding ASCII
Ok "Zapisano $BinDir\sdd-board.cmd"
if ($OnWindows) {
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not $userPath) { $userPath = "" }
  if (($userPath -split ';') -notcontains $BinDir) {
    [Environment]::SetEnvironmentVariable("Path", (($userPath.TrimEnd(';') + ";" + $BinDir).TrimStart(';')), "User")
    Ok "Dodalem $BinDir do PATH (nowe okna)."
  } else { Ok "PATH juz zawiera $BinDir." }
}
if (($env:Path -split ';') -notcontains $BinDir) { $env:Path = "$env:Path;$BinDir" }

Hr; Write-Host "KROK 6 z 6: pierwszy projekt (opcjonalnie)"
if (-not $Update) {
  $a = Read-Host "Wskazac teraz folder projektu? [t/N]"
  if ($a -match '^[tT]') {
    $proj = Read-Host "Sciezka (np. C:\projekty\horizon)"
    if ($proj) {
      New-Item -ItemType Directory -Force $proj | Out-Null; Ok "Folder: $proj"
      if ((Has git) -and -not (Test-Path (Join-Path $proj ".git"))) { git -C $proj init -q; Ok "Zalozylem repozytorium Git." }
      Write-Host "`n  Ostatnie dwa kroki robisz sam:"; Write-Host "    1. W PowerShell:   cd `"$proj`"; claude"; Write-Host "    2. W Claude Code:  /sdd:init"
    }
  }
}

Hr; Write-Host "GOTOWE"
Write-Host "  W Claude Code: /sdd:init  /sdd:intake  /sdd:interview  /sdd:domain  /sdd:spec  /sdd:validate  /sdd:handover  /sdd:status  /sdd:board"
Write-Host "  Panel i tablica: w folderze projektu wpisz  sdd-board  i otworz http://localhost:8012 (tablica: /board, demo: /demo)"
Write-Host "  Jesli 'sdd-board' nie jest znane - otworz nowe okno PowerShell."
Write-Host "  Przewodnik po ludzku: $KitDir\START-TUTAJ.md"; Hr
