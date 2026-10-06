# Changelog

## [0.35.1] - 2026-10-06
- Nowa wersja sdd-kit: zielona strzalka w dol tuz za numerem wersji w pasku stanu (zamiast "↑ X" w naglowku) - klik
  otwiera okienko aktualizacji. W Konfiguracji, w karcie Serwer: ta sama strzalka, "jest nowa wersja X", link do
  opisu zmian i "Aktualizuj…" (docs/specs/update.md AC-UP9).

## [0.35.0] - 2026-10-06
- Tablica: eksport do PDF jako jedna duza strona (docs/specs/board-pdf.md, AC-BP1..AC-BP6). Przycisk "PDF" w pasku
  narzedzi otwiera nowe okno z cala tablica w ukladzie wydruku i okno drukowania - jedna strona o rozmiarze tablicy
  (nie kartki A4), wybierasz "Zapisz jako PDF". W PDF: nazwa modulu, tytul tablicy, data eksportu, legenda typow i stanow plikow, wszystkie
  procesy i kolumny w skali 100%, pelny tekst karteczek i odpowiedzi; bez przyciskow, paskow i panelu. Zawsze jasne
  kolory; okno z praca zostaje bez zmian (motyw, powiekszenie, miejsce, edycja). Dziala tez w demo;
  na telefonie przycisku nie ma. Docelowo Chrome / Edge (Safari moze dzielic na kartki).
- Karteczki "nie wiemy" znow wyraznie czerwone: `#f25a48` w jasnym motywie, `#e8503f` w ciemnym (od 0.33.0 byly
  bladorozowe `#ff9d8d`). Tekst na karteczce dalej ciemny (kontrast 5,2:1 / 4,8:1).

## [0.34.2] - 2026-10-06
- Okno Claude idzie za modulem (docs/specs/claude-dock.md AC-T16): kazdy modul ma wlasna sesje Claude Code w swoim
  folderze. Po zmianie modulu okno od razu pokazuje sesje nowego modulu (albo "Uruchom Claude" w jego folderze);
  sesja poprzedniego dziala dalej w tle i wraca po powrocie do niego. Okno mowi, w ktorych innych modulach Claude
  dziala. Wczesniej jedna sesja na serwer zostawala w module, w ktorym ja uruchomiono.
- Nowy modul z Panelu: wybor rodzaju monolit / serwis w oknie "Nowy modul" (domyslnie monolit), zapisany w SDD.yaml
  i w CHANGELOG modulu (docs/specs/systems.md AC-SY31). Wczesniej modul z panelu byl zawsze monolitem, a zmiana
  wymagala wejscia w Konfiguracje.

## [0.34.1] - 2026-10-06
- Poprawka: po otwarciu okna Claude panel karteczki na Tablicy przesuwal sie w lewo na tablice (zgloszenie z Chrome
  na Windows; dotyczylo kazdej przegladarki). Pozostalosc z czasow, gdy panel byl przyklejony do prawej krawedzi
  ekranu - od 0.33.0 stoi w ukladzie tablicy, wiec okno Claude go nie przesuwa (docs/specs/claude-dock.md AC-T14).
- Poprawka (Windows): wolne przelaczanie zakladek pod http://localhost:8012. Windows laczy "localhost" najpierw przez
  IPv6 (::1), a serwer sluchal tylko na 127.0.0.1 - kazde nowe polaczenie czekalo ok. 2 s na odmowe. Serwer slucha teraz
  takze na ::1, nadal tylko lokalnie (AC-T15). Po aktualizacji trzeba zrestartowac sdd-board.
- Wersja sdd-kit wraca na kazda strone - na lewym brzegu czarnego paska stanu, razem z ostrzezeniem o nieaktualnym
  serwerze, pluginie albo sesji Claude (docs/specs/ui-frame.md AC-F9). Z naglowka znika.

## [0.34.0] - 2026-10-06
- Nowy wyglad calego panelu wg `design_handoff_sdd_kit_ui` (spec: docs/specs/ui-frame.md, AC-F1..AC-F8) - ten sam
  styl co Tablica od 0.33.0. Zmienia sie wyglad i uklad; logika, zapis plikow, demo, okno Claude, aktualizacje
  i zachowanie na telefonie bez zmian.
  - wspolna rama na kazdej stronie: pasek stanu (polaczenie; "3 z 6 etapow gotowych · poziom · rodzaj"; po prawej
    "nic nie blokuje dev" / "brak pytan u biznesu" albo liczby) i naglowek 36 px (logo, `sdd-kit / modul ▾`, krotkie
    zakladki, motyw ☾/☀, ⚙ Konfiguracja, Claude); pasek i naglowek stoja, tresc sie przewija;
  - Konfiguracja nie jest juz zakladka - ikona ⚙ w naglowku; wersja sdd-kit i "Przyklad gotowego modulu" w
    Konfiguracji (karta Serwer) i w podpowiedzi logo, w pasku tylko ostrzezenie o nieaktualnej wersji;
  - tokeny jasnego i ciemnego motywu oraz czcionki IBM Plex wspolne w `ui.css`;
  - Panel: karta "Aktualny krok" z polem komendy, pasek szesciu etapow z kolorem stanu, lista etapow jako akordeon,
    liczniki jako przyciski z lista pod spodem (ID · tresc · znacznik, "do" / "skad", ×), karta boczna z blokerami,
    pytaniami u biznesu i ostatnimi zmianami;
  - Jak to dziala: spis tresci z boku z podswietlaniem biezacej sekcji, numerowane karty, tabela komend z wariantami
    jako sufiksami, uklady sekcji z makiety (zrodla, identyfikatory i statusy, monolit / serwis, typy karteczek,
    Redmine); teksty bez zmian;
  - Konfiguracja: wiersze z podpowiedzia pod nazwa, Backlog i Rodzaj modulu jako przelaczniki, blok Redmine z
    kropka stanu klucza, role z przelacznikami uprawnien (rola uzyta w plikach - dopisek i nieaktywne "Usun"),
    przyklejony pasek zapisu ze stanem "niezapisane zmiany / zapisano / bez zmian";
  - Modul i dialogi Panelu w nowym stylu kart, pol i przyciskow.
- `/api/config`: nowe pole tylko do odczytu `sdd.usedRoles` - role, ktorych nazwa stoi w plikach (ta sama regula co
  przy zapisie).

## [0.33.0] - 2026-10-06
- Tablica warsztatowa - odchudzony interfejs wg `design_handoff_tablica_warsztatowa` (spec: docs/specs/board-ui.md,
  AC-B54..AC-B58). Zmienia sie tylko wyglad, logika tablicy bez zmian; Panel, Modul, Jak to dziala, Konfiguracja
  bez zmian.
  - pasek stanu (26 px): polaczenie, "Pliki:" z czterema stanami i pelnym opisem, odpowiedzi czekajace na zapis
    (klik kopiuje `/sdd:board sync`), zaznaczona karteczka albo liczby;
  - naglowek (36 px) zamiast paska zakladek i "Wymagania do modulu": logo, `sdd-kit / modul ▾`, krotkie zakladki,
    grupa pytan (liczba, "+N z pliku", Przeglad, Ukryj/Pokaz), motyw jednym przyciskiem ☾/☀, Claude; wersja w
    podpowiedzi logo, w pasku tylko ostrzezenie;
  - pasek narzedzi (34 px): + Karteczka, + Proces, Cofnij / Ponow tekstem, powiekszenie z wartoscia = Dopasuj;
  - tablica od krawedzi do krawedzi, kropki co 14 px, linijka numerow kolumn, nazwa procesu 132 px;
  - karteczka 128 px bez obrotu, meta w jednej linii (ID · autor · data), znaczek stanu w prawym gornym rogu
    takze dla "tylko na tablicy", etykieta "ODPOWIEDZ CZEKA" zamiast obrysu;
  - panel karteczki 300 px: typy jako zwarta lista z opisem i klawiszem, pola z malymi etykietami, przyciski
    Zapisz / Anuluj / Duplikuj / ↑ ↓ / Usun, status na dole; bez zaznaczenia - lista skrotow;
  - klawisze 1-7 ustawiaja typ otwartej karteczki (poza polem tekstowym, nie w demo);
  - nowe, cieplejsze tokeny jasnego i ciemnego motywu; `--hot` = kolor karteczki, `--hot-ink` = czerwony tekst;
  - czcionki IBM Plex Sans i Mono lokalnie w `board/fonts/` (OFL), `/fonts/*.woff2` z serwera - dzialaja offline.
- Poprawka: znaczek stanu "tylko na tablicy" (klasa `board`) nie dziedziczy juz stylu kontenera tablicy.
- Okno Claude Code na Windows 10 / 11 (spec: docs/specs/claude-dock.md, czesc "Windows 10 / 11"): pseudokonsola
  ConPTY przez pomocnika w C# (`board/conpty.cs`) kompilowanego przez Windows PowerShell 5.1 - bez Pythona i bez
  zaleznosci npm. Pomocnik przez `-EncodedCommand` (zasady wykonywania skryptow go nie dotycza), bez migajacego
  okna; `claude` i jego procesy w obiekcie zadania - Zakoncz i koniec serwera nie zostawiaja sierot; polskie znaki
  i emoji w obie strony; `claude` wybierany kolejno: `SDD_CLAUDE_CMD`, `claude.exe` (takze `~/.local/bin`),
  cel shimu npm bezposrednio (bez pliku wsadowego i `.ps1`), `cmd /c claude`. Czytelne komunikaty, gdy terminal
  niedostepny (Windows starszy niz 1809, brak PowerShell, Constrained Language / AppLocker).
- Przegladarka: xterm.js w trybie ConPTY (`windowsPty`) - zmiana szerokosci okna nie psuje ekranu; poza macOS
  Ctrl+C z zaznaczeniem kopiuje, Ctrl+V wkleja; czcionka Cascadia Mono / Consolas; nazwa folderu modulu
  z windowsowej sciezki. `GET /api/term`: `platform`, `windowsBuild`, `reason`.
- Testy: `test/terminal-windows.test.js` (AC-W1..AC-W12) i workflow `terminal-windows` na `windows-latest`
  i `windows-11-arm` - prawdziwy ConPTY i prawdziwy `claude` z npm, takze z TEMP i folderem ze spacja i polskimi znakami.

## [0.32.0] - 2026-10-05
- Wersja skilli w sesjach Claude Code (spec: docs/specs/session-version.md): plugin ma hooki `SessionStart`
  i `SessionEnd` (`hooks/hooks.json`, `board/session-mark.js`) - sesja zapisuje w `~/.sdd-kit/sessions/` wersje
  skilli, ktora zaladowala. Panel: gdy otwarta sesja ma inna wersje niz zainstalowany plugin, przy wersji
  w gornym pasku "· sesja Claude nieaktualna" z podpowiedzia, ktora sesje zamknac. Hook nic nie wypisuje
  i nigdy nie psuje startu sesji. Dziala dla sesji otwartych po instalacji tej wersji.

## [0.31.0] - 2026-10-05
- Decyzje `D` tylko ze slow biznesu `[Biz]` (spec: docs/specs/decisions.md). Wniosek z kodu, aplikacji albo
  dokumentu to zalozenie `A` `niepotwierdzone`, nie decyzja - zgoda prowadzacego nie zastepuje zrodla.
  `/sdd:validate`: nowa kontrola 16 BLOCK "D bez zrodla [Biz]" (numery 1-15 bez zmian). Reguly w CLAUDE.md
  projektu, szablonie DECISIONS i skillach interview / intake / domain; przewodnik "Jak to dziala".
- `/sdd:interview`: potwierdzenie hurtowe (jedna lista "zaznacz, co sie nie zgadza") i akceptacja as-built
  (jedna decyzja biznesu dla istniejacej aplikacji, z wyjatkami) - zeby blokada nie zasypala biznesu pytaniami.
- Demo: raport walidacji z wierszem 16 (PASS).
- Systemy i integracje (spec: docs/specs/systems.md): nowy plik `02-domain/SYSTEMS.md` - rejestr systemow `S-xxx`
  (wlasciciel integracji, master danych, kierunek i czestotliwosc wymiany, zachowanie przy awarii, krytycznosc),
  mapa systemow (mermaid `flowchart`) i proces systemowy (`sequenceDiagram` z galezia awarii) dla integracji krytycznych.
  `/sdd:domain` buduje rejestr i sprawdza jeden master na dane; `/sdd:interview` - regula "luka integracji"
  (zachowanie przy awarii zawsze osobnym pytaniem, poza akceptacja as-built); `/sdd:validate` - kontrole 17 BLOCK
  (dwa mastery), 18 WARN (bez wlasciciela / zachowania przy awarii), 19 WARN (krytyczna bez procesu systemowego),
  brak pliku = INFO; `/sdd:handover` - zadanie integracyjne z wierszem systemu i osobnym kryterium awarii.
- Panel: liczba i lista systemow przy etapie Domain, kafelki systemow i integracji krytycznych w zakladce Modul,
  sekcja "Systemy i integracje" w "Jak to dziala". Demo: rejestr 4 systemow z procesem kursu NBP.
- Poprawka: wiersz tabeli ze strzalka `<->` albo z `<encja>` w srodku zdania nie jest juz brany za wiersz-wzor
  szablonu - wzor to tylko komorka w calosci `<opis>` (znalezione przy weryfikacji na fv-manager).
- Rodzaj modulu i kontrakt jako wymaganie (spec: docs/specs/systems.md czesc B): `kind: monolith | service`
  w SDD.yaml (ustawia czlowiek - `/sdd:init` pyta, Konfiguracja w panelu; brak pola = monolith, odcisk zmienia
  tylko `service`). Kontrakt to `R` rodzaju kontrakt (`Rodzaj: kontrakt - wejscie|wyjscie`, `System: S-xxx`) z AC
  jezykiem biznesu; SYSTEMS.md: kolumna `Wymagania` i rola `konsument`. `/sdd:validate` kontrola 20: integracja
  bez R kontraktu - WARN przy monolicie, BLOCK przy serwisie (takze serwis bez kontraktu wyjscia); kontrakt dotyczy
  systemow zewnetrznych i wymiany plikow - wpis reczny (faktura, ceny) wskazuje zwykle R formularza.
  `/sdd:handover`: kolumna `Rodzaj` w TRACEABILITY; w serwisie `redmine.js status <id> done` odmawia zadaniu
  z kontraktem bez "test kontraktowy: ..." w notce. Panel: rodzaj w naglowku, w Module i w Konfiguracji.

## [0.30.0] - 2026-10-04
Wydanie zbiorcze na GitHub - zawiera wszystko od 0.28.1 (wersje 0.28.2..0.28.13 byly tylko na gitea; szczegoly
w CHANGELOG.md). W skrocie:
- Redmine w `/sdd:handover`: zadania ze specyfikacji prosto do backlogu (opis z tabela kryteriow, pole "Kryteria
  akceptacji", zalaczniki, zaleznosci, ponowne przekazanie bez dublowania), status zadania przez agenta
  (`/sdd:handover status`), link do srodowiska UAT, zgodnosc z wtyczka UAT (github.com/SyBeer/redmine-UAT-plugin).
- Klucze API w `~/.sdd-kit/.env`, ustawiane w panelu (Konfiguracja); Claude tego pliku nie czyta.
- Okno Claude Code: nie ucina dolu ekranu, wznawia rozmowe po restarcie serwera.
- Panel: Domain "w toku", gdy walidacja znalazla pojecia spoza slownika; ikona aplikacji; tytul karty "SDD: <modul>";
  spis tresci i sekcja o Redmine w "Jak to dziala".

- Redmine - link do srodowiska UAT z SDD.yaml (prosba usera: "dodaj link UAT do SDD.yaml w sdd-kit"): nowy klucz
  `redmine_uat_link` (opcjonalnie `redmine_uat_field`, domyslnie pole "Link do środowiska UAT"). /sdd:handover wpisuje
  link w kazde zakladane i aktualizowane zadanie; `check` pokazuje pole i ostrzega, gdy projekt ma pole z linkiem UAT,
  a klucza brak. Powod: pole stalo sie obowiazkowe w przeplywie Redmine i zadania bez niego nie przechodzily dalej.
  Spec: `docs/specs/redmine.md` AC-RM21.
- Redmine - wtyczka UAT (pytanie usera, czy jest czescia sdd-kit): nie, to osobny projekt `redmine-UAT-plugin`
  (wtyczka `uat_tests` w samym Redmine). Jak to dziala, sekcja Integracja z Redmine: punkt o wtyczce - przypadki
  "Test UAT" z pola "Kryteria akceptacji" przy "Gotowy do UAT", blokada akceptacji, adres repo. Zgodnosc formatu
  sprawdzona parserem wtyczki 0.5.0: jedno kryterium = jeden przypadek, tytul `AC-xxx-n: <Then>`. Skill handover:
  bez punktow listy na poczatku linii w kryteriach. Spec: `docs/specs/redmine.md` AC-RM20.

## [0.28.13] - 2026-10-04
- Panel: Domain nie jest juz "gotowe", gdy walidacja znalazla pojecia uzywane w PRD, ktorych nie ma w slowniku (pytanie
  usera: hasla niepotwierdzone, a Domain GOTOWE). Panel liczyl tylko wiersze GLOSSARY, a pojecia spoza slownika nie sa
  w nim ani robocze, ani zatwierdzone. Teraz czyta wiersz kontroli 9 z aktualnego raportu walidacji: WARN -> Domain
  "w toku", licznik "spoza słownika" z lista pojec, krok `/sdd:domain` (przed zatwierdzaniem). Po dopisaniu hasel raport
  staje sie nieaktualny i Domain wraca do liczenia hasel (`/sdd:domain zatwierdz`). Skill validate: format wiersza 9
  (numer `9`, pojecia w „…”). Demo: hasla "Kartoteka" i "Sredni kurs NBP" dopisane - raport demo mial ten sam WARN.
  Spec: `docs/specs/progress-ui.md` AC-74..AC-77.

## [0.28.12] - 2026-10-04
- Tytul karty przegladarki z nazwa modulu (prosba usera): "SDD: fv-manager" na kazdej stronie (Panel, Tablica, Moduł,
  Jak to działa, Konfiguracja); demo - "SDD: Demo"; bez modulu - "SDD". Ustawiany przy kazdej zmianie modulu, takze
  z innej karty; panel nie nadpisuje go juz nazwa projektu. Spec: `docs/specs/ui-switch.md` AC-U19.

## [0.28.11] - 2026-10-04
- Ikona aplikacji (prosba usera: "zeby w przegladarce latwo bylo ja wyluskac"): ciemny kwadrat z czterema
  karteczkami w kolorach tablicy. `favicon.svg` (zrodlo), `favicon.png` 32x32 (Safari), `apple-touch-icon.png` 180x180,
  `/favicon.ico` (PNG); linki w `<head>` panelu, tablicy i zakladek info (takze demo). PNG generuje
  `scripts/make-icons.js` (bez zaleznosci). Spec: `docs/specs/ui-switch.md` AC-U18.

## [0.28.10] - 2026-10-04
- Okno Claude: ostatnia linia nie jest juz ucieta (zrzut usera, Safari). Przyczyna: strony maja `box-sizing:
  border-box`, a dopasowanie xterm liczylo wysokosc kontenera razem z odstepami (12 px za duzo) - zaleznie od
  wysokosci okna raz wychodzil wiersz za duzo. Odstepy przeniesione na sam terminal; przeliczenie wierszy takze po
  zaladowaniu czcionek. Pomiar: 16 wysokosci okna, terminal nigdy nie wystaje (AC-T13).

## [0.28.9] - 2026-10-04
- Jak to dziala: karta "Na tej stronie" pod "Od czego zacząć" - linki do kazdej karty (Proces, Komendy, Folder
  requirements/, sekcje przewodnika, w tym Integracja z Redmine); karty z kotwicami `SddUI.slug(tytul)` (AC-C25).

## [0.28.8] - 2026-10-04
- Redmine - status zadania przez agenta (prosba usera): `/sdd:handover status #<id> start|done [opis]` ->
  `redmine.js status` / `comment`. start = `redmine_status_start` (domyslnie "W realizacji" / In Progress), done =
  `redmine_status_done` (domyslnie "Code review" / Resolved); statusy zamykajace odrzucane (UAT i zamkniecie robi
  czlowiek); po zmianie skrypt czyta zadanie i sprawdza, czy Redmine przyjal przejscie. Kazdy komentarz agenta i opis
  zadania z handover konczy sie dopiskiem "_Wygenerowane przez AI [Claude Code]_" (bez dublowania). Szablon CLAUDE.md:
  agent buduje z `tasks.md`, status ustawia przez skill. Przewodnik w panelu: nowy wariant. Spec: AC-RM15..AC-RM17.
- Sprawdzone na Redmine usera (zadanie testowe #16): Nowy -> W realizacji -> Code review z komentarzami AI, odmowa
  "Zamknięty". Poprawki z testu: pole "Kryteria akceptacji" jest tam wymagane przy zmianie statusu - komunikat 422
  wyjasnia, co zrobic; `check` podaje pola wlasne projektu (Redmine 4.2+ `include=issue_custom_fields`, takze pusty
  projekt) i ostrzega, gdy pole na kryteria nie jest ustawione w `redmine_ac_field` (AC-RM18, AC-RM19).
- Jak to dziala: nowa sekcja "Integracja z Redmine" - ustawienie, klucz API, przekazanie, ponowne przekazanie, pliki
  lokalne, agent budujacy (status start/done), typowe bledy (AC-C24).

## [0.28.7] - 2026-10-04
- Konfiguracja Redmine (zgloszenie usera: blad przy wklejonym adresie projektu, kluczyk aplikacji Hasla w polu projektu):
  wklejony adres projektu (`http://.../projects/pilotaz-dev`) w polu adresu albo projektu panel rozdziela sam na adres
  serwera i identyfikator (AC-RM14); pole klucza bez maski - kazda maska (pole hasla, `-webkit-text-security`) wlaczala
  w Safari logowanie z aplikacji Hasla; klucz widac tylko przy wklejaniu, po zapisie pole jest puste. Pola Redmine
  z `autocomplete="off"` i znacznikami dla menedzerow hasel.

## [0.28.6] - 2026-10-04
- Konfiguracja, klucz API Redmine (zgloszenie usera: "uruchamia sie Passwords, pyta o login; nie zapisaly sie dane
  adresu Redmine"): (1) jeden przycisk "Zapisz ustawienia modulu" zapisuje backlog, adres, projekt i klucz naraz -
  wczesniej "Zapisz klucz" przerysowywal zakladke i gubil niezapisane pola (backlog wracal do poprzedniego, adres
  znikal); (2) pole klucza to tekst z kropkami (CSS), nie pole hasla - przegladarka i aplikacja Hasla nie proponuja
  zapisania loginu. Przycisk "Usuń klucz" zostaje. Spec: `docs/specs/secrets.md` AC-S6.

## [0.28.5] - 2026-10-04
- Klucze API w `~/.sdd-kit/.env` - tak samo na macOS i Windows (uwaga usera: "konfiguracja klucza w pliku env;
  Claude go nie czyta, aplikacja tak"). Panel, Konfiguracja: pole "Klucz API Redmine" (Zapisz / Usun) - serwer
  zapisuje klucz w pliku (600), a pokazuje tylko, skad jest (plik / zmienna / Pek kluczy / brak), nigdy wartosc.
  `redmine.js`: zmienna > plik .env > Pek kluczy macOS. Zasada dla Claude w skillu handover i w szablonie CLAUDE.md:
  nie otwierac `~/.sdd-kit/.env` (umowa, nie blokada systemowa). Skill handover: sekcja Redmine przeniesiona za
  kroki ogolne (wczesniej rozcinala liste krokow). Spec: `docs/specs/secrets.md` (AC-S1..AC-S6).
- `.gitignore` kitu: `/.env`, `/config.json`, `/bin/` - przy instalacji jedna komenda `~/.sdd-kit` to klon repo,
  a te pliki kitu robily z niego "niezapisane zmiany" i blokowaly aktualizacje z panelu.

## [0.28.4] - 2026-10-04
- `/sdd:handover` do Redmine (`backlog: redmine`). Skrypt `board/redmine.js` (REST API, bez zaleznosci): `check` -
  projekt i trackery; `push <zadania.json>` - nowe zadania (POST), juz przekazane aktualizuje (PUT, ponowny handover
  nie dubluje), zaleznosci z plan.md jako relacje "poprzedza", `--dry-run` bez wysylania; blad w polowie zwraca
  zadania juz zalozone. Skill: plik zadan `04-validation/redmine-YYYY-MM-DD.json` (temat `[R-xxx]`, opis z AC),
  lista do zatwierdzenia przed zapisem, numery `#id` do TRACEABILITY.md, zadan usunietych z wymagan nie zamyka sam.
  Konfiguracja: `redmine_url`, `redmine_project`, opcjonalnie `redmine_tracker` w SDD.yaml - adres i projekt takze
  w panelu (Konfiguracja, pola przy wyborze redmine). Klucz API nigdy w plikach: `REDMINE_API_KEY` albo Pek kluczy
  macOS (`redmine-api-key`); bez klucza skrypt podaje, jak go ustawic. Spec: `docs/specs/redmine.md` (AC-RM1..AC-RM9);
  testy `test/redmine.test.js` na lokalnym serwerze udajacym REST API Redmine.
- Sprawdzone na prawdziwym Redmine (192.168.1.4:3001, projekt "Pilotaż DEV", zadania testowe #13-#15): zalozenie,
  relacje "poprzedza", ponowny handover aktualizuje te same zadania (bez duplikatow i bez podwojnych relacji).
  Poprawki z testu: domyslny tracker to funkcjonalnosc/zadanie, nie pierwszy z listy ("Błąd") - AC-RM10; w opisie
  pusta linia przed lista kryteriow i po niej (Textile).
- Redmine: opis w Markdown (domyslnie; `redmine_format: textile` dla starszych instalacji) - kryteria jako tabela
  Kryterium | Given | When | Then, polskie znaki, obrazy w opisie. Zalaczniki: `attachments` w pliku zadan (np. zrzuty
  ekranu z `00-intake/`) - skrypt wysyla je przez `/uploads.json`, przy ponownym przekazaniu nie dubluje; sciezki tylko
  z folderu requirements. Sprawdzone na Redmine usera (#13-#15: Markdown renderuje tabele i obrazy, Textile nie).
  Spec: AC-RM11, AC-RM12.
- Redmine: kryteria akceptacji takze w polu wlasnym projektu (`redmine_ac_field` w SDD.yaml - nazwa albo numer pola).
  Numer pola z nazwy bez uprawnien admina (z pol `custom_fields` istniejacych zadan projektu). Skill wypelnia pole
  w ukladzie zespolu (`**AC-xxx-n**` + `**Given/When/Then**` w osobnych liniach). Sprawdzone na Redmine usera
  (pole "Kryteria akceptacji", id 1, zadanie testowe #15). Spec: AC-RM13.

## [0.28.3] - 2026-10-04
- Okno Claude Code: wznowienie rozmowy po restarcie serwera (uwaga usera: "kazdy restart serwera czysci historie
  rozmowy"). Gdy w folderze modulu jest zapisana rozmowa Claude Code (`~/.claude/projects/<folder>/*.jsonl`), okno
  pokazuje "Wznów rozmowę" (`claude --continue` - ostatnia rozmowa w tym folderze, z historia) i "Nowa rozmowa";
  bez zapisanej rozmowy jak dotad "Uruchom Claude". Spec: `docs/specs/claude-dock.md` AC-T11, AC-T12.

## [0.28.2] - 2026-10-04
- Okno Claude Code: dol ekranu Claude nie ucieka juz poza okno (uwaga usera). Przyczyny: (1) przy dwoch kartach
  (np. Panel i Tablica o roznej wysokosci) rozmiar jednej sesji ustawiala karta, ktora podlaczyla sie ostatnio -
  teraz ustawia go karta, w ktorej pracujesz (aktywacja, fokus w terminalu, pisanie); (2) komunikat nad terminalem
  zmienial wysokosc bez przeliczenia wierszy - teraz przeliczenie przy kazdej zmianie wysokosci okna Claude.
  Serwer nie wysyla tego samego rozmiaru drugi raz (bez zbednego przerysowania). Spec: `docs/specs/claude-dock.md` AC-T10.

## [0.28.1] - 2026-10-04
- `/sdd:board processes`: karteczki odtworzone z plikow wymagan (BR, R, D, A, istniejace Q, role z ACTORS, stany
  z ENTITIES) dostaja `ref`, `file` (plik, w ktorym sa) i `synced` - panel pokazuje ✓ zamiast "tylko na tablicy"
  (uwaga usera). Karteczki tylko z kodu, "docelowo" i nowe Q - bez `synced` i `file`, do plikow przez `sync`.
  `file` znaczy zawsze "tu to jest" (wczesniej instrukcja kazala wpisywac plik docelowy). Podsumowanie podaje,
  ile karteczek jest w plikach, a ile tylko na tablicy. Spec: `docs/specs/board-ui.md` punkt 21 (AC-B52, AC-B53).

## [0.28.0] - 2026-10-04
- `/sdd:board processes` (skill board): procesy dzialajacej aplikacji na tablicy - pasy wg celu uzytkownika,
  karteczki act/cmd/pol/ev/rm ze zrodlem `[App] plik:linia`, decyzje `[Biz]` wygrywaja z kodem ("docelowo; dzis ..."),
  rozjazdy kod vs dokumentacja jako `hot` z kolejnym Q. Tylko board.json; do plikow przez `sync`. Wzor: warsztat fv-manager 2026-10-03.
  Przewodnik w panelu ("Jak to dziala") pokazuje nowy wariant.
- Aktualizacja z panelu sprawdzona przez usera na prawdziwym wydaniu: 0.27.1 -> 0.27.2 z GitHuba (AC-UP8).

## [0.27.2] - 2026-10-03
- Test AC-W1 (CRLF) porownuje liste plikow Intake bez kolejnosci - kopia z CRLF ma inne daty plikow, a lista idzie
  od najnowszego; na Windows w Actions wynik zalezal od kolejnosci zapisu (raz zielony, raz czerwony). Panel bez zmian.
- Wydanie testowe aktualizacji z panelu (przycisk "↑ 0.27.2" przy kicie 0.27.1).

## [0.27.1] - 2026-10-03
- Panel na Windows (test na prawdziwym Windows w GitHub Actions: 13 ze 153 testow nie przechodzilo).
  Konce linii CRLF (Git na Windows zapisuje tak domyslnie) - panel czyta je jak LF: poprawne statusy etapow, liczby
  w zakladce Modul, role i poziom nowego modulu, ten sam odcisk wymagan co na Macu (takze przy `\r\r\n`).
  Sciezki w szczegolach etapow zawsze z `/` (bylo `03-spec\PRD.md`). Aktualizacja z panelu rozpoznaje folder kitu
  jako repo Git takze na Windows (sciezki `C:/...` z gita vs `C:\...\RUNNER~1` z Node) i wola `claude` przez
  `cmd /s /c` z poprawnymi cudzyslowami. Testy instalatora z atrapami bash pomijane na Windows; krok "Testy panelu
  na Windows" w Actions blokujacy.
- Spec: `docs/specs/windows.md` (AC-W1..AC-W7); testy `test/crlf.test.js` (kopie modulu i szablonow z CRLF);
  caly zestaw przechodzi takze w klonie z `core.autocrlf=true`.

## [0.27.0] - 2026-10-03
- Sprawdzanie nowej wersji i aktualizacja z panelu (prosba usera). Serwer co 6 h pyta GitHuba o najnowsze wydanie
  (`releases/latest`); gdy jest nowsze od kitu na dysku, w gornym pasku pojawia sie "↑ X" -> okienko z "Co nowego ↗"
  i "Aktualizuj". Aktualizacja: `git pull --ff-only` w folderze kitu (zrodlo w Claude Code i folder panelu, tylko gdy
  sa korzeniem repo Git bez niezapisanych zmian), potem `claude plugin marketplace update` i `claude plugin update`;
  na koniec komunikat o restarcie sdd-board i sesji Claude Code. Kit z ZIP-a (bez Git) albo z niezapisanymi zmianami
  -> powod i co zrobic zamiast przycisku. Bez sieci - cisza. `SDD_UPDATE_CHECK=0` wylacza sprawdzanie.
  Spec: `docs/specs/update.md` (AC-UP1..AC-UP8); testy `test/update.test.js` (prawdziwy Git, lokalny serwer zamiast GitHuba).
- Test instalacji w GitHub Actions: pierwszy przebieg na prawdziwym Windows potwierdzil, ze `install.cmd` instaluje kit
  przy zasadach skryptow Restricted i Claude Code z npm (wszystkie 6 krokow). Poprawione same testy: sprawdzenia na
  Windows ida przez `powershell -ExecutionPolicy Bypass -File scripts/ci/check-windows.ps1` (kroki "shell: powershell"
  blokowala ustawiona w tescie zasada Restricted); testy instalatora szukaja pwsh po pelnej sciezce (na macOS w Actions
  pwsh jest, a atrapy podmieniaja PATH).
- Okno Claude Code w tablicy: sesja zapisuje transkrypt i dziala `/resume`, takze gdy serwer tablicy uruchomila
  inna sesja Claude. Terminal usuwa teraz wszystkie zmienne sesji (`CLAUDE_CODE_*`, `CLAUDE_PID`, `CLAUDE_EFFORT`),
  nie tylko `CLAUDECODE` - odziedziczone `CLAUDE_CODE_CHILD_SESSION` wylaczalo zapis ("Transcript saving is off").

## [0.26.0] - 2026-10-03
- Instalacja na Windows naprawiona (zgloszenie usera: instalator nie dzialal). Jedna komenda w PowerShell
  `irm https://raw.githubusercontent.com/SyBeer/sdd-kit/main/install.ps1 | iex` albo dwuklik `install.cmd` (nowy).
  Przyczyny: blokada skryptow .ps1 (takze claude.ps1 z npm) - teraz Bypass tylko dla procesu instalatora;
  uruchomienie bez folderu (`$PSScriptRoot` puste) przerywalo skrypt; `--update` z argumentow trafial do adresu repo;
  Git wymagany bez potrzeby; bledy `claude plugin` ukryte - teraz wypisane z komenda do powtorzenia. `sdd-board.cmd`
  przyjmuje plik i port, dziala od razu w tym samym oknie. Repo domyslne `SyBeer/sdd-kit` (Windows i macOS:
  `curl -fsSL .../install.sh | bash` bez `SDD_REPO=`). README i START-TUTAJ: instrukcja dla Mac i Windows, sekcja bledow.
- Instalacja jedna komenda, gdy `~\.sdd-kit` juz istnieje (np. `bin\` po instalacji z ZIP-a): `git init` + `pull`
  zamiast `git clone`, ktory odmawial przy niepustym folderze. `install.cmd` zwraca kod wyjscia instalatora.
- Test na prawdziwym Windows i macOS w GitHub Actions (`.github/workflows/install.yml`): Windows PowerShell 5.1,
  zasady skryptow Restricted jak na domowym komputerze, prawdziwy Claude Code z npm; install.cmd, panel przez
  sdd-board.cmd, odinstalowanie, ponowna instalacja przez `irm | iex`.
- Spec: `docs/specs/install.md` (AC-I1..AC-I8); testy `scripts/test/install.test.js` - instalator Windows sprawdzany
  w PowerShell 7 z atrapami claude i git (`SDD_PWSH=<sciezka do pwsh>`, bez pwsh pomijane).

## [0.25.0] - 2026-10-03
- Release Notes na GitHubie: skrypt `scripts/github-release.js <wersja>` (albo `--from <wersja>`, `--dry-run`) zaklada
  lub aktualizuje GitHub Release z trescia sekcji CHANGELOG tej wersji; Latest tylko najwyzsza wersja; token z
  `GITHUB_TOKEN` albo `git credential`. Uzupelnione Releases 0.19.0..0.24.0. Krok w procedurze wydania po pushu na GitHub.
- Spec: `docs/specs/github-release.md` (AC-G1..AC-G5); testy `scripts/test/github-release.test.js` 4/4.
- Wersja w gornym pasku (panel, tablica, wszystkie zakladki) jest linkiem do Release Notes tej wersji na GitHubie
  (nowa karta); dymek "Kliknij: opis zmian tej wersji na GitHubie"; ostrzezenia o nieaktualnym serwerze/pluginie bez zmian.
  Spec: `docs/specs/ui-switch.md` AC-U16..AC-U17; testy 130/130.
- Okno Claude Code z prawej strony (panel, tablica, wszystkie zakladki): przycisk "Claude" w gornym pasku, terminal xterm.js
  z prawdziwym `claude` w folderze modulu (skille /sdd:… dostepne obok tablicy). Sesja zyje na serwerze - przejscie miedzy
  zakladkami i przeladowanie strony jej nie przerywa (odtworzenie ekranu z bufora 512 KB). Uruchom / Zakoncz, szerokosc
  przeciagana (320 px .. 70% okna, pamietana), strona i panel karteczki zwezaja sie obok okna; ponizej 900 px okno na caly
  ekran; okno zawsze czarne jak terminal (niezaleznie od motywu strony); klawisze w terminalu nie uruchamiaja skrotow tablicy. pty z Pythona 3 (`board/pty-helper.py`) -
  bez zaleznosci npm; Windows / brak Pythona -> komunikat. Polecenie: `$SHELL -l -c 'exec claude'`, zmiana przez
  `SDD_CLAUDE_CMD`. Bezpieczenstwo: start tylko po kliknieciu, zapisy z `X-SDD` i Host lokalny, strumien tylko z Host
  lokalnego, demo bez terminala; koniec serwera (takze kill -9) konczy Claude. Serwer na starym kodzie (brak /api/term,
  a strony juz nowe) -> komunikat o restarcie zamiast pustego terminala z samym kursorem (zgloszenie usera).
- Spec: `docs/specs/claude-dock.md` (AC-T1..AC-T9); testy 138/138.

## [0.24.0] - 2026-10-03
- Krok "zatwierdz slownik" przed /sdd:spec (uwaga usera: kit kazal robic /sdd:spec, a ten odmawial przez niezatwierdzony
  slownik). Nowy tryb `/sdd:domain zatwierdz`: hasla paczkami, rola z SDD.yaml, "zatwierdzam" -> `zatwierdzone (<rola>, data)`.
  /sdd:domain nie proponuje /sdd:spec przy niezatwierdzonym slowniku; bramka /sdd:spec liczy status kazdego hasla
  (nie linie legendy) i zamiast samej odmowy proponuje zatwierdzanie. Panel: karta Domain z `/sdd:domain zatwierdz`
  i "Hasła do zatwierdzenia: N". Szablon GLOSSARY.md: legenda "Statusy hasel (kolumna Status)" zamiast "Status: ...";
  szablon CLAUDE.md: zasada o nastepnym kroku; przewodnik: nowy wariant.
- Spec: `docs/specs/progress-ui.md` zmiana 0.24.0 (AC-71..AC-73); testy 125/125.

## [0.23.1] - 2026-10-03
- Tablica: pod przyciskami Zapisz / Duplikuj / Usuń podpowiedz "⌘D / Ctrl+D – duplikowanie karteczki" (tylko przy
  istniejacej karteczce, nie w demo). Spec: `docs/specs/board-ui.md` punkt 20.

## [0.23.0] - 2026-10-03
- Tablica: kopiowanie karteczek. "Duplikuj" w panelu karteczki i Cmd/Ctrl+D - kopia pod oryginalem, panel na kopii;
  przeciagniecie z wcisnietym Option (Alt) kopiuje zamiast przenosic (do kolumny, innego procesu, na przerwe = nowa kolumna).
  Kopia bez numeru (ref), synchronizacji i odpowiedzi - "tylko na tablicy", do plikow przez /sdd:board sync. Jeden krok Cofnij.
- Spec: `docs/specs/board-ui.md` punkt 20 (AC-B50, AC-B51); testy 123/123.

## [0.22.0] - 2026-09-27
Czytelniejsza zakladka "Jak to dziala" (spec: `docs/specs/info-config.md`, AC-C22..AC-C23).
- Sekcje przewodnika (Tablica i panel, Zrodla, Identyfikatory, Tablica warsztatowa, Panel i serwer) jako listy punktowane.
- Zrodla pogrubione w formie `[Biz]`/`[App]`/`[Dok]`/`[AI]`; identyfikatory Q, D, A, BR, R, AC, PRD pogrubione bez nawiasow,
  jeden na punkt - nawiasy zarezerwowane dla zrodel (`[D]` to dawne `[Dok]`).
- `SddUI.marks()` pogrubia znaczniki zrodel i `**tekst**`.
- Testy 122/122.

## [0.21.0] - 2026-09-27
Plugin w Claude Code nieaktualny (spec: `docs/specs/ui-switch.md`, zmiana 0.21.0, AC-U13..AC-U15).
- Serwer czyta wersje zainstalowanego pluginu `sdd@sdd-kit` z `installed_plugins.json` Claude Code (`SDD_PLUGINS_FILE`,
  `CLAUDE_CONFIG_DIR` albo `~/.claude`); `GET /api/version` zwraca `{running, disk, plugin}`.
- Plugin w innej wersji niz kit na dysku -> pasek na czerwono "plugin nieaktualny", w dymku komenda aktualizacji i restart
  sesji Claude Code. Zdarzenie: panel 0.20.0, a skille z pluginu 0.19.0.
- Testy 119/119.

## [0.20.0] - 2026-09-27
Pobieranie pliku z Intake (spec: `docs/specs/progress-ui.md`, zmiana 0.20.0, AC-68..AC-70).
- Nazwa pliku na liscie "Wrzucone pliki" jest linkiem - klik zapisuje plik na dysk (takze "dodane" i w demo).
- Serwer: `GET /api/intake?name=...` jako zalacznik, ta sama walidacja sciezki co usuwanie (`intakeFile`), tylko Host lokalny.
- Testy 116/116.

## [0.19.1] - 2026-09-27
- Repo publiczne na GitHubie: github.com/SyBeer/sdd-kit. Instalacja jedna komenda z README i z komentarza w `install.sh`
  ma prawdziwy adres (`SyBeer/sdd-kit`) zamiast `<user>`.

## [0.19.0] - 2026-09-27
Handover nieaktualny po zmianie wymagan (spec: `docs/specs/progress-ui.md`, zmiana 0.19.0, AC-65..AC-67).
- `/sdd:handover` wpisuje `Odcisk wymagan: sha256:...` do `04-validation/TRACEABILITY.md`. Inny odcisk (albo, bez odcisku,
  wpis etapu innego niz handover/validate/config po ostatnim `handover` w CHANGELOG) -> Handover "nieaktualne", krok
  wraca na Handover (najpierw /sdd:spec --agent); przy nieaktualnej walidacji krokiem zostaje Validate.
- Wspolna logika `stepStale` dla Validate i Handover; dymek pigulki "nieaktualne" mowi, czego dotyczy.
- Testy 114/114.

## [0.18.2] - 2026-09-27
- Odcisk wymagan: z `SDD.yaml` licza sie tylko `level`, `owners` i `gate_blocking_status`. Zmiana `backlog` (handover),
  nazwy projektu (Konfiguracja) albo komentarza nie oznacza juz walidacji jako nieaktualnej (AC-64). Zdarzenie: /sdd:handover
  w horizon-zlecenia. Odciski policzone przez 0.18.0-0.18.1 zmieniaja sie raz - raport trzeba przeliczyc (demo przeliczone).
- Testy 112/112.

## [0.18.1] - 2026-09-27
- Wersja sdd-kit w gornym pasku na kazdej zakladce (i w demo), pelna w dymku. Serwer pamieta wersje z chwili startu
  (GET /api/version: running + disk); po aktualizacji pluginu bez restartu serwera pasek pokazuje na czerwono
  "serwer nieaktualny" z instrukcja restartu. Ponizej 1180 px link do przykladu w krotkiej formie; ponizej 900 px
  zwykly numer tylko w Konfiguracji (ostrzezenie zostaje). Spec: `docs/specs/ui-switch.md` AC-U10..AC-U12.

## [0.18.0] - 2026-09-27
Walidacja nieaktualna po zmianie wymagan (spec: `docs/specs/progress-ui.md`, zmiana 0.18.0, AC-59..AC-63).
- `board/fingerprint.js`: odcisk wymagan (sha256 z SDD.yaml, INDEX.md, QUESTIONS/DECISIONS/ASSUMPTIONS, 02-domain, 03-spec bez agent/);
  CLI `node board/fingerprint.js <requirements>`.
- `/sdd:validate` wpisuje do raportu `Odcisk wymagan: sha256:...`. Panel: inny odcisk (albo, bez odcisku, wpis innego etapu
  w CHANGELOG po ostatnim `validate`) -> Validate "nieaktualne", aktualny krok wraca na Validate, Handover nie jest proponowany.
- Demo: raport z odciskiem (dalej 100%).
- Testy 109/109.

## [0.17.0] - 2026-09-27
- Tablica: pytania z `QUESTIONS.md` na tablicy. Pasek "Pytania": ile na tablicy, ile z pliku brakuje - "Dołóż"
  (jeden krok Cofnij). Pytanie staje obok karteczki, ktorej dotyczy: bezposrednio (Skad/Wplyw) albo posrednio - decyzja
  -> jej Wplyw, zalozenie -> wymagania i reguly, wstecz: R w PRD i BR w RULES, ktore cytuja D/A. Bez miejsca -> proces
  "Do wyjaśnienia" (nazwa na czerwono). Pytanie zamkniete w pliku - karteczka szara z "zamknięte: D-xxx";
  "Zdejmij zamknięte (N)". Przelacznik "Pokaż pytania" (chowa czerwone karteczki i pusty proces pytan).
- Tablica: odpowiedzi na pytania. Panel czerwonej karteczki ma "Odpowiedź" i "Kto odpowiedział" (bez autora - nie zapisze);
  karteczka "odpowiedź czeka na zapis", w pasku licznik z `/sdd:board sync`. "Przegląd pytań": po kolei sprzeczne,
  blokujace, zadane, otwarte - przewija do pytania, kursor w odpowiedzi. Po zamknieciu Q w pliku - szara, odpowiedz jako slad.
- Skill board: `rebuild` bierze otwarte/zadane/sprzeczne Q; `sync` najpierw przetwarza odpowiedzi z tablicy jak
  `/sdd:interview` krok 3 (D/A/Q, kaskada, "tak"), potem mapowanie karteczek i pytania w druga strone.
- Rozwiniecia skrotow w calym interfejsie (jeden slownik `SddUI.ABBR`): Konfiguracja "R – wymagania", "PRD – cały
  dokument wymagań" itd.; Modul "Kto zatwierdza" i "Stan wymagań" z pelnymi wyrazami; przewodnik; licznik "założeń
  niepotwierdzonych"; panel karteczki - podpowiedz pod polem ID. Spec: `docs/specs/info-config.md` AC-C17, AC-C18.
- Jak to dziala: karta "Od czego zacząć" - dwa punkty startu (od materialow albo od tablicy warsztatowej); sekcja
  "Tablica i panel" - jak tablica synchronizuje sie z plikami i panelem (przez Claude Code, /sdd:board sync); w tabeli
  komend warianty kazdej komendy (np. /sdd:board start|sync|rebuild, /sdd:interview live|async, /sdd:spec --agent|--light).
  Test pilnuje, ze kazdy opisany wariant istnieje w pliku skilla. Spec: `docs/specs/info-config.md` AC-C19..AC-C21.
- Spec: `docs/specs/board-ui.md` punkty 18-19 (AC-B40..AC-B49); testy 105/105.

## [0.16.0] - 2026-09-27
Zakladki Moduł, Jak to działa i Konfiguracja (spec: `docs/specs/info-config.md`, AC-C1..AC-C14).
- Pasek: Panel | Tablica | Moduł | Jak to działa | Konfiguracja; na telefonie zakladki przewijaja sie w pasku. `/demo/start`: Tablica i Jak to działa.
- Moduł (tylko odczyt): cel, zakres, poza zakresem, aktorzy z PRD.md (lekki: SPEC.md), kto zatwierdza, liczby R/BR/D/A/Q, stan tablicy, aktualny krok, ostatnie zmiany.
- Jak to działa: etapy z `STAGES` (ten sam kod co panel), komendy /sdd:*, uklad requirements/, zrodla [B]/[D]/[AI], statusy, tablica i sync.
- Konfiguracja: edycja nazwy projektu, backlogu i rol (SDD.yaml z zachowaniem komentarzy + wpis w requirements/CHANGELOG.md);
  rola uzywana w plikach nie da sie usunac ani przemianowac (409, porownanie bez polskich znakow); zmiana katalogu modulow z podgladem,
  ktore moduly znikna; usuwanie projektow dodanych z listy (pliki zostaja). Poziom i etykieta blokujaca tylko do odczytu z instrukcja.
- Serwer: `info.js`, trasy /module /guide /config, GET /api/module /api/guide /api/config /api/root/preview, PUT /api/config, DELETE /api/modules; demo tylko odczyt.
- Oznaczenia zrodel w calym kicie: `[B]` -> `[Biz]`, `[P]` -> `[App]` (dzialajaca aplikacja/prototyp), `[D]` -> `[Dok]` (`[D]` mylilo sie z decyzjami D-xxx); `[AI]` bez zmian.
  Skille, szablony, CLAUDE.md modulu, tablica (karteczki z przegladarki), demo, README. Stare `[B]`/`[P]`/`[D]` w istniejacych modulach
  czytane tak samo (zdanie w CLAUDE.md). Przewodnik: pelna hierarchia [Biz] > [App] > [Dok] > [AI] (AC-C15, AC-C16).
- Testy 91/91.

## [0.15.0] - 2026-09-27
- Panel: liczniki na kartach Interview, Domain i Spec sa klikalne - klik rozwija liste tego, co licza (drugi klik zwija):
  pytania (wszystkie/otwarte/zadane/sprzeczne), decyzje D-xxx (kto, kiedy, tresc, "brak powodu"), zalozenia
  niepotwierdzone/obalone, hasla slownika, role, encje, reguly BR, wymagania R-xxx (zatwierdzone, do przegladu z powodem
  z sekcji 6 PRD). Naglowek listy z plikiem, z ktorego pochodzi. Tylko do czytania.
- Spec: `docs/specs/progress-ui.md` zmiana 0.15.0 (AC-54..AC-58); testy 77/77.

## [0.14.3] - 2026-09-27
- Tablica: zmiana nazwy procesu nie oznacza juz jego karteczek jako "zmienione po synchronizacji" (↻).
  `stampNotes` rozpoznaje zmiane nazwy po `lanes` (stara nazwa znika, nowa na tym samym miejscu); przeniesienie
  karteczki do innego procesu dalej jest zmiana. (Zdarzenie 2026-09-27, horizon-zlecenia: zmiana nazwy procesu
  "Przebitka, szablony, Rynek i konta" dala 11 falszywych ↻.)
- Spec: `docs/specs/board-ui.md` AC-B39; testy 73/73.

## [0.14.2] - 2026-09-27
- Tablica ostrzega o podmianie: serwer podaje w widoku `_file` (sciezka pliku tablicy, nie trafia do board.json);
  gdy karta dostanie tablice z innego pliku, a sama nie przelaczala modulu - staly pasek "Serwer pokazuje teraz inna
  tablice" z oboma plikami i "Rozumiem"; edycja z poprzedniej tablicy zamykana. (Zdarzenie 2026-09-27: po restarcie
  Claude Code port przejal serwer z przykladem, karta po cichu pokazala przyklad.)
- `project.json` (dashboard HQAI): start serwera na biezacym module zamiast przykladu `example-zlecenia.json`.
- Spec: `docs/specs/board-ui.md` punkt 17 (AC-B37, AC-B38); testy 72/72.

## [0.14.1] - 2026-09-27
Tablica warsztatowa - uwagi usera z pracy na horizon-zlecenia.
- Szkic nowej karteczki: klik "+" stawia od razu szara karteczke w miejscu docelowym; tresc i kolor (typ) na zywo z panelu.
  Typ nie jest wybrany z gory ("Wybierz typ"). Obok "Zapisz" przycisk "Anuluj" (= Escape, nic nie zapisane).
- Wstawianie pomiedzy: kreska z "+" miedzy karteczkami kolumny i miedzy kolumnami procesu (nowa kolumna, dalsze w prawo).
- Przeciagniecie karteczki na przerwe miedzy kolumnami tworzy tam nowa kolumne (takze w innym procesie).
  Kolumna oprozniona przez przeniesienie, zmiane procesu albo Usun znika - dalsze kolumny dosuwaja sie w lewo.
- Stan ↻ tylko dla karteczki, ktora naprawde przeniesiono (znacznik `_moved` z przegladarki, serwer go usuwa);
  przenumerowanie kolumn nie oznacza karteczek jako zmienionych.
- Nowy typ `space` "odstep": puste miejsce oddzielajace elementy; bez tresci, znaczka i daty; poza licznikami;
  `/sdd:board sync` go pomija (skill board).
- Szerokie okno: strona sie nie przewija - zakladki i pasek narzedzi zostaja, tablica ma oba paski przewijania na ekranie.
- Przesuwanie tablicy mysza: przeciagniecie pustego tla (kursor strzalki / zacisnieta dlon); karteczka - raczka, "+" - palec.
- Poprawki: odstep zmieniony na zdarzenie wywracal rysowanie (proces znikal z ekranu, zapis nie szedl) - stan rysowania
  zawsze znany, zapis przed rysowaniem, blad rysowania z komunikatem; przewijanie do karteczki omija przyklejona nazwe procesu.
- UWAGA przy aktualizacji: zrestartuj serwer tablicy (`sdd-board`) - logika zapisu zmienila sie po stronie serwera;
  stary serwer z nowa strona zapisalby `_moved` do board.json.
- Spec: `docs/specs/board-ui.md` punkty 3, 4, 12-16 (AC-B24..AC-B36); testy 70/70.

## [0.14.0] - 2026-09-27
Tablica warsztatowa: cofanie zmian, "+" pod kazda kolumna, panel karteczki na stale (uwagi usera z warsztatu horizon-zlecenia).
- "↶ Cofnij" / "↷ Ponów" w pasku oraz Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Ctrl+Y (w polu tekstowym cofa tekst, nie tablice).
  Do 50 krokow, historia w karcie przegladarki. Zmiana spoza karty (agent, sync, druga karta) czysci historie z komunikatem;
  echo wlasnego zapisu nie. Cofnieta karteczka wraca z datami, wiec i ze stanem synchronizacji.
- Pod kazda zajeta kolumna niski "+" - nowa karteczka na koncu tej kolumny; ostatnia pusta kolumna z pelnym "+".
- Panel karteczki na stale po prawej (okno > 640 px): tablica sie zweza, nic nie przykrywa edytowanej karteczki.
  Bez wybranej karteczki podpowiedz i "+ Karteczka" / "+ Proces". "»" zwija do paska (zapamietane), klik karteczki rozwija.
  "×"/Escape koncza edycje, nie chowaja panelu. Telefon bez zmian (panel od dolu).
- Spec: `docs/specs/board-ui.md` punkty 4, 10, 11 (AC-B19..AC-B23); testy 64/64 (nowy `test/history.test.js`).

## [0.13.1] - 2026-09-27
`/sdd:init` w repo istniejacej aplikacji (sprawdzone na fv-manager).
- `CLAUDE.md` nigdy nie nadpisywany: istniejacy dostaje na koncu tresc szablonu, bez drugiego naglowka.
- Init uruchomiony drugi raz nie dopisuje zasad ponownie (wykrywa naglowek `# Zasady pracy z wymaganiami (SDD)`).
- Repo z kodem bez `CLAUDE.md`: nowy plik z krotka sekcja `# Projekt`, pod nia zasady SDD.

## [0.13.0] - 2026-09-27
Moduly spoza katalogu modulow i zapamietany ostatni modul (uwagi usera: "ma to dzialac dla aktualnego modulu";
wymagania dla istniejacej aplikacji, np. fv-manager, w jej repozytorium).
- Menu modulu: "Dodaj istniejący projekt…" - folder z `requirements/SDD.yaml` gdziekolwiek na dysku (pole + "Przeglądaj…").
  Bez `requirements/` komunikat z `/sdd:init`; folder aplikacji sdd-kit odrzucony. Po dodaniu panel przelacza sie na modul.
- Lista modulow = katalog modulow + dodane (`modules` w `~/.sdd-kit/config.json`); znikniete foldery pomijane.
  Modul spoza katalogu z dopiskiem "poza katalogiem" i sciezka w podpowiedzi. Wybor modulu po sciezce (`{dir}`).
- Ostatni modul (`lastModule`) zapamietany przy kazdym wyborze; start bez projektu w biezacym folderze otwiera go
  (a gdy go nie ma - pierwszy z listy). Start z folderu projektu dalej ma pierwszenstwo.
- `config.json` zapisywany z laczeniem pol - zmiana katalogu modulow nie kasuje pozostalych ustawien.
- Test AC-U3/AC-U7 z wlasnym plikiem configu (nie dotyka configu usera).
- Spec: `docs/specs/progress-ui.md`, zmiana 0.13.0 (AC-47..AC-53); testy 62/62.
- Nastepnie (osobno): `/sdd:init` w repo z istniejacym CLAUDE.md i intake "stan obecny z kodu".

## [0.12.0] - 2026-09-27
Demo w tym samym serwerze co Twoj modul (uwaga usera: "zebym mogl uruchomic to w dwoch oknach przegladarki,
ale nie z roznych adresow www").
- Jeden serwer, trzy konteksty: `/` i `/board` (Twoj modul), `/demo` i `/demo/board` (gotowy modul po SDD),
  `/demo/start` (tablica z poczatku warsztatu). Kazdy z wlasnym stanem i podgladem na zywo; zmiana Twojego modulu
  nie rusza demo. API demo pod przedrostkiem (`/demo/api/...`), kazdy zapis -> 403 "Demo - tylko podgląd.".
- Gorny pasek: "Przykład gotowego modułu ↗" (nowe okno z `/demo`), w demo "← Twój moduł"; pasek DEMO z przelacznikiem
  "Start warsztatu | Wynik". Strony te same, przedrostek z adresu (`SddUI.base`, `SddUI.tabs(page, base)`).
- Tryb serwera `--demo` z 0.11.0 usuniety; `sdd-board --demo` uruchamia zwykly serwer i wypisuje adresy demo.
- Zajety port: czytelny komunikat z adresem `/demo` zamiast bledu Node, kod wyjscia 1.
- Instalatory i START-TUTAJ: `claude plugin list` bez `--installed` (Claude Code 2.1.x nie zna tej opcji -
  falszywe "Nie widze 'sdd'").
- Spec: `docs/specs/progress-ui.md`, zmiana 0.12.0 (AC-41..AC-46). Testy 56/56.
- Po aktualizacji: `bash install.sh --update`, restart `sdd-board`.

## [0.11.0] - 2026-09-27
Demo "wynik" - jak wyglada modul po przejsciu SDD (uwaga usera: "zeby operator mogl sobie podejrzec jaki ma osiagnac wynik").
- `sdd-board --demo wynik` (serwer: `node server.js --demo [nazwa] [port]`): gotowy modul Zlecenia z
  `plugins/sdd/demo/zlecenia/requirements/` - panel 100% (5 z 6 etapow, aktualny krok Handover) i tablica
  62 karteczek w 5 procesach, wszystkie z ✓. `sdd-board --demo` (tablica startowa) bez zmian.
- Demo tylko do podgladu: kazdy zapis przez API -> 403 "Demo - tylko podgląd."; nie czyta i nie zapisuje
  `~/.sdd-kit/config.json`; pasek DEMO w panelu i na tablicy; menu modulu bez "Nowy moduł…" i "Zmień katalog…";
  tablica bez przyciskow edycji, karteczka otwiera sie do czytania.
- Dane demo z projektu SDD po walidacji 100%, zanonimizowane (klient, dostawcy, gieldy, dzialy, liczby); tablica
  startowa `example-zlecenia.json` tez bez nazw.
- Spec: `docs/specs/progress-ui.md`, zmiana 0.11.0 (AC-35..AC-40); testy `test/demo.test.js` + AC-40 w `ui.test.js` (52/52).
- Instalatory i README: nowa komenda. Po aktualizacji pluginu uruchom `bash install.sh --update`.

## [0.10.1] - 2026-09-27
- Etap "gotowe" z pytaniami do wyjasnienia ma inny status i kolor: pigulka "gotowe · N do wyjaśnienia" (zolta)
  i zolte kolko na osi czasu. Nie cofa aktualnego kroku (jak w 0.9.0). Pole `partial` w etapie, AC-33, testy 47/47.

## [0.10.0] - 2026-09-27
Karty etapow w panelu w jednej kolumnie, zwijane (uwaga usera: "obsluzone tematy zwiniete, a aktualny rozwiniety").
- Szesc kart jedna pod druga; prawa kolumna (Blokuje dev, Czeka na biznes, Ostatnie zmiany) bez zmian.
- Domyslnie rozwinieta tylko karta aktualnego kroku; zwinieta pokazuje w naglowku jedna linie licznikow.
- Klik w naglowek zwija/rozwija (pamietane do przeladowania albo zmiany modulu); zmiana aktualnego kroku rozwija jego karte.
- Klik w kolko etapu na osi czasu rozwija jego karte i przewija do niej.
- `SddUI.cardOpen` + AC-31 w `test/ui.test.js`; spec: `docs/specs/progress-ui.md`, zmiana 0.10.0. Testy 46/46.

## [0.9.0] - 2026-09-27
Otwarte pytania nie cofaja procesu. /sdd:domain (test spojnosci) i krok 1 /sdd:interview dopisuja pytania,
wiec panel cofal "Aktualny krok" z Domain do Interview i nie dalo sie przerwac wywiadu (uwaga z horizon-zlecenia).
- Interview jest `done`, gdy nie ma blokerow: pytan `sprzeczne` ani `otwarte`/`zadane` z etykieta `gate_blocking_status`.
  Zwykle otwarte pytania widac w licznikach karty i w "Czeka na biznes".
- Etykieta zaprzeczona ("nie blokuje go-live") nie robi z pytania blokera.
- `/sdd:interview` live: "przerwij" / "stop" / "koniec" konczy warsztat bez zapisu niezatwierdzonej propozycji.
- Karta Interview: rozwijana lista "Pytania do wyjaśnienia" (otwarte, zadane, sprzeczne) - numer, tresc,
  znacznik (sprzeczne / blokuje / zadane / otwarte), do kogo, skad; kolejnosc jak priorytet wywiadu.
  Przelacznik "Do wyjaśnienia (N)" / "Wszystkie (M)" - takze odpowiedziane (czym zamkniete, np. D-012)
  i zaparkowane (z warunkiem).
- Spec: `docs/specs/progress-ui.md`, zmiana 0.9.0 (AC-26b..AC-30b), testy 45/45.

## [0.8.0] - 2026-09-26
Katalog produktow wskazuje uzytkownik. sdd-kit to tylko aplikacja: moduly (`requirements/`) nie powstaja
w jej folderze ani obok niego. Wczesniej serwer uruchomiony w folderze kitu liczyl katalog modulow
z biezacego folderu, wiec "Nowy moduł" zakladalby foldery obok aplikacji.

- Katalog modulow: `SDD_MODULES_ROOT` -> wybor z panelu w `~/.sdd-kit/config.json` (`SDD_CONFIG` zmienia sciezke)
  -> rodzic istniejacego `requirements/` projektu. Nic z tego = panel pyta "Gdzie trzymać wymagania?".
- Folder aplikacji (i wszystko w nim) jest odrzucany - z configu, ze zmiennej i jako projekt startowy.
- Tekst wyboru: "Wskaż katalog do przechowywania danych - powinien być poza katalogiem sdd-kit." 404 od serwera
  starszego niz strona -> komunikat "zatrzymaj go (Ctrl+C) i uruchom ponownie" zamiast "HTTP 404".
- Panel: ekran wyboru katalogu, "Brak modułów" z przyciskiem "Nowy moduł…", w menu modulow "Zmień katalog modułów…".
- "Przeglądaj…" przy polu katalogu: okno z podfolderami (serwer listuje, `GET /api/dirs`, chronione jak zapisy),
  wejscie w folder, "↑ wyżej", znaczniki "moduł" i wyszarzona "aplikacja"; "Wybierz ten folder" wpisuje sciezke do pola.
- Serwer: `POST /api/root`; bez katalogu `POST /api/modules` -> 409; konsola mowi, gdzie sa moduly albo ze nie wybrano.
- Zmiana zachowania: `sdd-board` w folderze bez `requirements/` przy zapisanym katalogu otwiera pierwszy modul z katalogu.
- `/sdd:interview` tryb live: JEDNO pytanie naraz zamiast partii 5-7 (uwaga z warsztatu horizon-zlecenia:
  "jak ja mam zbierac odpowiedzi?"). Staly uklad pytania "Pytanie X z N (Q-xxx)" konczony zdaniem
  "Zarejestruj kto udzielił odpowiedzi na pytanie.", zapis do sesji od razu, jedno dopytanie, parkowanie tylko
  z warunkiem go-live, odpowiedz sprzeczna z D -> nowa D + "Zmieniona przez", powod `[AI]` = pusty powod.
- Nowy `board/root.js`, kryteria AC-26..AC-33 w `docs/specs/progress-ui.md`, testy `test/root.test.js` (42/42).

## [0.7.2] - 2026-09-26
- Port panelu i tablicy: **4242 -> 8012**. Konwencja workspace rezerwuje dla uslug dev zakres
  8000-8999, a 4242 byl poza nim. Zmiana objela `install.sh`, `install.ps1`, `README.md`,
  `START-TUTAJ.md`, domyslna wartosc w `board/server.js` i `skills/board/SKILL.md`.
  Kto ma juz zainstalowanego pomocnika `sdd-board`, powinien przeinstalowac (`install.sh`)
  albo podac port recznie: `sdd-board <plik.json> 8012`.
  Testy nie sa zwiazane z portem - biora losowy z zakresu 4300-4800.

## [0.7.1] - 2026-09-26
- Panel: `porownanie-*.md` w `00-intake/` nie jest juz liczony jako zrodlo. Wprowadzony w 0.7.0
  artefakt procesu trafial na liste plikow czekajacych na spis i panel w kolko zganialby go do
  `INDEX.md`. `isProcessFile` w progress.js, kryterium AC-25, test (37/37).
  Znalezione na probie na zywym projekcie, nie w przegladzie kodu.

## [0.7.0] - 2026-09-26
Kolejne zrodlo w intake porownuje sie z MODELEM, nie ze starymi zrodlami. `00-intake/` to surowiec,
`02-domain/` jest prawda. Powod: intake wykrywal tylko sprzecznosci wartosci (ta sama rzecz, inna
wartosc). Nie widzial sprzecznosci struktury (zrodla inaczej dziela domene) ani milczacych pominiec
(zrodlo mowi o czyms, czego model nie ma - znika bez sladu, bo nie zostawia ani pytania, ani konfliktu).

- `intake`: podzial na przebieg pierwszy (zrodla miedzy soba) i kolejny (zrodlo kontra model).
  Przebieg kolejny ma obowiazkowa kolejnosc: najpierw czytanie "na zimno" do `00-intake/porownanie-YYYY-MM-DD.md`,
  dopiero potem model - inaczej agent dopasowuje nowe zrodlo do tego, co juz wie.
  Piec klas trafienia: `potwierdza`, `zamyka Q`, `uzupelnia`, `sprzeczne`, `podmywa model`.
  Trafienie w `D-xxx` = wniosek o ponowne otwarcie decyzji. Trafienie w strukture encji lub maszyne
  stanow = zgloszenie przebudowy modelu, nie dwadziescia pytan o szczegoly.
- Nowy status elementu modelu `zakwestionowane (Q-xxx)` w GLOSSARY, RULES, ACTORS, ENTITIES: nowe
  zrodlo wyzsze w hierarchii podmywa model. Nic nie jest kasowane, ale wszystko podmyte jest widoczne.
- Kaskada wplywu (`CLAUDE.md` §6) ma trzeci wyzwalacz: oznaczenie elementu jako `zakwestionowane`
  (dotad tylko zmiana `A` i nowa `D`). Sciezka: `RULES.Wymagania` -> `R` -> sekcja 6 PRD.
- `validate`: BLOCK 6 - `R` stojace na elemencie `zakwestionowane` (rownolegle do `A obalone`).
  WARN 10 - zrodlo `aktualne` z `INDEX.md`, ktorego nazwa nie wystepuje w zadnym `Zrodlo`
  ("zrodlo przeczytane i nieuzyte") - jedyna kontrola na wymaganie, ktore zniknelo bez sladu.
  INFO 15 - pojecie lub `BR` nieuzywane przez zadne `R`.
- `domain`: czwarta kontrola w tescie spojnosci - jedno pojecie = jeden zbior rekordow (sprawdza
  zakres, nie brzmienie definicji); piata - czy kazde zrodlo `aktualne` zostawilo slad w modelu.
  Nowa sekcja "Przebudowa modelu" jako wejscie po zgloszeniu z intake.
- `INDEX.md`: kolumny `Kierunek` (`intencja` / `as-built` / `potwierdzenie`) i `Status zrodla`
  (`aktualne` / `zastapione przez <plik>` / `dotyczy innej wersji <X>` / `wycofane`). Kierunek
  rozstrzyga tam, gdzie hierarchia nie wystarcza - dwa dokumenty `[D]` roznia sie zwykle tym,
  ze jeden opisuje zamiar, drugi stan faktyczny. Status pozwala uniewaznic cale zrodlo jedna
  decyzja i odsiewa falszywe sprzecznosci miedzy wersjami produktu.
- Zapis zrodla ujednolicony na `[B]/[P]/[D]/[AI] <plik z INDEX.md>[, sekcja/wiersz]` - nazwa pliku
  obowiazkowa, bo na niej stoi kontrola pokrycia zrodel.
- `CLAUDE.md`: zasada "zgodnosc dwoch zrodel `[D]` NIE jest potwierdzeniem" - dwa dokumenty spisane
  z tej samej aplikacji powtarzaja ten sam blad.
- `spec`: nie tworzy `R` na elemencie `zakwestionowane` (jak dotad na `A obalone`).
- Testy panelu bez zmian w kodzie: 36/36.

## [0.6.4] - 2026-09-26
- Przejscie Panel <-> Tablica bez skakania: staly pasek (47 px) i naglowek w ui.css niezalezne od CSS strony
  (inna wysokosc linii, odstepy naglowka, style `label` tablicy), `scrollbar-gutter: stable`.
  Pozycje paska, zakladek, ikon, naglowka i przycisku modulu identyczne na obu stronach (pomiar 1200 i 375 px).

## [0.6.3] - 2026-09-26
- Tablica: naglowek jak w panelu - "Wymagania do modułu: <nazwa> ▾" z menu modulow; wybor modulu na tablicy przelacza
  modul na serwerze (tablica i panel). "Nowy moduł…" przechodzi do panelu i otwiera formularz. Tytul tablicy - linia obok.
- Jeden kod menu dla panelu i tablicy (`modMenu`, `modSwitch` w ui.js, wyglad w ui.css).
- Serwer: widok tablicy z `_module` i `_modules`; pola `_...` nie trafiaja do board.json. Testy AC-U6, AC-U7 (36/36).

## [0.6.2] - 2026-09-26
- Motyw: same ikony slonce / ksiezyc, bez ramki i tla; wybrana w kolorze tekstu, druga przygaszona.

## [0.6.1] - 2026-09-26
- Motyw: bez opcji "Auto"; zamiast tekstu ikony slonce / ksiezyc (nazwa w dymku i dla czytnikow ekranu).
  Dopoki nic nie wybrano - motyw systemu i on jest zaznaczony; wybor wspolny dla panelu i tablicy.
- `pickTheme` zamiast `normTheme`, test AC-U1 (35/35).

## [0.6.0] - 2026-09-26
- Panel i tablica: wspolny pasek na gorze - zakladki "Panel modułu" | "Tablica warsztatowa" (na telefonie "Panel" | "Tablica")
  zamiast linkow "← Panel modułu" / "Tablica warsztatowa →".
- Przelacznik motywu Auto / Jasny / Ciemny: zapamietany w przegladarce, wspolny dla obu stron, zmiana w jednej karcie
  przelacza druga; ustawiany przed pierwszym malowaniem. "Auto" = jak system.
- Nowe pliki `board/ui.js`, `board/ui.css` (serwowane pod /ui.js, /ui.css); spec `docs/specs/ui-switch.md`, testy AC-U1..AC-U3 (35/35).

## [0.5.4] - 2026-09-26
- Tablica: wskazowka na pustej tablicy - dwie drogi: "Z AI" (`/sdd:board` z przyciskiem Kopiuj) i "Sam, w przegladarce"
  (4 kroki + przyklad karteczek w kolorach legendy + "Dodaj pierwszy proces"). Procesy bez karteczek: linia pod tablica
  "Kliknij + w procesie...", znika po pierwszej karteczce. Pusta tablica bez limitu wysokosci (telefon).
- `boardHint` w board-ops.js + test AC-B17 (32/32).

## [0.5.3] - 2026-09-26
- Intake: usuwanie pliku, ktory czeka na spis (✕ tylko przy "czeka na spis"), z potwierdzeniem; usuniecie ostateczne
  (plik kasowany z dysku). Plikow juz w spisie nie mozna usunac.
  Informacja pod lista plikow; skill intake: nie usuwaj ani nie przenos plikow z INDEX.md.
- Serwer: `DELETE /api/intake?name=`, chroniony jak inne zapisy, plik ze spisu -> 409; `removeIntake` + testy AC-21, AC-22, AC-24 (31/31).

## [0.5.2] - 2026-09-26
- Tablica: stan synchronizacji z plikami na karteczce - ✓ w plikach, ↻ zmieniona po synchronizacji, ! brak ID w pliku
  (bez znaczka = tylko na tablicy); podsumowanie liczb w pasku, wiersz "Pliki" w panelu.
- Stan liczy serwer: pole `synced` (ustawia agent przy `/sdd:board sync`) + sprawdzenie, czy `ref` jest w pliku `file`;
  odswiezany przy kazdej zmianie w requirements/, nie trafia do board.json.
- `syncState`, `syncMap` w board-ops.js + testy AC-B14, AC-B15 (28/28).

## [0.5.1] - 2026-09-26
- Tablica: karteczka pokazuje ID i zrodlo (jedna linia, pelne w dymku) oraz autora i date zmiany (RRRR-MM-DD HH:MM).
- Panel karteczki: Utworzono, Zmieniono, Autor, Skad, Trafia do; odswiezane na zywo.
- board.json: opcjonalne `created` / `updated` (ISO); serwer stempluje zmiany z przegladarki, skill board kaze agentowi je ustawiac.
- `stampNotes`, `fmtDate` w board-ops.js + testy AC-B11, AC-B12 (26/26).

## [0.5.0] - 2026-09-26
- Tablica: zakladanie procesow ("+ Proces", pusta tablica z "Dodaj pierwszy proces"), zmiana nazwy klikiem w nazwe
  (karteczki ida za nazwa, pusta/zajeta odrzucona), przesuwanie gora/dol, usuwanie z potwierdzeniem przy karteczkach.
- Tablica: panel edycji karteczki wysuwany z prawej (na telefonie od dolu), Escape zamyka, Cmd/Ctrl+Enter zapisuje;
  "+" w ostatniej kolumnie procesu i "+ Karteczka" w pasku; "Pas" -> "Proces".
- Tablica: na cala szerokosc, powiekszenie 50-150% z "Dopasuj" (zapamietane), nazwy procesow przyklejone przy przewijaniu.
- Tablica: kolejnosc karteczek w kolumnie - upuszczenie przed/za karteczka (kreska pokazuje miejsce),
  w panelu "↑ wyżej" / "↓ niżej" (dziala tez na telefonie).
- Tablica: typ karteczki w panelu jako przyciski jak legenda (kolor + nazwa + podpowiedz) zamiast listy rozwijanej.
- Pusta tablica bez procesow (wczesniej "Proces 1"), zeby bylo widac "Dodaj pierwszy proces".
- `board/board-ops.js` (wspolny dla przegladarki i testow) + testy AC-B1..AC-B5, AC-B8, AC-B9, spec `docs/specs/board-ui.md` (24/24).
- Skill board: czytaj board.json tuz przed edycja, nie cofaj zmian usera z przegladarki.

## [0.4.1] - 2026-09-26
- Panel: przelacznik modulu w tytule ("Wymagania do modułu: <nazwa> ▾") zamiast listy i przycisku po prawej.
  Menu: moduly z poziomem "pełny"/"lekki", na dole "+ Nowy moduł…"; Escape, klik poza menu, strzalki.
- Poziom pokazywany po polsku ("poziom pełny" zamiast "poziom full").

## [0.4.0] - 2026-09-26
- Panel: baner "Aktualny krok" zamiast "Nastepny krok".
- Intake: lista wrzuconych plikow (nazwa, rozmiar, "dodane" / "czeka na spis"), najnowsze na gorze,
  zwinieta przy wiecej niz 8 plikach, z przewijaniem.
- Intake: plik o identycznej tresci jak juz wrzucony (SHA-256) jest pomijany z informacja, pod jaka nazwa juz jest.
- Log uploadu: podsumowanie "zapisano N, pominieto M, bledy K" i tylko duplikaty/bledy z nazwami.
- Baner i karty: dopisek "Uruchom w Claude Code:" przed komenda; baner ma instrukcje "Co zrobic" (3 kroki) dla kazdego etapu.
- Testy AC-14, AC-15, AC-17 (17/17).

## [0.3.0] - 2026-09-26
- Panel: naglowek "Wymagania do modułu: <nazwa>", przelacznik modulow, "+ Nowy moduł" (folder obok, szablony, SDD.yaml, git init).
- Intake: zalaczanie plikow z przegladarki (przycisk / przeciagnij-upusc, do 25 MB) do `requirements/00-intake/`,
  oczyszczanie nazw, bez nadpisywania.
- Tablica: przycisk "← Panel modułu"; tablica przelacza sie razem z modulem; board.json powstaje dopiero przy pierwszym zapisie.
- Zapisy tylko z panelu (naglowek X-SDD + Host lokalny).
- `/sdd:init`: pytanie o zatwierdzajacych jezykiem biznesu zamiast skrotow R/D/GLOSSARY/BR.
- `board/modules.js` + testy AC-9..AC-12.

## [0.2.0] - 2026-09-26
- Widok postepu SDD pod `/` serwera tablicy (`sdd-board`): 6 etapow ze statusem z plikow, liczniki,
  nastepny krok z komenda, "blokuje dev", "czeka na biznes", ostatnie zmiany, odswiezanie SSE. Tylko podglad.
- Tablica warsztatowa przeniesiona pod `/board` (link w obie strony).
- `board/progress.js` + testy `node --test` (AC-1..AC-7 ze `docs/specs/progress-ui.md`).

## [0.1.0] - 2026-09-26
- Import kitu do repo `_DEV_/repos/sdd-kit` (wczesniej ~/Downloads/sdd-kit).
- Plugin `sdd`: skille init, intake, interview, domain, spec, validate, handover, status, board.
- Tablica warsztatowa `board/` (Node, SSE, port 4242), instalatory `install.sh` / `install.ps1`.
