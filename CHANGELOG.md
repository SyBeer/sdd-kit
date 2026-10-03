# Changelog

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
