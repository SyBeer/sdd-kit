---
name: handover
description: Przekazuje zatwierdzony spec do budowy - zadania do backlogu (Linear, Jira, Redmine lub plik), kazde z ID wymagania i kryterium, plus tabela sladowalnosci R -> task -> test. Uzyj, gdy user mowi "przekaz do dev", "do backlogu", "handover", "zrob taski".
---

# /sdd:handover

Etap 6. Piszesz sam. Bramka: ostatni raport validate bez BLOCK; jesli sa, odmow i wskaz.

## Kroki
1. Przeczytaj `SDD.yaml` (`backlog`), `03-spec/agent/*/tasks.md` (przy `light`: AC z SPEC.md).
2. Zbuduj liste zadan: tytul, opis w 2 zdaniach, `R-xxx`, `AC-xxx-n`, zaleznosci z plan.md, szacunek T-shirt (S/M/L) jesli user chce.
   Zadanie integracyjne (R dotyka systemu z `02-domain/SYSTEMS.md`): w opisie wiersz systemu - `S-xxx`, wlasciciel,
   kierunek i czestotliwosc, master dla - oraz odnosnik do sekcji "Proces systemowy", jesli jest. Zachowanie
   przy awarii idzie jako osobne kryterium w zadaniu (z kolumny `Przy awarii`, a jesli R ma takie AC - to AC).
3. Backlog:
   - `file`: `04-validation/backlog-YYYY-MM-DD.md`
   - `linear` / `jira`: uzyj dostepnego narzedzia MCP. Przed utworzeniem zadan pokaz liste i zapytaj o zgode (to zapis do systemu zewnetrznego). ID zadania wpisz z powrotem do tabeli.
   - `redmine`: REST API przez skrypt kitu `node "${CLAUDE_PLUGIN_ROOT}/board/redmine.js"` (sekcja ponizej).

4. `04-validation/TRACEABILITY.md`: tabela R | AC | task | test (kolumna test pusta do wypelnienia przez dev, nazwa testu = AC-xxx-n).
5. Reguła dla dev, wpisz na koncu TRACEABILITY.md: zmiana wymagania po przekazaniu = zmiana PRD i ponowny handover, nigdy ticket "z boku".
6. Pod naglowkiem TRACEABILITY.md wpisz odcisk wymagan, liczony na koncu przebiegu:
   `node "${CLAUDE_PLUGIN_ROOT}/board/fingerprint.js" requirements` -> linia `Odcisk wymagan: sha256:<hex>`.
   Panel porownuje go z biezacym stanem plikow: zmiana wymagan po przekazaniu oznacza handover jako nieaktualny
   i cofa aktualny krok na /sdd:handover (po /sdd:spec --agent).

## Redmine (`backlog: redmine`)
Konfiguracja w `SDD.yaml`: `redmine_url` (adres), `redmine_project` (identyfikator z adresu `/projects/<identyfikator>`),
opcjonalnie `redmine_tracker` (nazwa; brak = tracker typu funkcjonalnosc / zadanie, nigdy "Bug"),
`redmine_format` (`markdown` / `textile`), `redmine_ac_field` (pole wlasne na kryteria akceptacji - nazwa albo numer)
i `redmine_uat_link` (adres srodowiska UAT - skrypt wpisuje go w kazde zakladane i aktualizowane zadanie do pola
`redmine_uat_field`, domyslnie "Link do środowiska UAT"; nazwa albo numer). Adres i projekt da sie tez ustawic w panelu
(Konfiguracja). Klucz API: panel (Konfiguracja -> Klucz API Redmine) zapisuje go w `~/.sdd-kit/.env`; dziala tez
zmienna `REDMINE_API_KEY` i Pek kluczy macOS (`redmine-api-key`). **Nie otwieraj, nie wypisuj i nie kopiuj
`~/.sdd-kit/.env`** ani wyniku Peku kluczy - klucz czyta tylko skrypt; ustawia go czlowiek.
1. Brak `redmine_url` / `redmine_project` -> zapytaj o nie i wpisz do `SDD.yaml` (PYTASZ). Brak klucza (komunikat
   skryptu) -> powiedz userowi, zeby ustawil go w panelu (Konfiguracja -> Klucz API Redmine);
   nie pros o wklejenie klucza do czatu ani do plikow.
2. `node "${CLAUDE_PLUGIN_ROOT}/board/redmine.js" check --req requirements` -> nazwa projektu, trackery, wybrany
   tracker. Pokaz je w 1-2 linijkach. Blad -> pokaz komunikat i przerwij. `warning` (projekt ma pole na kryteria,
   a `redmine_ac_field` nie jest ustawione; albo pole z linkiem UAT, a `redmine_uat_link` nie jest ustawione) ->
   zaproponuj dopisanie do SDD.yaml (PYTASZ, adres srodowiska UAT podaje czlowiek) przed zalozeniem zadan -
   Redmine moze wymagac tych pol w przeplywie pracy.
3. Plik zadan `04-validation/redmine-YYYY-MM-DD.json`: `{ "tasks": [ { "key": "T-01", "subject": "[R-xxx] tytul",
   "description": "...", "after": ["T-00"], "issue": 123, "attachments": ["00-intake/ekran-zlecenia.png"] } ] }`.
   - `description` w formacie z `check` (`format`; `redmine_format` w SDD.yaml, domyslnie `markdown`). Markdown:
     ```
     <2 zdania opisu>

     **Wymaganie:** R-xxx

     | Kryterium | Given | When | Then |
     |---|---|---|---|
     | AC-xxx-1 | <stan> | <zdarzenie> | <wynik> |

     ![<co widac>](ekran-zlecenia.png)

     **Źródło:** 03-spec/PRD.md
     ```
     Kryteria doslownie z PRD, po polsku (z polskimi znakami); znak `|` w tresci zamien na `\|`. Kryterium, ktore
     nie dzieli sie na Given/When/Then - jedna komorka "Then" z cala trescia, Given i When `-`.
     Textile (`redmine_format: textile`): naglowek tabeli `|_. Kryterium |_. Given |_. When |_. Then |`, wiersze
     `| ... |`, obraz `!ekran-zlecenia.png!`, pogrubienie `*Wymaganie:*`; pusta linia przed tabela i po niej;
   - `after` = zaleznosci z `plan.md` (klucze zadan); skrypt zalozy relacje "poprzedza";
   - `issue` = numer z poprzedniego `TRACEABILITY.md`, gdy to zadanie bylo juz przekazane - wtedy aktualizacja
     zamiast nowego zadania (ponowny handover nie dubluje).
   - `acceptance` - tylko gdy `check` zwrocil `acField` (pole wlasne na kryteria): kryteria tego zadania w ukladzie,
     w jakim zespol wypelnia to pole w istniejacych zadaniach (zajrzyj do 1-2 zadan projektu); domyslnie kazde
     kryterium jako `**AC-xxx-n**`, `**Given** ...`, `**When** ...`, `**Then** ...` w osobnych liniach, kryteria
     rozdzielone pusta linia. Tabela w opisie zostaje - pole jest dla testerow UAT.
     Ten uklad czyta tez wtyczka UAT w Redmine (`uat_tests`, repo redmine-UAT-plugin): przy "Gotowy do UAT" kazde
     kryterium staje sie przypadkiem "Test UAT" z tytulem `AC-xxx-n: <Then>`. Nie zaczynaj linii w kryteriach od
     punktu listy (`- `, `1. `) - wtyczka uznalaby ja za osobny przypadek.
   - `attachments` (opcjonalnie) = pliki z `requirements/` dotyczace wymagania - zwykle zrzuty ekranu i dokumenty
     z `00-intake/` wskazane w zrodle R albo w INDEX.md. Skrypt je wysle i dolaczy; w opisie wstaw obraz po nazwie
     pliku (bez sciezki). Pliki, ktore zadanie juz ma, nie ida drugi raz. Nie dolaczaj surowca z danymi osobowymi
     bez pytania.
4. `... redmine.js push 04-validation/redmine-YYYY-MM-DD.json --req requirements --dry-run` -> pokaz liste: nowe /
   aktualizowane, tematy, zaleznosci. Zapis do systemu zewnetrznego: PYTASZ i czekasz na "tak".
5. `... redmine.js push 04-validation/redmine-YYYY-MM-DD.json --req requirements` -> JSON z `key`, `id`, `url`, `action`.
   Numery `#<id>` z linkiem `url` wpisz do tabeli zadan i do kolumny task w `TRACEABILITY.md`. Blad w polowie: skrypt
   wypisuje zadania juz zalozone - wpisz je mimo to (inaczej ponowny przebieg je zdubluje) i pokaz blad.
6. Zadania z poprzedniego `TRACEABILITY.md`, ktorych juz nie ma w wymaganiach: wypisz je userowi; nie zamykaj
   i nie usuwaj ich w Redmine sam.

## Status zadania w Redmine (`/sdd:handover status #<id> start|done [opis]`)
Dla agenta, ktory buduje aplikacje z `03-spec/agent/*/tasks.md`. Numer zadania z kolumny task w `TRACEABILITY.md`.
- `start` - zaczynasz zadanie: `node "${CLAUDE_PLUGIN_ROOT}/board/redmine.js" status <id> start --req requirements
  --note "Zaczynam: <R-xxx, co robie>"`. Status z `redmine_status_start` w SDD.yaml, bez niego np. "W realizacji".
- `done` - kod gotowy, testy kryteriow AC-xxx-n przechodza, commit zrobiony: `... status <id> done --note "Commit
  <hash>: <co zrobione>; kryteria: AC-xxx-1, AC-xxx-2; testy: <nazwy>"`. Status z `redmine_status_done`, bez niego
  np. "Code review".
- Sam komentarz bez zmiany statusu: `... comment <id> --note "..."`.
- Skrypt dopisuje do kazdego komentarza `Wygenerowane przez AI [Claude Code]`. Statusow UAT, zamykajacych
  i odrzucajacych nie ustawiasz - to robi czlowiek (skrypt i tak odmowi zamkniecia). Blad "Redmine nie pozwolil
  na przejscie" -> pokaz go userowi, nie probuj innego statusu.

## Na koniec
CHANGELOG + 5 linijek: ile zadan, gdzie, ile R pokrytych.
