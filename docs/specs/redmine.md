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
     (male litery, cyfry, `-`, `_`), `redmine_tracker` - nazwa trackera (opcjonalnie; brak = pierwszy tracker projektu);
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
- AC-RM9 (reczne, przy pierwszym prawdziwym Redmine): przekazanie zaklada zadania z zaleznosciami; ponowne -
  aktualizuje te same numery.
