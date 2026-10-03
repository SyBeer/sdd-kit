# Spec: Instalacja na macOS i Windows

Status: zatwierdzony zakres 2026-10-03 (user: "instalator nie zadzialal na Windows ... zeby mozna to bylo zainstalowac na MAC i Windows")
Wersja docelowa: 0.26.0 (AC-I7 do potwierdzenia na Windows przez usera)

## Cel
Osoba prowadzaca instaluje kit jedna komenda albo dwuklikiem, na Macu i na Windows, bez zmieniania ustawien
bezpieczenstwa systemu na stale.

## Przyczyny awarii na Windows (z analizy instalatora)
1. `.\install.ps1` blokowany przez zasady wykonywania skryptow (domyslnie Restricted; plik z ZIP-a ma znacznik
   "z internetu", wiec RemoteSigned tez go blokuje). Ta sama blokada zatrzymuje `claude.ps1` (Claude Code z npm).
2. Uruchomienie bez folderu (`irm ... | iex`): `$PSScriptRoot` puste -> `Join-Path` przerywa skrypt.
3. Git wymagany zawsze, choc potrzebny tylko do pobrania kitu z GitHuba.
4. Bledy `claude plugin ...` chowane (`Out-Null`) - nie widac, co poszlo zle.
5. `sdd-board` dostepne dopiero w nowym oknie (PATH tylko dla przyszlych sesji).
6. `~\.sdd-kit` juz istnieje (np. `bin\` po instalacji z ZIP-a), a kit pobierany z GitHuba -> `git clone` odmawia
   (folder niepusty). Teraz: `git init` + `pull` w istniejacym folderze.

## Zakres
1. Windows, trzy drogi (instrukcja w README i START-TUTAJ):
   - jedna komenda w PowerShell: `powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/SyBeer/sdd-kit/main/install.ps1 | iex"`;
   - z folderu: dwuklik `install.cmd` (albo `.\install.cmd` w PowerShell / cmd);
   - `install.cmd --update` / `--uninstall`.
   `install.cmd` uruchamia `install.ps1` z `-ExecutionPolicy Bypass` tylko dla tego procesu i czeka na Enter na koncu.
   Zapisany z CRLF (`.gitattributes`: `install.cmd -text`), zeby cmd.exe czytal go poprawnie takze z ZIP-a.
2. `install.ps1`:
   - Bypass dla biezacego procesu (`Set-ExecutionPolicy -Scope Process`) - dziala `claude.ps1`;
   - dziala bez folderu kitu (`irm | iex`) - wtedy pobiera kit do `~\.sdd-kit`;
   - repo domyslne `SyBeer/sdd-kit` (zmiana: `-Repo` albo `SDD_REPO`);
   - `-Update` / `-Uninstall` oraz `--update` / `--uninstall` (z install.cmd);
   - Git wymagany tylko przy pobieraniu z GitHuba; `git clone -c core.autocrlf=false`;
   - bledy `claude plugin ...` wypisywane z trescia komendy do powtorzenia recznie;
   - `sdd-board.cmd` w `~\.sdd-kit\bin`, PATH uzytkownika + biezace okno; argumenty: plik tablicy i port;
   - sam ASCII (Windows PowerShell 5.1 czyta pliki bez BOM jako ANSI).
3. macOS / Linux: `install.sh` bez zmian w dzialaniu; repo domyslne `SyBeer/sdd-kit` (jedna komenda bez `SDD_REPO=`):
   `curl -fsSL https://raw.githubusercontent.com/SyBeer/sdd-kit/main/install.sh | bash`.
4. Okno Claude w panelu na Windows: komunikat (bez zmian, AC z claude-dock.md); reszta panelu dziala.

## Kryteria akceptacji
- AC-I1: `install.ps1` parsuje sie bez bledow w PowerShell 7; plik tylko ASCII.
- AC-I2 (atrapa claude, PowerShell 7 na macOS): uruchomienie z folderu kitu z `-Update` przechodzi kroki 1-5 i wola
  `plugin marketplace add|update`, `plugin install|update`; `sdd-board.cmd` powstaje z argumentami pliku i portu.
- AC-I3 (atrapa claude): uruchomienie jako tekst (`iex`, bez `$PSScriptRoot`) nie przerywa sie na sciezce,
  pobiera kit z repo domyslnego (atrapa git) i instaluje.
- AC-I3b: jak AC-I3, ale `~/.sdd-kit/bin` juz istnieje -> bez `git clone`, `init` + `remote add` + `pull origin main`.
- AC-I8 (GitHub Actions, `.github/workflows/install.yml`): prawdziwy Windows (PowerShell 5.1, zasady Restricted,
  Claude Code z npm): `install.cmd --update` instaluje dodatek, `sdd-board.cmd` uruchamia panel (`/api/version`,
  terminal niedostepny), `--uninstall`, potem `irm | iex` instaluje ponownie; macOS: `install.sh --update` + testy.
- AC-I4: blad `claude plugin install` -> komunikat z wyjsciem komendy i kod wyjscia 1.
- AC-I5: `install.cmd` ma konce linii CRLF w repo i w paczce ZIP z GitHuba; zawiera `-ExecutionPolicy Bypass` i `pause`; zwraca kod wyjscia instalatora.
- AC-I6: `install.sh` bez `SDD_REPO` przy pobieraniu uzywa `SyBeer/sdd-kit`; `bash -n install.sh` bez bledow.
- AC-I7 (reczne, Windows): user uruchamia jedna komende z punktu 1 i ma `/sdd:...` w Claude Code oraz `sdd-board`.
