# sdd-kit

Nowy tutaj? Otworz START-TUTAJ.md, potem uruchom `bash install.sh` (kreator).

Plugin Claude Code do zbierania i analizy wymagan biznesowych metoda Spec-Driven Development.
Uniwersalny: firma (OLG), klient (CGBlue), dom. Jeden proces, dwa poziomy ceremonii (full / light).

## Instalacja (osoba prowadzaca, ma Claude Code)

macOS / Linux, z rozpakowanego folderu:

    bash install.sh

Windows (PowerShell):

    .\install.ps1

Jedna komenda z GitHuba (po wrzuceniu repo):

    curl -fsSL https://raw.githubusercontent.com/<user>/sdd-kit/main/install.sh | SDD_REPO=<user>/sdd-kit bash

Instalator: sprawdza Claude Code, Git, Node.js -> rejestruje kit jako zrodlo dodatkow -> instaluje
dodatek 'sdd' -> weryfikuje -> dodaje komende terminalowa `sdd-board` -> opcjonalnie zaklada projekt.
Aktualizacja: `bash install.sh --update`. Usuniecie: `bash install.sh --uninstall`.

Biznes nie instaluje nic: patrzy na tablice, odpowiada na pytania w pliku, zatwierdza dokumenty.

## Start w nowym projekcie

    /sdd:init            tworzy requirements/ i CLAUDE.md w repo projektu
    /sdd:init --light    wersja lekka (jeden SPEC.md, bez PRD)

## Skille

| Skill          | Etap | Autonomia |
|----------------|------|-----------|
| /sdd:intake    | 1 katalogowanie surowca | pisze sam (odtwarzalne) |
| /sdd:interview | 2 pytania i odpowiedzi (live / async) | pyta przed D i zmiana A |
| /sdd:domain    | 3 slownik, aktorzy, encje, reguly | pyta przed zmiana slownika |
| /sdd:spec      | 4 PRD; --agent pliki dla agenta; --light SPEC.md | pyta przed nowym R |
| /sdd:validate  | 5 kontrola jakosci, % gotowosci | pisze sam |
| /sdd:handover  | 6 backlog i sladowalnosc | pisze sam, pyta przed zapisem do Linear/Jira |
| /sdd:status    | stan w 20 linijkach | pisze sam |
| /sdd:board     | lokalna tablica z karteczkami na zywo (bez Miro) | rysuje sam, do plikow po "tak" |

## Widok postepu (web)

W folderze projektu uruchom `sdd-board` i otworz http://localhost:4242. Strona pokazuje 6 etapow
(Intake -> Handover) ze statusem liczonym z plikow w `requirements/`, liczniki, "nastepny krok"
z komenda do wpisania, co blokuje dev, co czeka na biznes i ostatnie zmiany. Odswieza sie sama.
Tylko podglad, nic nie zapisuje. Spec: `docs/specs/progress-ui.md`.
Testy: `node --test plugins/sdd/board/test/progress.test.js`

## Tablica warsztatowa (bez Miro)

W osobnym oknie terminala, w folderze projektu:

    node ~/.claude/plugins/... /board/server.js requirements/01-interview/board.json
    (dokladna sciezke podaje /sdd:board start)

Otworz http://localhost:4242/board. Agent stawia karteczki piszac do board.json, strona odswieza sie sama.
Ty mozesz przesuwac i dopisywac karteczki w przegladarce, agent to widzi.
Po warsztacie: /sdd:board sync przenosi karteczki do plikow. Przyklad: plugins/sdd/board/example-zlecenia.json

## Pliki w projekcie

    requirements/
      SDD.yaml              konfiguracja: poziom, role zatwierdzajace, backlog
      CHANGELOG.md          jedna linia na kazdy zapis automatyczny
      00-intake/INDEX.md    katalog surowca z wiarygodnoscia [B]/[P]/[D]/[AI]
      01-interview/         QUESTIONS.md, ASSUMPTIONS.md, DECISIONS.md, rundy, sesje
      02-domain/            GLOSSARY.md, ACTORS.md, ENTITIES.md, RULES.md
      03-spec/              PRD.md (zrodlo prawdy) lub SPEC.md; agent/ GENEROWANE
      04-validation/        raporty validate, TRACEABILITY.md, backlog

## Zasady (pelne w plugins/sdd/templates/CLAUDE.md)

1. Wymaganie istnieje, gdy jest w repo z data i zrodlem. Reszta to szum.
2. Zalozenia sa jawne i maja status. Obalone zalozenie = kaskada na wymagania.
3. Edytuje wielu, zatwierdza jeden (wlasciciel roli).
4. Automat tam, gdzie cofniecie kosztuje zero. Czlowiek tam, gdzie kosztuje go-live.
5. Agent nigdy nie pisze wymagania bez zrodla. Bez zrodla = zalozenie.

## Petla

Q (pytanie) -> odpowiedz -> D (decyzja) albo A (potwierdzone/obalone) -> kaskada na R/AC -> przeglad -> zatwierdzenie -> dev.
