# Spec: nowy wyglad interfejsu - wspolna rama, Panel, Jak to dziala, Konfiguracja (zmiana 0.34.0)

Status: zlecone przez wlasciciela produktu 2026-10-06 (handoff `design_handoff_sdd_kit_ui/README.md` i `02-tablica.md`,
makiety w `design_handoff_sdd_kit_ui/makiety/` - pliki lokalne, poza repo).

## Cel
"To narzedzie do pracy - ma byc chude i czytelne." Wszystkie strony panelu dostaja ten sam wyglad co Tablica od 0.33.0:
gesty, precyzyjny jak IDE, ale cieply; mniej ramek, wiecej tresci; liczby, ID i komendy w mono. Jasny i ciemny motyw.

Metryka: wiecej tresci na pierwszym ekranie Panelu (aktualny krok, wszystkie etapy i ich stan bez przewijania na oknie 1280x800).

## Zakres
Zmienia sie wyglad i uklad. Bez zmian: logika, API serwera (poza jednym polem tylko do odczytu, AC-F7), zapis plikow, demo,
okno Claude, aktualizacje, zachowanie na telefonie, id elementow uzywane przez skrypty i testy.

## Poza zakresem
- wyszukiwanie (lupa ⌘K w makiecie) - nowa funkcja, osobna zmiana; ikony nie ma, zeby nie udawac dzialania,
- zmiana tresci przewodnika - teksty zostaja w `info.js`, zmienia sie tylko uklad.

## Kryteria akceptacji
- **AC-F1** Wspolna rama (`ui.css`, `ui.js`): tokeny jasne i ciemne z handoffu (6) w `:root` w `ui.css`, czcionki IBM Plex,
  pasek stanu 26 px (`.statusbar`: na zywo, etapy/poziom/rodzaj, po prawej blokery i pytania u biznesu), naglowek 36 px
  na kazdej stronie: logo, `sdd-kit / <modul> ▾` (gniazdo `#modbtn` + `#modmenu`), krotkie zakladki, motyw jednym
  przyciskiem ☾/☀ (zapis `sdd-theme` jak dotad), ⚙, Claude. Wersja w podpowiedzi logo i w Konfiguracji; w pasku tylko
  ostrzezenie (`.ver.stale`) i chip aktualizacji. Pasek stanu i naglowek stoja (`.chrome`, sticky), tresc sie przewija.
- **AC-F2** Konfiguracja nie jest zakladka: `tabs()` zwraca 4 pozycje, `cfgHref(b)` daje link ⚙ (`/config`, `/demo/config`,
  brak na `/demo/start`); na stronie Konfiguracji ⚙ ma `aria-current="page"`.
- **AC-F3** Panel: karta "Aktualny krok" (etykieta, NN / 06, nazwa, opis, pole komendy `#nextcmd` + `#copy` "Kopiuj" ->
  "Skopiowano" na 1,5 s, kroki 01..03), pasek etapow (kolor stanu u gory, krotki stan pod nazwa), lista etapow jako
  akordeon (wybor usera / aktualny krok - `cardOpen`), karta boczna: Blokuje dev, Czeka na biznes, Ostatnie zmiany
  (data, obszar, tresc, zrodlo z wpisu CHANGELOG.md). Stany: gotowe, gotowe · N (do wyjasnienia), w toku, nieaktualne, nie zaczete.
- **AC-F4** Lista pod licznikiem (`countList`): naglowek z liczba, plikiem i × (zamyka), pozycja = ID · tresc · znacznik,
  pod spodem "do" i "skad" (zrodlo mono, dlugie sciezki sie lamia). Otwarty licznik "otwarte" w Interview nie dubluje
  listy pytan pod nim.
- **AC-F5** Pasek stanu Panelu: "nic nie blokuje dev" / "brak pytan u biznesu" z zielonym ✓, albo liczba w czerwonym kolku
  i "N blokuje dev" / "N czeka na biznes".
- **AC-F6** Jak to dziala: spis tresci z boku (sticky, na telefonie nad trescia), numerowane karty "NN · TYTUL", klik
  przewija z offsetem, scroll-spy podswietla biezaca sekcje (na samym dole - ostatnia). Kotwice `SddUI.slug` (AC-C25) bez zmian.
  Sekcje o znanym ksztalcie (Zrodla, Identyfikatory, Rodzaj modulu, Tablica warsztatowa, Redmine) maja uklad z makiety,
  pozostale - lista "–" (AC-C22).
- **AC-F7** Konfiguracja: wiersze formularza (etykieta z podpowiedzia + kontrolka), Backlog i Rodzaj modulu jako przelaczniki
  segmentowe nad ukrytym `<select>` (`#f-backlog`, `#f-kind` - zapis jak dotad), blok Redmine z kropka stanu klucza, role jako
  ramki z przelacznikami uprawnien; rola uzyta w plikach ma dopisek "uzyta w plikach" i nieaktywne "Usun" - serwer podaje
  `sdd.usedRoles` w `/api/config` (ta sama regula co przy zapisie, `roleChangeBlocked`). Pasek zapisu przyklejony u dolu
  karty: niezapisane zmiany / zapisano w SDD.yaml (2,5 s) / bez zmian; zapis i "Cofnij zmiany" nieaktywne bez zmian.
  Karta Serwer: wersja z linkiem do Release Notes i ostrzezeniami, "Przyklad gotowego modulu ↗". Id pol i przyciskow z handoffu 4 bez zmian.
- **AC-F8** Telefon (<= 640 px): pasek stanu i naglowek zawijaja sie i nie stoja, zakladki przewijaja sie w poziomie, etykieta
  pola nad kontrolka, strona bez poziomego przewijania.

## Testy
`board/test/ui-frame.test.js` (AC-F1..F8) + zaktualizowane AC-C1, AC-C22, AC-C25, AC-B55, AC-B56 (zmiany wynikaja z handoffu).
Recznie: Panel, Jak to dziala, Konfiguracja, Modul i Tablica w jasnym i ciemnym motywie; telefon 375 px.

## Weryfikacja
- 2026-10-06, podglad na porcie 8013 (demo i fv-manager bez zapisu): Panel (licznik "otwarte" z lista), Jak to dziala
  (spis tresci, scroll-spy), Konfiguracja (segmenty, blok Redmine, pasek zapisu i Cofnij), Tablica; ciemny motyw; telefon
  375 px bez poziomego przewijania.
