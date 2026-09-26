# Spec: Widok postepu SDD (web, tylko podglad)

Status: zatwierdzony zakres 2026-09-26 (user: "na razie sam podglad")
Wersja docelowa: 0.2.0

## Cel
Prowadzacy widzi na jednej stronie, na ktorym etapie SDD jest projekt i jaka komende wpisac dalej,
bez otwierania plikow w `requirements/`.

## Zakres
1. Os 6 etapow: Intake, Interview, Domain, Spec, Validate, Handover. Kazdy ma status
   `todo` (nie zaczety) | `active` (w toku) | `done` (gotowy), liczony wylacznie z plikow.
2. Karta etapu: opis po ludzku (1 zdanie), liczniki, komenda do wpisania w Claude Code.
3. "Nastepny krok" = pierwszy etap nie-`done`, wyrozniony, z komenda.
4. Panel "Blokuje dev": Q `sprzeczne` + Q z etykieta `gate_blocking_status` (z SDD.yaml) w statusie `otwarte`/`zadane`.
5. Panel "Czeka na biznes": Q `zadane`, pogrupowane po roli ("Do kogo").
6. Ostatnie 5 wpisow z `requirements/CHANGELOG.md`.
7. Odswiezanie na zywo (SSE) po kazdej zmianie w `requirements/`.
8. Strona dziala w tym samym serwerze co tablica: `/` = postep, `/board` = tablica. Komenda `sdd-board` bez zmian.

## Poza zakresem
- Edycja czegokolwiek z przegladarki (odpowiedzi, zatwierdzanie) - kolejna wersja.
- Zaleznosci npm. Tylko Node stdlib.
- Parser YAML - SDD.yaml czytany regexem (pola plaskie: project, level, gate_blocking_status).

## Reguly statusu etapow
| Etap | todo | active | done |
|------|------|--------|------|
| Intake | 0 wierszy w INDEX.md i 0 plikow surowca | sa pliki surowca spoza INDEX.md | >=1 wiersz i 0 nieskatalogowanych |
| Interview | 0 Q i 0 D | Q `otwarte`/`zadane`/`sprzeczne` > 0 | >=1 Q lub D, zadne Q otwarte/zadane/sprzeczne |
| Domain | 0 hasel w GLOSSARY | hasla sa, nie wszystkie `zatwierdzone` | wszystkie hasla `zatwierdzone` |
| Spec | 0 R (PRD.md, przy light SPEC.md) | R sa, nie wszystkie `zatwierdzone` | wszystkie R `zatwierdzone` |
| Validate | brak `04-validation/validate-*.md` | jest raport, gotowosc < 100% | ostatni raport 100% |
| Handover | brak `04-validation/TRACEABILITY.md` | - | jest TRACEABILITY.md |

Wiersze szablonowe (zawierajace `<...>`, np. `### R-001 <tytul>`) nie licza sie.
Brak katalogu `requirements/` = komunikat "uruchom /sdd:init", bez bledu.

## Kryteria akceptacji (testy w `plugins/sdd/board/test/progress.test.js`)
- AC-1: swiezy `/sdd:init` (szablony) -> wszystkie etapy `todo`, nastepny krok Intake, komenda `/sdd:intake`.
- AC-2: plik w `00-intake/` spoza INDEX.md -> Intake `active`; po dopisaniu wiersza -> `done`, nastepny Interview.
- AC-3: liczniki Q po statusach zgadzaja sie z tabela QUESTIONS.md; `sprzeczne` i blokujace trafiaja do "Blokuje dev".
- AC-4: Q `zadane` z roli "sponsor" -> "Czeka na biznes: sponsor 1".
- AC-5: R z placeholderem `<tytul>` ignorowane; R z `Status: zatwierdzone` liczone jako zatwierdzone.
- AC-6: gotowosc czytana z najnowszego `validate-*.md` (np. "gotowosc: 60%").
- AC-7: brak `requirements/` -> `{ exists: false }`, bez wyjatku.
- AC-8 (reczne, w przegladarce): zmiana pliku w `requirements/` odswieza strone bez przeladowania; `/board` dalej dziala.

## Metryka produktowa
Prowadzacy przestaje otwierac pliki, zeby odpowiedziec "gdzie jestesmy" - weryfikacja w uzyciu na projekcie horizon.

## Wyglad
Brak DESIGN.md w kicie. Tokeny kolorow z `board/index.html` (`:root`) sa de facto systemem - te same, jasny i ciemny motyw.
