---
name: handover
description: Przekazuje zatwierdzony spec do budowy - zadania do backlogu (Linear, Jira, Redmine lub plik), kazde z ID wymagania i kryterium, plus tabela sladowalnosci R -> task -> test. Uzyj, gdy user mowi "przekaz do dev", "do backlogu", "handover", "zrob taski".
---

# /sdd:handover

Etap 6. Piszesz sam. Bramka: ostatni raport validate bez BLOCK; jesli sa, odmow i wskaz.

## Kroki
1. Przeczytaj `SDD.yaml` (`backlog`), `03-spec/agent/*/tasks.md` (przy `light`: AC z SPEC.md).
2. Zbuduj liste zadan: tytul, opis w 2 zdaniach, `R-xxx`, `AC-xxx-n`, zaleznosci z plan.md, szacunek T-shirt (S/M/L) jesli user chce.
3. Backlog:
   - `file`: `04-validation/backlog-YYYY-MM-DD.md`
   - `linear` / `jira`: uzyj dostepnego narzedzia MCP. Przed utworzeniem zadan pokaz liste i zapytaj o zgode (to zapis do systemu zewnetrznego). ID zadania wpisz z powrotem do tabeli.
   - `redmine`: REST API przez skrypt kitu `node "${CLAUDE_PLUGIN_ROOT}/board/redmine.js"` (sekcja ponizej).

## Redmine (`backlog: redmine`)
Konfiguracja w `SDD.yaml`: `redmine_url` (adres), `redmine_project` (identyfikator z adresu `/projects/<identyfikator>`),
opcjonalnie `redmine_tracker` (nazwa; brak = tracker typu funkcjonalnosc / zadanie, nigdy "Bug"),
`redmine_format` (`markdown` / `textile`) i `redmine_ac_field` (pole wlasne na kryteria akceptacji - nazwa albo numer). Adres i projekt da sie tez ustawic w panelu
(Konfiguracja). Klucz API nigdy w plikach: zmienna `REDMINE_API_KEY` albo Pek kluczy macOS (usluga `redmine-api-key`).
1. Brak `redmine_url` / `redmine_project` -> zapytaj o nie i wpisz do `SDD.yaml` (PYTASZ). Brak klucza (komunikat
   skryptu) -> przekaz userowi komendy z komunikatu; nie pros o wklejenie klucza do czatu ani do plikow.
2. `node "${CLAUDE_PLUGIN_ROOT}/board/redmine.js" check --req requirements` -> nazwa projektu, trackery, wybrany
   tracker. Pokaz je w 1-2 linijkach. Blad -> pokaz komunikat i przerwij.
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
4. `04-validation/TRACEABILITY.md`: tabela R | AC | task | test (kolumna test pusta do wypelnienia przez dev, nazwa testu = AC-xxx-n).
5. Reguła dla dev, wpisz na koncu TRACEABILITY.md: zmiana wymagania po przekazaniu = zmiana PRD i ponowny handover, nigdy ticket "z boku".
6. Pod naglowkiem TRACEABILITY.md wpisz odcisk wymagan, liczony na koncu przebiegu:
   `node "${CLAUDE_PLUGIN_ROOT}/board/fingerprint.js" requirements` -> linia `Odcisk wymagan: sha256:<hex>`.
   Panel porownuje go z biezacym stanem plikow: zmiana wymagan po przekazaniu oznacza handover jako nieaktualny
   i cofa aktualny krok na /sdd:handover (po /sdd:spec --agent).

## Na koniec
CHANGELOG + 5 linijek: ile zadan, gdzie, ile R pokrytych.
