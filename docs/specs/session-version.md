# Wersja skilli w sesjach Claude Code (zmiana 0.32.0)

Status: **zatwierdzone** (wlasciciel produktu, 2026-10-05).

## Problem
Po aktualizacji pluginu (`claude plugin update`) otwarte sesje Claude Code dalej uzywaja skilli z poprzedniej
wersji - nowe laduja sie dopiero w nowej sesji. Panel pokazuje wersje serwera i pluginu na dysku, ale nie wie,
na jakiej wersji pracuja otwarte sesje. Skutek: user uruchamia `/sdd:validate` w starej sesji i dostaje raport bez
nowych kontroli (przyklad 2026-10-05: sesja na 0.30.0 po wydaniu 0.31.0), nie wiedzac o tym.

## Cel
Panel pokazuje otwarte sesje Claude Code z wersja skilli, ktora kazda z nich zaladowala, i ostrzega, gdy sesja
ma inna wersje niz zainstalowany plugin: "sesja Claude na 0.30.0 - zamknij ja i otworz nowa".

Metryka: po aktualizacji pluginu user widzi w panelu, ktore sesje trzeba zrestartowac, bez zagladania do terminala.

## Jak (CO widzi user, w skrocie mechanizm)
Plugin dostaje hooki Claude Code `SessionStart` i `SessionEnd`. Claude Code uruchamia je z katalogu tej wersji
pluginu, ktora sesja zaladowala - wiec hook zna dokladnie wersje skilli tej sesji (bez zgadywania).
- `SessionStart` zapisuje znacznik `~/.sdd-kit/sessions/<id sesji>.json`: wersja, folder sesji (cwd), czas startu,
  sciezka transkryptu (do oceny, czy sesja zyje).
- `SessionEnd` usuwa znacznik.
- Panel (`/api/version`) czyta znaczniki i pokazuje je przy wersji w gornym pasku.

## Zakres
- macOS, Linux, Windows (node jest wymagany przez kit, sciezki przez `os.homedir()`/`path.join`),
- sesje lokalne na tym komputerze, rowniez sesja uruchomiona w oknie Claude w panelu.

## Poza zakresem
- sesje uruchomione przed wersja z hookiem (nie maja znacznika - panel ich nie widzi; pierwsza aktualizacja
  po wydaniu to jedyny moment, gdy ostrzezenie nie zadziala),
- sesje w chmurze i na innych komputerach,
- automatyczny restart sesji - panel tylko informuje.

## Kryteria akceptacji
- **AC-SV1** Plugin ma `hooks/hooks.json` z hookami `SessionStart` i `SessionEnd`, ktore uruchamiaja
  `node "${CLAUDE_PLUGIN_ROOT}/board/session-mark.js" start|end`.
- **AC-SV2** `session-mark.js start` czyta JSON hooka ze stdin (`session_id`, `cwd`, `transcript_path`) i zapisuje
  `~/.sdd-kit/sessions/<session_id>.json` z `version` z `.claude-plugin/plugin.json` swojej kopii pluginu, `cwd`,
  `started`, `transcript`. Nic nie wypisuje (stdout SessionStart trafia do kontekstu sesji) i zawsze konczy sie
  kodem 0 - takze przy zlym wejsciu albo braku uprawnien (hook nigdy nie psuje startu sesji).
- **AC-SV3** `session-mark.js end` usuwa znacznik tej sesji; brak pliku nie jest bledem.
- **AC-SV4** Lista sesji: zywa = transkrypt zmieniony w ciagu 12 h (bez transkryptu - znacznik z ostatnich 12 h);
  znaczniki starsze niz 7 dni albo z nazwa spoza `[A-Za-z0-9_-]` sa pomijane i usuwane przy odczycie.
- **AC-SV5** `/api/version` zwraca `sessions`: `[{ version, cwd, started, stale }]` dla zywych sesji, `stale` =
  wersja rozna od zainstalowanego pluginu; w demo pusta lista.
- **AC-SV6** Gorny pasek: gdy jakas zywa sesja ma `stale`, plakietka wersji dostaje dopisek
  "· sesja Claude nieaktualna", a podpowiedz wymienia sesje (folder, wersja) i mowi: "zamknij te sesje i otworz
  nowa - skille laduja sie przy starcie sesji". Bez nieaktualnych sesji - bez dopisku; podpowiedz pokazuje liczbe
  otwartych sesji na biezacej wersji.
- **AC-SV7** Przewodnik "Jak to dziala" (sekcja Panel i serwer): zdanie o wersji skilli w sesjach.
- **AC-SV8** Sciezki dzialaja na Windows (test z `path.join`, bez `/` na sztywno).

## Testy (TDD, przed kodem)
`board/test/session-version.test.js`: AC-SV1 (hooks.json), AC-SV2..AC-SV4 (session-mark.js z katalogiem domowym
podstawionym przez zmienna srodowiskowa, zly JSON, brak katalogu), AC-SV5 (funkcja listy sesji), AC-SV6
(`versionBadge` w ui.js), AC-SV7 (przewodnik).
Recznie po wydaniu: stara sesja otwarta, aktualizacja pluginu -> panel pokazuje "sesja Claude nieaktualna";
nowa sesja -> dopisek znika po zamknieciu starej.

## Rozstrzygniecia (2026-10-05)
1. Panel pokazuje tylko ostrzezenie przy nieaktualnych sesjach; w podpowiedzi liczba sesji na biezacej wersji.

## Weryfikacja
- 2026-10-05, panel z repo na fv-manager, sztuczny znacznik sesji 0.30.0 przy pluginie 0.31.0: plakietka
  "v0.31.0 · sesja Claude nieaktualna" (czerwona), podpowiedz z folderem i wersja. Hook w prawdziwej sesji -
  do sprawdzenia po wydaniu (sesja otwarta po instalacji 0.32.0 zapisuje znacznik w ~/.sdd-kit/sessions/).

## Zmiana 0.36.1 - PID procesu Claude Code
Zgloszenie usera (2026-10-06, Windows): "SDD-kit pokazuje wiele sesji Claude, ktore zostaly juz zamkniete ... trzeba
zabezpieczyc ten proces tak, zeby zbieral pare Session ID i PID". Na Windows zamkniecie okna terminala nie uruchamia
`SessionEnd` - znacznik zostawal, a panel liczyl sesje jako otwarta do 12 h od ostatniej zmiany transkryptu.
- **AC-SV9** `claudePid(chain)`: z lancucha przodkow hooka (najblizszy pierwszy) pierwszy proces z "claude" w poleceniu
  (`claude`, `claude.exe`, `node …claude-code/cli.js`), z pominieciem samego hooka i jego powloki (polecenie
  z `session-mark.js`); brak - `null`.
- **AC-SV10** Lancuch przodkow: macOS / Linux `ps -o pid=,ppid=,command=` po kolei, Windows jedno wywolanie PowerShell
  (`Get-CimInstance Win32_Process`, linie "pid<TAB>ppid<TAB>polecenie"), najwyzej 8 poziomow; `parseChain` czyta oba.
- **AC-SV11** Lista sesji: znacznik z `pid` - sesja zywa, dopoki proces istnieje (`process.kill(pid, 0)`, EPERM = istnieje),
  niezaleznie od wieku transkryptu; proces nie istnieje - znacznik usuniety od razu. Znacznik bez `pid` (starsze wersje,
  nie znaleziono Claude) - regula 12 h jak dotad.
- **AC-SV12** `start` zapisuje `pid` Claude Code w znaczniku (gdy znaleziony); dalej bez wyjscia i zawsze kod 0.
Znaczniki zapisane przed 0.36.1 nie maja PID - znikaja po 12 h bez zmian transkryptu albo recznie (folder
`~/.sdd-kit/sessions`, na Windows `%USERPROFILE%\.sdd-kit\sessions`).
