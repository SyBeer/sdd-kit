# Changelog

## [0.8.0] - 2026-09-26
Katalog produktow wskazuje uzytkownik. sdd-kit to tylko aplikacja: moduly (`requirements/`) nie powstaja
w jej folderze ani obok niego. Wczesniej serwer uruchomiony w folderze kitu liczyl katalog modulow
z biezacego folderu, wiec "Nowy moduł" zakladalby foldery obok aplikacji.

- Katalog modulow: `SDD_MODULES_ROOT` -> wybor z panelu w `~/.sdd-kit/config.json` (`SDD_CONFIG` zmienia sciezke)
  -> rodzic istniejacego `requirements/` projektu. Nic z tego = panel pyta "Gdzie trzymać wymagania?".
- Folder aplikacji (i wszystko w nim) jest odrzucany - z configu, ze zmiennej i jako projekt startowy.
- Panel: ekran wyboru katalogu, "Brak modułów" z przyciskiem "Nowy moduł…", w menu modulow "Zmień katalog modułów…".
- "Przeglądaj…" przy polu katalogu: okno z podfolderami (serwer listuje, `GET /api/dirs`, chronione jak zapisy),
  wejscie w folder, "↑ wyżej", znaczniki "moduł" i wyszarzona "aplikacja"; "Wybierz ten folder" wpisuje sciezke do pola.
- Serwer: `POST /api/root`; bez katalogu `POST /api/modules` -> 409; konsola mowi, gdzie sa moduly albo ze nie wybrano.
- Zmiana zachowania: `sdd-board` w folderze bez `requirements/` przy zapisanym katalogu otwiera pierwszy modul z katalogu.
- `/sdd:interview` tryb live: JEDNO pytanie naraz zamiast partii 5-7 (uwaga z warsztatu horizon-zlecenia:
  "jak ja mam zbierac odpowiedzi?"). Staly uklad pytania "Pytanie X z N (Q-xxx)" konczony zdaniem
  "Zarejestruj kto udzielił odpowiedzi na pytanie.", zapis do sesji od razu, jedno dopytanie, parkowanie tylko
  z warunkiem go-live, odpowiedz sprzeczna z D -> nowa D + "Zmieniona przez", powod `[AI]` = pusty powod.
- Nowy `board/root.js`, kryteria AC-26..AC-33 w `docs/specs/progress-ui.md`, testy `test/root.test.js` (42/42).

## [0.7.2] - 2026-09-26
- Port panelu i tablicy: **4242 -> 8012**. Konwencja workspace rezerwuje dla uslug dev zakres
  8000-8999, a 4242 byl poza nim. Zmiana objela `install.sh`, `install.ps1`, `README.md`,
  `START-TUTAJ.md`, domyslna wartosc w `board/server.js` i `skills/board/SKILL.md`.
  Kto ma juz zainstalowanego pomocnika `sdd-board`, powinien przeinstalowac (`install.sh`)
  albo podac port recznie: `sdd-board <plik.json> 8012`.
  Testy nie sa zwiazane z portem - biora losowy z zakresu 4300-4800.

## [0.7.1] - 2026-09-26
- Panel: `porownanie-*.md` w `00-intake/` nie jest juz liczony jako zrodlo. Wprowadzony w 0.7.0
  artefakt procesu trafial na liste plikow czekajacych na spis i panel w kolko zganialby go do
  `INDEX.md`. `isProcessFile` w progress.js, kryterium AC-25, test (37/37).
  Znalezione na probie na zywym projekcie, nie w przegladzie kodu.

## [0.7.0] - 2026-09-26
Kolejne zrodlo w intake porownuje sie z MODELEM, nie ze starymi zrodlami. `00-intake/` to surowiec,
`02-domain/` jest prawda. Powod: intake wykrywal tylko sprzecznosci wartosci (ta sama rzecz, inna
wartosc). Nie widzial sprzecznosci struktury (zrodla inaczej dziela domene) ani milczacych pominiec
(zrodlo mowi o czyms, czego model nie ma - znika bez sladu, bo nie zostawia ani pytania, ani konfliktu).

- `intake`: podzial na przebieg pierwszy (zrodla miedzy soba) i kolejny (zrodlo kontra model).
  Przebieg kolejny ma obowiazkowa kolejnosc: najpierw czytanie "na zimno" do `00-intake/porownanie-YYYY-MM-DD.md`,
  dopiero potem model - inaczej agent dopasowuje nowe zrodlo do tego, co juz wie.
  Piec klas trafienia: `potwierdza`, `zamyka Q`, `uzupelnia`, `sprzeczne`, `podmywa model`.
  Trafienie w `D-xxx` = wniosek o ponowne otwarcie decyzji. Trafienie w strukture encji lub maszyne
  stanow = zgloszenie przebudowy modelu, nie dwadziescia pytan o szczegoly.
- Nowy status elementu modelu `zakwestionowane (Q-xxx)` w GLOSSARY, RULES, ACTORS, ENTITIES: nowe
  zrodlo wyzsze w hierarchii podmywa model. Nic nie jest kasowane, ale wszystko podmyte jest widoczne.
- Kaskada wplywu (`CLAUDE.md` §6) ma trzeci wyzwalacz: oznaczenie elementu jako `zakwestionowane`
  (dotad tylko zmiana `A` i nowa `D`). Sciezka: `RULES.Wymagania` -> `R` -> sekcja 6 PRD.
- `validate`: BLOCK 6 - `R` stojace na elemencie `zakwestionowane` (rownolegle do `A obalone`).
  WARN 10 - zrodlo `aktualne` z `INDEX.md`, ktorego nazwa nie wystepuje w zadnym `Zrodlo`
  ("zrodlo przeczytane i nieuzyte") - jedyna kontrola na wymaganie, ktore zniknelo bez sladu.
  INFO 15 - pojecie lub `BR` nieuzywane przez zadne `R`.
- `domain`: czwarta kontrola w tescie spojnosci - jedno pojecie = jeden zbior rekordow (sprawdza
  zakres, nie brzmienie definicji); piata - czy kazde zrodlo `aktualne` zostawilo slad w modelu.
  Nowa sekcja "Przebudowa modelu" jako wejscie po zgloszeniu z intake.
- `INDEX.md`: kolumny `Kierunek` (`intencja` / `as-built` / `potwierdzenie`) i `Status zrodla`
  (`aktualne` / `zastapione przez <plik>` / `dotyczy innej wersji <X>` / `wycofane`). Kierunek
  rozstrzyga tam, gdzie hierarchia nie wystarcza - dwa dokumenty `[D]` roznia sie zwykle tym,
  ze jeden opisuje zamiar, drugi stan faktyczny. Status pozwala uniewaznic cale zrodlo jedna
  decyzja i odsiewa falszywe sprzecznosci miedzy wersjami produktu.
- Zapis zrodla ujednolicony na `[B]/[P]/[D]/[AI] <plik z INDEX.md>[, sekcja/wiersz]` - nazwa pliku
  obowiazkowa, bo na niej stoi kontrola pokrycia zrodel.
- `CLAUDE.md`: zasada "zgodnosc dwoch zrodel `[D]` NIE jest potwierdzeniem" - dwa dokumenty spisane
  z tej samej aplikacji powtarzaja ten sam blad.
- `spec`: nie tworzy `R` na elemencie `zakwestionowane` (jak dotad na `A obalone`).
- Testy panelu bez zmian w kodzie: 36/36.

## [0.6.4] - 2026-09-26
- Przejscie Panel <-> Tablica bez skakania: staly pasek (47 px) i naglowek w ui.css niezalezne od CSS strony
  (inna wysokosc linii, odstepy naglowka, style `label` tablicy), `scrollbar-gutter: stable`.
  Pozycje paska, zakladek, ikon, naglowka i przycisku modulu identyczne na obu stronach (pomiar 1200 i 375 px).

## [0.6.3] - 2026-09-26
- Tablica: naglowek jak w panelu - "Wymagania do modułu: <nazwa> ▾" z menu modulow; wybor modulu na tablicy przelacza
  modul na serwerze (tablica i panel). "Nowy moduł…" przechodzi do panelu i otwiera formularz. Tytul tablicy - linia obok.
- Jeden kod menu dla panelu i tablicy (`modMenu`, `modSwitch` w ui.js, wyglad w ui.css).
- Serwer: widok tablicy z `_module` i `_modules`; pola `_...` nie trafiaja do board.json. Testy AC-U6, AC-U7 (36/36).

## [0.6.2] - 2026-09-26
- Motyw: same ikony slonce / ksiezyc, bez ramki i tla; wybrana w kolorze tekstu, druga przygaszona.

## [0.6.1] - 2026-09-26
- Motyw: bez opcji "Auto"; zamiast tekstu ikony slonce / ksiezyc (nazwa w dymku i dla czytnikow ekranu).
  Dopoki nic nie wybrano - motyw systemu i on jest zaznaczony; wybor wspolny dla panelu i tablicy.
- `pickTheme` zamiast `normTheme`, test AC-U1 (35/35).

## [0.6.0] - 2026-09-26
- Panel i tablica: wspolny pasek na gorze - zakladki "Panel modułu" | "Tablica warsztatowa" (na telefonie "Panel" | "Tablica")
  zamiast linkow "← Panel modułu" / "Tablica warsztatowa →".
- Przelacznik motywu Auto / Jasny / Ciemny: zapamietany w przegladarce, wspolny dla obu stron, zmiana w jednej karcie
  przelacza druga; ustawiany przed pierwszym malowaniem. "Auto" = jak system.
- Nowe pliki `board/ui.js`, `board/ui.css` (serwowane pod /ui.js, /ui.css); spec `docs/specs/ui-switch.md`, testy AC-U1..AC-U3 (35/35).

## [0.5.4] - 2026-09-26
- Tablica: wskazowka na pustej tablicy - dwie drogi: "Z AI" (`/sdd:board` z przyciskiem Kopiuj) i "Sam, w przegladarce"
  (4 kroki + przyklad karteczek w kolorach legendy + "Dodaj pierwszy proces"). Procesy bez karteczek: linia pod tablica
  "Kliknij + w procesie...", znika po pierwszej karteczce. Pusta tablica bez limitu wysokosci (telefon).
- `boardHint` w board-ops.js + test AC-B17 (32/32).

## [0.5.3] - 2026-09-26
- Intake: usuwanie pliku, ktory czeka na spis (✕ tylko przy "czeka na spis"), z potwierdzeniem; usuniecie ostateczne
  (plik kasowany z dysku). Plikow juz w spisie nie mozna usunac.
  Informacja pod lista plikow; skill intake: nie usuwaj ani nie przenos plikow z INDEX.md.
- Serwer: `DELETE /api/intake?name=`, chroniony jak inne zapisy, plik ze spisu -> 409; `removeIntake` + testy AC-21, AC-22, AC-24 (31/31).

## [0.5.2] - 2026-09-26
- Tablica: stan synchronizacji z plikami na karteczce - ✓ w plikach, ↻ zmieniona po synchronizacji, ! brak ID w pliku
  (bez znaczka = tylko na tablicy); podsumowanie liczb w pasku, wiersz "Pliki" w panelu.
- Stan liczy serwer: pole `synced` (ustawia agent przy `/sdd:board sync`) + sprawdzenie, czy `ref` jest w pliku `file`;
  odswiezany przy kazdej zmianie w requirements/, nie trafia do board.json.
- `syncState`, `syncMap` w board-ops.js + testy AC-B14, AC-B15 (28/28).

## [0.5.1] - 2026-09-26
- Tablica: karteczka pokazuje ID i zrodlo (jedna linia, pelne w dymku) oraz autora i date zmiany (RRRR-MM-DD HH:MM).
- Panel karteczki: Utworzono, Zmieniono, Autor, Skad, Trafia do; odswiezane na zywo.
- board.json: opcjonalne `created` / `updated` (ISO); serwer stempluje zmiany z przegladarki, skill board kaze agentowi je ustawiac.
- `stampNotes`, `fmtDate` w board-ops.js + testy AC-B11, AC-B12 (26/26).

## [0.5.0] - 2026-09-26
- Tablica: zakladanie procesow ("+ Proces", pusta tablica z "Dodaj pierwszy proces"), zmiana nazwy klikiem w nazwe
  (karteczki ida za nazwa, pusta/zajeta odrzucona), przesuwanie gora/dol, usuwanie z potwierdzeniem przy karteczkach.
- Tablica: panel edycji karteczki wysuwany z prawej (na telefonie od dolu), Escape zamyka, Cmd/Ctrl+Enter zapisuje;
  "+" w ostatniej kolumnie procesu i "+ Karteczka" w pasku; "Pas" -> "Proces".
- Tablica: na cala szerokosc, powiekszenie 50-150% z "Dopasuj" (zapamietane), nazwy procesow przyklejone przy przewijaniu.
- Tablica: kolejnosc karteczek w kolumnie - upuszczenie przed/za karteczka (kreska pokazuje miejsce),
  w panelu "↑ wyżej" / "↓ niżej" (dziala tez na telefonie).
- Tablica: typ karteczki w panelu jako przyciski jak legenda (kolor + nazwa + podpowiedz) zamiast listy rozwijanej.
- Pusta tablica bez procesow (wczesniej "Proces 1"), zeby bylo widac "Dodaj pierwszy proces".
- `board/board-ops.js` (wspolny dla przegladarki i testow) + testy AC-B1..AC-B5, AC-B8, AC-B9, spec `docs/specs/board-ui.md` (24/24).
- Skill board: czytaj board.json tuz przed edycja, nie cofaj zmian usera z przegladarki.

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
