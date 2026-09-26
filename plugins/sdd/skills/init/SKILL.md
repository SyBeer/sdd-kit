---
name: init
description: Inicjalizuje proces SDD w biezacym repo - tworzy requirements/ z szablonami i CLAUDE.md z zasadami. Uzyj, gdy user mowi "zacznij SDD", "zainicjuj wymagania", "sdd init", albo gdy w repo nie ma requirements/ a user chce pracowac z wymaganiami.
---

# /sdd:init

Tworzy szkielet procesu w biezacym projekcie.

## Kroki
1. Sprawdz, czy `requirements/` juz istnieje. Jesli tak, zatrzymaj sie i zapytaj, czy nadpisac szablony (domyslnie NIE, tylko dopisz brakujace pliki).
2. Skopiuj `${CLAUDE_PLUGIN_ROOT}/templates/requirements/` do `./requirements/`.
3. Jesli `CLAUDE.md` nie istnieje, skopiuj `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.md`. Jesli istnieje, dopisz jego tresc na koncu pod naglowkiem `# Zasady pracy z wymaganiami (SDD)`, nie nadpisuj.
4. Zapytaj o dwie rzeczy, po kolei, nie naraz:
   - nazwa projektu (wpisz do `SDD.yaml`)
   - poziom: `full` czy `light`. Argument `--light` pomija pytanie. Przy `light` usun `03-spec/PRD.md`, zostaw `SPEC.md`. Przy `full` odwrotnie.
5. Zapytaj o zatwierdzajacych jezykiem biznesu, dwa pytania po kolei (bez skrotow R/D/GLOSSARY/BR w pytaniu):
   - "Kto akceptuje wymagania, decyzje i slownik pojec? Podaj role, nie osobe (np. wlasciciel procesu, kierownik dzialu)."
     -> `owners: - role: "<odpowiedz>"  approves: [R, D, GLOSSARY, BR]`
   - "Kto zatwierdza caly dokument na koniec? (opcjonalnie, np. sponsor, zarzad; puste = ta sama osoba)"
     -> jesli podano: `- role: "<odpowiedz>"  approves: [PRD]`
   Zastap cala liste `owners` z szablonu (usun przykladowa "ksiegowosc").
6. Dopisz do `CHANGELOG.md`: `YYYY-MM-DD | init | utworzono strukture, poziom <level> | -`.
7. Wypisz w 5 linijkach, co powstalo i jaki jest nastepny krok: wrzucic surowiec do `00-intake/` i odpalic `/sdd:intake`.

## Nie rob
- nie tworz commitow, user decyduje
- nie wypelniaj szablonow trescia, to robia kolejne skille
