# Changelog

## [0.4.1] - 2026-09-26
- Panel: przelacznik modulu w tytule ("Wymagania do modułu: <nazwa> ▾") zamiast listy i przycisku po prawej.
  Menu: moduly z poziomem "pełny"/"lekki", na dole "+ Nowy moduł…"; Escape, klik poza menu, strzalki.
- Poziom pokazywany po polsku ("poziom pełny" zamiast "poziom full").

## [0.4.0] - 2026-09-26
- Panel: baner "Aktualny krok" zamiast "Nastepny krok".
- Intake: lista wrzuconych plikow (nazwa, rozmiar, "dodane" / "czeka na spis"), najnowsze na gorze,
  zwinieta przy wiecej niz 8 plikach, z przewijaniem.
- Intake: plik o identycznej tresci jak juz wrzucony (SHA-256) jest pomijany z informacja, pod jaka nazwa juz jest.
- Log uploadu: podsumowanie "zapisano N, pominieto M, bledy K" i tylko duplikaty/bledy z nazwami.
- Baner i karty: dopisek "Uruchom w Claude Code:" przed komenda; baner ma instrukcje "Co zrobic" (3 kroki) dla kazdego etapu.
- Testy AC-14, AC-15, AC-17 (17/17).

## [0.3.0] - 2026-09-26
- Panel: naglowek "Wymagania do modułu: <nazwa>", przelacznik modulow, "+ Nowy moduł" (folder obok, szablony, SDD.yaml, git init).
- Intake: zalaczanie plikow z przegladarki (przycisk / przeciagnij-upusc, do 25 MB) do `requirements/00-intake/`,
  oczyszczanie nazw, bez nadpisywania.
- Tablica: przycisk "← Panel modułu"; tablica przelacza sie razem z modulem; board.json powstaje dopiero przy pierwszym zapisie.
- Zapisy tylko z panelu (naglowek X-SDD + Host lokalny).
- `/sdd:init`: pytanie o zatwierdzajacych jezykiem biznesu zamiast skrotow R/D/GLOSSARY/BR.
- `board/modules.js` + testy AC-9..AC-12.

## [0.2.0] - 2026-09-26
- Widok postepu SDD pod `/` serwera tablicy (`sdd-board`): 6 etapow ze statusem z plikow, liczniki,
  nastepny krok z komenda, "blokuje dev", "czeka na biznes", ostatnie zmiany, odswiezanie SSE. Tylko podglad.
- Tablica warsztatowa przeniesiona pod `/board` (link w obie strony).
- `board/progress.js` + testy `node --test` (AC-1..AC-7 ze `docs/specs/progress-ui.md`).

## [0.1.0] - 2026-09-26
- Import kitu do repo `_DEV_/repos/sdd-kit` (wczesniej ~/Downloads/sdd-kit).
- Plugin `sdd`: skille init, intake, interview, domain, spec, validate, handover, status, board.
- Tablica warsztatowa `board/` (Node, SSE, port 4242), instalatory `install.sh` / `install.ps1`.
