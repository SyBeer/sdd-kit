# Grupa spedycyjna — proces dodawania i obiegu zlecenia

Opis oparty na przeglądzie interfejsu aplikacji (prototyp no-code, moduł Orders/Rynek) oraz na historii promptów, którymi budowany był ten moduł.

## 1. Formularz "Nowe zlecenie"

Formularz otwiera się z poziomu każdej zakładki listy zleceń (Zlecenia wstępne, Zlecenia do akceptacji, Zlecenia spedycyjne) oraz z zakładki Rynek. Podzielony jest na 6 sekcji:

### Klient
- Checkbox "Przebitka" u góry — jeśli zaznaczony, wybiera się spółkę z grupy (słownik `group_company`), domyślnie ustawianą na pracodawcę zalogowanego użytkownika. Oznacza, że wobec klienta występujemy jako wskazana spółka.
- Wyszukiwanie klienta z bazy (klient musi być wcześniej zarejestrowany w module Klienci) — docelowo również po NIP, z możliwością wyboru oddziału, jeśli klient ma oddziały w kartotece głównej.
- Źródło klienta, zgoda na płatność na skanach, dokumenty przez portal.

### Przewoźnik
- Struktura identyczna jak zakładka Klient (ten sam komponent, ten sam checkbox przebitki), tylko podpięta pod kartotekę przewoźników (Contractor) i z opisami "przewoźnik".
- Wyszukiwanie przewoźnika z bazy (analogicznie — docelowo też po NIP + wybór oddziału).

### Trasa
- Załącz zlecenie z pliku (PDF/JPG/PNG) — możliwość wgrania dokumentu zlecenia.
- Typ pojazdu (wielokrotny wybór: Firanka, Chłodnia, Cysterna, Platforma, Kontener, Mega, Inny) i łączna waga (pole wyliczane automatycznie).
- Numery rejestracyjne pojazdu (można dodać kilka).
- Załadunek — może być wiele miejsc załadunku: nazwa firmy, adres (kraj/kod/miejscowość/ulica/nr budynku), okno czasowe (data i godzina od–do), lat/lng, telefon do SMS, pozycje ładunku (osobny numer referencyjny per pozycja), opcje ADR i wymiana palet, uwagi.
- Rozładunek — lustrzana struktura względem załadunku, również z możliwością wielu miejsc i numerem referencyjnym per pozycja.
- Długość trasy (deklarowana i wyliczana automatycznie).
- Wymagania specjalne (wielokrotny wybór): wymiana palet, transport ADR, transport chłodzony, dokumentacja celna/paszporty, wózki widłowe przy załadunku, winda załadowcza, pojazd Mega, kierowca anglojęzyczny, rejestrator temperatury, plombowanie ładunku, kopie CMR czarno-białe, fitosanitarna/sanepid, monitoring GPS, ubezpieczenie ładunku.
- Uwagi ogólne.

### Fracht
- Fracht klienta i fracht przewoźnika — osobne kwoty i waluty (różnica = marża spedycji).
- Wartości domyślnie zaciągane z kartoteki klienta/przewoźnika (termin płatności) — trzeba zaznaczyć "Odblokuj edycję", żeby je zmienić ręcznie.
- Podział marży (przełącznik).
- Kary i koszty dodatkowe: kary umowne, koszty anulacji zlecenia, koszty postojowe.

### Załączniki
- Dodawanie dowolnych plików do zlecenia.

### Kontakt
- Lista kontaktów (domyślnie rola "Kierowca"): imię i nazwisko, telefon. Można dodać kolejne kontakty.

Formularz pozwala poruszać się między zakładkami przyciskiem "Dalej", a od zakładki Klient dostępny jest przycisk "Zapisz wstępnie" (zapis wersji roboczej w dowolnym momencie).

## 2. Cykl życia zlecenia (etapy)

Obieg zlecenia przeszedł ewolucję w trakcie budowy aplikacji — poniżej aktualna, obowiązująca logika:

1. **Utworzenie zlecenia** — niezależnie od miejsca powstania (formularz "Nowe zlecenie", kopia istniejącego zlecenia, czy dodanie z zakładki Rynek) — nowe zlecenie **automatycznie** staje się **"Zleceniem wstępnym"** (`order_stage = draft`).
   - Numeracja tymczasowa: `00000/rr` (kolejny numer / rok).
   - Zlecenie wstępne może być w pełni uzupełnione i mimo to pozostaje "wstępne", dopóki nie zostanie uruchomione.

2. **Przycisk "Uruchom"** — dostępny na liście zleceń wstępnych. Jego użycie:
   - nadaje docelowy numer zlecenia w formacie `0000/mm/rr`,
   - zapisuje datę utworzenia zlecenia jako datę kliknięcia przycisku,
   - **awansuje zlecenie dalej**, w zależności od poziomu doświadczenia spedytora (flaga "nowy spedytor" ustawiana w panelu admina):
     - **nowy / młodszy spedytor** → zlecenie trafia do **"Zlecenia do akceptacji"** — wymaga zatwierdzenia przez team leadera (przycisk akceptacji widoczny tylko dla ról team_leader / manager / admin),
     - **doświadczony spedytor** → zlecenie trafia od razu do **"Zlecenia spedycyjne"** (= zlecenie transportowe, aktywny transport).

3. **Zlecenia do akceptacji** — po zatwierdzeniu przez team leadera zlecenie automatycznie staje się zleceniem transportowym i pojawia się w zakładce **Zlecenia spedycyjne**.

4. **Zlecenia spedycyjne** — aktywne zlecenia transportowe, realizowane w praktyce.

5. **Rynek (Giełda)** — z poziomu list zleceń (wstępnych i spedycyjnych) dostępny jest przycisk **"Wystaw na giełdę"**, publikujący ofertę (towar lub wolny pojazd) na Rynku. Rynek dodatkowo agreguje oferty zewnętrzne z integracji Gielda A i Gielda B obok ofert własnych i ręcznych; ofertę zewnętrzną można "Pobrać" jako zlecenie do własnego systemu.

## 3. Dodatkowe zasady

- **Kopiowanie zlecenia** — z podglądu zlecenia otwiera ekran "Nowe zlecenie" wypełniony danymi kopiowanego zlecenia; przy zapisie pojawia się pop-up z prośbą o potwierdzenie, że użytkownik sprawdził dane. Kopia trafia jako nowe zlecenie wstępne (stąd na liście widoczne wpisy oznaczone "Kopia — do weryfikacji").
- **Przebitka** — mechanizm występowania w imieniu innej spółki z grupy wobec klienta lub przewoźnika, ustawiany osobno na zakładce Klient i Przewoźnik.
- **Widoczność przycisków** — przyciski tworzenia zlecenia i szablonu zlecenia są dostępne na wszystkich trzech zakładkach operacyjnych (wstępne, do akceptacji, spedycyjne), nie tylko na jednej z nich.
- **Spójność kolumn** — widok listy zleceń wstępnych ma te same kolumny co zlecenia spedycyjne (wzbogacone o zysk/€/km/dystans), z zachowaniem przycisku i logiki akceptacji właściwej dla zleceń wstępnych.
- **Powiadomienia mailowe** (zaplanowane, jeszcze niewdrożone w pełni) — po utworzeniu zlecenia: mail do klienta z potwierdzeniem przyjęcia zlecenia (z danymi lokalizacji z zakładki Klient) oraz mail do przewoźnika ze zleceniem transportu, generowane z szablonów z podglądem przed wysyłką.
