---
name: handover
description: Przekazuje zatwierdzony spec do budowy - zadania do backlogu (Linear, Jira lub plik), kazde z ID wymagania i kryterium, plus tabela sladowalnosci R -> task -> test. Uzyj, gdy user mowi "przekaz do dev", "do backlogu", "handover", "zrob taski".
---

# /sdd:handover

Etap 6. Piszesz sam. Bramka: ostatni raport validate bez BLOCK; jesli sa, odmow i wskaz.

## Kroki
1. Przeczytaj `SDD.yaml` (`backlog`), `03-spec/agent/*/tasks.md` (przy `light`: AC z SPEC.md).
2. Zbuduj liste zadan: tytul, opis w 2 zdaniach, `R-xxx`, `AC-xxx-n`, zaleznosci z plan.md, szacunek T-shirt (S/M/L) jesli user chce.
3. Backlog:
   - `file`: `04-validation/backlog-YYYY-MM-DD.md`
   - `linear` / `jira`: uzyj dostepnego narzedzia MCP. Przed utworzeniem zadan pokaz liste i zapytaj o zgode (to zapis do systemu zewnetrznego). ID zadania wpisz z powrotem do tabeli.
4. `04-validation/TRACEABILITY.md`: tabela R | AC | task | test (kolumna test pusta do wypelnienia przez dev, nazwa testu = AC-xxx-n).
5. Reguła dla dev, wpisz na koncu TRACEABILITY.md: zmiana wymagania po przekazaniu = zmiana PRD i ponowny handover, nigdy ticket "z boku".

## Na koniec
CHANGELOG + 5 linijek: ile zadan, gdzie, ile R pokrytych.
