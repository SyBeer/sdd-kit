@echo off
rem sdd-kit: instalator dla Windows - dwuklik albo .\install.cmd [--update ^| --uninstall]
rem Uruchamia install.ps1 z ominieciem blokady skryptow TYLKO dla tego okna (nic nie zmienia na stale).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
