# Spec: Przelacznik interfejsu - Panel / Tablica i motyw

Status: zatwierdzony zakres 2026-09-26 (user: "dodaj przelacznik interfejsu" -> wybor: motyw jasny/ciemny oraz Panel <-> Tablica)
Wersja docelowa: 0.6.0

## Cel
Uzytkownik przechodzi miedzy panelem modulu a tablica jednym kliknieciem w tym samym miejscu na obu stronach
i sam wybiera motyw, niezaleznie od ustawienia systemu (np. ciemna sala przy warsztacie, rzutnik).

## Zakres
1. Pasek na gorze obu stron (`/` panel, `/board` tablica), ten sam wyglad i miejsce:
   - z lewej zakladki "Panel modułu" | "Tablica warsztatowa"; biezaca strona zaznaczona (`aria-current="page"`), druga jest linkiem;
   - z prawej przelacznik motywu: "Auto" | "Jasny" | "Ciemny" (grupa radio, dziala z klawiatury).
   - Znikaja stare linki "← Panel modułu" (tablica) i "Tablica warsztatowa →" (panel).
2. Motyw:
   - "Auto" = jak system (`prefers-color-scheme`), domyslnie.
   - Wybor zapamietany w przegladarce (`localStorage` `sdd-theme`, odczyt/zapis w try/catch - bez niego strona dziala w "Auto").
   - Wspolny dla panelu i tablicy; zmiana w jednej karcie przelacza motyw w drugiej otwartej karcie (zdarzenie `storage`).
   - Ustawiany przed pierwszym malowaniem strony (brak migniecia jasnego motywu przy wyborze "Ciemny").
   - Kolory tylko z tokenow `:root`; ciemne tokeny pod `:root[data-theme="dark"]` i pod `prefers-color-scheme: dark` z `:root:not([data-theme="light"])`.
3. Wspolny kod: `board/ui.js` (motyw + pasek) i `board/ui.css` (wyglad paska), serwowane pod `/ui.js` i `/ui.css`.
4. Telefon (< 640 px): pasek miesci sie bez poziomego przewijania (krotkie etykiety zakladek "Panel" / "Tablica").

## Poza zakresem
- Wiecej motywow, kontrast, rozmiar czcionki; przelacznik jezyka.

## Kryteria akceptacji (testy w `plugins/sdd/board/test/ui.test.js`)
- AC-U1: `normTheme(v)`: 'light' / 'dark' / 'auto' bez zmian; cokolwiek innego (null, '', 'blue') -> 'auto'.
- AC-U2: `tabs(page)`: dwie zakladki w kolejnosci Panel (`/`), Tablica (`/board`); `current` tylko przy `page`; nieznana strona -> zadna biezaca.
- AC-U3: serwer zwraca `/ui.js` (text/javascript) i `/ui.css` (text/css) z kodem 200.
- AC-U4 (reczne): na obu stronach pasek w tym samym miejscu; klik zakladki przechodzi na druga strone.
- AC-U5 (reczne): "Ciemny" przy jasnym systemie -> ciemne kolory na obu stronach, po przeladowaniu tez; "Auto" wraca do systemu;
  zmiana w jednej karcie zmienia druga; telefon bez poziomego przewijania.
