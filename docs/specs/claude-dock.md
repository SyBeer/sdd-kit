# Spec: Okno Claude Code w aplikacji sdd-kit

Status: zatwierdzony zakres 2026-10-03 (user: "w aplikacji SDD-kit z prawej strony wyswietlic/osadzic okno claude";
wybor z trzech opcji: terminal z Claude Code)
Wersja docelowa: 0.25.0

## Cel
Warsztat i praca nad modulem bez przelaczania okien: tablica albo panel po lewej, Claude Code (ze skillami `/sdd:…`)
po prawej, w folderze biezacego modulu. claude.ai nie da sie osadzic (blokada ramek), wiec okno to prawdziwy terminal
z `claude` uruchomionym przez serwer kitu.

## Zakres
1. Serwer (`board/terminal.js` + `board/pty-helper.py`):
   - Terminal przez modul `pty` z Pythona 3 (stdlib, jest na macOS i Linuksie) - kit dalej bez zaleznosci npm.
     Brak Pythona albo Windows -> `available: false` i komunikat w oknie, reszta aplikacji dziala.
   - Jedna sesja na serwer, katalog roboczy = folder modulu (rodzic `requirements/`) z chwili startu sesji.
     Sesja zyje na serwerze: przejscie Panel <-> Tablica <-> inne zakladki i przeladowanie strony nie przerywa Claude.
   - Polecenie: `$SHELL -l -c 'exec claude'` (powloka logowania daje PATH z Homebrew, bez aliasow z .zshrc);
     zmiana przez `SDD_CLAUDE_CMD`. Zmienne `CLAUDECODE*` usuniete (serwer uruchomiony z Claude Code nie blokuje
     zagniezdzenia), `TERM=xterm-256color`.
   - Bufor ostatnich 512 KB wyjscia - nowe okno odtwarza ekran po podlaczeniu.
   - Koniec serwera konczy sesje (helper konczy `claude`, gdy zamknie sie jego wejscie).
   - API (tylko Twoj modul, demo -> 403): `GET /api/term` stan; `POST /api/term/start {cols, rows}`;
     `POST /api/term/input {data}`; `POST /api/term/resize {cols, rows}`; `POST /api/term/stop`;
     `GET /term-events` (SSE: `{replay, d}` base64, zdarzenie `exit`).
   - Bezpieczenstwo (terminal = wykonanie polecen): zapisy jak dotad tylko z naglowkiem `X-SDD: 1` i Host lokalny;
     strumien i stan tez tylko przy Host lokalnym (ochrona przed DNS rebinding); serwer slucha tylko na 127.0.0.1.
     Sesja startuje wylacznie po kliknieciu "Uruchom Claude" - nigdy sama.
2. Przegladarka (`board/ui.js`, `board/ui.css`; wszystkie strony z gornym paskiem, nie w demo):
   - Przycisk "Claude" w gornym pasku otwiera / zamyka okno z prawej; stan otwarcia i szerokosc pamietane
     (localStorage `sdd-claude`, try/catch), wiec okno zostaje otwarte po przejsciu na inna zakladke.
   - Okno: naglowek "Claude Code · <folder modulu>", przyciski Uruchom / Zakoncz / zamknij okno; terminal xterm.js
     (CDN jsdelivr, ladowany przy pierwszym otwarciu); offline -> komunikat zamiast terminala.
   - Szerokosc przeciagana uchwytem po lewej krawedzi (320 px .. 70% okna, domyslnie 520 px). Strona zweza sie
     o szerokosc okna (tablica i jej panel karteczki przesuwaja sie w lewo, nic nie jest zasloniete).
   - Ponizej 900 px okno zajmuje caly ekran nad strona (przycisk zamyka).
   - Okno zawsze czarne (naglowek i terminal), niezaleznie od motywu strony - wlasne tokeny `.cdock`
     (zmiana 2026-10-03, user: "zeby claude mial czarny styl").
   - Klawisze w terminalu nie uruchamiaja skrotow tablicy (Escape, Cmd+Z, Cmd+D, Cmd+Enter trafiaja do Claude).
   - Sesja zakonczona -> "Sesja zakończona (kod N)" i przycisk Uruchom ponownie. Sesja z innego modulu ->
     naglowek pokazuje jej folder.

## Kryteria akceptacji
- AC-T1: `TermSession` uruchamia polecenie w pty o zadanym rozmiarze (`stty size` -> "30 100"), `write` trafia na
  wejscie, `exit` zwraca kod, `running` false po zakonczeniu.
- AC-T2: `resize(120, 40)` zmienia rozmiar terminalu widziany przez program (`stty size` -> "40 120").
- AC-T3: `buffer()` zwraca dotychczasowe wyjscie; limit obcina od poczatku (zostaja ostatnie bajty).
- AC-T4: `stop()` konczy dlugo dzialajacy program (zdarzenie `exit` < 3 s).
- AC-T5: srodowisko programu bez `CLAUDECODE`, z `TERM=xterm-256color`. Bez zmiennych sesji Claude Code
  (`CLAUDE_CODE_*`, `CLAUDE_PID`, `CLAUDE_EFFORT`), gdy serwer tablicy uruchomila inna sesja Claude - inaczej
  `CLAUDE_CODE_CHILD_SESSION` wylacza zapis transkryptu (brak `/resume`). Inne zmienne (np. `CLAUDE_CONFIG_DIR`) zostaja.
- AC-T6: `claudeArgv(env)`: domyslnie `[SHELL, '-l', '-c', 'exec claude']` (`/bin/zsh` bez SHELL);
  `SDD_CLAUDE_CMD` podmienia polecenie.
- AC-T7 (serwer): start bez `X-SDD` -> 403; `GET /term-events` z obcym Host -> 403; `/demo/api/term/start` -> 403;
  start w module -> `GET /api/term` `{running: true, cwd: <folder modulu>}`, strumien odtwarza wyjscie, stop -> `running: false`.
- AC-T8: `dockWidth(stored, viewport)`: domyslnie 520, ograniczone do 320 .. 70% okna, liczby z localStorage
  nieprawidlowe -> domyslna.
- AC-T10 (zmiana 0.28.2, user: "panel Claude Code konczy sie za ekranem - ucina sie"): `TermSession.resize(cols, rows,
  force)` - ten sam rozmiar nie idzie drugi raz (kazda zmiana przerysowuje ekran Claude), `force` wysyla zawsze; zwraca,
  czy wyslano; `state().size` = biezacy rozmiar. Przegladarka: rozmiar sesji ustawia karta, w ktorej pracujesz
  (aktywacja okna/karty, fokus w terminalu, pisanie - najwyzej co 2 s), po podlaczeniu karty z `force`; liczba wierszy
  przeliczana przy kazdej zmianie wysokosci okna Claude (pojawienie / znikniecie komunikatu nad terminalem,
  ResizeObserver), nie tylko przy zmianie okna przegladarki. Reczne: dwie karty o roznej wysokosci - aktywna karta
  ma caly ekran Claude bez ucinania; komunikat nad terminalem nie wypycha dolu poza okno.
- AC-T11 (zmiana 0.28.3, user: "kazdy restart serwera czysci historie rozmowy z Claude"): `claudeArgv(env, {resume:true})`
  -> polecenie z `--continue` (wznawia ostatnia rozmowe w folderze modulu; takze z `SDD_CLAUDE_CMD`).
  `historyDir(cwd, env)` = `<CLAUDE_CONFIG_DIR albo ~/.claude>/projects/<cwd, kazdy znak spoza [A-Za-z0-9] -> '-'>`;
  `hasHistory(cwd, env)` - jest tam co najmniej jeden plik `.jsonl`.
- AC-T12 (serwer): `GET /api/term` -> `canResume` (rozmowa w folderze modulu jest); `POST /api/term/start {resume:true}`
  uruchamia z `--continue`. Przegladarka: przy `canResume` i braku sesji przyciski "Wznów rozmowę" i "Nowa rozmowa",
  bez - "Uruchom Claude". Reczne: rozmowa, restart serwera, "Wznów rozmowę" -> ta sama rozmowa z historia.
- AC-T13 (0.28.10, zrzut usera: ostatnia linia Claude ucieta w polowie): kontener terminala (`.cd-term`) bez
  odstepow wewnetrznych - strony maja `box-sizing: border-box`, a dopasowanie xterm (FitAddon) liczy wysokosc
  kontenera razem z odstepami (12 px za duzo -> czasem jeden wiersz za duzo). Odstepy na elemencie `.xterm`
  (FitAddon je odejmuje). Przeliczenie wierszy takze po zaladowaniu czcionek (`document.fonts`). Reczne/pomiar:
  wiersze x wysokosc wiersza <= wysokosc terminala dla wielu wysokosci okna.
- AC-T9 (reczne): na Tablicy i w Panelu przycisk Claude otwiera okno, Uruchom startuje Claude Code w folderze modulu,
  /sdd:… dziala; przejscie na druga zakladke zostawia otwarte okno i te sama sesje; Escape w terminalu nie zamyka
  panelu karteczki; tablica i panel karteczki widoczne obok okna; okno czarne w jasnym i ciemnym motywie; 375 px bez
  poziomego przewijania.

## Windows 10 / 11 (zmiana 0.33.0)

Status: zakres 2026-10-05 (user: "przygotuj SDD-Kit, zeby terminal dzialal na Windows 11 ... wiele rzeczy dziala
domyslnie zle i trzeba to madrze sprawdzic"; wybor: PowerShell + C#, kit bez zaleznosci npm).

### Zakres
1. Pseudokonsola Windows (ConPTY, Windows 10 1809 = build 17763 i nowsze) przez pomocnika `board/conpty.cs`
   (C# 5 - kompilator Windows PowerShell 5.1), ladowanego przez `powershell.exe -NoProfile -NonInteractive
   -EncodedCommand` (zasady wykonywania skryptow nie dotycza `-EncodedCommand`; plik `.cs` to nie skrypt).
   Python na Windows niepotrzebny.
2. Protokol pomocnika (zamiast fd 3, ktorego PowerShell nie odczyta): wejscie = ramki `[typ 1 B][dlugosc 4 B BE][dane]`;
   typ `d` = bajty do terminala, `r` = "kolumny wiersze". Wyjscie terminala -> surowe bajty na stdout
   (strumien binarny, bez przekodowania konsoli). Bledy pomocnika -> stderr w UTF-8 (nie w stronie kodowej 852),
   kod 127 (nie da sie uruchomic polecenia), 126 (kompilacja C# albo pseudokonsola niedostepna), 125 (Constrained
   Language Mode / AppLocker - komunikat dopisuje serwer). Kazdy wyjatek PowerShell lapany i wypisany tekstem
   (nieobsluzony trafilby na stderr jako `#< CLIXML` - smieci w terminalu; znalezione na probie pod pwsh).
3. Pulapki Windows, ktore pomocnik i serwer obsluguja:
   - drzewo procesow: `claude` i jego procesy potomne w obiekcie zadania (Job Object, KILL_ON_JOB_CLOSE) -
     zabicie pomocnika (Zakoncz, koniec serwera) konczy cale drzewo, bez sierot;
   - stdio pomocnika jest przekierowane, wiec proces w pseudokonsoli dostaje puste uchwyty standardowe
     (STARTF_USESTDHANDLES) - inaczej pisalby do rury pomocnika zamiast do terminala;
   - zamkniete wejscie pomocnika (koniec serwera) -> ClosePseudoConsole, do 3 s na zakonczenie, potem zakonczenie
     zadania; wyjscie czytane do konca przed zamknieciem (inaczej ClosePseudoConsole moze zawisnac);
   - bez migajacego okna konsoli (`windowsHide`);
   - polecenie `claude`: kolejno `SDD_CLAUDE_CMD`; `claude.exe` w PATH albo `%USERPROFILE%\.local\bin\claude.exe`
     (instalator natywny); `claude.cmd` z npm -> `node <cli.js>` bezposrednio, gdy obok jest
     `node_modules/@anthropic-ai/claude-code/cli.js` (bez pliku wsadowego: Ctrl+C nie pyta "Terminate batch job",
     `.ps1` z npm i zasady Restricted nie maja znaczenia); inaczej `cmd.exe /d /s /c "claude"`;
   - argumenty w linii polecen cytowane wg regul CommandLineToArgvW (spacje, cudzyslowy, ukosniki przed cudzyslowem);
   - polskie znaki i emoji w obie strony bez zmian (UTF-8 przez ConPTY).
4. Serwer: `available()` zwraca tez powod niedostepnosci (`reason`): Windows starszy niz 17763, brak
   `powershell.exe`, brak Pythona na macOS/Linuksie. `GET /api/term`: `platform`, `windowsBuild`, `reason`.
   Komunikat w oknie i blad 501 biora `reason`.
5. Przegladarka: na Windows xterm.js z `windowsPty: {backend: 'conpty', buildNumber}` (ConPTY sam przerysowuje
   zawiniete linie - bez tego zmiana szerokosci psuje ekran); czcionka z Cascadia Mono / Consolas;
   poza macOS Ctrl+C przy zaznaczonym tekscie kopiuje (bez zaznaczenia idzie do Claude jako przerwanie),
   Ctrl+V wkleja.
6. Testy na prawdziwym Windows w GitHub Actions (`windows-latest` i `windows-11-arm`): testy pomocnika
   na programach Node (bez atrap) i start prawdziwego `claude` z npm w pseudokonsoli.

### Kryteria akceptacji
- AC-W1: na Windows program w pseudokonsoli widzi terminal (`process.stdout.isTTY` true) o zadanym rozmiarze
  (`columns`/`rows` = 100/30); wejscie trafia do programu; kod wyjscia (3) wraca; `running` false po zakonczeniu.
- AC-W2: `resize(120, 40)` - program dostaje zdarzenie zmiany rozmiaru i widzi 120x40.
- AC-W3: "zażółć gęślą jaźń 🙂" wpisane do terminala wraca z programu bajt w bajt (UTF-8).
- AC-W4: `stop()` konczy program i jego proces potomny (wnuk pomocnika) w < 3 s - zaden nie zostaje.
- AC-W5: zamkniete wejscie pomocnika (koniec serwera) konczy program w < 5 s.
- AC-W6: Ctrl+C (`\x03`) trafia do programu jako przerwanie (program bez trybu raw konczy sie po SIGINT).
- AC-W7: `winQuote` / `winCommandLine`: argumenty ze spacjami, cudzyslowami i ukosnikami przechodza przez
  CommandLineToArgvW bez zmian (sprawdzane programem Node w pseudokonsoli: `process.argv`).
- AC-W8: `frame(typ, dane)` - naglowek 5 B (typ + dlugosc big-endian) + dane; wejscie i rozmiar nie mieszaja sie
  przy duzym wklejeniu (100 KB wejscia, potem resize).
- AC-W9: `windowsClaude(env, fs)`: kolejnosc SDD_CLAUDE_CMD -> claude.exe (PATH, potem ~/.local/bin) ->
  claude.cmd z cli.js obok (node + cli.js) -> `cmd.exe /d /s /c claude`; `--continue` doklejane w kazdym wariancie.
- AC-W10: `available()` na Windows: build < 17763 -> false z powodem; brak powershell.exe -> false z powodem;
  inaczej true. Na macOS/Linux bez zmian (Python). Pomocnik bez zasad wykonywania: `-EncodedCommand`, nie `-File`.
- AC-W11: `GET /api/term` zwraca `platform`, `windowsBuild` (Windows) i `reason`; `ui.termOptions(state)` daje
  `windowsPty` tylko na Windows; `ui.termKey(event, hasSelection, isMac)` - `'copy'` dla Ctrl+C z zaznaczeniem,
  `'paste'` dla Ctrl+V, tylko poza macOS; inaczej `null` (klawisz idzie do Claude).
- AC-W12 (Actions): prawdziwy `claude` z npm startuje w pseudokonsoli - `--version` zwraca numer wersji, a sam
  `claude` rysuje ekran (tekst "Claude Code" albo ekran logowania) w < 60 s; Zakoncz nie zostawia procesow `claude`.
- AC-W13 (reczne, Windows 11 usera): Tablica -> Claude -> Uruchom: Claude Code dziala, /sdd:status odpowiada,
  polskie znaki w odpowiedziach, zmiana szerokosci okna nie psuje ekranu, Ctrl+C przy zaznaczeniu kopiuje,
  Esc przerywa Claude, Zakoncz i zamkniecie serwera nie zostawiaja `claude.exe`/`node.exe` w Menedzerze zadan,
  Wznów rozmowę po restarcie serwera.
