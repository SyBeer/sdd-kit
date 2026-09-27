# Decyzje

Szablon wpisu:

## D-xxx | YYYY-MM-DD | <tytul>
Pytanie:
Decyzja:
Powod:            (puste = automatycznie nowe Q "dlaczego")
Zdecydowal:       (rola)
Zrodlo:
Wplyw:            (R, AC, A)
Zamyka pytanie:   (Q)
Otwiera pytania:  (Q)

## D-001 | 2026-09-26 | Akceptacja zlecen nowych spedytorow na osobnej liscie
Pytanie: Q-001 - na ktorej liscie zlecenie mlodszego spedytora czeka na akceptacje team leadera?
Decyzja: Po "Uruchom" zlecenie nowego/mlodszego spedytora trafia na osobna liste "Zlecenia do akceptacji"; akceptuje je team leader. Fragment o "logice akceptacji wlasciwej dla zlecen wstepnych" (prototyp-proces-dodawania-zlecenia.md §3) jest nieaktualny.
Powod: "ponieważ się uczą" - nowi spedytorzy sa w okresie nauki.
Zdecydowal: team leader
Zrodlo: [B] session-2026-09-26.md, Q-001 (Team Leader)
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-001
Otwiera pytania: -

## D-002 | 2026-09-26 | Limit kredytowy tylko u klienta
Pytanie: Q-002 - czy przewoznik ma "Dostepny limit"?
Decyzja: "Dostepny limit" dotyczy wylacznie klientow. Kolumna "Dostepny limit" na liscie Przewoznikow (wymagania-limity-i-blokady.md §7, §1 geneza) jest do usuniecia; §3 (brak sekcji limitow u przewoznika) zgodny z decyzja.
Powod: "nie chcemy zwiekszac ryzyka wynikajacego z zadluzenia" - limit mierzy zadluzenie klienta wobec grupy.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-002 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-002
Otwiera pytania: Q-017

## D-003 | 2026-09-26 | Brak limitu w spolce blokuje wspolprace tej spolki z klientem
Pytanie: Q-003 - czy brak limitu w spolce to blokada i jaki daje status?
Decyzja: Jezeli spolka z grupy nie ma przyznanego limitu dla klienta, ta spolka nie moze pracowac z klientem; status przy nazwie klienta jest czerwony. Spedytor musi najpierw uzyskac limit. Dwa mechanizmy zostaja rozne: blokada z braku limitu (per spolka, wyliczana) i blokada reczna (per kontrahent, wymagania-limity-i-blokady.md §4) - obie daja kolor czerwony.
Powod: jak D-002 - "nie chcemy zwiekszac ryzyka wynikajacego z zadluzenia".
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-003 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji; dla /sdd:domain - dwa hasla w GLOSSARY zamiast jednego "blokada"
Zamyka pytanie: Q-003
Otwiera pytania: Q-018
Zmieniona przez: D-016 (2026-09-26) - kolor czerwony liczony w kontekscie spolki bez limitu, nie dla klienta w ogole.

## D-004 | 2026-09-26 | Wniosek o limit moze zlozyc kazdy spedytor
Pytanie: Q-004 - kto moze wystapic o limit?
Decyzja: Kazdy spedytor moze zlozyc wniosek o limit (nowy albo zwiekszenie). Opis widoku, w ktorym "Wystap o limit" jest tylko u zespolu operacji (wymagania-limity-i-blokady.md §2), jest nieaktualny. Operacje rozpatruja wnioski; nie kazdy dostaje zgode.
Powod: "spedytor zna klienta najlepiej"; wnioskow jest bardzo duzo.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-004 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-004
Otwiera pytania: - (odrzucenia wnioskow: Q-011, juz otwarte)

## D-005 | 2026-09-26 | Kwote limitu ustala DR; DR jest adminem procesu limitow
Pytanie: Q-005 - skad pochodzi kwota limitu i kto ja wpisuje?
Decyzja: Kwote limitu ustala i wpisuje Dzial Ryzyka (DR) na podstawie sprawdzenia firmy w roznych zrodlach oraz historii wspolpracy. DR jest adminem w tym procesie (edycja limitow w panelu admina, wymagania-limity-i-blokady.md §7, nalezy do DR). Wniosek moze zlozyc kazdy - spedytor, team leader (uzupelnia D-004).
Powod: weryfikacja firmy w zrodlach i historii wspolpracy przed przyznaniem limitu.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-005 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji; dla /sdd:domain - nowy aktor DR
Zamyka pytanie: Q-005
Otwiera pytania: Q-019, Q-020

## D-006 | 2026-09-26 | Blokada i brak limitu zatrzymuja zlecenie
Pytanie: Q-006 - co sie dzieje przy dodawaniu zlecenia dla kontrahenta z blokada?
Decyzja: Przy wyborze klienta lub przewoznika z blokada formularz "Nowe zlecenie" pokazuje brak mozliwosci wspolpracy. Dla klienta bez limitu w danej spolce zlecen nie robimy (spojne z D-003). Stan docelowy - dzisiejszy formularz tego nie sprawdza (prototyp-proces-dodawania-zlecenia.md §1).
Powod: jak D-002 - "nie chcemy zwiekszac ryzyka wynikajacego z zadluzenia".
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-006 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-006
Otwiera pytania: Q-021

## D-007 | 2026-09-26 | Przy przebitce limit ze spolki wskazanej przez spedytora
Pytanie: Q-007 - limit ktorej spolki wykorzystuje zlecenie z przebitka?
Decyzja: Zlecenie z "Przebitka" wykorzystuje limit spolki z grupy wskazanej przez spedytora z widocznej dla niego puli. Pula = spolki, dla ktorych spedytor realizuje zlecenia; ustawiana w konfiguracji. Wskazana spolka musi miec limit dla klienta (D-003, D-006).
Powod: "tak jest efektywniej" (Sponsor, Q-022)
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-007 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-007
Otwiera pytania: Q-022 (pusty powod)

## D-008 | 2026-09-26 | Odrzucone zlecenie jest trwale usuwane
Pytanie: Q-008 - co sie dzieje ze zleceniem, ktorego team leader nie zaakceptowal?
Decyzja: Team leader moze odrzucic zlecenie z listy "Zlecenia do akceptacji". Odrzucone zlecenie nie jest realizowane i jest trwale usuwane z systemu - bez sladu w historii (kto utworzyl, kto odrzucil).
Powod: odrzucenie - jak D-001 (nowi spedytorzy sie ucza, team leader kontroluje); trwale usuniecie - "nie potrzebujemy tej informacji" (Sponsor).
Zdecydowal: team leader ("uznajmy ze znika na zawsze"), doprecyzowal sponsor biznesowy (trwale usuwane)
Zrodlo: [B] session-2026-09-26.md, Q-008 (Sponsor, Team Leader)
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-008
Otwiera pytania: -
Zmieniona przez: D-023 (2026-09-27) - odrzucac moga tez manager i admin.

## D-009 | 2026-09-26 | Anulowanie zlecenia zalezy od etapu
Pytanie: Q-009 - co sie dzieje ze zleceniem anulowanym?
Decyzja: Zlecenie wstepne (draft) anulowane - bez kar i kosztow, zapis trwale kasowany z systemu (jak D-008). Zlecenie zaakceptowane (w realizacji) anulowane - zostaje w systemie i wymaga rozliczenia; mozliwe dodatkowe koszty, ich podzial zalezy od powodu anulacji (np. brak mozliwosci realizacji transportu, zmiana decyzji klienta).
Powod: [AI] wniosek prowadzacego, niepotwierdzony - kary i koszty powstaja dopiero przy zleceniu w realizacji.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-009 (Sponsor); skala: 40 000 zlecen/mies.
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-009
Otwiera pytania: Q-023

## D-010 | 2026-09-26 | Klasa spedytora zmieniana przez HR, poza logika systemu
Pytanie: Q-010 - kiedy i kto zdejmuje oznaczenie "nowy spedytor"?
Decyzja: Sa dwie klasy spedytora: "nowy" i "doswiadczony". O zmianie decyduje szef sprzedazy, w systemie zmienia ja HR. System nie liczy stazu - widzi tylko aktualna klase. Zwykle zmiana po ok. roku (informacja, nie regula systemu).
Powod: decyzja kadrowa - "system nie musi tego wiedziec".
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-010 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji; dla /sdd:domain - pojecie "klasa spedytora", aktorzy HR i szef sprzedazy
Zamyka pytanie: Q-010
Otwiera pytania: -

## D-011 | 2026-09-26 | Odrzucony wniosek o limit = zlecenie transportowe nie jest zawierane
Pytanie: Q-011 - co sie dzieje po odrzuceniu wniosku o limit?
Decyzja: Po odrzuceniu wniosku przez DR spedytor widzi, ze nie moze zrobic zlecenia, i odmawia klientowi realizacji. Nie ma jeszcze umowy miedzy spolka a klientem, wiec to nie jest anulowanie (D-009 nie dotyczy) - zlecenie transportowe po prostu nie jest zawierane. Ciag dalszy D-003 i D-006.
Powod: jak D-002 - "nie chcemy zwiekszac ryzyka wynikajacego z zadluzenia".
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-011 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji; dla /sdd:domain - zlecenie transportowe = umowa ze spolka (odroznic od zlecenia wstepnego)
Zamyka pytanie: Q-011
Otwiera pytania: -

## D-012 | 2026-09-26 | Wykorzystanie limitu: fracht klienta, kurs sredni NBP z dnia poprzedzajacego
Pytanie: Q-012 - co zmienia kwote "Wykorzystano" w limicie?
Decyzja: Zawarcie zlecenia konsumuje wolne saldo limitu o fracht klienta; zaplata za zlecenie uwalnia saldo. Limity sa w PLN; fracht w innej walucie (zwykle EUR) przeliczany po srednim kursie NBP z dnia roboczego poprzedzajacego zawarcie umowy (wytyczne finansowe). Inne, zewnetrzne czynniki zmieniajace saldo obsluguje recznie DR.
Powod: zgodnie z wytycznymi finansowymi dla takich zdarzen.
Zdecydowal: szef DR (mechanizm), sponsor biznesowy (zrodlo kursu)
Zrodlo: [B] session-2026-09-26.md, Q-012 (Szef DR, Sponsor)
Wplyw: brak R, AC, A w chwili decyzji; do intake: dokument "wytyczne finansowe" jako zrodlo
Zamyka pytanie: Q-012
Otwiera pytania: -

## D-013 | 2026-09-26 | Fracht ponad wolne saldo blokuje zlecenie
Pytanie: Q-013 - co sie dzieje, gdy zlecenie przekracza wolne saldo klienta?
Decyzja: Jezeli fracht klienta (przeliczony wg D-012) przekracza wolne saldo limitu, zlecenia nie mozna zrealizowac; spedytor musi najpierw wystapic o zwiekszenie limitu (D-004).
Powod: jak D-002 - "nie chcemy zwiekszac ryzyka wynikajacego z zadluzenia".
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-013 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-013
Otwiera pytania: -

## D-014 | 2026-09-26 | Zlecenie z gieldy wymaga zarejestrowanego klienta
Pytanie: Q-015 - co z oferta pobrana z Gielda A/Gielda B, gdy klienta nie ma w module Klienci?
Decyzja: Zanim oferta pobrana z Gielda A lub Gielda B stanie sie zleceniem, klienta trzeba zarejestrowac w module Klienci. Potem obowiazuja zwykle zasady limitu (D-003, D-006, D-013).
Powod: [AI] wniosek prowadzacego, niepotwierdzony - limit (D-003) mozna przyznac tylko zarejestrowanemu klientowi.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-015 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-015
Otwiera pytania: -

## D-015 | 2026-09-26 | Limit wazny rok, odnawia DR
Pytanie: Q-016 - dlaczego limit trzeba odnawiac?
Decyzja: Limit klienta wygasa po roku; odnawia go DR. Polisa (OCP/OCS) i licencja transportowa dotycza przewoznika i nie wplywaja na wygasniecie limitu (zgodne z D-002 i wymagania-limity-i-blokady.md §3 - tam sa powodem blokady/ostrzezenia u przewoznika).
Powod: [AI] wniosek prowadzacego, niepotwierdzony - coroczna weryfikacja kontrahenta przez DR.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-016 (Sponsor, z korekta)
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-016
Otwiera pytania: -

## D-016 | 2026-09-26 | Kolor statusu liczony z punktu widzenia spolki; blokada per spolka albo na calosc
Pytanie: Q-018 - jaki kolor, gdy klient ma limit w jednej spolce, a w innej nie?
Decyzja: Kolor statusu przy nazwie klienta liczy sie dla spolki, w kontekscie ktorej pracuje spedytor. Spolka bez limitu -> czerwony; spedytor przelacza sie na inna spolke, zeby zobaczyc jej limit, i jesli tam limit jest, moze pracowac z klientem przez te spolke. Blokada reczna moze byc ustawiona per spolka albo na calego kontrahenta (zrodlo wymagania-limity-i-blokady.md §4 opisuje tylko blokade na calego kontrahenta).
Powod: [AI] wniosek prowadzacego, niepotwierdzony - spedytor pracuje w imieniu konkretnej spolki, wiec widzi ryzyko tej spolki.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-018 (Sponsor)
Wplyw: zmienia D-003 (kolor per spolka); dotyka D-007 (pula spolek); brak R, AC, A w chwili decyzji; dla /sdd:domain - zmiana struktury blokady (zakres: spolka | caly kontrahent)
Zamyka pytanie: Q-018
Otwiera pytania: -

## D-017 | 2026-09-26 | "Zespol operacji" to DR
Pytanie: Q-019 - czy DR to ten sam zespol, ktory rozpatruje "Wnioski o limit"?
Decyzja: "Zespol operacji" z wymagania-limity-i-blokady.md §2 i §7 to Dzial Ryzyka (DR). Wnioski w zakladce "Wnioski o limit" rozpatruje DR. W slowniku jeden aktor, "zespol operacji" jako synonim.
Powod: to ten sam zespol (Sponsor).
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-019 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji; zgodne z D-005
Zamyka pytanie: Q-019
Otwiera pytania: -

## D-018 | 2026-09-26 | Kazdy rodzaj blokady zatrzymuje zlecenie
Pytanie: Q-021 - ktore rodzaje blokady zatrzymuja zlecenie?
Decyzja: Kazdy rodzaj blokady (platnosci, wspolpracy, dokumentow, pelna) zatrzymuje zlecenie w swoim zakresie - spolka albo caly kontrahent (D-016). Tylko "Brak blokady" pozwala pracowac. Uzupelnia D-006.
Powod: [AI] wniosek prowadzacego, niepotwierdzony - jak D-002 ("nie chcemy zwiekszac ryzyka").
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-021 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-021
Otwiera pytania: -

## D-019 | 2026-09-26 | Koszty anulacji ponosi strona, ktora ja spowodowala
Pytanie: Q-023 - kto ponosi koszty anulacji zaakceptowanego zlecenia?
Decyzja: Klient zmienia decyzje -> klient placi za anulacje zgodnie z zapisami w zleceniu. Transportu nie da sie zrealizowac z winy przewoznika -> placi przewoznik. Podstawa rozliczenia: pola "kary umowne" i "koszty anulacji" w sekcji Fracht (prototyp-proces-dodawania-zlecenia.md §1). Uzupelnia D-009.
Powod: [AI] wniosek prowadzacego, niepotwierdzony - koszty ponosi strona, ktora spowodowala anulacje.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-023 (Sponsor)
Wplyw: brak R, AC, A w chwili decyzji
Zamyka pytanie: Q-023
Otwiera pytania: -

## D-020 | 2026-09-26 | Zawarcie zlecenia = wejscie w stan spedycyjne
Pytanie: Q-024 - kiedy zlecenie jest zawierane (saldo limitu, kurs)?
Decyzja: Zlecenie jest zawierane w chwili, gdy staje sie spedycyjne: u spedytora klasy "nowy" po akceptacji team leadera, u "doswiadczonego" przy "Uruchom". Od tego momentu schodzi saldo limitu (BR-011), a kurs waluty bierze sie z dnia roboczego przed ta data (BR-013).
Powod: "zeby tworzone i nie potwierdzone zlecenie nie konsumowaly srodkow".
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-024 (Sponsor)
Wplyw: BR-011, BR-013 (doprecyzowane), GLOSSARY "Zawarcie zlecenia" (definicja), ENTITIES Zlecenie; brak R w PRD
Zamyka pytanie: Q-024
Otwiera pytania: -

## D-021 | 2026-09-26 | Zlecenie anuluje spedytor (tylko swoje) albo team leader
Pytanie: Q-026 - kto moze anulowac zlecenie?
Decyzja: Zlecenie - wstepne (trwale kasowane) i zaakceptowane (zostaje do rozliczenia) - moze anulowac spedytor, ale tylko wlasne zlecenie, albo team leader.
Powod:
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-26.md, Q-026 (Sponsor)
Wplyw: ENTITIES Zlecenie (przejscia anulacji), ACTORS Spedytor i Team leader; brak R w PRD
Zamyka pytanie: Q-026
Otwiera pytania: Q-058 (pusty powod)
Zmieniona przez: D-033 (2026-09-27) - team leader tylko swoj zespol, manager swoje zespoly.

## D-022 | 2026-09-27 | Blokady i ostrzezenia ustawia i zdejmuje tylko DR
Pytanie: Q-027 - kto ustawia i zdejmuje blokady oraz ostrzezenia?
Decyzja: Blokady (kazdy rodzaj, zakres spolka albo calosc) i ostrzezenia ustawia i zdejmuje wylacznie DR. Spedytor i team leader je widza, nie zmieniaja.
Powod:
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-27.md, Q-027 (Sponsor)
Wplyw: ENTITIES Blokada, Ostrzezenie (przejscia); ACTORS Spedytor, Team leader, DR; brak R w PRD
Zamyka pytanie: Q-027
Otwiera pytania: Q-059 (pusty powod)

## D-023 | 2026-09-27 | Akceptowac i odrzucac moga team leader, manager i admin
Pytanie: Q-028 - kto moze odrzucic zlecenie do akceptacji?
Decyzja: Zlecenie z listy "Zlecenia do akceptacji" moze zaakceptowac albo odrzucic team leader, manager albo admin. Zmienia D-008 (tam tylko team leader); zasada trwalego usuniecia odrzuconego zlecenia bez zmian. Potwierdza A-004.
Powod: [AI] wniosek prowadzacego, niepotwierdzony - ten sam zestaw rol co przy akceptacji.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-27.md, Q-028 (Sponsor)
Wplyw: zmienia D-008; A-004 -> potwierdzone; BR-006, BR-007; ENTITIES Zlecenie; ACTORS Manager, Administrator systemu; brak R w PRD
Zamyka pytanie: Q-028, Q-042
Otwiera pytania: -

## D-024 | 2026-09-27 | Ostrzezenie per spolka albo na calosc, jak blokada
Pytanie: Q-029 - jaki zakres ma ostrzezenie?
Decyzja: Ostrzezenie ustawia sie dla jednej spolki z grupy albo dla calego kontrahenta - tak samo jak blokade (D-016). Zolty kolor statusu liczy sie w kontekscie spolki.
Powod: spojnosc z blokada ("jak blokada").
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-27.md, Q-029 (Sponsor)
Wplyw: ENTITIES Ostrzezenie, BR-023, GLOSSARY Ostrzezenie; brak R w PRD
Zamyka pytanie: Q-029
Otwiera pytania: -

## D-025 | 2026-09-27 | "Zapisz wstepnie" zapisuje zlecenie wstepne
Pytanie: Q-030 - czy wersja robocza ("Zapisz wstepnie") to zlecenie wstepne?
Decyzja: "Zapisz wstepnie" zapisuje zlecenie wstepne, widoczne od razu na liscie zlecen wstepnych. Wersja robocza i zlecenie wstepne to ten sam rekord (jedno pojecie).
Powod: to ten sam rekord (Sponsor).
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-27.md, Q-030 (Sponsor)
Wplyw: GLOSSARY Zlecenie wstepne (synonim), ENTITIES Zlecenie; brak R w PRD
Zamyka pytanie: Q-030
Otwiera pytania: -

## D-026 | 2026-09-27 | Szablon zlecenia - trwaly wzor; kopia - jednorazowa
Pytanie: Q-031 - czym jest szablon zlecenia?
Decyzja: Szablon zlecenia to wzor zapisany na stale, uzywany wielokrotnie przy wielu podobnych zleceniach; zlecenie utworzone z szablonu powstaje jako wstepne. Kopia zlecenia jest jednorazowa i powstaje z istniejacego zlecenia. Dwa osobne pojecia.
Powod: przydaje sie przy wielu podobnych zleceniach (Sponsor).
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-27.md, Q-031 (Sponsor)
Wplyw: GLOSSARY Szablon zlecenia, Kopia zlecenia; ENTITIES Zlecenie, nowa encja Szablon zlecenia; BR-001; brak R w PRD
Zamyka pytanie: Q-031
Otwiera pytania: Q-060

## D-027 | 2026-09-27 | Szablon zlecenia jest prywatny
Pytanie: Q-060 - kto tworzy szablon i kto z niego korzysta?
Decyzja: Szablon zlecenia tworzy spedytor i tylko on z niego korzysta; inni spedytorzy nie widza cudzych szablonow.
Powod:
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-27.md, Q-060 (Sponsor)
Wplyw: ENTITIES Szablon zlecenia, GLOSSARY, ACTORS Spedytor; brak R w PRD
Zamyka pytanie: Q-060
Otwiera pytania: Q-061 (pusty powod)

## D-028 | 2026-09-27 | "Odnow" to wniosek o odnowienie; trzy rodzaje wniosku o limit
Pytanie: Q-032 - co robi "Odnow" u spedytora, skoro limit odnawia DR?
Decyzja: "Odnow" sklada wniosek o odnowienie limitu; odnawia DR (D-015). Rodzaje wniosku o limit: nadanie ("Zawnioskuj o limit", "Wystap o limit"), zwiekszenie ("Zwieksz limit"), odnowienie ("Odnow").
Powod: [AI] wniosek prowadzacego, niepotwierdzony - decyzje o limicie podejmuje DR, spedytor tylko wnioskuje (D-004, D-005).
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-27.md, Q-032 (Sponsor)
Wplyw: ENTITIES Wniosek o limit, Limit; GLOSSARY Wniosek o limit; brak R w PRD
Zamyka pytanie: Q-032
Otwiera pytania: -
Zmieniona przez: D-036 (2026-09-27) - nadanie i zwiekszenie jednym przyciskiem "Zwieksz limit"; nie ma osobnego "Zawnioskuj o limit" / "Wystap o limit".

## D-029 | 2026-09-27 | Uprawnienia: dozwolone tylko to, co przyznaja decyzje
Pytanie: Q-033 - czego nie wolno team leaderowi, managerowi, adminowi, szefowi sprzedazy (i DR, Q-034)?
Decyzja: W pierwszej wersji kazda rola moze tylko to, co wprost przyznaja jej decyzje (D-001..D-028); wszystko inne jest zabronione. Szczegolowe listy zakazow - Q-033, Q-034 (zaparkowane).
Powod: [AI] wniosek prowadzacego, niepotwierdzony - bez listy zakazow bezpieczniej blokowac domyslnie.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-27.md, Q-033 (Sponsor)
Wplyw: ACTORS (wszystkie role), nowa BR-031; brak R w PRD
Zamyka pytanie: - (Q-033, Q-034 zaparkowane z tym warunkiem)
Otwiera pytania: -

## D-030 | 2026-09-27 | Podzial marzy miedzy spedytorow pomagajacych przy zleceniu
Pytanie: Q-035 - miedzy kogo dzielona jest marza przy "Podziale marzy"?
Decyzja: Gdy spedytorzy pomagaja sobie przy zleceniu, moga podzielic marze spedycji; proporcje ustalaja sami miedzy soba. Przelacznik "Podzial marzy" zostaje w pierwszej wersji.
Powod: wynagrodzenie za pomoc przy zleceniu - "jezeli sobie pomagaja przy zleceniu" (Sponsor).
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-27.md, Q-035 (Sponsor)
Wplyw: GLOSSARY Marza spedycji, nowe haslo Podzial marzy; ENTITIES Zlecenie; brak R w PRD
Zamyka pytanie: Q-035
Otwiera pytania: Q-062

## D-031 | 2026-09-27 | Podzial marzy wpisuje kwotowo spedytor prowadzacy
Pytanie: Q-062 - kto i jak wpisuje podzial marzy?
Decyzja: Podzial marzy wpisuje na zleceniu spedytor prowadzacy zlecenie, jako kwote dla kazdego pomagajacego spedytora.
Powod: [AI] wniosek prowadzacego, niepotwierdzony - prowadzacy odpowiada za zlecenie i jego marze.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-27.md, Q-062 (Sponsor)
Wplyw: ENTITIES Zlecenie, GLOSSARY Podzial marzy, ACTORS Spedytor; brak R w PRD
Zamyka pytanie: Q-062
Otwiera pytania: -

## D-033 | 2026-09-27 | Anulacja wedlug hierarchii zespolow
Pytanie: uwaga wlasciciela procesu do R-004 (paczka 2 PRD)
Decyzja: Zlecenie anuluje: spedytor - tylko swoje; team leader - zlecenia ludzi ze swojego zespolu; manager - zlecenia swoich team leaderow i ich ludzi. Na poziomie managera kilkanascie zespolow, razem kilkaset osob. Zmienia D-021.
Powod: [AI] wniosek prowadzacego, niepotwierdzony - kontrola w ramach odpowiedzialnosci przelozonego.
Zdecydowal: wlasciciel procesu
Zrodlo: [B] session-2026-09-27.md, paczka 2 PRD (Wlasciciel procesu)
Wplyw: zmienia D-021; ENTITIES Zlecenie (przejscia anulacji), Konto spedytora (zespol, przelozony); ACTORS Team leader, Manager; GLOSSARY Zespol (robocze); nowa BR-032; R-004
Zamyka pytanie: -
Otwiera pytania: Q-065, Q-066

## D-034 | 2026-09-27 | Cel przebitki
Pytanie: Q-043 - jaka spolka jest ustawiona przy przebitce (runda 1)
Decyzja: Przebitke robi sie ze wzgledu na obsluge przez przewoznika albo gdy spolka pracodawcy (spolka, ktora przyjela zlecenie od klienta) nie ma juz limitu na kliencie.
Powod: [B] sponsor - przebitka jest zrobiona z punktu widzenia obslugi przez przewoznika albo braku limitu pierwotnej spolki na kliencie.
Zdecydowal: sponsor biznesowy
Zrodlo: [B] session-2026-09-27.md, runda 1, Q-043 (Sponsor)
Wplyw: GLOSSARY Przebitka; potwierdza A-005 (BR-015); R-009
Zamyka pytanie: Q-043
Otwiera pytania: -

## D-035 | 2026-09-27 | Kopia zlecenia to ulatwienie, bez potwierdzenia i oznaczenia
Pytanie: Q-071 - co pokazuje system przy zapisie kopii i po czym widac kopie (runda 2)
Decyzja: Z kopii powstaje nowe zlecenie wstepne (w trakcie tworzenia) z danymi przepisanymi z kopiowanego zlecenia. Zapis kopii nie wymaga potwierdzenia sprawdzenia danych, a kopia nie ma oznaczenia na liscie.
Powod: [B] sponsor - "to ulatwienie dla spedytora, zeby nie musial wszystkiego wpisywac".
Zdecydowal: sponsor biznesowy
Zrodlo: [B] 01-interview/Q-round-2-wlasciciel-procesu-odp.md, Q-071 (Sponsor)
Wplyw: obala A-006; BR-021, GLOSSARY Kopia zlecenia; R-001 (AC-001-2)
Zamyka pytanie: Q-071
Otwiera pytania: -

## D-036 | 2026-09-27 | Jeden przycisk "Zwieksz limit" do nadania i zwiekszenia limitu
Pytanie: Q-073 - jaki przycisk sluzy do wniosku o limit, gdy spolka nie ma limitu (runda 2); sprzecznosc Q-049 ("zwieksz limit") vs Q-073 ("dodaj limit")
Decyzja: Wniosek o nowy limit (gdy spolka nie ma limitu dla klienta) i wniosek o zwiekszenie limitu sklada sie tym samym przyciskiem "Zwieksz limit". Odnowienie - "Odnow". Rodzaje wniosku z D-028 bez zmian; nie ma osobnego przycisku "Zawnioskuj o limit" / "Wystap o limit". Zmienia D-028.
Powod:
Zdecydowal: wlasciciel procesu
Zrodlo: [B] 01-interview/Q-round-1-sponsor-biznesowy - odp.md, Q-049 (wlasciciel procesu); [B] 01-interview/Q-round-2-wlasciciel-procesu-odp.md, Q-073 (sponsor); [B] session-2026-09-27.md, runda 2 (wlasciciel procesu: wariant "Zwieksz limit")
Wplyw: zmienia D-028; A-011 potwierdzone; BR-026; GLOSSARY Wniosek o limit, Pracodawca; R-010 (opis, AC-010-1)
Zamyka pytanie: Q-073
Otwiera pytania: -

## D-037 | 2026-09-27 | Pola formularza zlecenia poza zakresem PRD v1
Pytanie: walidacja 2026-09-27 (INFO 15: BR-022, hasla formularza bez R), Q-036, Q-045
Decyzja: Pola formularza zlecenia przechodza z obecnej aplikacji bez opisu wymaganiami: Klient (zrodlo klienta, zgoda na platnosc na skanach, dokumenty przez portal), Trasa (zlecenie z pliku, typ pojazdu, waga, numery rejestracyjne, zaladunek, rozladunek, pozycje ladunku, dlugosc trasy, wymagania specjalne, uwagi), Fracht (termin platnosci i "Odblokuj edycje", kary i koszty dodatkowe), Zalaczniki, Kontakt. W zakresie zostaja: wybor klienta i przewoznika, przebitka, fracht klienta i przewoznika, podzial marzy.
Powod:
Zdecydowal: wlasciciel procesu
Zrodlo: [B] session-2026-09-27.md, zakres PRD po walidacji (Wlasciciel procesu)
Wplyw: PRD sekcja 4; Q-036, Q-045 zaparkowane; BR-022 poza zakresem v1; A-007 bez R; brak zmian R
Zamyka pytanie: -
Otwiera pytania: -
