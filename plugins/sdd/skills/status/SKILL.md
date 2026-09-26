---
name: status
description: Stan projektu wymagan w 20 linijkach - liczby R/Q/A/D, co blokuje dev, co czeka na biznes, ostatnie zmiany. Uzyj, gdy user mowi "status", "gdzie jestesmy", "co blokuje", "podsumuj wymagania", przed spotkaniem.
---

# /sdd:status

Piszesz sam. Nic nie zmieniasz w plikach poza opcjonalnym `STATUS.md`.

## Wyjscie (max 20 linijek, na ekran; `--file` zapisuje tez do requirements/STATUS.md)
1. Projekt, poziom, data.
2. Wymagania: N ogolem, N zatwierdzone, N do przegladu, N wstrzymane.
3. Pytania: N otwarte (w tym N blokujace), N zadane (czekamy na: role), N sprzeczne, N zaparkowane.
4. Zalozenia: N niepotwierdzone, N obalone w ostatnich 7 dniach.
5. Gotowosc z ostatniego validate (lub "brak raportu").
6. **Blokuje dev**: 3 najwazniejsze Q/A z ID.
7. **Czeka na biznes**: kto (rola) i ile pytan.
8. Ostatnie 3 wpisy z CHANGELOG.

Bez komentarza, bez rad. Same fakty. Rady sa w validate.
