# Changelog wymagan
# format: YYYY-MM-DD | skill | co | zrodlo
2026-09-26 | init | utworzono strukture, poziom full | panel
2026-09-26 | intake | przebieg pierwszy: 2 zrodla [D] w INDEX.md, 5 pytan sprzeczne (Q-001..Q-005) | 00-intake/prototyp-proces-dodawania-zlecenia.md, 00-intake/wymagania-limity-i-blokady.md
2026-09-26 | interview | krok 1: 11 pytan z reguly luka (Q-006..Q-016) | 00-intake/prototyp-proces-dodawania-zlecenia.md, 00-intake/wymagania-limity-i-blokady.md
2026-09-26 | interview | D-001 akceptacja zlecen nowych spedytorow na liscie "Zlecenia do akceptacji"; Q-001 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-002 limit kredytowy tylko u klienta; Q-002 odpowiedziane; nowe Q-017 | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-003 brak limitu w spolce blokuje wspolprace (status czerwony); Q-003 odpowiedziane; nowe Q-018 | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-004 wniosek o limit moze zlozyc kazdy spedytor; Q-004 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-005 kwote limitu ustala DR (admin procesu); Q-005 odpowiedziane; nowe Q-019, Q-020 | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-006 blokada i brak limitu zatrzymuja zlecenie; Q-006 odpowiedziane; nowe Q-021 | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-007 przebitka: limit spolki wskazanej przez spedytora z jego puli (konfiguracja); Q-007 odpowiedziane; Q-022 pusty powod | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-008 odrzucone zlecenie trwale usuwane; Q-008 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-009 anulowanie: draft trwale kasowany, zaakceptowane zostaje i jest rozliczane; Q-009 odpowiedziane; nowe Q-023 | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-010 klasa spedytora (nowy/doswiadczony) zmieniana przez HR na zlecenie szefa sprzedazy; Q-010 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-011 odrzucony wniosek o limit: zlecenie transportowe nie jest zawierane (nie anulowanie); Q-011 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-012 wykorzystanie limitu: fracht klienta, kurs sredni NBP z dnia roboczego przed zawarciem; Q-012 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-013 fracht ponad wolne saldo blokuje zlecenie; Q-013 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | Q-014 zaparkowane (nie blokuje go-live; ostrzezenia zdejmowane recznie w pierwszej wersji) | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-014 zlecenie z gieldy wymaga zarejestrowanego klienta; Q-015 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-015 limit wazny rok, odnawia DR; Q-016 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | Q-017 zaparkowane (nie blokuje go-live) | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-016 kolor statusu per spolka, blokada per spolka albo na calosc; zmienia D-003; Q-018 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-017 zespol operacji = DR; Q-019 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | Q-020 zaparkowane (nie blokuje go-live; bez bazy kredytowej w pierwszej wersji) | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-018 kazdy rodzaj blokady zatrzymuje zlecenie; Q-021 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-007 uzupelniony powod; Q-022 odpowiedziane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-019 koszty anulacji: klient przy zmianie decyzji, przewoznik przy braku realizacji; Q-023 odpowiedziane; koniec sesji live | [B] 01-interview/session-2026-09-26.md
2026-09-26 | domain | pierwsze utworzenie modelu: GLOSSARY 50 hasel, ACTORS 9 rol, ENTITIES 8 encji, RULES BR-001..BR-030, ASSUMPTIONS A-001..A-014; test spojnosci -> Q-024..Q-038 | 00-intake/prototyp-proces-dodawania-zlecenia.md, 00-intake/wymagania-limity-i-blokady.md, 01-interview/session-2026-09-26.md
2026-09-26 | interview | krok 1: Q-039..Q-052 (zalozenia A-001..A-014 z [D]), Q-053..Q-057 (powody [AI] w D-009, D-014, D-015, D-016, D-018) | 02-domain/RULES.md, 01-interview/DECISIONS.md
2026-09-26 | interview | D-020 zawarcie zlecenia = wejscie w spedycyjne; Q-024 odpowiedziane; BR-011, GLOSSARY Zawarcie zlecenia, ENTITIES Zlecenie zaktualizowane | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | Q-025 zaparkowane (nie blokuje go-live; saldo po zaplacie recznie przez DR); BR-012 uzupelniona | [B] 01-interview/session-2026-09-26.md
2026-09-26 | interview | D-021 anulacja: spedytor (tylko swoje) albo team leader; Q-026 odpowiedziane; ENTITIES, ACTORS zaktualizowane; Q-058 pusty powod | [B] 01-interview/session-2026-09-26.md
2026-09-27 | interview | D-022 blokady i ostrzezenia tylko DR; Q-027 odpowiedziane; ENTITIES, ACTORS zaktualizowane; Q-059 pusty powod | [B] 01-interview/session-2026-09-27.md
2026-09-27 | interview | D-023 akceptacja i odrzucenie: TL, manager, admin; zmienia D-008; A-004 potwierdzone; Q-028, Q-042 odpowiedziane; BR-006, BR-007, ENTITIES, ACTORS zaktualizowane | [B] 01-interview/session-2026-09-27.md
2026-09-27 | interview | D-024 ostrzezenie per spolka albo calosc; Q-029 odpowiedziane; ENTITIES, BR-023, GLOSSARY zaktualizowane | [B] 01-interview/session-2026-09-27.md
2026-09-27 | interview | D-025 Zapisz wstepnie = zlecenie wstepne; Q-030 odpowiedziane; GLOSSARY, ENTITIES zaktualizowane | [B] 01-interview/session-2026-09-27.md
2026-09-27 | interview | D-026 szablon zlecenia (trwaly wzor) vs kopia (jednorazowa); Q-031 odpowiedziane; nowa encja Szablon zlecenia, GLOSSARY, BR-001; nowe Q-060 | [B] 01-interview/session-2026-09-27.md
2026-09-27 | interview | D-027 szablon prywatny (tylko autor); Q-060 odpowiedziane; ENTITIES, GLOSSARY, ACTORS zaktualizowane; Q-061 pusty powod | [B] 01-interview/session-2026-09-27.md
2026-09-27 | interview | D-028 Odnow = wniosek o odnowienie; rodzaje wniosku o limit; Q-032 odpowiedziane; ENTITIES, GLOSSARY zaktualizowane | [B] 01-interview/session-2026-09-27.md
2026-09-27 | interview | D-029 uprawnienia domyslnie zabronione; Q-033, Q-034 zaparkowane (nie blokuje go-live); ACTORS, BR-031 | [B] 01-interview/session-2026-09-27.md
2026-09-27 | interview | D-030 podzial marzy miedzy spedytorow (ustalaja sami); Q-035 odpowiedziane; GLOSSARY Podzial marzy, ENTITIES; nowe Q-062 | [B] 01-interview/session-2026-09-27.md
2026-09-27 | interview | D-031 podzial marzy kwotowo, wpisuje spedytor prowadzacy; Q-062 odpowiedziane; ENTITIES, GLOSSARY, ACTORS zaktualizowane | [B] 01-interview/session-2026-09-27.md
2026-09-27 | interview | warsztat przerwany; D-032 niezapisane, Q-036 otwarte (odpowiedz w sesji) | 01-interview/session-2026-09-27.md
2026-09-27 | domain | test spojnosci po decyzjach D-020..D-031: GLOSSARY + Konto spedytora, ACTORS + System (automatycznie), Integracja gieldy; nowe Q-063, Q-064 | 01-interview/DECISIONS.md, 02-domain/ENTITIES.md, 02-domain/RULES.md
2026-09-27 | domain | GLOSSARY grupa 1 (cykl zlecenia, 6 hasel) zatwierdzona przez wlasciciela procesu | [B] 01-interview/session-2026-09-27.md
2026-09-27 | domain | GLOSSARY grupa 2 (5 hasel) zatwierdzona przez wlasciciela procesu; definicje Odrzucenie i Anulacja uzupelnione wg D-023, D-021 | [B] 01-interview/session-2026-09-27.md
2026-09-27 | domain | GLOSSARY grupa 3 (6 hasel) zatwierdzona przez wlasciciela procesu | [B] 01-interview/session-2026-09-27.md
2026-09-27 | domain | GLOSSARY grupa 4 (5 hasel) zatwierdzona przez wlasciciela procesu | [B] 01-interview/session-2026-09-27.md
2026-09-27 | domain | GLOSSARY grupa 5 (6 hasel) zatwierdzona przez wlasciciela procesu | [B] 01-interview/session-2026-09-27.md
2026-09-27 | domain | GLOSSARY grupa 6 (6 hasel) zatwierdzona przez wlasciciela procesu | [B] 01-interview/session-2026-09-27.md
2026-09-27 | domain | GLOSSARY grupa 7 (5 hasel) zatwierdzona przez wlasciciela procesu; Blokada uzupelniona wg D-022 | [B] 01-interview/session-2026-09-27.md
2026-09-27 | domain | GLOSSARY grupa 8 (5 hasel) zatwierdzona przez wlasciciela procesu (Ubezpieczenie kredytu kupieckiego i Status weryfikacji z otwartymi Q-020, Q-037) | [B] 01-interview/session-2026-09-27.md
2026-09-27 | domain | GLOSSARY grupa 9 (8 hasel) zatwierdzona; caly slownik 52/52 zatwierdzony przez wlasciciela procesu | [B] 01-interview/session-2026-09-27.md
2026-09-27 | spec | PRD sekcje 1-4; R-001..R-003 (robocze) zatwierdzone jako tresc przez wlasciciela procesu; RULES/ASSUMPTIONS powiazane z R | [B] 01-interview/session-2026-09-27.md
2026-09-27 | spec | R-004..R-006 (robocze) zatwierdzone jako tresc; D-033 anulacja wg hierarchii (zmienia D-021), BR-032, GLOSSARY Zespol (robocze), Q-065..Q-067 | [B] 01-interview/session-2026-09-27.md
2026-09-27 | spec | R-007..R-009 (robocze) zatwierdzone jako tresc; AC-008-2 potwierdzone; GLOSSARY Zespol zatwierdzone | [B] 01-interview/session-2026-09-27.md
2026-09-27 | spec | R-010..R-012 (robocze) zatwierdzone jako tresc; AC-011-3 potwierdzone | [B] 01-interview/session-2026-09-27.md
2026-09-27 | spec | R-013..R-015 (robocze) zatwierdzone jako tresc; A-008 potwierdzone, Q-046 odpowiedziane (AC-015-3) | [B] 01-interview/session-2026-09-27.md
2026-09-27 | spec | R-016..R-018 (robocze) zatwierdzone jako tresc; PRD: 18 R, 0 zatwierdzonych, 0 wstrzymanych; agent/ nie generowany (brak R zatwierdzone) | [B] 01-interview/session-2026-09-27.md
2026-09-27 | validate | raport 04-validation/validate-2026-09-27.md: gotowosc 0%, 0 blokerow, WARN: 3 AC, 7 R na A niepotwierdzonych, 2 pojecia, 14 D bez potwierdzonego powodu | 03-spec/PRD.md
2026-09-27 | spec | R-003, R-004, R-005, R-006, R-008, R-012, R-015, R-017 zatwierdzone przez wlasciciela procesu | [B] 01-interview/session-2026-09-27.md
2026-09-27 | validate | przebieg 2: gotowosc 44% (8/18), 0 blokerow; ostrzezenia bez zmian | 03-spec/PRD.md
2026-09-27 | spec | AC-007-4, AC-011-1, AC-016-2 poprawione (testowalne); zasada domyslnego braku uprawnien w opisie R-016 jako zasada budowy | [B] 01-interview/session-2026-09-27.md
2026-09-27 | spec | R-007, R-011, R-016 zatwierdzone przez wlasciciela procesu (11/18) | [B] 01-interview/session-2026-09-27.md
2026-09-27 | validate | przebieg 3: gotowosc 61% (11/18), 0 blokerow; WARN 7 zamkniete | 03-spec/PRD.md
2026-09-27 | interview | runda async 1 (termin 2026-10-03): Q-039, Q-040, Q-041, Q-043, Q-044, Q-051 -> wlasciciel procesu; Q-047..Q-050 -> sponsor biznesowy; status zadane | 01-interview/Q-round-1-*.md
2026-09-27 | interview | runda 1: Q-039 odpowiedziane; A-001 format 00000/_/rr (niepotwierdzone); nowe Q-068; R-001 do przegladu | [B] 01-interview/Q-round-1-wlasciciel-procesu - odp.md
2026-09-27 | interview | format numeru tymczasowego 00000/_/rr w BR-001, GLOSSARY, ENTITIES, R-001/AC-001-1 (zgoda wlasciciela procesu) | [B] session-2026-09-27.md, runda 1
2026-09-27 | interview | runda 1: Q-040 odpowiedziane; A-002 +zrodlo [B] (data), niepotwierdzone; nowe Q-069 | [B] 01-interview/Q-round-1-wlasciciel-procesu - odp.md
2026-09-27 | interview | runda 1: Q-041 odpowiedziane; A-003 niepotwierdzone (odpowiedz niejednoznaczna); nowe Q-070 | [B] 01-interview/Q-round-1-wlasciciel-procesu - odp.md
2026-09-27 | interview | runda 1: Q-043 odpowiedziane; A-005 potwierdzone; D-034 cel przebitki; GLOSSARY Przebitka uzupelnione; R-009 gotowe do zatwierdzenia | [B] session-2026-09-27.md, runda 1
2026-09-27 | interview | runda 1: Q-044 odpowiedziane; A-006 niepotwierdzone (+[B] czesciowo); nowe Q-071 | [B] 01-interview/Q-round-1-wlasciciel-procesu - odp.md
2026-09-27 | interview | runda 1: Q-051 odpowiedziane; A-013 potwierdzone; R-018 gotowe do zatwierdzenia | [B] 01-interview/Q-round-1-wlasciciel-procesu - odp.md
2026-09-27 | interview | runda 1: Q-047 odpowiedziane; A-009 potwierdzone; R-013 gotowe do zatwierdzenia | [B] 01-interview/Q-round-1-sponsor-biznesowy - odp.md
2026-09-27 | interview | runda 1: Q-048 odpowiedziane; A-010 potwierdzone; nowe Q-072; R-014 gotowe do zatwierdzenia | [B] 01-interview/Q-round-1-sponsor-biznesowy - odp.md
2026-09-27 | interview | runda 1: Q-049 odpowiedziane; A-011 niepotwierdzone; nowe Q-073 (nie blokuje go-live) | [B] 01-interview/Q-round-1-sponsor-biznesowy - odp.md
2026-09-27 | interview | runda 1: Q-050 odpowiedziane; A-012 potwierdzone (zakladka Operacje); BR-027, ACTORS DR, R-010 poprawione; nowe Q-074 | [B] 01-interview/Q-round-1-sponsor-biznesowy - odp.md; session-2026-09-27.md
2026-09-27 | spec | R-009, R-013, R-014, R-018 zatwierdzone przez wlasciciela procesu (15/18) | [B] 01-interview/session-2026-09-27.md
2026-09-27 | validate | przebieg 4: gotowosc 83% (15/18), 0 blokerow; WARN 8: R-001, R-002, R-010 | 03-spec/PRD.md
2026-09-27 | interview | runda async 2 (termin 2026-10-10): Q-069, Q-071, Q-072, Q-073, Q-074 -> wlasciciel procesu; Q-068, Q-070 -> sponsor biznesowy; status zadane | 01-interview/Q-round-2-*.md
2026-09-27 | interview | runda 2: Q-068 odpowiedziane; A-001 potwierdzone; synonim 'zlecenie obslugiwane' | [B] 01-interview/Q-round-2-sponsor-biznesowy-odp.md
2026-09-27 | interview | runda 2: Q-069 odpowiedziane; A-002 potwierdzone; numer docelowy 000000/mm/rr w BR-002, GLOSSARY, ENTITIES, R-002 | [B] session-2026-09-27.md, runda 2
2026-09-27 | interview | GLOSSARY Kopia zlecenia: przyklad w aktualnych formatach numerow (000000/mm/rr, 00000/_/rr) | session-2026-09-27.md, runda 1-2
2026-09-27 | interview | runda 2: Q-071 odpowiedziane; A-006 obalone; D-035 kopia bez potwierdzenia i oznaczenia; BR-021, GLOSSARY, R-001 poprawione; R-001 gotowe do zatwierdzenia | [B] 01-interview/Q-round-2-wlasciciel-procesu-odp.md
2026-09-27 | interview | runda 2: Q-073 odpowiedziane; D-036 jeden przycisk 'Zwieksz limit' (zmienia D-028); A-011 potwierdzone; BR-026, GLOSSARY, R-010 poprawione | [B] session-2026-09-27.md, runda 2
2026-09-27 | interview | runda 2: Q-074 odpowiedziane; A-012 doprecyzowane (Operacje > Limity, licznik); BR-027, ACTORS, ENTITIES, R-010 | [B] 01-interview/Q-round-2-wlasciciel-procesu-odp.md
2026-09-27 | interview | runda 2: Q-072 odpowiedziane; PRD sekcja 4 - konsekwencje dla spedytora poza procesem | [B] 01-interview/Q-round-2-wlasciciel-procesu-odp.md
2026-09-27 | interview | runda 2: Q-070 odpowiedziane; A-003 potwierdzone; nowe Q-075 (nie blokuje); R-002 gotowe do zatwierdzenia | [B] 01-interview/Q-round-2-sponsor-biznesowy-odp.md
2026-09-27 | spec | R-001, R-002, R-010 zatwierdzone przez wlasciciela procesu (18/18); sekcja 6 PRD pusta | [B] 01-interview/session-2026-09-27.md
2026-09-27 | validate | przebieg 5: gotowosc 100% (18/18), 0 blokerow; WARN 9, 11 | 03-spec/PRD.md
2026-09-27 | interview | D-037 pola formularza poza zakresem v1; PRD sekcja 4; Q-036, Q-045 zaparkowane; BR-022 poza zakresem | [B] session-2026-09-27.md
