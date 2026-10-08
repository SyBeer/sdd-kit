# Spec: okno Claude jako czat albo terminal, styl rozmowy z widoku, dyktowanie systemowe (zmiana 0.38.0)

Status: **zatwierdzone** (wlasciciel produktu, 2026-10-08: makieta przyjeta; "zamiast przelaczania BIZ/INZ wystarczy
powiazanie jednego wyboru wersji wygladu (chat/code)"; mikrofon - "od razu uruchomic dyktowanie systemowe";
"zrob tak, zeby mozna bylo te funkcjonalnosc wycofac z kodu").

## Problem
Okno Claude w panelu to terminal - na warsztacie z biznesem odstrasza, a odpowiedzi trzeba pisac na klawiaturze.
Styl rozmowy (0.37.0) ustawia sie osobno, choc w praktyce wynika z tego, kto siedzi przy oknie.

## Cel
Operator wybiera widok okna Claude: **czat** (dymki, pole wiadomosci, styl rozmowy BIZ) albo **terminal** (jak dzis,
styl INZ). Ta sama rozmowa, ten sam folder modulu, te same skille. W czacie odpowiedz mozna podyktowac
dyktowaniem systemu operacyjnego jednym przyciskiem.

Metryka: wywiad `/sdd:interview live` prowadzony w czacie od poczatku do konca bez przelaczania na terminal.

## Jak
- Czat = Claude Code w trybie wymiany wiadomosci: `claude -p --input-format stream-json --output-format stream-json
  --verbose`, z `--continue`, gdy w folderze modulu jest rozmowa. Proces zyje przez cala rozmowe (stdin otwarty).
- Zgody w czacie: `--permission-mode dontAsk` + `--allowedTools`: odczyt (Read, Glob, Grep), zapis w folderze modulu
  (Edit, Write, MultiEdit), Skill, Task, TodoWrite, `Bash(date:*)`, `Bash(ls:*)`, `Bash(git status:*)`, `Bash(git diff:*)`,
  `Bash(git log:*)`. Reszta odrzucana bez pytania - Claude prosi o przelaczenie na terminal.
- Styl: panel dopisuje instrukcje `--append-system-prompt` - czat: styl BIZ, terminal z panelu: styl INZ (niezaleznie od
  `interview_style` w SDD.yaml; to pole dotyczy Claude Code uruchomionego poza panelem).
- Jedna rozmowa na modul: przelaczenie widoku konczy dzialajacy tryb i wznawia rozmowe w drugim (`--continue`).
- Dyktowanie (osobny modul `dictate.js`, wylaczalne i usuwalne - rozdzial "Wycofanie dyktowania"): przycisk 🎙
  ustawia kursor w polu wiadomosci, serwer uruchamia dyktowanie systemu:
  - Windows: Win+H (Pisanie glosowe) przez PowerShell (`keybd_event`),
  - macOS: menu przegladarki Edycja/Edit -> "Rozpocznij dyktowanie…"/"Start Dictation…" przez System Events
    (wymaga zgody Dostepnosc dla programu, ktory uruchamia serwer).
  Blad (brak zgody, brak menu, Constrained Language) -> jednorazowa wskazowka, co wlaczyc.

## Zakres
- Naglowek okna Claude: przelacznik dwoch ikon (czat / `</>` terminal) z kropka przy aktywnej, znacznik stylu
  `BIZ` / `INŻ`, Zakoncz, ×. Wybor widoku zapamietany w przegladarce (domyslnie terminal - jak dotad).
- Widok czatu: kolory panelu (jasny / ciemny jak motyw), wiadomosci usera z prawej (ciemne dymki), Claude z lewej
  (jasne), formatowanie: pogrubienie, kursywa, `kod`, listy, akapity; dzialania Claude jako jedna zwijana linijka
  ("✓ zapisano A.md, B.md" / "odczyt 3 plikow" / "✕ odrzucone: <polecenie> - przelacz na terminal");
  kropki, gdy Claude pracuje; pole wiadomosci (Enter wysyla, Shift+Enter nowa linia); start: "Uruchom" /
  "Wznów rozmowę" jak w terminalu.
- Terminal: bez zmian poza stylem INZ w instrukcji startowej.
- Sesja na modul (AC-T16) obejmuje oba tryby; zmiana modulu przelacza okno na rozmowe nowego modulu.
- Windows: czat nie potrzebuje ConPTY.

## Poza zakresem
- przyciski "Zezwol / Odmow" w czacie dla polecen spoza listy (drugi krok),
- wlasne rozpoznawanie mowy w sdd-kit,
- jednoczesna praca czatu i terminala na jednej rozmowie.

## Kryteria akceptacji
- **AC-CH1** `claudeArgv(env, {resume, args})` i `windowsClaude(env, fsx, {resume, args})` dopisuja argumenty (POSIX - w
  cudzyslowie dla powloki; Windows - `winCommandLine`), `windowsClaude` zwraca tez `argv`.
- **AC-CH2** `chat.js`: `chatArgs({resume, style})` - flagi trybu wymiany wiadomosci, zgody (`dontAsk` + lista),
  `--append-system-prompt` ze stylem; `parseEvent(line)` - z linii stream-json: tekst Claude, dzialania (narzedzie + plik /
  polecenie), odrzucenia, koniec tury, id rozmowy; `ChatSession` - start / send / stop, dziennik (limit), stan `busy`.
- **AC-CH3** Serwer: `GET /api/chat`, `GET /chat-events` (odtworzenie dziennika + zdarzenia), `POST /api/chat/start`,
  `/api/chat/send`, `/api/chat/stop` - tylko Twoj modul i Host lokalny (demo 403); start czatu konczy terminal modulu
  i odwrotnie; terminal z panelu startuje ze stylem INZ.
- **AC-CH4** Okno Claude: przelacznik widoku, znacznik stylu, widok czatu (dymki, zwijane dzialania, pole, Enter/Shift+Enter),
  zapamietany widok; terminal jak dotad.
- **AC-CH5** Skill `interview`: instrukcja z panelu (styl BIZ / INZ) ma pierwszenstwo przed `interview_style`.
- **AC-CH6** Dyktowanie: `dictate.js` - `dictateCommand(platform)` (Windows: PowerShell z Win+H; macOS: osascript z menu
  PL/EN; inne - brak), `POST /api/chat/dictate` (Twoj modul, Host lokalny), `GET /api/chat` -> `dictate: true|false`;
  `SDD_DICTATE=0` wylacza; przycisk 🎙 tylko gdy `dictate`; blad -> wskazowka.
- **AC-CH7** Wycofanie dyktowania opisane i sprawdzone testem: kod dyktowania tylko w `dictate.js` i w blokach oznaczonych
  `DYKTOWANIE (0.38.0)` w `server.js` i `ui.js`.
- **AC-CH8** (reczne) Czat na fv-manager: `/sdd:interview live` w stylu BIZ, zapis plikow, odrzucenie polecenia spoza listy,
  przelaczenie na terminal i z powrotem z ta sama rozmowa; dyktowanie na macOS.

## Weryfikacja
- 2026-10-08, serwer na kopii modulu demo, prawdziwy Claude Code 2.1.293: czat - "nowa rozmowa · styl BIZ", wiadomosc,
  zapis pliku pokazany jako "✓ zapisano test-czat.txt", polecenia `curl` Claude nie uruchomil i odeslal do terminala;
  przelaczenie na terminal - "Wznów rozmowę", styl INZ, czat zakonczony, terminal dziala. Uwaga: tryb wymiany wiadomosci
  pomija pytanie Claude Code o zaufanie do folderu (terminal je zadaje) - czat uruchamia sie tylko w folderze modulu
  wybranego w panelu. Dyktowanie: nie klikane na zywo (macOS wymaga zgody Dostepnosc, Windows - do sprawdzenia u usera).

## Zmiana 0.38.1
- **AC-CH9** Czat: instrukcja - tylko po polsku, bez opisywania swoich krokow, szukanie przez Grep/Read; dozwolony odczyt
  prostymi poleceniami (`cd`, `grep`, `cat`, `head`, `tail`, `wc`); w podsumowaniu dzialan polecenia powloki tylko licznikiem
  ("1 polecenie"), tresc w podpowiedzi; odrzucone polecenie: "pominięto polecenie spoza czatu …" (angielski komunikat
  Claude Code tylko w podpowiedzi), "(</>)" escapowane (wczesniej znikalo jako znacznik HTML).

## Zmiana 0.39.0
- **AC-CH10** Czas rozmowy w czacie: gdy ostatnia wiadomosc Claude pyta o czas (`asksTime`), nad polem gotowe odpowiedzi
  15 min / 30 min / 45 min / 1 h; klik wysyla "Mam … ." i uruchamia zegar w naglowku okna (odliczanie, ostatnie 5 min -
  kolor akcentu, po czasie "czas minął"); czas wpisany recznie ("mam 20 minut", "pół godziny") tez uruchamia zegar
  (`parseMinutes`); klik w zegar - zmiana czasu. Koniec czasu zapisany w przegladarce per modul.
  Sprawdzone 2026-10-08 z udawanym Claude (stream-json): podpowiedzi, "Mam 30 min.", zegar "⏱ 29:59".

## Zmiana 0.39.1 (zgloszenie usera: "na mac nie uruchomil mi sie mikrofon" - dyktowanie macOS wylaczone, serwer z HQAI
uruchamia Homebrew Python.app bez zgody Dostepnosc; user dyktuje Superwhisperem, skrot option+space)
- **AC-CH11** Wlasny skrot programu do dyktowania: `parseKeys` (modyfikatory option/alt, control/ctrl, command/cmd/win, shift
  + litera, cyfra, space, f1-f12, return, tab, esc); macOS `key code` / `keystroke … using {…}` przez System Events, Windows
  `keybd_event`; pusty skrot = dyktowanie systemu jak w 0.38.0.
- **AC-CH12** Brak zgody Dostepnosc -> wskazowka z dokladna sciezka aplikacji `.app`, ktora uruchomila serwer
  (`responsibleApp` z lancucha przodkow), do wklejenia przez Cmd+Shift+G.
- **AC-CH13** Konfiguracja: karta "Dyktowanie w czacie" (ten komputer) - pole skrotu i zapis do `~/.sdd-kit/config.json`
  (`POST /api/chat/dictate-keys`, `dictateKeys`); tylko w blokach DYKTOWANIE (takze w `info.html`).

## Zmiana 0.39.2
- **AC-CH15** Gdy ostatnia wiadomosc Claude pyta o kontynuacje (`asksContinue`: "Kontynuujemy czy konczymy…"), nad polem
  przyciski "Kontynuujmy (+N min)" (N z wiadomosci, `parseMinutes`, domyslnie 10) i "Konczymy na dzis"; klik wysyla
  odpowiedz, "Kontynuujmy" ustawia zegar na N min; wpisane "tak" / "kontynu…" tez; przyciski nie wracaja po odpowiedzi.
  Sprawdzone 2026-10-08 z udawanym Claude: przyciski pod pytaniem, klik -> "Kontynuujmy.", zegar "⏱ 9:59", nastepne pytanie.

## Zmiana 0.40.1 (uwagi usera 2026-10-08: tabela z podsumowania /sdd:domain wyswietlala sie jako tekst z kreskami;
"jezeli spodziewasz sie odpowiedzi - wpisz propozycje w pole")
- **AC-CH16** `chatMd`: tabela markdown (wiersze `| a | b |`, opcjonalna linia `|---|` po naglowku) -> `<table>` w `div.tbl`
  (przewijanie w poziomie), naglowek `th`, formatowanie i escapowanie w komorkach, pierwsza kolumna bez lamania;
  instrukcja czatu nie zabrania juz krotkich tabel.
- **AC-CH17** Propozycja odpowiedzi: instrukcja czatu prosi Claude o ostatnia linie `[[odpowiedz: …]]`, gdy czeka na
  odpowiedz; `replyHint(text)` usuwa znacznik z dymka i zwraca propozycje (zapasowo z "Odpisz „…”"); okno wpisuje ja
  w puste pole raz na wiadomosc, zaznaczona (pisanie albo dyktowanie ja zastepuje, Enter wysyla), nie obok przyciskow
  czasu / kontynuacji.
  Sprawdzone 2026-10-08 z udawanym Claude: tabela 3 kolumny z pogrubieniem i `kod`, znacznik niewidoczny, w polu
  "Tak, zatwierdzam" zaznaczone, Enter wyslal, kolejna wiadomosc bez propozycji.

## Wycofanie dyktowania
1. Usun `plugins/sdd/board/dictate.js` i jego test `board/test/dictate.test.js`.
2. W `server.js`, `ui.js` i `info.html` usun bloki miedzy `// DYKTOWANIE (0.38.0) start` a `// DYKTOWANIE (0.38.0) koniec`.
3. Usun AC-CH6/AC-CH7 z tego pliku i linie o dyktowaniu z CHANGELOG nastepnej wersji.
Bez usuwania kodu: zmienna srodowiskowa `SDD_DICTATE=0` przy starcie sdd-board chowa przycisk i blokuje `/api/chat/dictate`.

## Testy (TDD, przed kodem)
`board/test/chat.test.js` (AC-CH1..AC-CH5), `board/test/dictate.test.js` (AC-CH6, AC-CH7),
`board/test/chat-reply.test.js` (AC-CH16, AC-CH17).
