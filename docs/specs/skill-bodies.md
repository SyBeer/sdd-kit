# Spec: krotsze skille - rzadkie sekcje w references/ (zmiana 0.46.2)

Status: zlecone przez wlasciciela produktu 2026-10-25 po przegladzie /doctor skilli pod nowe modele (Opus/Sonnet 4.x-5.x
wykonuja polecenia doslownie, zle znosza dlugie przyklady, historie wersji w tresci i rozdete cialo skilla).

## Problem
Cialo kilku SKILL.md laduje sie w calosci przy kazdym wywolaniu, choc duza czesc dotyczy rzadkich przypadkow (Redmine,
`tidy`, `processes`, kontrakt, format raportu). W tresci sa znaczniki wersji (historia zmian), cztery przyklady
w miejscu jednego i sprzecznosci (krok 3 interview "czekaj na tak" wobec "odpowiedz jasna - zapis od razu").

## Cel
Te same zachowania skilli, krotsze ciala SKILL.md; szczegoly rzadkich przypadkow w `references/` ladowanych tylko wtedy,
gdy sa potrzebne. Bez zmiany zachowania.

Metryka: suma linii szesciu SKILL.md (interview, handover, board, spec, init, validate) co najmniej 25% mniejsza niz
w 0.46.1 (592 linie).

## Zakres
- interview, handover, board, spec, init, validate. Pozostale skille (intake, domain, status) bez zmian, poza usunieciem
  odwolan do `docs/specs/` (tego folderu nie ma w paczce pluginu).
- Poza zakresem: zmiana opisow (`description`), nowe zachowania, zmiany w panelu.

## Kryteria akceptacji
- **AC-SB1** Pliki referencyjne istnieja i SKILL.md wskazuje kazdy z warunkiem zaladowania:
  `interview/references/style.md` (styl BIZ), `handover/references/redmine.md` (`backlog: redmine`, `status`),
  `board/references/tidy.md`, `board/references/processes.md`, `spec/references/contract.md` (wymaganie kontraktu),
  `validate/references/report-format.md` (wiersz kontroli 9, odcisk).
- **AC-SB2** Zadna tresc w `skills/` nie odwoluje sie do `docs/specs/` ani nie ma znacznikow wersji `(0.x.y`.
- **AC-SB3** interview: regula "odpowiedz jasna -> zapis od razu / niejasna -> parafraza jako pytanie" jest jedna
  tabela w kroku 3 (BIZ i INZ obok siebie); bez bezwarunkowego "Czekaj na \"tak\""; jeden przyklad z fv-manager
  (Q-027: pytanie i parafraza z powodem); zasady formulowania pytan jako cel dodatni.
- **AC-SB4** board: numeracja krokow bez "6a"; `tidy` i `processes` w `references/`.
- **AC-SB5** spec: zwykle "zaproponuj" zamiast "ZAPROPONUJ"; akapit kontraktu w `references/contract.md`.
- **AC-SB6** init: liczba rzeczy w pytaniu zgadza sie z lista; "Nie rob" z powodem przy kazdym punkcie.
- **AC-SB7** validate: zdanie wyjasnia, co znaczy "odtwarzalny" (ten sam stan plikow -> ten sam raport, wiec zapis
  bez pytania).
- **AC-SB8** Suma linii szesciu SKILL.md <= 444 (25% mniej niz 592).
- **AC-SB9** Testy, ktore sprawdzaja tresc skilli, czytaja SKILL.md razem z `references/` (`test/skill-text.js`) -
  dotychczasowe kryteria (AC-IS*, AC-RM8, AC-BC4, AC-B52, AC-SY*, AC-76 i in.) dalej przechodza.

## Zmiana 0.48.0 (2026-11-17): kaskada ustawia status R - wymagania sdd-kit-wymagania R-014 AC-014-4
Przeglad TRACEABILITY (luka K2): kaskada tylko dopisywala dotkniete R do sekcji 6 PRD, a pole `Status` zostawalo
`zatwierdzone`. Panel liczy wymagania do przegladu po `Status` (progress.js), wiec pokazywal 0. AC-014-4: zalezne R
maja status "do przegladu" i sa wypisane w sekcji 6.
- **AC-SB10** (AC-014-4) Szablon CLAUDE.md (sekcja Kaskada wplywu), skille interview (zapis odpowiedzi), intake
  (`podmywa model`) i spec (sekcja 6): kazde dotkniete R dostaje `Status: do przegladu (<powod>, <data>)` i trafia do
  sekcji 6; ponowne zatwierdzenie - tylko za zgoda czlowieka.

## Zmiana 0.48.1 (2026-11-17): awaria Linear/Jira w trakcie przekazania - wymagania sdd-kit-wymagania R-036 AC-036-2
Przeglad TRACEABILITY (luka K2): skill handover dla Linear/Jira mial jedna linie (MCP, zgoda) bez instrukcji na awarie
w trakcie - dla Redmine taka jest (references/redmine.md, krok 5). AC-036-2: system nie odpowiada w trakcie -> kit staje,
numery juz zalozonych zadan sa w tabeli sledzenia. (S-007 dzis nieuzywany - [Biz] Q-033.)
- **AC-SB11** (AC-036-2) Skill handover, `linear` / `jira`: zadania po jednym, numer kazdego od razu do tabeli zadan
  i `TRACEABILITY.md`; blad albo brak odpowiedzi -> stop (bez ponawiania w petli), numery juz zalozonych zostaja
  w tabeli, pokaz blad i liste niezalozonych.
