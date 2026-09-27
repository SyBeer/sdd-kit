# sdd-kit: pelny instalator (Windows, PowerShell)
# Uruchom w PowerShell:   .\install.ps1          (z rozpakowanego folderu)
#                         .\install.ps1 -Update
#                         .\install.ps1 -Uninstall
# Jesli PowerShell odmawia uruchomienia skryptu, najpierw:  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
param([switch]$Update, [switch]$Uninstall, [string]$Repo = $env:SDD_REPO)

$Market = "sdd-kit"; $Plugin = "sdd"
$HomeKit = Join-Path $HOME ".sdd-kit"
$BinDir  = Join-Path $HOME ".sdd-kit\bin"
$KitDir  = $PSScriptRoot
if (-not (Test-Path (Join-Path $KitDir "plugins\$Plugin\.claude-plugin\plugin.json"))) {
  if (Test-Path (Join-Path $HomeKit "plugins\$Plugin\.claude-plugin\plugin.json")) { $KitDir = $HomeKit } else { $KitDir = "" }
}
function Hr  { Write-Host "`n----------------------------------------------------------" }
function Ok  ($m) { Write-Host "  [OK]  $m" -ForegroundColor Green }
function Bad ($m) { Write-Host "  [!!]  $m" -ForegroundColor Yellow }
function Has ($c) { $null -ne (Get-Command $c -ErrorAction SilentlyContinue) }

if ($Uninstall) {
  Hr; Write-Host "ODINSTALOWANIE sdd-kit"
  claude plugin uninstall "$Plugin@$Market" 2>$null | Out-Null; Ok "Dodatek usuniety (jesli byl)."
  claude plugin marketplace remove $Market 2>$null | Out-Null; Ok "Zrodlo usuniete (jesli bylo)."
  Remove-Item (Join-Path $BinDir "sdd-board.cmd") -ErrorAction SilentlyContinue; Ok "Pomocnik sdd-board usuniety."
  Write-Host "  Folder $HomeKit zostawiam. Pliki requirements/ w projektach nietkniete."; Hr; exit 0
}

Hr; Write-Host "INSTALATOR sdd-kit (Windows)"; Write-Host "Zbieranie wymagan biznesowych z AI (Spec-Driven Development)"; Hr
Write-Host "Plan: 1 programy -> 2 kit -> 3 instalacja -> 4 sprawdzenie -> 5 komenda sdd-board -> 6 projekt (opcjonalnie)"
if (-not $Update) { Read-Host "Enter, zeby zaczac (Ctrl+C przerywa)" | Out-Null }

Hr; Write-Host "KROK 1 z 6: programy"; $fail = $false
if (Has claude) { Ok "Claude Code: $(claude --version 2>$null | Select-Object -First 1)" } else { Bad "Brak Claude Code. https://docs.claude.com/en/docs/claude-code/overview"; $fail = $true }
if (Has git)    { Ok "Git: $(git --version)" } else { Bad "Brak Git. https://git-scm.com/download/win"; $fail = $true }
if (Has node)   { Ok "Node.js: $(node --version) (tablica bedzie dzialac)" } else { Bad "Brak Node.js: tablica /sdd:board nie zadziala, reszta tak. https://nodejs.org" }
if ($fail) { Hr; Write-Host "Uzupelnij brakujace programy i uruchom ponownie."; exit 1 }

Hr; Write-Host "KROK 2 z 6: skad kit"
$ch = "2"
if ($KitDir -and -not $Update) {
  Write-Host "  Znalazlem kit w: $KitDir"; Write-Host "    1. Uzyj tego folderu"; Write-Host "    2. Pobierz swiezy z GitHuba do $HomeKit"
  $ch = Read-Host "Wybierz [1]"; if (-not $ch) { $ch = "1" }
} elseif ($KitDir) { $ch = "1" }
if ($ch -eq "2") {
  if (-not $Repo) { $Repo = Read-Host "Adres repo (uzytkownik/nazwa, np. zelu/sdd-kit)" }
  if (-not $Repo) { Bad "Brak adresu repo."; exit 1 }
  if (Test-Path (Join-Path $HomeKit ".git")) { git -C $HomeKit pull -q; Ok "Kit odswiezony." }
  else { git clone -q "https://github.com/$Repo.git" $HomeKit; if ($LASTEXITCODE -ne 0) { Bad "Nie udalo sie pobrac."; exit 1 }; Ok "Kit pobrany do $HomeKit" }
  $KitDir = $HomeKit; $Source = $Repo
} else { $Source = $KitDir }
$PluginDir = Join-Path $KitDir "plugins\$Plugin"

Hr; Write-Host "KROK 3 z 6: instalacja dodatku"
claude plugin validate $PluginDir 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Ok "Paczka poprawna." } else { Bad "Kontrola paczki zglosila uwagi (claude plugin validate $PluginDir)." }
$mk = claude plugin marketplace list 2>$null
if ($mk -match $Market) { claude plugin marketplace update $Market 2>$null | Out-Null; Ok "Zrodlo '$Market' odswiezone." }
else { claude plugin marketplace add $Source 2>&1 | Out-Null; if ($LASTEXITCODE -ne 0) { Bad "Rejestracja zrodla nie powiodla sie."; exit 1 }; Ok "Zrodlo '$Market' zarejestrowane." }
$inst = claude plugin list 2>$null
if ($inst -match $Plugin) {
  if ($Update) { claude plugin update "$Plugin@$Market" 2>$null | Out-Null; Ok "Dodatek zaktualizowany." } else { Ok "Dodatek juz zainstalowany." }
} else {
  claude plugin install "$Plugin@$Market" --scope user 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Bad "Instalacja nie powiodla sie. Sprobuj recznie: claude plugin install $Plugin@$Market"; exit 1 }
  Ok "Dodatek zainstalowany dla Twojego uzytkownika."
}

Hr; Write-Host "KROK 4 z 6: czy dziala"
if ((claude plugin list 2>$null) -match $Plugin) { Ok "'$Plugin' jest na liscie zainstalowanych." } else { Bad "Nie widze '$Plugin'. Sprawdz: claude plugin list" }
if (Test-Path (Join-Path $PluginDir "board\server.js")) { Ok "Pliki tablicy sa na miejscu." }

Hr; Write-Host "KROK 5 z 6: komenda 'sdd-board'"
New-Item -ItemType Directory -Force $BinDir | Out-Null
$board = Join-Path $PluginDir "board"
@"
@echo off
rem sdd-board            -> requirements\01-interview\board.json
rem sdd-board plik.json  -> wskazany plik
rem demo zawsze pod http://localhost:8012/demo i /demo/start
if "%~1"=="--demo" ( node "$board\server.js" requirements\01-interview\board.json 8012 ) else if "%~1"=="" ( node "$board\server.js" requirements\01-interview\board.json 8012 ) else ( node "$board\server.js" %1 8012 )
"@ | Set-Content (Join-Path $BinDir "sdd-board.cmd") -Encoding ASCII
Ok "Zapisano $BinDir\sdd-board.cmd"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$BinDir*") { [Environment]::SetEnvironmentVariable("Path", "$userPath;$BinDir", "User"); Ok "Dodalem $BinDir do PATH. Otworz nowe okno PowerShell." } else { Ok "PATH juz zawiera $BinDir." }

Hr; Write-Host "KROK 6 z 6: pierwszy projekt (opcjonalnie)"
if (-not $Update) {
  $a = Read-Host "Wskazac teraz folder projektu? [t/N]"
  if ($a -match '^[tT]') {
    $proj = Read-Host "Sciezka (np. C:\projekty\horizon)"
    if ($proj) {
      New-Item -ItemType Directory -Force $proj | Out-Null; Ok "Folder: $proj"
      if (-not (Test-Path (Join-Path $proj ".git"))) { git -C $proj init -q; Ok "Zalozylem repozytorium Git." }
      Write-Host "`n  Ostatnie dwa kroki robisz sam:"; Write-Host "    1. W PowerShell:   cd `"$proj`"; claude"; Write-Host "    2. W Claude Code:  /sdd:init"
    }
  }
}

Hr; Write-Host "GOTOWE"
Write-Host "  W Claude Code: /sdd:init  /sdd:intake  /sdd:interview  /sdd:domain  /sdd:spec  /sdd:validate  /sdd:handover  /sdd:status  /sdd:board"
Write-Host "  W PowerShell:  sdd-board   (postep -> http://localhost:8012, tablica -> /board)   demo: http://localhost:8012/demo i /demo/start"
Write-Host "  Przewodnik po ludzku: $KitDir\START-TUTAJ.md"; Hr
