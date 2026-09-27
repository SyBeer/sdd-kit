# Spec: Tablica warsztatowa - procesy, panel edycji, mieszczenie sie na ekranie

Status: zatwierdzony zakres 2026-09-26 (user: "Interfejs nie umie zakladac procesow, zrob tez 5, 6 i 7")
Wersja docelowa: 0.5.0 (zmiany do 0.14.0)

## Cel
Prowadzacy warsztat sam uklada tablice w przegladarce - zaklada i porzadkuje procesy (pasy),
edytuje karteczki bez przewijania strony i widzi wieksza czesc tablicy naraz.
Agent (Claude Code) dalej pisze do tego samego `board.json`; format pliku bez zmian.

## Zakres
1. Procesy (pasy, `lanes` w board.json):
   - "+ Proces" w pasku narzedzi i na pustej tablicy. Nowy proces dostaje unikalna nazwe ("Nowy proces", "Nowy proces 2")
     i od razu pole do wpisania nazwy.
   - Zmiana nazwy: klik w nazwe procesu -> pole tekstowe, Enter zapisuje, Escape anuluje. Karteczki procesu ida za nowa nazwa.
     Pusta nazwa albo nazwa juz uzyta -> odrzucone z komunikatem.
   - Kolejnosc: strzalki w gore / w dol przy nazwie.
   - Usuwanie: pusty proces od razu; proces z karteczkami po potwierdzeniu "Usunac proces X razem z N karteczkami?".
2. Panel edycji karteczki (dawny punkt 5): wysuwa sie z prawej po kliknieciu karteczki albo "+ Karteczka";
   zamykany krzyzykiem, Escape albo po usunieciu karteczki. Na telefonie (< 640 px) wysuwa sie od dolu.
   Tablica nie traci szerokosci, gdy panel jest zamkniety. Etykieta "Pas" -> "Proces".
3. Mieszczenie sie (dawny punkt 6): tablica na cala szerokosc; powiekszenie -, +, "Dopasuj" (tablica miesci sie w szerokosci okna),
   zakres 50-150%, zapamietane w przegladarce. Nazwy procesow przyklejone do lewej krawedzi przy przewijaniu w poziomie.
4. Nowa karteczka: w kazdym procesie ostatnia pusta kolumna ma "+"; klik tworzy karteczke w tym procesie i kolumnie i otwiera panel.
   "+ Karteczka" z paska dodaje do pierwszego procesu, w pierwszej wolnej kolumnie.
   Zmiana 0.14.0 (uwaga usera: "pod kazda kolumna karteczek powinna byc opcja (+) tak jak na koncu procesu. Moze byc nizsze niz karteczka"):
   pod karteczkami kazdej zajetej kolumny niski "+" (szerokosc karteczki, ok. 1/3 wysokosci); klik tworzy karteczke na koncu tej kolumny.
   Ostatnia pusta kolumna zostaje z pelnym "+". W demo brak.
5. Kolejnosc w kolumnie (uwaga usera: "jak mam 3 karteczki w kolumnie - nie moge ich zamieniac miejscami"):
   upuszczenie na karteczke wstawia przed nia (gorna polowa) albo za nia (dolna polowa), z kreska pokazujaca miejsce;
   upuszczenie na puste miejsce kolumny - na koniec kolumny. W panelu karteczki przyciski "↑ wyżej" / "↓ niżej" (dziala tez na telefonie).
   Kolejnosc w kolumnie = kolejnosc w `notes[]` board.json (format bez zmian).
6. Spojnosc z legenda (uwaga usera): typ karteczki w panelu wybierany przyciskami-radio wygladajacymi jak legenda
   (kwadrat koloru + ta sama nazwa + krotka podpowiedz), zamiast listy rozwijanej.

7. Zrodlo, autor i daty (uwaga usera: "pokaz zrodlo i autora na karteczce i date zmiany; po kliknieciu tez data utworzenia; RRRR-MM-DD HH:MM"):
   - Karteczka na dole: `ref · zrodlo` (jedna linia, obcieta, pelne w dymku) oraz `autor · data zmiany`.
   - Panel: "Utworzono" i "Zmieniono" (RRRR-MM-DD HH:MM, czas lokalny), zrodlo, "Trafia do", autor.
   - board.json: nowe opcjonalne pola karteczki `created`, `updated` (ISO 8601). Stare karteczki bez dat dzialaja - daty sie nie pokazuja.
   - Zapis z przegladarki (PUT): serwer nadaje `created` nowym karteczkom, `updated` zmienionym (tresc, typ, proces, kolumna, ID);
     nie zmienia dat karteczek nietknietych. Agent ustawia `created`/`updated` sam (skill board).
   - Autor: `agent` pokazywany jako "AI", `człowiek` jako "człowiek".

8. Stan synchronizacji z plikami (uwaga usera: "pokaz na karteczce co juz zsynchronizowane z plikami"):
   - board.json: opcjonalne pole karteczki `synced` (ISO) - agent ustawia je przy `/sdd:board sync` dla karteczek przeniesionych do plikow.
   - Stan liczy serwer (nie ufa samemu polu):
     `board` - brak `synced` (tylko na tablicy); `changed` - `updated` pozniej niz `synced` (zmieniona po synchronizacji);
     `missing` - `synced` jest, ale `ref` nie wystepuje w pliku `file` (sciezka wzgledem requirements/); `synced` - w pozostalych przypadkach.
   - Karteczka: znaczek w rogu (✓ / ↻ / ! / ●) z dymkiem. Pasek: podsumowanie liczb w kazdym stanie. Panel: wiersz "Pliki" ze stanem i data synchronizacji.
   - Stan jest wyliczany przy kazdej zmianie tablicy albo plikow w requirements/; nie jest zapisywany do board.json.

9. Wskazowka na pustej tablicy (0.5.4, punkt 10 z listy pomyslow: "poza sesja z Claude pusta tablica nie daje zadnej wskazowki, od czego zaczac"):
   - Brak procesow: dwie drogi obok siebie (na telefonie jedna pod druga):
     "Z AI" - `Uruchom w Claude Code: /sdd:board` z przyciskiem Kopiuj i jednym zdaniem, co zrobi AI;
     "Sam, w przegladarce" - 4 kroki (proces, zdarzenia od lewej w czasie przeszlym, reszta typow pod zdarzeniem, `/sdd:board sync` po warsztacie)
     i przycisk "+ Dodaj pierwszy proces".
   - Pod krokami przyklad w miniaturze: rzad karteczek w kolorach legendy (kto, komenda, zdarzenie, regula, nie wiemy).
   - Sa procesy, ale nie ma karteczek: jedna linia pod tablica "Kliknij + w procesie..." z podpowiedzia o zdarzeniach. Znika po pierwszej karteczce.

10. Cofnij / Ponow (0.14.0, uwaga usera: "przydalo by sie na tablicy UNDO/REDO"):
   - Przyciski "↶ Cofnij" i "↷ Ponów" w pasku narzedzi (nieaktywne, gdy nie ma czego cofnac/ponowic) oraz skroty
     Cmd/Ctrl+Z (cofnij), Cmd/Ctrl+Shift+Z i Ctrl+Y (ponow). Skroty nie dzialaja w polu tekstowym - tam cofa przegladarka.
   - Cofa kazda zmiane tablicy z przegladarki: karteczka (nowa, edycja, usuniecie, przeniesienie, kolejnosc), proces
     (nowy, nazwa, kolejnosc, usuniecie z karteczkami). Jedna zmiana = jeden krok; do 50 krokow. Cofniecie zapisuje board.json.
   - Nowa zmiana po cofnieciu kasuje kroki do ponowienia.
   - Historia jest w karcie przegladarki (znika po przeladowaniu i zmianie modulu).
   - Zmiana tablicy spoza tej karty (agent, `/sdd:board sync`, druga karta) czysci historie z komunikatem -
     cofniecie nie moze skasowac cudzej pracy. Echo wlasnego zapisu (serwer dopisuje daty) historii nie czysci.
   - Cofniecie przywraca karteczke z jej datami - karteczka wraca do stanu synchronizacji sprzed zmiany.
   - Demo (tylko podglad): przyciski ukryte.

11. Panel karteczki na stale (0.14.0, uwaga usera: "okno karteczek zaslania ekran, a w skrajnym przypadku karteczke,
    ktora aktualnie edytuje. Niech ten panel bedzie na stale na ekranie, z mozliwoscia zwiniecia do boku"):
   - Szerokie okno (> 640 px): panel stoi na stale po prawej, obok tablicy - tablica zweza sie, nic nie przykrywa.
   - Bez wybranej karteczki panel pokazuje podpowiedz ("kliknij karteczke albo +") i przyciski "+ Karteczka", "+ Proces".
   - "»" zwija panel do waskiego paska przy prawej krawedzi (tablica dostaje cala szerokosc), "«" albo klik w pasek rozwija.
     Zwiniecie zapamietane w przegladarce. Klik karteczki albo "+" przy zwinietym panelu rozwija go.
   - "×" i Escape koncza edycje (panel wraca do podpowiedzi), nie chowaja panelu.
   - Otwarta karteczka jest przewijana do widoku, jesli jest poza nim.
   - Telefon (<= 640 px): bez zmian - panel wysuwa sie od dolu i chowa po zamknieciu.
   - Demo: panel tez stoi na stale (podglad karteczki), bez przyciskow edycji.

## Poza zakresem
- Zmiana formatu board.json, wiele tablic w module.
- Cofanie zmian agenta i historia miedzy sesjami przegladarki.
- Synchronizacja tablicy do plikow z przegladarki - dalej `/sdd:board sync` w Claude Code.

## Kryteria akceptacji (testy w `plugins/sdd/board/test/board-ops.test.js`)
- AC-B1: `addLane` dodaje proces na koncu z unikalna nazwa; z podana nazwa - ta nazwa (przycieta).
- AC-B2: `renameLane` zmienia nazwe w `lanes` i w `lane` wszystkich karteczek procesu; odrzuca pusta i zajeta nazwe.
- AC-B3: `moveLane` przesuwa o 1 w gore/dol, na krawedzi nic nie robi.
- AC-B4: `deleteLane` usuwa proces i jego karteczki, zwraca liczbe usunietych; inne procesy nietkniete.
- AC-B5: `nextCol` zwraca pierwsza kolumne za ostatnia zajeta (0 dla pustego procesu).
- AC-B8: `moveNote(b, id, lane, col, beforeId)` ustawia karteczke w procesie i kolumnie przed `beforeId`; bez `beforeId` - na koniec kolumny; kolejnosc innych karteczek bez zmian.
- AC-B9: `stepNote(b, id, -1|1)` zamienia karteczke z sasiadem w tej samej kolumnie; na krawedzi nic nie robi.
- AC-B10 (reczne): panel karteczki pokazuje 6 typow z kolorami i nazwami jak w legendzie; zaznaczony = typ karteczki; zmiana i Zapisz zmienia kolor karteczki; dziala strzalkami z klawiatury.
- AC-B11: `stampNotes(prev, next, now)`: nowa karteczka -> created=updated=now; zmieniona tresc/typ/proces/kolumna/ID -> updated=now, created bez zmian; nietknieta -> daty bez zmian; daty podane przez agenta w `next` nie sa nadpisywane.
- AC-B12: `fmtDate(iso)` -> "RRRR-MM-DD HH:MM" w czasie lokalnym; pusta/zla data -> "".
- AC-B13 (reczne): karteczka pokazuje zrodlo, autora i date zmiany; panel pokazuje date utworzenia i zmiany; edycja w przegladarce zmienia date zmiany.
- AC-B14: `syncState(note, inFile)`: brak synced -> board; updated > synced -> changed; inFile === false -> missing; inaczej synced (takze gdy brak ref/file).
- AC-B15: `syncMap(board, readFile)`: dla kazdej karteczki stan; `ref` szukany w tresci pliku jako cale slowo (Q-02 nie pasuje do Q-024); plik czytany raz; brak pliku -> missing.
- AC-B16 (reczne): karteczki pokazuja znaczek stanu; dopisanie ID do pliku zmienia ! na ✓ bez przeladowania; edycja zsynchronizowanej karteczki -> ↻.
- AC-B17: `boardHint(b)`: brak procesow -> 'blank'; procesy bez karteczek -> 'nonotes'; sa karteczki -> null (takze karteczki bez procesow w `lanes`).
- AC-B18 (reczne): pusta tablica pokazuje obie drogi, przyklad i dziala Kopiuj; po dodaniu procesu wskazowka zmienia sie na linie pod tablica, po pierwszej karteczce znika; telefon bez poziomego przewijania, tryb ciemny czytelny.
- AC-B19: `createHistory(limit)`: `record` po zmianie tresci dodaje krok (bez zmiany - nie); `undo`/`redo` zwracaja poprzedni/nastepny stan tablicy albo null; nowy `record` po `undo` czysci redo; najstarsze kroki ponad limit odpadaja.
- AC-B20: `incoming(board)` historii: echo wlasnego zapisu rozni sie tylko `created`/`updated` i polami `_` -> 'echo', historia zostaje (takze gdy przyjdzie echo starszego z dwoch zapisow); inna tresc (np. agent dodal karteczke albo `synced`) -> 'external', historia pusta.
- AC-B21 (reczne): w przegladarce: dodaj karteczke, zmien nazwe procesu, usun proces - Cofnij 3x przywraca tablice, Ponow 3x wraca; Cmd+Z w polu tekstowym cofa tekst, nie tablice; dopisanie karteczki przez agenta wylacza Cofnij z komunikatem; w demo brak przyciskow.
- AC-B22 (reczne): kazda zajeta kolumna ma pod karteczkami niski "+"; klik otwiera panel nowej karteczki, po Zapisz karteczka stoi na dole tej kolumny; Cofnij ja usuwa; w demo brak "+".
- AC-B23 (reczne): okno 1280 px: panel widoczny bez wybranej karteczki (podpowiedz + przyciski); klik karteczki przy prawej krawedzi - karteczka widoczna obok panelu; "»" zwija do paska, tablica szersza, stan po przeladowaniu zachowany; klik karteczki rozwija; Escape wraca do podpowiedzi; telefon 375 px - panel od dolu jak wczesniej; tryb ciemny czytelny.
- AC-B6 (reczne): w przegladarce: zaloz proces, zmien nazwe, przesun, usun z karteczkami; plik board.json odpowiada widokowi.
- AC-B7 (reczne): klik karteczki otwiera karteczke w panelu z prawej (od 0.14.0 panel stoi na stale - AC-B23), Escape konczy edycje; "Dopasuj" miesci tablice bez poziomego paska; na telefonie brak przewijania strony w poziomie.

## Wyglad
Tokeny kolorow z `board/index.html` (`:root`), jasny i ciemny motyw bez zmian.
