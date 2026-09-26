# Spec: Przelacznik interfejsu - Panel / Tablica i motyw

Status: zatwierdzony zakres 2026-09-26 (user: "dodaj przelacznik interfejsu" -> wybor: motyw jasny/ciemny oraz Panel <-> Tablica)
Wersja docelowa: 0.6.0 (ikony zamiast Auto/Jasny/Ciemny: 0.6.1)

## Cel
Uzytkownik przechodzi miedzy panelem modulu a tablica jednym kliknieciem w tym samym miejscu na obu stronach
i sam wybiera motyw, niezaleznie od ustawienia systemu (np. ciemna sala przy warsztacie, rzutnik).

## Zakres
1. Pasek na gorze obu stron (`/` panel, `/board` tablica), ten sam wyglad i miejsce:
   - z lewej zakladki "Panel modułu" | "Tablica warsztatowa"; biezaca strona zaznaczona (`aria-current="page"`), druga jest linkiem;
   - z prawej przelacznik motywu: dwie ikony - slonce (jasny) | ksiezyc (ciemny), bez tekstu; nazwa w `aria-label` i dymku
     (grupa radio, dziala z klawiatury). Zmiana 2026-09-26 (user: "usun AUTO i zamiast tekstu daj sloneczko/ksiezyc").
     Same ikony, bez ramki i tla (0.6.2): wybrana w kolorze tekstu, druga przygaszona.
   - Znikaja stare linki "← Panel modułu" (tablica) i "Tablica warsztatowa →" (panel).
2. Motyw:
   - Nie ma opcji "Auto". Dopoki user nic nie wybral, strona ma motyw systemu (`prefers-color-scheme`) i ten motyw jest zaznaczony
     (zmiana motywu systemu przestawia zaznaczenie). Po kliknieciu wybor jest staly.
   - Wybor zapamietany w przegladarce (`localStorage` `sdd-theme`, odczyt/zapis w try/catch - bez niego strona ma motyw systemu).
   - Wspolny dla panelu i tablicy; zmiana w jednej karcie przelacza motyw w drugiej otwartej karcie (zdarzenie `storage`).
   - Ustawiany przed pierwszym malowaniem strony (brak migniecia jasnego motywu przy wyborze "Ciemny").
   - Kolory tylko z tokenow `:root`; ciemne tokeny pod `:root[data-theme="dark"]` i pod `prefers-color-scheme: dark` z `:root:not([data-theme="light"])`.
3. Wspolny kod: `board/ui.js` (motyw + pasek) i `board/ui.css` (wyglad paska), serwowane pod `/ui.js` i `/ui.css`.
4. Telefon (< 640 px): pasek miesci sie bez poziomego przewijania (krotkie etykiety zakladek "Panel" / "Tablica").

## Poza zakresem
- Wiecej motywow, kontrast, rozmiar czcionki; przelacznik jezyka.

## Kryteria akceptacji (testy w `plugins/sdd/board/test/ui.test.js`)
- AC-U1: `pickTheme(stored, systemDark)`: 'light' / 'dark' zapisane -> ten motyw; brak albo zla wartosc (null, '', 'auto', 'blue') -> motyw systemu.
- AC-U2: `tabs(page)`: dwie zakladki w kolejnosci Panel (`/`), Tablica (`/board`); `current` tylko przy `page`; nieznana strona -> zadna biezaca.
- AC-U3: serwer zwraca `/ui.js` (text/javascript) i `/ui.css` (text/css) z kodem 200.
- AC-U4 (reczne): na obu stronach pasek w tym samym miejscu; klik zakladki przechodzi na druga strone.
- AC-U5 (reczne): ksiezyc przy jasnym systemie -> ciemne kolory na obu stronach, po przeladowaniu tez; slonce przy ciemnym -> jasne;
  zmiana w jednej karcie zmienia druga; telefon bez poziomego przewijania.
