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
5. Naglowek modulu na tablicy (0.6.3, user: "w tablicy warsztatowej musi sie pojawic analogiczny naglowek jak w Panel Modulu"):
   - Tablica ma ten sam naglowek co panel: "Wymagania do modułu: <nazwa> ▾" z tym samym menu modulow
     (lista z ✓ przy biezacym i poziomem pelny/lekki, strzalki, Escape, klik obok zamyka).
   - Wybor modulu na tablicy przelacza modul na serwerze (jak w panelu); tablica pokazuje board.json nowego modulu, panel w drugiej karcie tez sie przelacza.
   - "+ Nowy moduł…" na tablicy przechodzi do panelu i otwiera tam formularz (`/#nowy-modul`).
   - Tytul i podtytul tablicy (z board.json) zostaja jako mniejsza linia pod naglowkiem.
   - Jeden kod menu dla obu stron: `ui.js` (`modMenu` + obsluga), wyglad w `ui.css`.
   - Bez skakania (0.6.4, user: "przelaczanie zakladki powoduje skakanie ekranow"): pasek (47 px) i naglowek maja stale wymiary
     z `ui.css`, niezalezne od CSS strony; `scrollbar-gutter: stable`, zeby pasek przewijania nie przesuwal strony w bok.
   - Serwer dokleja do widoku tablicy `_module` (nazwa) i `_modules` (lista); jak `_sync` - nigdy nie trafiaja do board.json.

## Poza zakresem
- Wiecej motywow, kontrast, rozmiar czcionki; przelacznik jezyka.

## Kryteria akceptacji (testy w `plugins/sdd/board/test/ui.test.js`)
- AC-U1: `pickTheme(stored, systemDark)`: 'light' / 'dark' zapisane -> ten motyw; brak albo zla wartosc (null, '', 'auto', 'blue') -> motyw systemu.
- AC-U2 (od 0.16.0 zastapione przez AC-C1 w info-config.md - piec zakladek): `tabs(page)`: dwie zakladki w kolejnosci Panel (`/`), Tablica (`/board`); `current` tylko przy `page`; nieznana strona -> zadna biezaca.
- AC-U3: serwer zwraca `/ui.js` (text/javascript) i `/ui.css` (text/css) z kodem 200.
- AC-U6: `modMenu(mods, cur)`: przycisk na kazdy modul, `aria-checked="true"` i ✓ tylko przy biezacym; biezacy spoza listy dopisany na poczatku;
  nazwy escapowane; na koncu "Nowy moduł…".
- AC-U7: serwer: GET /api/board zawiera `_module.name` i `_modules`; PUT z `_module`, `_modules`, `_sync` nie zapisuje ich do board.json.
- AC-U4 (reczne): na obu stronach pasek w tym samym miejscu; klik zakladki przechodzi na druga strone.
- AC-U5 (reczne): ksiezyc przy jasnym systemie -> ciemne kolory na obu stronach, po przeladowaniu tez; slonce przy ciemnym -> jasne;
  zmiana w jednej karcie zmienia druga; telefon bez poziomego przewijania.
- AC-U9 (reczne, pomiar): pasek, zakladki, ikony motywu, h1 i przycisk modulu maja te same wspolrzedne na panelu i tablicy (1200 px i 375 px).
- AC-U8 (reczne): na tablicy naglowek jak w panelu; zmiana modulu z tablicy pokazuje jego tablice i przelacza panel; "Nowy moduł…" otwiera formularz w panelu.
