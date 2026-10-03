# Sprawdzenie instalacji na Windows w GitHub Actions (.github/workflows/install.yml, AC-I8).
# Uruchamiane przez: powershell -ExecutionPolicy Bypass -File (zasady systemu zostaja Restricted jak w domu).
param([switch]$Panel)
$ErrorActionPreference = 'Continue'
$list = (claude plugin list 2>&1 | ForEach-Object { "$_" }) -join "`n"; $list
if ($list -notmatch 'sdd@sdd-kit') { Write-Host 'BLAD: dodatek sdd nie jest zainstalowany'; exit 1 }
$cmd = Join-Path $HOME '.sdd-kit\bin\sdd-board.cmd'
if (-not (Test-Path $cmd)) { Write-Host 'BLAD: brak sdd-board.cmd'; exit 1 }
Get-Content $cmd
if (-not $Panel) { exit 0 }
$proj = Join-Path $env:RUNNER_TEMP 'proj'
New-Item -ItemType Directory -Force $proj | Out-Null
Copy-Item -Recurse -Force plugins\sdd\templates\requirements (Join-Path $proj 'requirements')
$p = Start-Process -FilePath cmd.exe -ArgumentList '/c', "`"$cmd`" requirements\01-interview\board.json 8019" -WorkingDirectory $proj -PassThru -WindowStyle Hidden
$v = $null
for ($i = 0; $i -lt 20 -and -not $v; $i++) { Start-Sleep 1; try { $v = Invoke-RestMethod http://127.0.0.1:8019/api/version } catch { } }
if (-not $v) { Write-Host 'BLAD: panel nie odpowiada'; exit 1 }
$v | Format-List
$t = Invoke-RestMethod http://127.0.0.1:8019/api/term; $t | Format-List
if ($t.available) { Write-Host 'BLAD: terminal na Windows powinien byc niedostepny'; exit 1 }
taskkill /PID $p.Id /T /F | Out-Null
Write-Host 'OK: dodatek, sdd-board.cmd, panel'
