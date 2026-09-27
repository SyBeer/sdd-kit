# PRD - zlecenia-demo (Grupa spedycyjna: zlecenia, limity i blokady)

## 1. Cel
Problem: spedytorzy moga dzis przyjac zlecenie od klienta bez sprawdzenia limitu kredytowego i blokad, a grupa nie chce
zwiekszac ryzyka wynikajacego z zadluzenia klientow ([Biz] session-2026-09-26.md, Q-002, D-002).
Efekt: zlecenie jest zawierane tylko wtedy, gdy kontrahent nie ma blokady, a spolka z grupy ma dla klienta limit z wolnym
saldem pokrywajacym fracht; zlecenia nowych spedytorow przechodza przez akceptacje team leadera (D-001, D-006, D-013).

Metryka produktowa: 0 zlecen zawartych z kontrahentem z blokada albo ponad wolne saldo (weryfikacja na danych po uruchomieniu).
Skala: ok. 40 000 zlecen miesiecznie ([Biz] session-2026-09-26.md, Q-009).

## 2. Aktorzy
Zob. `02-domain/ACTORS.md`: Spedytor, Team leader, Manager, Administrator systemu, DR, HR, Szef sprzedazy,
System (automatycznie), Integracja gieldy; zewnetrzni: Klient, Przewoznik.
Zasada uprawnien pierwszej wersji: rola moze tylko to, co przyznaja jej decyzje (D-029, BR-031).

## 3. Zakres
1. Cykl zlecenia: tworzenie zlecenia wstepnego (formularz, kopia, szablon, Rynek), uruchomienie, akceptacja
   i odrzucenie, anulacja, szablony prywatne, podzial marzy.
2. Limity kredytowe klienta per spolka z grupy: sprawdzenie przy wyborze kontrahenta i przy zawarciu, wykorzystanie
   i uwolnienie salda, przeliczenie waluty, przebitka, wnioski o limit (nadanie, zwiekszenie, odnowienie), waznosc roczna.
3. Blokady i ostrzezenia na kontrahencie (ustawia DR, zakres spolka albo calosc) oraz status ryzyka w kontekscie spolki.
4. Uprawnienia rol zgodnie z decyzjami D-001..D-031.
5. Pobieranie ofert z Rynku jako zlecen (tylko dla zarejestrowanego klienta).

## 4. Poza zakresem
Pierwsza wersja - swiadomie odlozone przez biznes (zaparkowane, nie blokuja go-live):
- Automatyczne wygasanie ostrzezen - w pierwszej wersji ostrzezenie zdejmuje recznie DR (Q-014).
- Zmiana listy typow ostrzezen u przewoznika - zostaje obecna lista (Q-017).
- Integracja z baza kredytowa - limity wpisuje recznie DR (Q-020).
- Automatyczne odnotowanie zaplat klienta - saldo po zaplacie koryguje recznie DR (Q-025).
- Szczegolowe listy zakazow per rola - obowiazuje zasada "tylko to, co przyznaja decyzje" (Q-033, Q-034, D-029).
Poza systemem z decyzji biznesu:
- Decyzja o zmianie klasy spedytora (kadry, szef sprzedazy) - system przechowuje tylko klase (D-010).
- Ustalanie proporcji podzialu marzy - spedytorzy ustalaja miedzy soba, system zapisuje kwoty (D-030, D-031).
- Konsekwencje dla spedytora za zlecenie u kontrahenta z ostrzezeniem (np. obnizka wynagrodzenia) - poza procesem; system tylko pokazuje ostrzezenie ([Biz] 01-interview/Q-round-2-wlasciciel-procesu-odp.md, Q-072, sponsor).
Pola formularza zlecenia - przechodza z obecnej aplikacji bez opisu wymaganiami (D-037):
- Klient: zrodlo klienta, zgoda na platnosc na skanach, dokumenty przez portal (Q-036).
- Trasa: zlecenie z pliku, typ pojazdu, waga, numery rejestracyjne, miejsca zaladunku i rozladunku, pozycje ladunku,
  dlugosc trasy, wymagania specjalne, uwagi.
- Fracht: termin platnosci i "Odblokuj edycje" (BR-022, A-007, Q-045), kary i koszty dodatkowe.
- Zalaczniki i Kontakt.
W zakresie zostaja: wybor klienta i przewoznika (R-007), przebitka (R-009), fracht klienta i przewoznika (R-007, R-008),
podzial marzy (R-006).

## 5. Wymagania

### R-001 Utworzenie zlecenia wstepnego
Opis:              Spedytor tworzy zlecenie z formularza, kopii, wlasnego szablonu albo "Pobierz" z Rynku; zawsze powstaje zlecenie wstepne z numerem tymczasowym 00000/_/rr. "Zapisz wstepnie" zapisuje ten sam rekord.
Zrodlo:            [Dok] prototyp-proces-dodawania-zlecenia.md, §2 pkt 1, §3; [Biz] session-2026-09-26.md, Q-015 (D-014); [Biz] session-2026-09-27.md, Q-030, Q-031 (D-025, D-026); [Biz] 01-interview/Q-round-2-wlasciciel-procesu-odp.md, Q-071 (sponsor) (D-035)
Zalozenia:         A-001
Reguly:            BR-001, BR-020, BR-021
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-001-1: Given otwarty formularz "Nowe zlecenie", When spedytor klika "Zapisz wstepnie", Then zlecenie jest na liscie zlecen wstepnych z kolejnym numerem 00000/_/rr.
- AC-001-2: Given istniejace zlecenie, When spedytor zapisuje jego kopie, Then powstaje nowe zlecenie wstepne z kolejnym numerem 00000/_/rr i danymi przepisanymi z kopiowanego zlecenia.
- AC-001-3: Given wlasny szablon spedytora, When spedytor tworzy z niego zlecenie, Then powstaje zlecenie wstepne z danymi szablonu.
- AC-001-4: Given oferta z Gielda A, ktorej klienta nie ma w module Klienci, When spedytor klika "Pobierz", Then zlecenie nie powstaje, a system prosi o rejestracje klienta.

### R-002 Uruchomienie zlecenia
Opis:              "Uruchom" nadaje numer 000000/mm/rr i date utworzenia = dzien klikniecia; zlecenie spedytora klasy "nowy" trafia do akceptacji, "doswiadczonego" od razu staje sie spedycyjne (zawarcie).
Zrodlo:            [Dok] prototyp-proces-dodawania-zlecenia.md, §2 pkt 2; [Biz] session-2026-09-26.md, Q-001, Q-010 (D-001, D-010); [Biz] session-2026-09-27.md, Q-024 (D-020)
Zalozenia:         A-002, A-003
Reguly:            BR-002, BR-003, BR-004, BR-011
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-002-1: Given zlecenie wstepne spedytora klasy "nowy", When spedytor klika "Uruchom", Then zlecenie ma numer 000000/mm/rr i dzisiejsza date utworzenia, jest na liscie "Zlecenia do akceptacji", a saldo limitu sie nie zmienia.
- AC-002-2: Given zlecenie wstepne spedytora klasy "doswiadczony", When spedytor klika "Uruchom", Then zlecenie jest spedycyjne, a wykorzystanie limitu spolki rosnie o fracht klienta w PLN.
- AC-002-3: Given HR zmienil klase spedytora z "nowy" na "doswiadczony", When ten spedytor uruchamia zlecenie, Then zlecenie idzie sciezka doswiadczonego (od razu spedycyjne).

### R-003 Akceptacja i odrzucenie zlecenia
Opis:              Team leader, manager albo admin akceptuje zlecenie do akceptacji (staje sie spedycyjne, zuzywa saldo) albo je odrzuca (trwale usuniete bez sladu). Ryzyko: Q-063 (saldo spadlo w czasie oczekiwania) - otwarte, nie blokuje.
Zrodlo:            [Biz] session-2026-09-26.md, Q-001, Q-008 (D-001, D-008); [Biz] session-2026-09-27.md, Q-024, Q-028 (D-020, D-023)
Zalozenia:         A-004
Reguly:            BR-005, BR-006, BR-007, BR-011
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-003-1: Given zlecenie do akceptacji, When team leader je akceptuje, Then zlecenie jest spedycyjne, a wykorzystanie limitu rosnie o fracht klienta.
- AC-003-2: Given zlecenie do akceptacji, When manager je odrzuca, Then zlecenie znika ze wszystkich list i z bazy, bez wpisu w historii.
- AC-003-3: Given uzytkownik w roli spedytora, When otwiera zlecenie do akceptacji, Then nie ma akcji "Akceptuj" ani "Odrzuc", a wywolanie ich z pominieciem interfejsu jest odrzucane.

### R-004 Anulacja zlecenia
Opis:              Zlecenie anuluje spedytor (tylko swoje), team leader (zlecenia swojego zespolu) albo manager (zlecenia swoich team leaderow i ich ludzi). Wstepne - bez kosztow, trwale kasowane; spedycyjne - zostaje jako anulowane do rozliczenia, koszty ponosi klient (zmiana decyzji, wg zapisow zlecenia) albo przewoznik (brak realizacji z jego winy). Ryzyko: Q-064 (saldo po anulacji) - otwarte, nie blokuje.
Zrodlo:            [Biz] session-2026-09-26.md, Q-009, Q-023 (D-009, D-019); [Biz] session-2026-09-27.md, Q-026 (D-021), paczka 2 PRD (D-033)
Zalozenia:         -
Reguly:            BR-018, BR-019, BR-032
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-004-1: Given wlasne zlecenie wstepne spedytora, When spedytor je anuluje, Then zlecenie znika z systemu, bez kar i kosztow.
- AC-004-2: Given zlecenie spedycyjne spedytora z zespolu team leadera, When team leader anuluje je z powodu zmiany decyzji klienta, Then zlecenie ma status "anulowane", zostaje na liscie, a koszty anulacji sa przypisane klientowi.
- AC-004-3: Given zlecenie spedycyjne, When anulacja wynika z braku realizacji z winy przewoznika, Then koszty anulacji sa przypisane przewoznikowi.
- AC-004-4: Given zlecenie spedytora z innego zespolu, When team leader probuje je anulowac, Then operacja jest odrzucona.
- AC-004-5: Given zlecenie spedytora z zespolu podleglego managerowi, When manager je anuluje, Then anulacja przebiega jak w AC-004-1 i AC-004-2.
- AC-004-6: Given zlecenie innego spedytora, When spedytor probuje je anulowac, Then operacja jest odrzucona.

### R-005 Szablon zlecenia
Opis:              Spedytor zapisuje wzor zlecenia jako szablon na stale i uzywa go wielokrotnie; szablon widzi i uzywa tylko jego autor.
Zrodlo:            [Dok] prototyp-proces-dodawania-zlecenia.md, §3; [Biz] session-2026-09-27.md, Q-031, Q-060 (D-026, D-027)
Zalozenia:         -
Reguly:            BR-001
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-005-1: Given spedytor zapisal szablon, When tworzy z niego trzy zlecenia, Then kazde jest nowym zleceniem wstepnym, a szablon zostaje bez zmian.
- AC-005-2: Given szablon spedytora A, When spedytor B przeglada szablony, Then szablonu A nie widzi i nie moze go uzyc.

### R-006 Podzial marzy
Opis:              Spedytor prowadzacy moze na swoim zleceniu wlaczyc "Podzial marzy" i wpisac kwote dla kazdego pomagajacego spedytora. Limit sumy podzialu - Q-067 (otwarte, nie blokuje).
Zrodlo:            [Dok] prototyp-proces-dodawania-zlecenia.md, §1 Fracht; [Biz] session-2026-09-27.md, Q-035, Q-062 (D-030, D-031)
Zalozenia:         -
Reguly:            -
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-006-1: Given zlecenie z marza 250 EUR, When spedytor prowadzacy wlacza podzial i wpisuje 100 EUR dla spedytora B, Then zlecenie zapisuje podzial: B 100 EUR.
- AC-006-2: Given zlecenie innego spedytora, When spedytor probuje wpisac na nim podzial marzy, Then operacja jest odrzucona.

### R-007 Kontrola blokad i limitu przed zawarciem
Opis:              Przy wyborze kontrahenta w formularzu i przy zawarciu zlecenia system nie pozwala pracowac, gdy: kontrahent ma blokade dowolnego rodzaju w spolce albo na calosci; spolka limitu nie ma limitu dla klienta; fracht przekracza wolne saldo. Ryzyko: Q-063 - otwarte, nie blokuje.
Zrodlo:            [Biz] session-2026-09-26.md, Q-003, Q-006, Q-013, Q-018, Q-021 (D-003, D-006, D-013, D-016, D-018)
Zalozenia:         -
Reguly:            BR-008, BR-009, BR-010, BR-016
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-007-1: Given klient z "Blokada platnosci" na calosci, When spedytor wybiera go w formularzu, Then widzi komunikat "brak mozliwosci wspolpracy" i nie moze uruchomic zlecenia.
- AC-007-2: Given klient z blokada tylko w spolce B, When spedytor pracuje w kontekscie spolki A z limitem, Then moze wybrac klienta; w kontekscie spolki B nie moze.
- AC-007-3: Given spolka limitu bez limitu dla klienta, When spedytor wybiera klienta, Then widzi "brak limitu" i moze zlozyc wniosek o limit.
- AC-007-4: Given wolne saldo 1 000 PLN, fracht 300 EUR i sredni kurs NBP 4,30 (1 290 PLN), When doswiadczony spedytor klika "Uruchom", Then zlecenie nie zostaje zawarte, a system podpowiada wniosek o zwiekszenie limitu.

### R-008 Wykorzystanie i uwolnienie salda
Opis:              Przy zawarciu wykorzystanie limitu rosnie o fracht klienta w PLN (sredni kurs NBP z dnia roboczego poprzedzajacego zawarcie). W pierwszej wersji zaplate odnotowuje recznie DR, co uwalnia te sama kwote PLN. Ryzyko: Q-064 (saldo po anulacji) - otwarte, nie blokuje.
Zrodlo:            [Biz] session-2026-09-26.md, Q-012 (D-012); [Biz] session-2026-09-27.md, Q-024, Q-025 (D-020), paczka 3 PRD (AC-008-2)
Zalozenia:         -
Reguly:            BR-011, BR-012, BR-013
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-008-1: Given fracht 1 000 EUR i sredni kurs NBP z piatku 4,30, When zlecenie zostaje zawarte w poniedzialek, Then wykorzystanie rosnie o 4 300 PLN.
- AC-008-2: Given zawarte zlecenie, When DR odnotowuje zaplate, Then wykorzystanie maleje o te sama kwote PLN co przy zawarciu.
- AC-008-3: Given zlecenie wstepne albo do akceptacji, Then wykorzystanie limitu sie nie zmienia.

### R-009 Przebitka a limit
Opis:              Przy przebitce spedytor wskazuje spolke z puli (domyslnie pracodawca); limit, saldo i blokady licza sie dla wskazanej spolki.
Zrodlo:            [Dok] prototyp-proces-dodawania-zlecenia.md, §1 Klient; [Biz] session-2026-09-26.md, Q-007 (D-007)
Zalozenia:         A-005
Reguly:            BR-014, BR-015
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-009-1: Given spedytor zaznacza przebitke, Then domyslnie wybrana jest spolka jego pracodawcy.
- AC-009-2: Given pula spedytora ze spolkami A i B, When spedytor wskazuje B, Then limit, saldo i blokady sa sprawdzane dla spolki B.
- AC-009-3: Given spolka C spoza puli spedytora, Then nie mozna jej wskazac.

### R-010 Wniosek o limit
Opis:              Wniosek sklada spedytor albo team leader; rodzaje: nadanie i zwiekszenie (jeden przycisk "Zwieksz limit"), odnowienie ("Odnow"). Wniosek trafia do DR w zakladce "Operacje" > "Limity"; DR przyznaje z kwota albo odrzuca (odmowa realizacji zlecenia).
Zrodlo:            [Dok] wymagania-limity-i-blokady.md, §2; [Biz] session-2026-09-26.md, Q-004, Q-005, Q-011, Q-019 (D-004, D-005, D-011, D-017); [Biz] session-2026-09-27.md, Q-032 (D-028); [Biz] session-2026-09-27.md, runda 2, Q-073 (D-036)
Zalozenia:         A-011, A-012
Reguly:            BR-016, BR-026, BR-027
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-010-1: Given pracodawca spedytora nie ma limitu dla klienta, Then przycisk "Zwieksz limit" jest aktywny; When spedytor sklada wniosek, Then wniosek jest u DR w zakladce "Operacje" > "Limity", licznik oczekujacych rosnie o 1, a przy spolce widac status "oczekuje".
- AC-010-2: Given oczekujacy wniosek, When DR przyznaje 200 000 PLN, Then w kartotece jest aktywny limit 200 000 PLN wazny rok, a status "oczekuje" znika.
- AC-010-3: Given oczekujacy wniosek, When DR go odrzuca, Then limit sie nie zmienia, a spedytor widzi, ze nie moze zawrzec zlecenia.
- AC-010-4: Given uzytkownik w roli spedytora, When probuje wpisac kwote limitu, Then nie ma takiej mozliwosci (kwote wpisuje tylko DR).

### R-011 Waznosc i odnowienie limitu
Opis:              Limit wygasa po roku; wygasly limit dziala jak brak limitu. "Odnow" sklada wniosek o odnowienie, DR odnawia - nowa waznosc rok od dnia odnowienia.
Zrodlo:            [Biz] session-2026-09-26.md, Q-016 (D-015); [Biz] session-2026-09-27.md, Q-032 (D-028), paczka 4 PRD (AC-011-3)
Zalozenia:         -
Reguly:            BR-017
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-011-1: Given limit przyznany 2026-09-27 (ostatni dzien waznosci 2027-09-26), When 2027-09-27 spedytor wybiera klienta, Then limit jest wygasly, status klienta w kontekscie tej spolki jest czerwony, a zlecenia nie da sie zawrzec.
- AC-011-2: Given aktywny albo wygasly limit, When spedytor klika "Odnow", Then w kolejce DR jest wniosek o odnowienie.
- AC-011-3: Given wniosek o odnowienie, When DR odnawia limit, Then limit jest aktywny z nowa data waznosci: rok od dnia odnowienia.

### R-012 Limit tylko dla klienta
Opis:              Przewoznik nie ma sekcji limitow ani kolumny "Dostepny limit".
Zrodlo:            [Biz] session-2026-09-26.md, Q-002 (D-002); [Dok] wymagania-limity-i-blokady.md, §3
Zalozenia:         -
Reguly:            BR-028
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-012-1: Given kartoteka przewoznika, Then zakladka "Limity i Blokady" zawiera tylko sekcje Blokady i Ostrzezenia.
- AC-012-2: Given lista przewoznikow, Then nie ma kolumny "Dostepny limit"; lista klientow ja ma.

### R-013 Blokady
Opis:              DR ustawia, zmienia i zdejmuje blokade (platnosci, wspolpracy, dokumentow, pelna / "Brak blokady") w zakresie spolki albo calosci; powod wymagany; kazda zmiana w historii blokad; status w kolumnie listy kontrahentow, klik = historia.
Zrodlo:            [Dok] wymagania-limity-i-blokady.md, §4; [Biz] session-2026-09-26.md, Q-018, Q-021 (D-016, D-018); [Biz] session-2026-09-27.md, Q-027 (D-022)
Zalozenia:         A-009
Reguly:            BR-009, BR-024
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-013-1: Given uzytkownik DR, When dodaje "Blokade dokumentow" dla spolki A bez powodu, Then zapis jest odrzucony.
- AC-013-2: Given uzytkownik DR podaje powod, When zapisuje blokade, Then blokada jest aktywna, a w historii jest wpis: kto, kiedy, jaki status.
- AC-013-3: Given spedytor albo team leader, Then nie ma przycisku "Dodaj blokade" ani mozliwosci zmiany statusu.
- AC-013-4: Given lista klientow, When uzytkownik klika status blokady, Then widzi historie zmian.

### R-014 Ostrzezenia
Opis:              DR dodaje ostrzezenie (typ z 6, powod wymagany) w zakresie spolki albo calosci; nie blokuje zlecen; w pierwszej wersji DR zdejmuje je recznie.
Zrodlo:            [Dok] wymagania-limity-i-blokady.md, §5; [Biz] session-2026-09-26.md, Q-014; [Biz] session-2026-09-27.md, Q-027, Q-029 (D-022, D-024)
Zalozenia:         A-010
Reguly:            BR-025
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-014-1: Given uzytkownik DR, When dodaje "Opoznienie platnosci" z powodem dla calosci, Then ostrzezenie jest aktywne, a spedytor dalej moze zawrzec zlecenie z tym klientem.
- AC-014-2: Given aktywne ostrzezenie, When DR je zdejmuje, Then znika z listy aktywnych ostrzezen.
- AC-014-3: Given spedytor, Then nie ma przycisku "Dodaj ostrzezenie".

### R-015 Status ryzyka
Opis:              Kolor przy nazwie kontrahenta (naglowek kartoteki) liczony w kontekscie spolki: czerwony (blokada w zakresie spolki lub calosci; u klienta takze brak limitu), zolty (co najmniej jedno aktywne ostrzezenie), zielony (brak).
Zrodlo:            [Dok] wymagania-limity-i-blokady.md, §6; [Biz] session-2026-09-26.md, Q-003, Q-018 (D-003, D-016); [Biz] session-2026-09-27.md, Q-029 (D-024), paczka 5 PRD (AC-015-3)
Zalozenia:         A-008
Reguly:            BR-008, BR-023
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-015-1: Given klient z limitem w spolce A, bez limitu w spolce B i bez blokad, Then w kontekscie A status jest zielony, w kontekscie B czerwony.
- AC-015-2: Given ostrzezenie dla calosci, brak blokad, limit w porzadku, Then status jest zolty w kazdej spolce.
- AC-015-3: Given blokada i ostrzezenie jednoczesnie, Then status jest czerwony.

### R-016 Uprawnienia: dozwolone tylko to, co przyznano
Opis:              Kazda rola wykonuje tylko czynnosci przyznane jej w decyzjach D-001..D-033; kazda inna operacja jest odrzucana, takze wywolana z pominieciem interfejsu. Zasada budowy (do constitution.md): nowa czynnosc bez decyzji o uprawnieniach jest domyslnie niedostepna dla wszystkich rol.
Zrodlo:            [Biz] session-2026-09-27.md, Q-033 (D-029)
Zalozenia:         -
Reguly:            BR-031
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-016-1: Given rola bez prawa do czynnosci (np. spedytor i "Przyznaj limit"), When wywoluje ja przez interfejs albo bezposrednio, Then operacja jest odrzucona i nic sie nie zmienia.
- AC-016-2: Given spedytor, When wywoluje "Przyznaj limit", "Dodaj blokade" albo "Zmien klase spedytora", Then kazda z tych operacji jest odrzucona.

### R-017 Klasa i zespol spedytora
Opis:              Konto spedytora ma klase (nowy / doswiadczony), zespol i przelozonego (team leader -> manager). Klase zmienia HR na zlecenie szefa sprzedazy; klasa decyduje o sciezce akceptacji, hierarchia o prawach anulacji. Ryzyko: Q-066 (kto przypisuje do zespolu) - otwarte, nie blokuje.
Zrodlo:            [Biz] session-2026-09-26.md, Q-010 (D-010); [Biz] session-2026-09-27.md, paczka 2 PRD (D-033); [Dok] prototyp-proces-dodawania-zlecenia.md, §2 pkt 2
Zalozenia:         -
Reguly:            BR-003, BR-004, BR-032
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-017-1: Given uzytkownik HR, When zmienia klase spedytora z "nowy" na "doswiadczony", Then od kolejnego uruchomienia zlecenia spedytora obowiazuje sciezka doswiadczonego.
- AC-017-2: Given spedytor, When probuje zmienic swoja klase, Then operacja jest odrzucona.
- AC-017-3: Given spedytor przypisany do zespolu team leadera X, Then X moze anulowac jego zlecenia (R-004), a team leader innego zespolu nie.

### R-018 Historia zmian kontrahenta
Opis:              Kazde utworzenie i zmiana danych kontrahenta zapisuje sie automatycznie w zakladce "Historia zmian": kto, co, data i godzina.
Zrodlo:            [Dok] wymagania-limity-i-blokady.md, §7
Zalozenia:         A-013
Reguly:            BR-029
Status:            zatwierdzone (wlasciciel procesu, 2026-09-27)
Wlasciciel:        wlasciciel procesu

Kryteria akceptacji:
- AC-018-1: Given kartoteka klienta, When uzytkownik zmienia termin platnosci, Then w "Historii zmian" jest wpis z uzytkownikiem, data, godzina i zmiana.

## 6. Do przegladu
Brak. Pozycje z rund async 1-2 (R-001, R-002, R-010) przejrzane i zatwierdzone przez wlasciciela procesu 2026-09-27.

## 7. Otwarte pytania blokujace
Brak pytan z etykieta "blokuje go-live" ani sprzecznych (stan 2026-09-27).
