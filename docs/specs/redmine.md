# Spec: Backlog w Redmine (/sdd:handover)

Status: zatwierdzony zakres 2026-10-04 (user: "Dopisz obsluge Redmine do skilla /sdd:handover, zeby zadania ze
specyfikacji trafialy prosto do backlogu w Redmine")
Wersja docelowa: 0.28.4

## Cel
Zadania z przekazania (`/sdd:handover`) trafiaja do projektu w Redmine bez przepisywania recznie, kazde z numerem
wymagania i kryteriami akceptacji, z zaleznosciami miedzy zadaniami i numerem zadania z Redmine z powrotem
w tabeli sladowalnosci. Ponowne przekazanie po zmianie wymagan aktualizuje istniejace zadania, nie dubluje ich.

## Zakres
1. Konfiguracja (SDD.yaml, plaskie klucze jak reszta pliku):
   - `backlog: redmine`;
   - `redmine_url` - adres Redmine (`https://...` albo `http://...`), `redmine_project` - identyfikator projektu
     (male litery, cyfry, `-`, `_`), `redmine_tracker` - nazwa trackera (opcjonalnie; brak = pierwszy tracker typu funkcjonalnosc / zadanie, AC-RM10);
   - klucz API: zmienna `REDMINE_API_KEY`, a na macOS - gdy jej brak - Pek kluczy (`security find-generic-password
     -s redmine-api-key -w`). Klucz nigdy w plikach, w wyjsciu skryptu ani w czacie.
   - Panel, zakladka Konfiguracja: `redmine` na liscie backlogow; przy `redmine` pola "Adres Redmine" i "Projekt
     w Redmine" (zapis do SDD.yaml jak backlog, walidacja jak wyzej).
2. Skrypt `board/redmine.js` (Node, bez zaleznosci):
   - `check [--req <requirements>]` - polaczenie i projekt: nazwa projektu, trackery projektu, wybrany tracker;
     JSON na wyjsciu; blad -> komunikat po polsku i kod 1 (brak klucza, 401, 404 projektu, brak sieci);
   - `push <zadania.json> [--req <requirements>] [--dry-run]` - plik `{ "tasks": [ { "key", "subject", "description",
     "after": [key...], "issue": <id istniejacego zadania, opcjonalnie> } ] }`:
     - bez `issue` -> POST `/issues.json` (projekt, tracker, temat, opis); z `issue` -> PUT `/issues/<id>.json`
       (temat, opis) - ponowne przekazanie aktualizuje, nie dubluje;
     - `after` -> relacja "poprzedza" (POST `/issues/<id poprzednika>/relations.json`, `relation_type: precedes`);
       istniejaca relacja (422) nie jest bledem;
     - wynik JSON: `[{ key, id, url, action: created|updated|dry-run }]`; `--dry-run` nic nie wysyla (takze bez klucza);
     - blad w polowie -> stop, wynik z dotychczasowymi zadaniami i komunikat (zeby wpisac je do tabeli i nie dublowac).
3. Skill `/sdd:handover`, `backlog: redmine`:
   - brak `redmine_url` / `redmine_project` -> zapytaj o nie i wpisz do SDD.yaml (PYTASZ); brak klucza -> powiedz, jak
     go ustawic (zmienna albo Pek kluczy), nie proś o wklejenie klucza w czacie;
   - `check`, potem plik zadan w `04-validation/redmine-YYYY-MM-DD.json` (temat `[R-xxx] tytul`, opis: 2 zdania,
     R, kryteria AC-xxx-n, zrodlo w PRD), `issue` z poprzedniego TRACEABILITY.md, gdy zadanie juz bylo przekazane;
   - `push --dry-run`, lista do zatwierdzenia (zapis do systemu zewnetrznego - PYTASZ), potem `push`;
   - numery `#<id>` (z linkiem) do tabeli zadan i TRACEABILITY.md; zadania usuniete z wymagan - wypisz, nie zamykaj sam.
4. Panel i przewodnik: Redmine wymieniony obok Linear i Jira.

## Kryteria akceptacji
- AC-RM1: `readConfig(yaml, env)` -> `{ url (bez / na koncu), project, tracker }`; brak url/projektu -> blad z nazwa
  klucza; zly url (bez http/https) lub zly identyfikator -> blad.
- AC-RM2: `issueBody(task, projectId, trackerId)` -> `{ issue: { project_id, tracker_id, subject, description } }`;
  przy aktualizacji bez `project_id` i `tracker_id`.
- AC-RM3: `check` na lokalnym serwerze udajacym Redmine: naglowek `X-Redmine-API-Key`, nazwa projektu, trackery,
  wybrany tracker (nazwa z konfiguracji albo pierwszy); 401 -> komunikat o kluczu; 404 -> o projekcie.
- AC-RM4: `push`: zadanie bez `issue` -> POST (utworzone, id i url w wyniku), z `issue` -> PUT; `after` -> relacja
  precedes od poprzednika; 422 przy relacji nie przerywa; `--dry-run` -> zero zapytan zapisujacych.
- AC-RM5: blad przy drugim zadaniu -> kod 1, w wyniku pierwsze zadanie z id.
- AC-RM6: klucz nie pojawia sie w wyjsciu skryptu; brak klucza (bez `--dry-run`) -> komunikat, jak go ustawic.
- AC-RM7: `yamlSet` przyjmuje `backlog: redmine`, `redmine_url`, `redmine_project` (walidacja AC-RM1); serwer zapisuje
  je z Konfiguracji; `BACKLOGS` zawiera `redmine`.
- AC-RM8: skill handover opisuje `redmine` (check, plik zadan, dry-run, zgoda, push, numery do TRACEABILITY,
  klucz poza plikami).
- AC-RM10 (po pierwszym prawdziwym Redmine: pierwszy tracker projektu to "Błąd"): bez `redmine_tracker` wybierany
  pierwszy tracker typu funkcjonalnosc / zadanie (Feature, Funkcjonalność, Story, Zadanie, Task, Wymaganie), nigdy
  "Bug" / "Błąd", chyba ze innego nie ma; nazwa z konfiguracji wygrywa (bez wielkosci liter), nieznana -> blad z lista.
- AC-RM11 (po tescie na Redmine usera: Markdown renderuje tabele i obrazy, Textile nie): `redmine_format` w SDD.yaml
  (`markdown` domyslnie albo `textile`, inne -> blad); `check` podaje format. Skill buduje opis w tym formacie:
  kryteria jako tabela Kryterium | Given | When | Then (Markdown `| a | b |` + `|---|`, Textile `|_. a |`),
  obrazy `![opis](plik)` / `!plik!`; znak `|` w komorce zamieniany na `\|`.
- AC-RM12: zadanie z `attachments: ["00-intake/ekran.png", ...]` (sciezki wzgledem `requirements/`): kazdy plik
  wysylany przez POST `/uploads.json?filename=<nazwa>` (`application/octet-stream`), token w `uploads` zapytania o zadanie
  (`filename`, `content_type` z rozszerzenia); przy aktualizacji pliki, ktore zadanie juz ma (ta sama nazwa), pomijane;
  sciezka poza `requirements/` albo brak pliku -> blad przed wyslaniem czegokolwiek; `--dry-run` liczy zalaczniki,
  nic nie wysyla.
- AC-RM13 (user: "dodaj pole Kryteria akceptacji"; projekt ma pole wlasne "Kryteria akceptacji", id 1, Markdown,
  zespol wpisuje `**Given** ...` / `**When** ...` / `**Then** ...` w osobnych liniach): `redmine_ac_field` w SDD.yaml -
  nazwa pola (bez wielkosci liter) albo jego numer. Nazwa -> numer z pola `custom_fields` zadan projektu (GET
  `/issues.json?project_id=..&tracker_id=..&status_id=*&limit=1`, potem bez trackera); `/custom_fields.json` wymaga
  admina, wiec go nie uzywamy. Nie znaleziono -> blad z prosba o numer pola. `check` podaje pole (`acField`).
  Zadanie z `acceptance` -> `custom_fields: [{ id, value }]` przy tworzeniu i aktualizacji; bez `redmine_ac_field`
  albo bez `acceptance` - bez `custom_fields`. Skill: kryteria w uklad zespolu, kazde z naglowkiem `**AC-xxx-n**`,
  kryteria rozdzielone pusta linia; w opisie tabela zostaje.
- AC-RM14 (0.28.7, zgloszenie usera: wkleil adres projektu w pole adresu i "/projects/x" w pole projektu -> blad):
  `yamlSet` rozdziela adres projektu `.../projects/<id>[/...]` na `redmine_url` (czesc przed `/projects/`) i
  `redmine_project` (gdy projekt nie podany albo tez wskazuje adres); z projektu zdejmuje `/projects/`, `projects/`
  i caly adres; zly identyfikator po tym - blad jak dotad.
- AC-RM15 (0.28.8, user: "dodaj zmiane statusu w Redmine przez agenta; dopisz, ze wygenerowane przez AI [Claude Code]"):
  `redmine.js status <id> <start|done|"nazwa statusu"> [--note "..."]` - status z `/issue_statuses.json`; `start` / `done`
  = `redmine_status_start` / `redmine_status_done` z SDD.yaml, bez nich pierwszy pasujacy: start - W realizacji / W toku /
  In Progress, done - Code review / Do przegladu / Resolved / Rozwiazany; status zamykajacy (`is_closed`) -> odmowa
  (zamyka czlowiek); nieznana nazwa -> blad z lista statusow. PUT `{ issue: { status_id, notes } }`, potem GET zadania:
  status inny niz zadany -> blad "Redmine nie pozwolil na przejscie" (przeplyw pracy roli). Wynik JSON `{ id, url, status }`.
- AC-RM16: `redmine.js comment <id> --note "..."` - sam komentarz (PUT `notes`). Kazdy komentarz od agenta (status
  i comment) konczy sie linia `_Wygenerowane przez AI [Claude Code]_`; opis zadania z `push` - ta sama linia na koncu
  (bez dublowania przy ponownym przekazaniu).
- AC-RM17: skill handover - wariant `/sdd:handover status #<id> start|done [opis]` dla agenta budujacego (numer z
  TRACEABILITY.md, przy done w opisie commit i kryteria AC); zakaz statusow UAT i zamykajacych; info.js - wariant
  w przewodniku; szablon CLAUDE.md - kiedy agent zmienia status.
- AC-RM18 (prawdziwy Redmine usera: pole "Kryteria akceptacji" wymagane przy zmianie statusu, 422 "nie moze byc puste"):
  `check` zwraca `customFields` (pola widziane w zadaniach projektu) i `warning`, gdy projekt ma pole z "kryteri" /
  "acceptance" w nazwie, a `redmine_ac_field` nie jest ustawione; blad 422 "nie moze byc puste" / "can't be blank"
  przy zmianie statusu -> komunikat z wyjasnieniem i co zrobic. Skill: przy `warning` zaproponuj dopisanie pola (PYTASZ).
- AC-RM19 (projekt usera bez zadan - `check` nie widzial pol): pola wlasne z `GET /projects/<id>.json?include=trackers,
  issue_custom_fields` (Redmine 4.2+, bez admina); starsze wersje bez `issue_custom_fields` - z zadan projektu jak dotad.
  Nazwa w `redmine_ac_field` rozpoznawana tez w pustym projekcie.
- AC-RM9 (reczne, przy pierwszym prawdziwym Redmine): przekazanie zaklada zadania z zaleznosciami; ponowne -
  aktualizuje te same numery.

# Zmiana 0.28.14 (2026-10-04): wtyczka UAT po stronie Redmine

Pytanie usera: "czy plugin do REDMINE jest czescia SDD-KIT?" - nie: wtyczka `uat_tests` (repo `redmine-UAT-plugin`,
Ruby, dziala wewnatrz Redmine) to osobny projekt. sdd-kit wypelnia pole "Kryteria akceptacji", wtyczka przy statusie
"Gotowy do UAT" robi z niego podzadania "Test UAT" i blokuje akceptacje, dopoki ktorys przypadek nie jest zaliczony.

Zgodnosc formatu (sprawdzona 2026-10-04 parserem `UatTests.parse_cases` z wtyczki 0.5.0, offline): domyslny uklad
pola z `/sdd:handover` (`**AC-xxx-n**`, potem linie `**Given** ...`, `**When** ...`, `**Then** ...`) daje jeden
przypadek na kryterium, tytul `AC-xxx-n: <tresc Then>`, tresc z Given/When/Then. Punkt listy bez wciecia (`- `, `1. `)
na poczatku linii wtyczka traktuje jako nowy przypadek - w kryteriach go nie uzywamy.

## Zakres
1. Przewodnik (Jak to dziala, sekcja Integracja z Redmine): punkt o wtyczce UAT - co robi, ze to osobny projekt
   instalowany w Redmine, adres repo; agent konczy na "Code review", "Gotowy do UAT" ustawia czlowiek (wtyczka wymaga
   wtedy linku do srodowiska UAT).
2. Skill handover: przy `acceptance` - zgodnosc z wtyczka UAT (jedno kryterium = jeden przypadek testowy, bez linii
   zaczynajacych sie od `- ` / `1. `).

## Kryteria akceptacji
- AC-RM20: sekcja przewodnika zawiera "uat_tests", "Gotowy do UAT", "Test UAT", adres
  `github.com/SyBeer/redmine-UAT-plugin`; skill handover wspomina wtyczke UAT i zakaz punktow listy w kryteriach.

# Zmiana (niewydane, 2026-10-04): link do srodowiska UAT z SDD.yaml

Prosba usera (projekt fv-manager): "dodaj link UAT do SDD.yaml w sdd-kit". Powod: w prawdziwym Redmine pole
"Link do środowiska UAT" stalo sie obowiazkowe w przeplywie (zadania bez niego "nie spelniaja kryteriow flow");
/sdd:handover go nie wypelnial i 16 zadan trzeba bylo uzupelnic recznie.

## Zakres
1. SDD.yaml: `redmine_uat_link` (adres http/https) i opcjonalnie `redmine_uat_field` (nazwa albo numer pola,
   domyslnie "Link do środowiska UAT"). Pole odnajdywane jak `redmine_ac_field` (z projektu albo z zadan).
2. push: link w `custom_fields` kazdego nowego i aktualizowanego zadania (obok kryteriow).
3. check: `uatField` w wyniku; `warning`, gdy projekt ma pole z linkiem UAT, a `redmine_uat_link` nie jest ustawione.
4. Szablon SDD.yaml, skill handover i przewodnik (Integracja z Redmine) opisuja nowe klucze.

## Kryteria akceptacji
- AC-RM21: z `redmine_uat_link` i `redmine_uat_field` check zwraca `uatField`, push wpisuje link w nowe (POST) i
  aktualizowane (PUT) zadania; nieznana nazwa pola - blad z prosba o numer (`redmine_uat_field`); bez
  `redmine_uat_link` zadania sa bez pola, a check podpowiada klucz; adres inny niz http/https - blad w readConfig.
