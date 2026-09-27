---
name: init
description: Inicjalizuje proces SDD w biezacym repo - tworzy requirements/ z szablonami i CLAUDE.md z zasadami. Uzyj, gdy user mowi "zacznij SDD", "zainicjuj wymagania", "sdd init", albo gdy w repo nie ma requirements/ a user chce pracowac z wymaganiami.
---

# /sdd:init

Tworzy szkielet procesu w biezacym projekcie.

## Kroki
1. Sprawdz, czy `requirements/` juz istnieje. Jesli tak, zatrzymaj sie i zapytaj, czy nadpisac szablony (domyslnie NIE, tylko dopisz brakujace pliki).
2. Skopiuj `${CLAUDE_PLUGIN_ROOT}/templates/requirements/` do `./requirements/`.
3. `CLAUDE.md` - nigdy nie nadpisuj istniejacego:
   - Jesli w `CLAUDE.md` jest juz naglowek `# Zasady pracy z wymaganiami (SDD)`, pomin ten krok (init uruchomiony
     drugi raz nie dopisuje zasad ponownie).
   - Jesli `CLAUDE.md` istnieje, dopisz na koncu tresc `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.md` tak, jak jest -
     szablon zaczyna sie od naglowka `# Zasady pracy z wymaganiami (SDD)`, nie dodawaj drugiego.
   - Jesli `CLAUDE.md` nie ma, a repo zawiera kod (np. `src/`, `package.json`, `pyproject.toml`, `requirements.txt`,
     `Dockerfile`): utworz `CLAUDE.md` z krotka sekcja `# Projekt` (nazwa, 1-2 zdania z README, jesli jest) i pod nia
     tresc szablonu. Wymagania to czesc repo aplikacji, nie cale repo.
   - Jesli `CLAUDE.md` nie ma i repo nie zawiera kodu (osobne repo wymagan): skopiuj szablon.
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
