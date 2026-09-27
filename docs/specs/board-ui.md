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
   Zmiana 0.14.1 (uwaga usera: "przy scrollowaniu aplikacji w dol gora ekranu sie przenosi (znikaja zakladki), ale nie widac poziomego scrolla"):
   szerokie okno (> 640 px) - strona sie nie przewija; zakladki, naglowek i pasek narzedzi stoja na gorze, tablica wypelnia
   reszte wysokosci okna i przewija sie sama w obu kierunkach - poziomy pasek zawsze przy dolnej krawedzi okna.
   Telefon bez zmian (przewija sie cala strona).
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

12. Szkic nowej karteczki (0.14.1, uwaga usera: "przy kliknieciu na + powinna pojawic sie na ekranie pusta kartka w SZARYM kolorze"):
   - Klik "+" (pod kolumna, w ostatniej kolumnie, "+ Karteczka") stawia na tablicy od razu szara karteczke-szkic
     w miejscu, gdzie trafi (na koncu kolumny), zaznaczona i przewinieta do widoku; panel otwiera sie obok.
   - Szkic pokazuje na zywo wpisywana tresc (pusty - "Nowa karteczka…"). Typ nie jest wybrany z gory;
     wybor typu w panelu od razu zmienia kolor szkicu. Zmiana procesu w panelu przenosi szkic na koniec tego procesu.
   - Zapisz bez typu -> komunikat "Wybierz typ"; po Zapisz szkic staje sie zwykla karteczka.
   - "×", Escape albo klik innej karteczki usuwa szkic - nic nie trafia do board.json. Szkic nie jest krokiem Cofnij.

13. Przesuwanie tablicy mysza (0.14.1, uwaga usera: "nad pustymi przestrzeniami powinna pojawiac sie ikona, ktora pozwoli
    lapac i scrollowac ekran bez uzywania scrollbarow"):
   - Kursory: karteczka - raczka (przeciagniecie przenosi karteczke), "+" i przyciski - palec,
     puste tlo tablicy (takze obok nazwy procesu) - strzalki w 4 strony; podczas przesuwania - zacisnieta dlon.
   - Wcisniecie i przeciagniecie na pustym tle przesuwa tablice w poziomie i pionie (jak mapa). Bez zaznaczania tekstu.
   - Nie przesuwa: start na karteczce, przycisku, polu tekstowym. Przeciaganie karteczek dziala jak wczesniej.
   - Dotyk (telefon, tablet): bez zmian - przewija przegladarka.

14. Wstawianie pomiedzy (0.14.1, uwaga usera: "powinna byc tez opcja dodawania karteczek pomiedzy istniejacymi"; wybor: oba warianty):
   - W kolumnie: miedzy dwiema karteczkami waska strefa; po najechaniu kreska z "+". Klik -> szkic (punkt 12) miedzy nimi,
     po Zapisz karteczka stoi w tym miejscu kolumny.
   - Miedzy kolumnami procesu: pionowa strefa miedzy dwiema kolumnami; po najechaniu kreska z "+". Klik -> nowa kolumna
     ze szkicem, dalsze kolumny procesu przesuwaja sie w prawo (na ekranie od razu). Escape cofa to przesuniecie (nic nie zapisane).
     Zapisz -> karteczka w nowej kolumnie, dalsze karteczki procesu `col` + 1. Jeden krok Cofnij.
   - Przesuniecie kolumn nie oznacza karteczek jako zmienionych: `updated` (i stan ↻) zmienia sie przy zmianie tresci, typu,
     procesu, ID albo gdy karteczke przeniesiono - przegladarka oznacza przeniesiona karteczke polem `_moved` (serwer je usuwa
     przed zapisem). Sam numer `col` zmieniony przez wstawienie albo zamkniecie kolumny to uklad, nie zmiana.
   - W demo brak stref wstawiania.

15. Przenoszenie miedzy kolumny i zamykanie pustych kolumn (0.14.1, uwaga usera: "brakuje mozliwosci przesuniecia karteczek
    i wlozenia ich miedzy istniejace kolumny. Zabranie karteczki powoduje powstanie pustego miejsca" - ma przesuwac w lewo):
   - Przeciagniecie karteczki nad przerwe miedzy kolumnami pokazuje pionowa kreske; upuszczenie tworzy tam nowa kolumne
     z ta karteczka, dalsze kolumny procesu przesuwaja sie w prawo. Dziala tez miedzy procesami (karteczka zmienia proces).
   - Kolumna, z ktorej zabrano ostatnia karteczke (przeniesienie, zmiana procesu w panelu, Usun), znika - dalsze kolumny
     tego procesu przesuwaja sie o 1 w lewo. Zamykana jest tylko ta kolumna; inne puste miejsca (np. zostawione przez agenta) zostaja.
   - Jedno przeniesienie = jeden krok Cofnij. Przesuniete karteczki bez ↻ (AC-B28 - miejsce wzgledem innych bez zmian).

16. Anuluj i odstep (0.14.1, uwaga usera: "przy tworzeniu nowej karteczki (szarej) powinien byc przycisk anuluj obok zapisz.
    Dodatkowo powinna byc karteczka typu SPACE, zeby oddzielac od siebie elementy na wizualizacji"):
   - Nowa karteczka (szkic): obok "Zapisz" przycisk "Anuluj" - dziala jak Escape (szkic znika, nic nie zapisane).
   - Nowy typ `space` "odstęp" (puste miejsce): w panelu jako siodmy typ; tresc nieobowiazkowa.
     Na tablicy: przezroczysty prostokat o rozmiarze karteczki z blada przerywana ramka (widac, gdzie kliknac), bez cienia,
     bez znaczka synchronizacji i daty; tresc (jesli jest) blada. Przeciaganie, wstawianie, Cofnij - jak zwykla karteczka.
   - Odstep to uklad tablicy, nie wymaganie: nie liczy sie do "N karteczek" procesu ani do paska "Pliki:",
     `/sdd:board sync` go pomija (skill board). Stan synchronizacji `space`.
   - W legendzie na gorze bez zmian (legenda to typy tresci).

17. Ostrzezenie o podmianie tablicy (0.14.2, zdarzenie 2026-09-27: po restarcie Claude Code port przejal serwer z przykladowa
    tablica, karta po cichu pokazala przyklad i user uznal, ze stracil prace):
   - Serwer podaje w widoku tablicy `_file` - pelna sciezke pliku tablicy (pole tylko widoku, nie trafia do board.json).
   - Strona zapamietuje `_file` z pierwszego wczytania. Gdy przyjdzie tablica z innego pliku, a ta karta nie przelaczala
     modulu: staly pasek ostrzezenia "Serwer pokazuje teraz inna tablice: <modul> (<plik>). Wczesniej: <modul> (<plik>)"
     z wyjasnieniem (przelaczenie w innej karcie albo serwer uruchomiony z innym plikiem) i przyciskiem "Rozumiem".
     Otwarta edycja/szkic z poprzedniej tablicy jest zamykana, historia Cofnij czyszczona (jak przy zmianie z zewnatrz).
   - Przelaczenie modulu z menu na tej karcie - bez ostrzezenia.
   - Zrodlo zdarzenia poza tablica: `sdd-kit/project.json` (dashboard HQAI) uruchamial przyklad `example-zlecenia.json`
     na porcie 8012; od 0.14.2 uruchamia biezacy modul (przyklad jest pod /demo).

18. Pytania z pliku na tablicy (0.17.0, uwaga usera: "dlaczego nierozwiazane kwestie nie pojawiaja sie na tablicy?";
    decyzja: wszystkie cztery punkty, "pytanie, ktorego nie da sie przypisac do procesu - do procesu Do wyjasnienia
    (napisanego na czerwono)"):
   - Serwer podaje w widoku tablicy `_questions` - pytania z `01-interview/QUESTIONS.md`: ID, tresc, rodzaj statusu
     (otwarte, zadane, sprzeczne, odpowiedziane, zaparkowane), status, "Zamkniete przez", powiazane ID (R/BR/D/A z kolumn
     "Skad" i "Wplyw"). Pole tylko widoku.
   - Brakujace pytania: otwarte, zadane i sprzeczne Q, ktorych nie ma na tablicy (zadna karteczka nie ma `ref` = Q-xxx).
     Pasek tablicy: "Pytania z plików: N nie ma na tablicy - Dołóż". Dolozenie = jeden krok Cofnij, karteczki `hot`
     z trescia pytania i `ref`, `file` = 01-interview/QUESTIONS.md, `synced` (pytanie juz jest w pliku).
   - Miejsce: obok karteczki, ktorej `ref` jest wsrod powiazanych ID pytania (ten sam proces i kolumna, na koncu kolumny).
     Brak takiej karteczki -> proces "Do wyjaśnienia" na koncu tablicy (zakladany, jesli go nie ma), kolejna kolumna.
   - Proces "Do wyjaśnienia" ma nazwe na czerwono (rozpoznawany po nazwie).
   - Karteczka pytania zamknietego w pliku (odpowiedziane / zaparkowane): wyszarzona, z dopiskiem "zamknięte: D-xxx"
     albo "zaparkowane". Przycisk "Zdejmij zamknięte (N)" usuwa je z tablicy - jeden krok Cofnij.
   - Przelacznik "Pokaż pytania" w pasku tablicy (zapamietany w przegladarce): wylaczony chowa karteczki `hot`
     i proces "Do wyjaśnienia", jesli poza pytaniami nic w nim nie ma.
   - Skill board: `rebuild` bierze otwarte/zadane/sprzeczne Q z tymi samymi zasadami miejsca; `sync` konczy sie
     informacja o pytaniach spoza tablicy (dolozenie przyciskiem albo przez agenta).

19. Odpowiedzi na pytania na tablicy (0.17.0, uwaga usera: "a jak zrobic wyjasnienie tych pytan? Czy mozna je ogarnac
    po stronie Tablicy Warsztatowej" - decyzja: komplet, tablica zbiera odpowiedzi, do plikow wpisuje agent):
   - Panel czerwonej karteczki (`hot`): pola "Odpowiedź" i "Kto odpowiedział" (rola; podpowiedzi z rol w pytaniach).
     Zapis odpowiedzi bez "Kto odpowiedział" - komunikat "Wpisz, kto odpowiedział." (zasada procesu: kazda odpowiedz ma autora).
     board.json: nowe opcjonalne pola karteczki `answer`, `answeredBy`, `answeredAt` (ISO, ustawiane przy zmianie odpowiedzi).
     Zmiana odpowiedzi to zmiana karteczki (`updated`, stan ↻ dla zsynchronizowanej).
   - Karteczka z odpowiedzia, ktorej pytanie w pliku jest dalej otwarte/zadane/sprzeczne (albo pytania nie ma w pliku):
     znacznik "odpowiedź czeka na zapis" i poczatek odpowiedzi na karteczce. Po zamknieciu pytania w pliku - jak w punkcie 18
     (szara, "zamknięte: D-xxx"); odpowiedz zostaje na karteczce jako slad.
   - Pasek "Pytania": "N odpowiedzi czeka na zapis - uruchom /sdd:board sync" (z przyciskiem Kopiuj).
   - `/sdd:board sync` (skill board): odpowiedzi z tablicy przetwarza jak `/sdd:interview` krok 3 - dla kazdej 3-5 linijek:
     D czy potwierdzenie/obalenie A czy nowe Q, tresc, kaskada; autor = "Kto odpowiedział"; czeka na "tak"; zapis do
     DECISIONS/ASSUMPTIONS, Q -> odpowiedziane + "Zamkniete przez", PRD sekcja 6, CHANGELOG.
   - Przeglad pytan: przycisk "Przegląd pytań" w pasku. Kolejnosc: sprzeczne, blokujace (etykieta z SDD.yaml), zadane,
     otwarte, potem pytania z tablicy spoza pliku; zamkniete i juz odpowiedziane - na koncu. Pasek pokazuje
     "‹ Poprzednie · 3 z 18 · Następne ›" i "Zakończ"; kazdy krok przewija tablice do pytania, otwiera je w panelu
     i ustawia kursor w polu odpowiedzi. Wlacza "Pokaż pytania", jesli byly schowane.

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
- AC-B11: `stampNotes(prev, next, now)`: nowa karteczka -> created=updated=now; zmieniona tresc/typ/proces/ID albo przeniesiona (`_moved`, AC-B28) -> updated=now, created bez zmian; nietknieta -> daty bez zmian; daty podane przez agenta w `next` nie sa nadpisywane.
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
- AC-B24 (reczne): klik "+" pod kolumna -> szara karteczka na dole tej kolumny, panel obok; wpisywanie zmienia tekst szkicu; wybor typu zmienia kolor; Zapisz bez typu -> "Wybierz typ"; Escape usuwa szkic i board.json bez zmian; Zapisz -> karteczka w tym miejscu; tryb ciemny: szkic czytelny.
- AC-B25 (reczne): okno 1280x800, tablica horizon-zlecenia: strona nie ma paska przewijania; zakladki i pasek narzedzi widoczne przy przewijaniu tablicy w dol; poziomy pasek tablicy widoczny bez przewijania strony; dol tablicy przy dolnej krawedzi okna; telefon 375 px - strona przewija sie jak wczesniej.
- AC-B26 (reczne): kursor nad karteczka = grab, nad "+" = pointer, nad pustym tlem = all-scroll; przeciagniecie pustego tla o 200 px w lewo przesuwa tablice o 200 px w prawo (i w pionie analogicznie); przeciagniecie karteczki dalej ja przenosi; zadne klikniecie nie wywoluje sie po przesunieciu.
- AC-B27: `insertCol(b, lane, col)` przesuwa w procesie `lane` karteczki z `col >= col` o 1 w prawo, inne procesy nietkniete; zwraca liczbe przesunietych.
- AC-B28: `stampNotes`: zmiana samego `col` (np. po `insertCol`/`closeCol`, takze cofniecie) nie zmienia `updated`; karteczka z `_moved` dostaje `updated`=now, a `_moved` znika z wyniku; sasiad, ktorego przeniesiona karteczka minela, bez zmian; AC-B11 bez zmian dla tresci/typu/procesu/ID.
- AC-B29 (reczne): najechanie miedzy karteczki kolumny pokazuje kreske z "+", klik -> szary szkic miedzy nimi, Zapisz -> karteczka tam; najechanie miedzy kolumny -> pionowa kreska z "+", klik -> dalsze kolumny w prawo i szkic w nowej kolumnie, Escape -> wszystko wraca, Zapisz -> zapisane, przesuniete karteczki bez ↻, Cofnij -> jak przed wstawieniem.
- AC-B30: `closeCol(b, lane, col)`: gdy w kolumnie nie ma karteczek procesu - karteczki procesu z `col > col` o 1 w lewo, zwraca liczbe przesunietych; gdy kolumna zajeta - nic (0); inne procesy nietkniete.
- AC-B31: `placeNote(b, id, lane, col, {before, newCol})`: przenosi karteczke i oznacza ja `_moved` (z `newCol` - najpierw `insertCol`), potem zamyka kolumne, z ktorej wyszla, jesli zostala pusta; wynik: kolejnosc karteczek w procesach bez dziur po przeniesieniu; `removeNote(b, id)` usuwa i zamyka pusta kolumne.
- AC-B32 (reczne): przeciagniecie karteczki na kreske miedzy kolumnami innego procesu -> nowa kolumna tam, dalsze w prawo, w starym procesie kolumna znika (jesli byla jedyna), bez ↻ na przesunietych; Cofnij przywraca; przeciagniecie do zwyklej kolumny i Usun ostatniej karteczki w kolumnie tez zamykaja dziure.
- AC-B33: `syncState` / `syncMap`: karteczka `type: "space"` ma stan 'space' niezaleznie od `synced`, `ref`, `file`.
- AC-B35: `noteSync(note, map)` - stan do narysowania: odstep -> 'space'; zwykla karteczka ze stanem z serwera 'space' (typ wlasnie zmieniony z odstepu) albo nieznanym/brakujacym -> 'board'; znany stan -> ten stan. (Blad user 2026-09-27: zmiana odstepu na zdarzenie wywracala rysowanie - proces znikal z ekranu, zapis nie szedl.)
- AC-B36 (reczne): blad rysowania tablicy nie blokuje zapisu (zapis idzie przed rysowaniem) i pokazuje komunikat; odstep zmieniony na zdarzenie zapisuje sie i rysuje z kolorem zdarzenia.
- AC-B34 (reczne): nowa karteczka ma "Anuluj" obok "Zapisz" (istniejaca - nie), Anuluj usuwa szkic bez zapisu; typ "odstęp" zapisuje sie bez tresci, na tablicy przezroczysty z blada ramka, bez znaczka i daty, nie liczy sie do licznika procesu ani paska Pliki; da sie go przeciagnac i usunac; tryb ciemny czytelny.
- AC-B37: `boardSwitched(known, board)`: brak zapamietanego pliku -> null; ten sam `_file` -> null; inny `_file` -> {from, to}; GET /api/board zwraca `_file` = sciezka pliku tablicy, a PUT nie zapisuje `_file` do board.json.
- AC-B38 (reczne): karta tablicy otwarta, serwer zatrzymany i uruchomiony z innym plikiem tablicy -> staly pasek ostrzezenia z oboma plikami, "Rozumiem" go chowa; przelaczenie modulu z menu tej karty -> bez paska.
- AC-B39: `stampNotes`: zmiana nazwy procesu (`renameLane` - stara nazwa znika z `lanes`, nowa stoi na tym samym miejscu) nie zmienia `updated` karteczek tego procesu, takze przy cofnieciu; przeniesienie karteczki do innego istniejacego procesu (formularz albo `placeNote`) dalej daje `updated`=now (AC-B11).
- AC-B40: `questionIndex(req)` (progress.js): mapa Q-xxx -> {text, kind, status, closedBy, refs}; `refs` - ID R/BR/D/A z kolumn Skad i Wplyw, bez samego pytania; wiersz szablonu pominiety; GET /api/board zwraca `_questions`, PUT go nie zapisuje.
- AC-B41: `missingQuestions(board, questions)`: otwarte/zadane/sprzeczne Q bez karteczki z tym `ref`; odpowiedziane, zaparkowane i juz obecne - pominiete; kolejnosc po ID.
- AC-B42: `placeQuestions(board, missing, now)`: pytanie z ref znanym na tablicy -> ten proces i kolumna, na koncu kolumny; bez miejsca -> proces "Do wyjaśnienia" (zalozony na koncu `lanes`, jesli brak), kolejne kolumny; karteczki `hot` z `ref`, `file`, `synced`/`created`/`updated` = now, `by: "agent"`; zwraca liczbe dolozonych.
- AC-B43: `closedQuestion(note, questions)`: karteczka z `ref` Q o rodzaju odpowiedziane -> "zamknięte: <Zamkniete przez>" (albo "zamknięte"), zaparkowane -> "zaparkowane"; inne i karteczki bez Q -> null. `isQuestionsLane(name)` rozpoznaje "Do wyjaśnienia" (takze bez polskich znakow, wielkosc liter dowolna).
- AC-B44 (reczne): horizon-zlecenia: pasek "16 nie ma na tablicy", Dołóż -> pytania przy swoich karteczkach, reszta w czerwonym "Do wyjaśnienia"; Cofnij zdejmuje wszystkie naraz; pytanie oznaczone w pliku jako odpowiedziane -> karteczka szara z "zamknięte: D-xxx" na zywo; "Zdejmij zamknięte" usuwa; "Pokaż pytania" wylaczone chowa czerwone karteczki i pusty proces pytan; stan przelacznika po przeladowaniu zachowany; tryb ciemny czytelny.
- AC-B45: `questionIndex` podaje tez `role` ("Do kogo") i `blocking` (etykieta blokujaca z SDD.yaml, bez zaprzeczenia "nie").
- AC-B46: `stampNotes`: zmiana `answer` albo `answeredBy` -> `updated`=now (jak tresc).
- AC-B47: `answerState(note, questions)`: `hot` z `answer` i pytaniem w pliku otwartym/zadanym/sprzecznym albo bez pytania w pliku -> 'pending'; z `answer` i pytaniem zamknietym -> 'recorded'; bez `answer`, pusta odpowiedz albo nie `hot` -> null. `pendingAnswers(board, questions)` - karteczki 'pending'.
- AC-B48: `questionOrder(board, questions)`: id karteczek `hot` w kolejnosci: sprzeczne, blokujace, zadane, otwarte (w grupie po ID pytania), pytania spoza pliku, na koncu odpowiedziane na tablicy i zamkniete w pliku.
- AC-B49 (reczne): horizon-zlecenia (kopia): panel pytania ma Odpowiedz i Kto; zapis bez "Kto" -> komunikat; z "Kto" -> znacznik na karteczce i licznik w pasku; Przegląd pytań prowadzi po kolei z kursorem w odpowiedzi; Cofnij cofa odpowiedz; oznaczenie Q w pliku jako odpowiedziane -> karteczka szara z odpowiedzia; tryb ciemny czytelny.
- AC-B6 (reczne): w przegladarce: zaloz proces, zmien nazwe, przesun, usun z karteczkami; plik board.json odpowiada widokowi.
- AC-B7 (reczne): klik karteczki otwiera karteczke w panelu z prawej (od 0.14.0 panel stoi na stale - AC-B23), Escape konczy edycje; "Dopasuj" miesci tablice bez poziomego paska; na telefonie brak przewijania strony w poziomie.

## Wyglad
Tokeny kolorow z `board/index.html` (`:root`), jasny i ciemny motyw bez zmian.
