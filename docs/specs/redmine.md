# Spec: Backlog w Redmine (/sdd:handover)

Status: zatwierdzony zakres 2026-10-04 (user: "Dopisz obsluge Redmine do skilla /sdd:handover, zeby zadania ze
specyfikacji trafialy prosto do backlogu w Redmine")
Wersja docelowa: 0.29.0

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
- AC-RM9 (reczne, przy pierwszym prawdziwym Redmine): przekazanie zaklada zadania z zaleznosciami; ponowne -
  aktualizuje te same numery.
