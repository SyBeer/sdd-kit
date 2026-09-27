# Grupa spedycyjna — wymagania dla zakładki "Limity i Blokady"

Opis oparty na przeglądzie interfejsu aplikacji (prototyp no-code, kartoteki Klient/Przewoźnik) oraz na historii promptów, którymi budowany był ten moduł.

## 1. Umiejscowienie i cel

Zakładka "Limity i Blokady" znajduje się w kartotece każdego **Klienta** oraz każdego **Przewoźnika** (obok Przeglądu, Grupy kapitałowej, Oddziałów, Historii zleceń, Weryfikacji KYC itd.). Łączy w sobie trzy powiązane, ale osobne mechanizmy kontroli ryzyka współpracy:

1. **Limity kredytowe** (tylko u Klienta — limit, ile firma może być winna grupie za nieopłacone zlecenia).
2. **Blokady** (u Klienta i u Przewoźnika — twardy stop współpracy z określonego powodu).
3. **Ostrzeżenia** (u Klienta i u Przewoźnika — miękki sygnał ryzyka, niewymuszający blokady).

Geneza modułu: najpierw (3 miesiące temu) powstała prosta wersja — zakładka "Weryfikacja" z limitem (edytowalnym w panelu admina), statusem ze słownika i kolumną "Dostępny limit" na listach Klientów/Przewoźników, plus osobno możliwość ustawiania blokad u przewoźnika (blokada, historia blokad z datą/użytkownikiem, kolumna statusu na liście, podgląd historii po kliknięciu). Dwa miesiące temu moduł został przebudowany na podstawie załączonego makiety/zrzutu ekranu do obecnej, rozbudowanej postaci opisanej niżej.

## 2. Widok u Klienta — sekcja Limitów

Dostępny **wyłącznie w kartotece Klienta** (Przewoźnik nie ma sekcji limitów — patrz punkt 3).

- **Baner NUU** na górze: numer ubezpieczonego kontrahenta u ubezpieczyciela kredytu kupieckiego (identyfikator w systemie ubezpieczyciela).
- **Trzy karty podsumowania**: Suma limitów, Wykorzystano, Wolne saldo (kwoty w PLN).
- **Przycisk "Zawnioskuj o limit"** — aktywny tylko wtedy, gdy spółka z grupy, w imieniu której zalogowany jest aktualny spedytor (pracodawca użytkownika), **nie ma jeszcze przyznanego limitu** dla tego klienta.
- **Lista spółek z grupy** (sekcja "Ubezpieczenie kredytu kupieckiego wg naszych spółek", oznaczona badge "z bazy kredytowej"): dla każdej spółki widoczny pasek wykorzystania (%), kwota wykorzystana i pozostała. Stan może być:
  - normalny (pasek % wykorzystania),
  - "wniosek oczekuje" (żółty tag — złożono wniosek o zwiększenie/nadanie limitu, czeka na decyzję),
  - "Współpraca zablokowana w tej spółce — brak przyznanego limitu" (czerwony komunikat zamiast paska).
- **Widok dla spedytora** (rola operacyjna, sprzedaż): przyciski "Zwiększ limit" / "Odnów" przy spółkach, które już mają limit.
- **Widok dla zespołu operacji** (rola z wyższymi uprawnieniami): sekcja spółki rozwija się dodatkowo o przyciski "Nadaj limit" i "Wystąp o limit", pole do wpisania kwoty oraz pole NUU.

### Obieg wniosku o limit

1. Spedytor klika "Zwiększ limit" lub "Wystąp o limit" przy danej spółce/kliencie.
2. Sprawa trafia jako **wniosek** do zakładki **"Wnioski o limit"** w module Operacje (widoczna tam z licznikiem oczekujących wniosków).
3. Pracownik operacji otwiera wniosek z listy, ma dostęp do kartoteki klienta i podejmuje decyzję (nadaje/odrzuca limit, wpisuje kwotę).
4. Po zaakceptowaniu — limit i kwota pojawiają się w kartotece klienta, znika status "wniosek oczekuje".

## 3. Widok u Przewoźnika — różnica względem Klienta

U Przewoźnika zakładka "Limity i Blokady" zawiera **tylko sekcje Blokady i Ostrzeżenia** — brak sekcji limitów kredytowych (limit kredytowy dotyczy tego, ile klient jest winien grupie, więc nie ma zastosowania do przewoźnika).

Przewoźnik ma za to dodatkową, osobną zakładkę **"Ubezpieczenia i licencje"** (niewystępującą u Klienta) — tam zarządza się polisami OCP/OCS (jedna firma może mieć oba typy) i licencją przewozową jako osobnymi załącznikami/dokumentami. Wygasające ubezpieczenie/licencja to jeden z typowych powodów założenia blokady lub ostrzeżenia u przewoźnika.

## 4. Sekcja "Blokady" (Klient i Przewoźnik — identyczna)

- Pokazuje **aktualny status blokady** (domyślnie "Brak blokady", zielony tag) oraz **historię blokad** (kto, kiedy, jaki status ustawił) — pusta lista pokazuje "Brak historii blokad".
- Przycisk **"Dodaj blokadę"** otwiera formularz:
  - **Nowy status blokady** (lista wyboru): Brak blokady / Blokada płatności / Blokada współpracy / Blokada dokumentów / Pełna blokada.
  - **Powód / Opis** (pole wymagane).
  - Zapis / Anuluj.
- Każda zmiana statusu blokady jest zapisywana w historii z datą i użytkownikiem, który jej dokonał (zgodnie z pierwotnym wymaganiem: "historia blokad powinna być widoczna z datami i użytkownikiem, który je ustawił").
- Status blokady jest też widoczny jako osobna kolumna na liście Klientów / Przewoźników — kliknięcie w status pozwala podejrzeć historię zmian.

## 5. Sekcja "Ostrzeżenia" (Klient i Przewoźnik — identyczna)

- Pokazuje listę aktywnych ostrzeżeń (pusta: "Brak aktywnych ostrzeżeń").
- Przycisk **"Dodaj ostrzeżenie"** otwiera formularz:
  - **Typ ostrzeżenia** (lista wyboru): Limit przeterminowany / Opóźnienie płatności / Dokumenty wygasające / Reklamacja / Ryzyko współpracy / Inne ostrzeżenie.
  - **Powód / Opis** (pole wymagane).
  - Zapis / Anuluj.
- Ostrzeżenie jest sygnałem "miękkim" — nie blokuje współpracy, ale wpływa na wizualne oznaczenie statusu (patrz punkt 6).

## 6. Wizualne oznaczenie statusu ryzyka

Przy nazwie firmy (na pasku nagłówkowym kartoteki Klienta i Przewoźnika) wyświetlana jest kolorowa "kostka" statusu:

- **zielona** — brak blokad i ostrzeżeń,
- **żółta** — w zakładce Limity i Blokady dodano co najmniej jedno ostrzeżenie,
- **czerwona** — na kliencie/przewoźniku ustawiona jest aktywna blokada.

Reguła jest wspólna dla obu typów kartotek i ma dawać operacji/spedytorom natychmiastowy sygnał ryzyka bez wchodzenia w szczegóły zakładki.

## 7. Powiązane elementy w innych częściach systemu

- **Kolumna "Dostępny limit"** na listach Klientów i Przewoźników (widoczna od rozdzielczości XL).
- **Event log / Historia zmian** — osobna zakładka w kartotece, zapisująca kto utworzył/zmodyfikował dane oraz inne zdarzenia (data, godzina, użytkownik) — działa automatycznie przy tworzeniu i edycji klienta/przewoźnika.
- **Panel administracyjny** — zakładka do zarządzania limitami i statusami weryfikacji (edycja globalna, niezależna od wniosków spedytorów), plus kategorie w słowniku (statusy weryfikacji, spółki z grupy).
- **Zakładka "Wnioski o limit"** w module Operacje — kolejka wniosków spedytorów do rozpatrzenia przez zespół operacji, z licznikiem i możliwością otwarcia kartoteki klienta z poziomu wniosku.
