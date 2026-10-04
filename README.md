# sdd-kit

Nowy tutaj? Otworz START-TUTAJ.md, potem uruchom kreator: Mac `bash install.sh`, Windows dwuklik `install.cmd`.

Plugin Claude Code do zbierania i analizy wymagan biznesowych metoda Spec-Driven Development.
Uniwersalny: firma (OLG), klient (CGBlue), dom. Jeden proces, dwa poziomy ceremonii (full / light).

## Instalacja (osoba prowadzaca, ma Claude Code)

Wymagane: Claude Code. Zalecane: Node.js (panel i tablica), Git (historia wymagan, pobranie kitu).

**macOS / Linux** - jedna komenda w Terminalu:

    curl -fsSL https://raw.githubusercontent.com/SyBeer/sdd-kit/main/install.sh | bash

albo z rozpakowanego folderu: `bash install.sh`.

**Windows** - jedna komenda w PowerShell (Start -> wpisz "PowerShell"):

    irm https://raw.githubusercontent.com/SyBeer/sdd-kit/main/install.ps1 | iex

albo z rozpakowanego folderu: dwuklik `install.cmd` (lub `.\install.cmd` w PowerShell).
Nie trzeba zmieniac zasad wykonywania skryptow - instalator omija blokade tylko na czas swojego dzialania.
Brak Claude Code na Windows: `irm https://claude.ai/install.ps1 | iex`, potem nowe okno PowerShell.

Instalator: sprawdza Claude Code, Node.js, Git -> rejestruje kit jako zrodlo dodatkow -> instaluje
dodatek 'sdd' -> weryfikuje -> dodaje komende terminalowa `sdd-board` -> opcjonalnie zaklada projekt.
Aktualizacja: `bash install.sh --update` / `.\install.cmd --update`.
Usuniecie: `bash install.sh --uninstall` / `.\install.cmd --uninstall`.
Okno Claude w panelu (terminal) dziala na macOS i Linuksie; na Windows uruchamiasz Claude Code w osobnym oknie.

Biznes nie instaluje nic: patrzy na tablice, odpowiada na pytania w pliku, zatwierdza dokumenty.

## Start w nowym projekcie

    /sdd:init            tworzy requirements/ i CLAUDE.md w repo projektu
    /sdd:init --light    wersja lekka (jeden SPEC.md, bez PRD)

## Skille

| Skill          | Etap | Autonomia |
|----------------|------|-----------|
| /sdd:intake    | 1 katalogowanie surowca; kolejne zrodla porownywane z modelem | pisze sam (odtwarzalne) |
| /sdd:interview | 2 pytania i odpowiedzi (live / async) | pyta przed D i zmiana A |
| /sdd:domain    | 3 slownik, aktorzy, encje, reguly | pyta przed zmiana slownika |
| /sdd:spec      | 4 PRD; --agent pliki dla agenta; --light SPEC.md | pyta przed nowym R |
| /sdd:validate  | 5 kontrola jakosci, % gotowosci | pisze sam |
| /sdd:handover  | 6 backlog i sladowalnosc | pisze sam, pyta przed zapisem do Linear/Jira/Redmine |
| /sdd:status    | stan w 20 linijkach | pisze sam |
| /sdd:board     | lokalna tablica z karteczkami na zywo (bez Miro) | rysuje sam, do plikow po "tak" |

## Panel modulu (web)

W folderze projektu uruchom `sdd-board` i otworz http://localhost:8012. Strona pokazuje 6 etapow
(Intake -> Handover) ze statusem liczonym z plikow w `requirements/`, liczniki, "aktualny krok"
z komenda do wpisania, co blokuje dev, co czeka na biznes i ostatnie zmiany. Odswieza sie sama.
Naglowek "Wymagania do modułu: <nazwa> ▾" - klik w nazwe przelacza modul (modul = podfolder katalogu modulow z `requirements/SDD.yaml`),
a "+ Nowy moduł…" na dole menu zaklada folder w katalogu modulow jak `/sdd:init`, z `git init`.
Katalog modulow wskazujesz sam: przy pierwszym uruchomieniu (poza folderem projektu) panel pyta "Gdzie trzymać wymagania?" (sciezka recznie albo "Przeglądaj…"),
wybor trafia do `~/.sdd-kit/config.json`, zmiana: "Zmień katalog modułów…" w menu. Folder aplikacji sdd-kit jest odrzucany -
kit to tylko aplikacja, wymagania leza poza nim. `SDD_MODULES_ROOT` nadpisuje wybor.
Karta Intake przyjmuje zalaczniki (przycisk lub przeciagnij-upusc, do 25 MB) i zapisuje je do `requirements/00-intake/`, pomija pliki o identycznej tresci i pokazuje liste wrzuconych plikow (dodane / czeka na spis); ✕ przy pliku czekajacym na spis kasuje go (ostatecznie).
Tablica (`/board`): procesy zakladasz, nazywasz, przesuwasz i usuwasz w przegladarce; karteczke edytujesz w panelu z prawej;
powiekszenie z "Dopasuj" miesci cala tablice w oknie.
Poza tym tylko podglad. Spec: `docs/specs/progress-ui.md`.
Testy: `node --test plugins/sdd/board/test/*.test.js`

## Tablica warsztatowa (bez Miro)

W osobnym oknie terminala, w folderze projektu:

    node ~/.claude/plugins/... /board/server.js requirements/01-interview/board.json
    (dokladna sciezke podaje /sdd:board start)

Otworz http://localhost:8012/board. Agent stawia karteczki piszac do board.json, strona odswieza sie sama.
Ty mozesz przesuwac i dopisywac karteczki w przegladarce, agent to widzi.
Istniejaca aplikacja: /sdd:board processes rozpisuje jej procesy (as-built z kodu, README i decyzji) na karteczki.
Po warsztacie: /sdd:board sync przenosi karteczki do plikow. Przyklad: plugins/sdd/board/example-zlecenia.json

Jak wyglada wynik? Ten sam serwer pokazuje demo: http://localhost:8012/demo - gotowy modul Zlecenia po przejsciu SDD
(walidacja 100%, 18 wymagan zatwierdzonych, model na tablicy w 5 procesach), /demo/start - tablica z poczatku warsztatu.
Link "Przykład ↗" w gornym pasku otwiera demo w nowym oknie. Demo tylko do podgladu, nic sie nie zapisuje.
Dane demo sa zanonimizowane: `plugins/sdd/demo/zlecenia/requirements/`.
Na gorze obu stron sa zakladki Panel modułu | Tablica warsztatowa i przelacznik motywu jasny / ciemny (slonce / ksiezyc), wspolny dla obu zakladek.

## Pliki w projekcie

    requirements/
      SDD.yaml              konfiguracja: poziom, role zatwierdzajace, backlog
      CHANGELOG.md          jedna linia na kazdy zapis automatyczny
      00-intake/INDEX.md    katalog surowca: wiarygodnosc [Biz]/[App]/[Dok]/[AI], kierunek, status
      00-intake/porownanie-*.md  czytanie nowego zrodla "na zimno" przed zajrzeniem do modelu
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
