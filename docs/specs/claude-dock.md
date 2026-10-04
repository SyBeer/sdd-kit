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
