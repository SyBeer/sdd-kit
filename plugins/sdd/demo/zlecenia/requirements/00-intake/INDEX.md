# Indeks surowca

Status zrodla: `aktualne` | `zastapione przez <plik>` | `dotyczy innej wersji <X>` | `wycofane`
Kierunek: `intencja` (co mielismy zbudowac) | `as-built` (jak dziala teraz) | `potwierdzenie` (biznes potwierdzil)

Kierunek rozstrzyga tam, gdzie hierarchia wiarygodnosci nie wystarcza - dwa dokumenty `[D]`
o tym samym module moga sie roznic tylko tym, ze jeden opisuje zamiar, a drugi stan faktyczny.
Na pytanie "jak to dziala" wygrywa `as-built`, na "co mielismy zbudowac" - `intencja`.
Rozjazd miedzy nimi to zawsze pytanie do biznesu, nie rozstrzygniecie po hierarchii.

| Plik / zrodlo | Data | Typ | Wiarygodnosc | Kierunek | Status zrodla | Opis (1-2 zdania) | Uwagi |
|---------------|------|-----|--------------|----------|---------------|-------------------|-------|
| prototyp-proces-dodawania-zlecenia.md | b.d. w tresci; plik dodany 2026-09-26 | dokument procesu (reverse engineering aplikacji prototyp no-code + historia promptow) | [D] | as-built (§3 "Powiadomienia mailowe": intencja - zaplanowane, niewdrozone) | aktualne | Formularz "Nowe zlecenie" (6 sekcji: Klient, Przewoznik, Trasa, Fracht, Zalaczniki, Kontakt) i cykl zlecenia: wstepne (draft, nr 00000/rr) -> "Uruchom" (nr 0000/mm/rr) -> do akceptacji (nowy spedytor) albo od razu spedycyjne; do tego Rynek/gielda, kopiowanie, przebitka. | Zrodlo mieszane: opis UI [D] i streszczenie promptow (w oryginale [B]) - warto dolaczyc surowa historie czatu prototyp no-code (tryb C), zeby rozdzielic [B] od [D]. Sam dokument mowi, ze obieg "przeszedl ewolucje" - opisuje wersje obecna. Sprzecznosc wewnetrzna -> Q-001. Luka do wywiadu: czy przebitka (wystepowanie jako inna spolka) zmienia, z czyjego limitu korzysta zlecenie - por. wymagania-limity-i-blokady.md §2. |
| wymagania-limity-i-blokady.md | b.d. w tresci; plik dodany 2026-09-26 (daty wzgledne w §1: "3 miesiace temu", "2 miesiace temu" - bez punktu odniesienia) | dokument procesu (reverse engineering aplikacji prototyp no-code + historia promptow) | [D] | as-built | aktualne | Zakladka "Limity i Blokady" w kartotece Klienta i Przewoznika: limity kredytowe per spolka z grupy (tylko Klient) z obiegiem wnioskow do Operacji, blokady (5 statusow, historia), ostrzezenia (6 typow) i kolorowa "kostka" ryzyka przy nazwie firmy. | Zrodlo mieszane jak wyzej (UI + prompty). §4 cytuje pierwotny prompt "historia blokad powinna byc widoczna z datami i uzytkownikiem, ktory je ustawil" - kandydat R, [B] dopiero po potwierdzeniu w historii czatu. Sprzecznosci wewnetrzne -> Q-002..Q-005. Brak w dokumencie: czy blokada/brak limitu zatrzymuje dodanie zlecenia (formularz w prototyp-proces-dodawania-zlecenia.md o tym milczy) - do wywiadu. |
