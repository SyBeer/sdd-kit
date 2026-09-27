# Spec: Zakladki "Moduł", "Jak to działa" i "Konfiguracja"

Status: zatwierdzony 2026-09-27 (user: "tak, buduj") (user: "potrzebujemy zakladki, ktora opisze jak dziala projekt, i zakladki z konfiguracja";
wybor: opis procesu + opis modulu w osobnej zakladce; konfiguracja: katalog, projekty dodane, SDD.yaml, serwer;
edycja: "to zalezy od tego, czy mozna ja zmieniac" - rozstrzygniete pole po polu nizej)
Wersja docelowa: 0.16.0 (0.15.0 zajete przez liczniki panelu, zbudowane rownolegle)

## Cel
Nowa osoba (albo user po przerwie) rozumie z samej przegladarki, jak dziala proces SDD i czym jest biezacy modul,
a ustawienia rozsiane dzis po menu modulu i `~/.sdd-kit/config.json` sa w jednym miejscu - z jasnym "to mozesz zmienic tutaj,
to zmienia Claude, bo dotyka plikow wymagan".

Metryka sukcesu (produktowo): user zmienia katalog modulow i role zatwierdzajace bez pytania agenta i bez recznej edycji plikow;
pytania "jak to dziala / co robi /sdd:x" nie wracaja w rozmowie.

## Zakres
1. Pasek zakladek (ui.js): Panel | Tablica | Moduł | Jak to działa | Konfiguracja. Adresy `/`, `/board`, `/module`, `/guide`, `/config`
   (z przedrostkiem kontekstu jak dzis: `/demo/...`). Krotkie etykiety na telefonie: Panel, Tablica, Moduł, Jak działa, Ustawienia.
   Przy < 640 px zakladki przewijaja sie w poziomie wewnatrz paska (strona nie). Motyw bez zmian, z prawej.
   Naglowek "Wymagania do modułu: X ▾" z menu modulow na kazdej zakladce (jak na panelu i tablicy).
2. "Moduł" (tylko odczyt, z plikow biezacego modulu):
   - nazwa projektu, poziom (pelny / lekki), sciezka folderu;
   - Cel, Zakres, Poza zakresem, Aktorzy - sekcje z `03-spec/PRD.md` (przy `light`: z `SPEC.md`); brak pliku/sekcji -> "Jeszcze nie spisane - powstanie w /sdd:spec";
   - kto co zatwierdza (owners z SDD.yaml);
   - liczby: R (w tym zatwierdzone), BR, D, A, Q (otwarte / blokujace), karteczki na tablicy i ile zsynchronizowanych;
   - aktualny krok i 5 ostatnich wpisow CHANGELOG (to samo zrodlo co panel, `readProgress`).
3. "Jak to działa" (tylko odczyt, ta sama tresc dla kazdego modulu):
   - etapy intake -> interview -> domain -> spec -> validate -> handover: po co, komenda, co powstaje - z `STAGES` (progress.js), bez kopiowania tekstu;
   - skille `/sdd:*` (w tym board, status, init) - jedno zdanie + kiedy uzyc;
   - uklad folderu `requirements/` (00-intake ... 04-validation) i ktory plik jest prawda;
   - zrodla i wiarygodnosc [B] / [D] / [AI], statusy (robocze / zakwestionowane / zatwierdzone), ID (R, BR, D, A, Q, AC);
   - tablica: typy karteczek, ze tablica to widok, sync (✓ ↻ !), kto co zapisuje;
   - panel i HQAI: jak uruchomic serwer, gdzie sa pliki konfiguracji.
4. "Konfiguracja" - pole po polu, edycja tylko tam, gdzie zmiana nie psuje plikow wymagan:

   | Pole | Gdzie | Edycja w przegladarce | Dlaczego |
   |------|-------|-----------------------|----------|
   | Katalog modulow | config.json `modulesRoot` | TAK (jak "Zmien katalog…") + podglad: ktore moduly znikna z listy | tylko wskaznik, pliki zostaja |
   | Projekty dodane | config.json `modules` | TAK: dodaj, usun z listy (pliki zostaja) | tylko lista |
   | Nazwa projektu | SDD.yaml `project` | TAK | tylko wyswietlana |
   | Backlog | SDD.yaml `backlog` | TAK: none / linear / jira / file | czytany dopiero w /sdd:handover |
   | Role i co zatwierdzaja | SDD.yaml `owners` | TAK: dodaj role, zmien `approves` (R, D, GLOSSARY, BR, PRD); zmiana nazwy albo usuniecie roli - tylko gdy nazwa nie wystepuje w plikach `requirements/` | nazwy rol stoja w DECISIONS/QUESTIONS ("Zdecydowal", "Do kogo"); zmiana zerwalaby slad |
   | Poziom | SDD.yaml `level` | NIE - pokazane z instrukcja | zmiana wymaga przebudowy plikow (PRD.md <-> SPEC.md) - robi Claude |
   | Etykieta blokujaca | SDD.yaml `gate_blocking_status` | NIE - pokazane z instrukcja | pytania w QUESTIONS.md maja stara etykiete; zmiana po cichu odblokowalaby go-live |
   | Ostatni modul | config.json `lastModule` | NIE (ustawia sie przy wyborze modulu) | - |
   | Serwer | wersja sdd-kit, port, plik tablicy, sciezka config.json, zrodlo katalogu (SDD_MODULES_ROOT / config / folder projektu) | NIE | stan procesu |

   Pola "NIE" maja obok zdanie, co wpisac w Claude Code (np. "zmiana poziomu: /sdd:init --light w folderze modulu").
   Zapis SDD.yaml zachowuje komentarze i kolejnosc linii; zmieniane sa tylko edytowane pola. Po zapisie wpis w `requirements/CHANGELOG.md`
   (`YYYY-MM-DD | config | zmiana SDD.yaml: <pole> | panel`).
5. Demo (`/demo`): Moduł i Jak to działa dzialaja; Konfiguracja tylko do odczytu (bez sciezek usera), zapisy 403 jak dzis.
   `/demo/start`: Tablica i Jak to działa.
6. Menu modulu bez zmian: "Zmień katalog modułów…" dalej otwiera okno "Przeglądaj…" w panelu; Konfiguracja to druga droga
   (sciezka + podglad skutkow). Oba zapisuja przez to samo POST /api/root.

7. Oznaczenia zrodel (user 2026-09-27: "W zrodlach wiarygodnosci mialo byc Dok zamiast D, zmien jeszcze B na Biz"; zakres: caly sdd-kit):
   `[B]` -> `[Biz]` (biznes), `[D]` -> `[Dok]` (dokument; `[D]` mylilo sie z decyzjami D-xxx), `[AI]` bez zmian.
   Zmiana w skillach, szablonach, CLAUDE.md modulu, tablicy (karteczki z przegladarki), demo, przewodniku i specach.
   Historia w CHANGELOG.md zostaje. Skille czytajace istniejace pliki traktuja stare `[B]`/`[D]` jak `[Biz]`/`[Dok]`.
   Dalej (user: "P zmien na App od aplikacja"): `[P]` -> `[App]` (dzialajaca aplikacja, system albo prototyp). Hierarchia: [Biz] > [App] > [Dok] > [AI].

## Poza zakresem
- Edycja PRD/R/BR z przegladarki; zmiana poziomu i etykiety blokujacej z przegladarki.
- Zmiana portu z przegladarki (wymaga restartu serwera).
- Wlasny edytor tresci "Jak to działa" - tresc w kodzie sdd-kit.

## Kryteria akceptacji
Testy: `plugins/sdd/board/test/info-config.test.js` (+ ui.test.js dla paska).
- AC-C1: `tabs(page, base)`: piec zakladek w kolejnosci Panel, Tablica, Moduł, Jak to działa, Konfiguracja; `current` tylko przy `page`; `/demo/start` -> Tablica i Jak to działa.
- AC-C2: serwer zwraca 200 dla `/module`, `/guide`, `/config` (i `/demo/module`, `/demo/guide`); nieznany adres - 404 jak dzis.
- AC-C3: `moduleInfo` (GET /api/module): nazwa, poziom, sekcje Cel/Zakres/Poza zakresem/Aktorzy z PRD.md (light: SPEC.md), owners, liczby R/BR/D/A/Q; brak PRD -> sekcje puste z informacja, bez bledu.
- AC-C4: `guide()` bierze etapy z `STAGES` - kazdy etap ma nazwe, komende i opis; test porownuje z STAGES (brak rozjazdu).
- AC-C5: GET /api/config: modulesRoot, zrodlo katalogu, modules (z informacja, czy folder istnieje), SDD.yaml biezacego modulu (project, level, owners, gate, backlog), wersja, port, plik tablicy.
- AC-C6: `yamlSet(text, changes)`: zmienia `project` i `backlog`, reszta linii i komentarze bez zmian; bledna wartosc backlog -> blad.
- AC-C7: `ownersSet(text, owners)`: podmienia blok `owners`, reszta pliku bez zmian; `approves` tylko z R, D, GLOSSARY, BR, PRD; pusta nazwa roli -> blad.
- AC-C8: zmiana nazwy albo usuniecie roli, ktorej nazwa wystepuje w plikach requirements/ -> 409 z lista plikow; nieuzywana -> zapis; porownanie bez wielkosci liter i polskich znakow ("właściciel procesu" znajduje "wlasciciel procesu" - znalezione przy tescie na kopii horizon-zlecenia).
- AC-C9: PUT /api/config nie zmienia `level` ani `gate_blocking_status` (proba -> 400) i dopisuje wiersz do requirements/CHANGELOG.md.
- AC-C10: DELETE projektu z listy `modules` usuwa tylko wpis w config.json; folder zostaje.
- AC-C11: podglad zmiany katalogu: ktore moduly z obecnej listy nie beda widoczne w nowym katalogu (i nie sa na liscie dodanych).
- AC-C12: demo: PUT/DELETE /demo/api/config -> 403; GET bez sciezek usera.
- AC-C13 (reczne, sprawdzone 2026-09-27 na kopii modulu: 375 px bez przewijania strony, pasek 47 px i h1 w tym samym miejscu na 5 zakladkach, ciemny motyw): 1200 px i 375 px - pasek z piecioma zakladkami bez przewijania strony w poziomie, naglowek w tym samym miejscu na wszystkich zakladkach; motyw jasny i ciemny.
- AC-C14 (reczne, sprawdzone 2026-09-27: blokada roli uzywanej w plikach, zapis backlogu + wpis CHANGELOG): zmiana roli w Konfiguracji -> SDD.yaml w module zmieniony, karta Modul pokazuje nowa role; zmiana katalogu -> lista modulow jak w podgladzie.

- AC-C15: `guide()` - sekcja zrodel opisuje `[Biz]`, `[App]`, `[Dok]`, `[AI]` w kolejnosci hierarchii; w tresci przewodnika nie ma `[B]`, `[D]`, `[P]`.
- AC-C16: w plikach sdd-kit (skille, szablony, tablica, demo, przyklad tablicy) nie ma `[B]`, `[D]` ani `[P]`, poza zdaniem o zgodnosci ze starymi plikami (linia z "dawniej"); CHANGELOG.md pominiety.

## Wyglad
Tokeny kolorow z `:root` jak panel (ui.css + strony); bez nowych kolorow. Tresc w kartach jak karty etapow panelu.
