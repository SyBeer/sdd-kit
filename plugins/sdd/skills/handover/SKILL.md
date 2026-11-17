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
   - `linear` / `jira`: uzyj dostepnego narzedzia MCP. Przed utworzeniem zadan pokaz liste i zapytaj o zgode (to zapis do systemu zewnetrznego). Zakladaj po jednym; ID kazdego wpisz od razu do tabeli zadan i `TRACEABILITY.md`.
     System nie odpowiada albo zwraca blad: zatrzymaj sie bez ponawiania w petli, numery juz zalozonych zostaja w tabeli; pokaz blad i liste niezalozonych.
   - `redmine`: REST API przez skrypt kitu `node "${CLAUDE_PLUGIN_ROOT}/board/redmine.js"`. Przeczytaj
     `references/redmine.md` (konfiguracja, klucz API - czyta go tylko skrypt, plik zadan, `check` -> `push --dry-run` -> `push`)
     i postepuj wg niego.
4. `04-validation/TRACEABILITY.md`: tabela R | AC | Rodzaj | task | test (kolumna test pusta do wypelnienia przez dev,
   nazwa testu = AC-xxx-n). `Rodzaj` = `kontrakt - wejscie|wyjscie` dla R kontraktu (linia `Rodzaj:` w PRD), inaczej `-`.
   R kontraktu -> w kolumnie test test kontraktowy (np. test konsumenta/dostawcy); przy `kind: service` obowiazkowy.
5. Reguła dla dev, wpisz na koncu TRACEABILITY.md: zmiana wymagania po przekazaniu = zmiana PRD i ponowny handover, nigdy ticket "z boku".
6. Pod naglowkiem TRACEABILITY.md wpisz odcisk wymagan, liczony na koncu przebiegu:
   `node "${CLAUDE_PLUGIN_ROOT}/board/fingerprint.js" requirements` -> linia `Odcisk wymagan: sha256:<hex>`.
   Panel porownuje go z biezacym stanem plikow: zmiana wymagan po przekazaniu oznacza handover jako nieaktualny
   i cofa aktualny krok na /sdd:handover (po /sdd:spec --agent).

## Status zadania w Redmine (`/sdd:handover status #<id> start|done [opis]`)
Dla agenta, ktory buduje aplikacje z `03-spec/agent/*/tasks.md`: zmiana statusu i komentarz w zadaniu Redmine.
Przeczytaj `references/redmine.md`, sekcja "Status zadania w Redmine", i postepuj wg niej.

## Na koniec
CHANGELOG + 5 linijek: ile zadan, gdzie, ile R pokrytych.
