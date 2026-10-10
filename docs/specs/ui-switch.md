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

## Zmiana 0.18.1: wersja w gornym pasku (uwaga usera: "dodaj do ekranu wyswietlanie wersji")
- Maly napis "v0.18.1" po prawej w pasku zakladek, na kazdej stronie; pelna informacja w dymku.
- Serwer pamieta wersje z chwili startu i porownuje z plugin.json na dysku: po aktualizacji pluginu bez restartu serwera
  pasek pokazuje "serwer nieaktualny – zrestartuj" (lekcja z 2026-09-27: nowa strona + stary serwer psuly zapis).

## Zmiana 0.21.0: plugin w Claude Code nieaktualny (uwaga usera: "czy moge miec status, ze rozjechala sie wersja serwera i pluginu?")
- Zdarzenie 2026-09-27: panel pokazywal 0.20.0 (serwer z repo), a Claude Code mial zainstalowany plugin 0.19.0 (kopia w
  `~/.claude/plugins/cache`) - skille /sdd:* i tablica z roznych wersji, nikt tego nie widzial.
- Serwer czyta wersje zainstalowanego pluginu `sdd@sdd-kit` z `installed_plugins.json` Claude Code
  (`$SDD_PLUGINS_FILE`, inaczej `$CLAUDE_CONFIG_DIR/plugins/installed_plugins.json`, inaczej `~/.claude/plugins/...`).
- Plugin inny niz wersja na dysku -> pasek na czerwono "plugin nieaktualny", w dymku obie wersje, komenda aktualizacji
  i przypomnienie o restarcie sesji Claude Code. Brak pliku / wpisu -> bez ostrzezenia (np. kit uzywany bez Claude Code).
- Poza zakresem: wykrywanie juz uruchomionych sesji Claude Code ze starymi skillami (panel ich nie widzi).

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
- AC-U10: `versionBadge({running, disk})`: tekst "v<running>"; gdy wersja na dysku inna niz wersja dzialajacego serwera ->
  `stale: true`, tekst z "serwer nieaktualny" i podpowiedz z wersja na dysku i restartem; brak wersji -> null.
- AC-U11 (serwer): GET /api/version (i /demo/api/version) -> `{running, disk}`; `running` = wersja z plugin.json przy starcie,
  `disk` = czytana przy kazdym zapytaniu (zmiana pliku po starcie -> rozne wartosci).
- AC-U12 (reczne): wersja widoczna w gornym pasku na wszystkich zakladkach (Panel, Tablica, Moduł, Jak to działa, Konfiguracja)
  i w demo, powyzej 900 px; ponizej 1180 px link do przykladu w krotkiej formie (zakladki nie sa ucinane przez wersje);
  ponizej 900 px zwykly numer tylko w Konfiguracji, ostrzezenie "serwer nieaktualny" zawsze; po podbiciu wersji w
  plugin.json bez restartu serwera - "serwer nieaktualny"; 375 px bez przewijania strony w poziomie.
- AC-U13: `pluginVersion(file)`: wersja `sdd@sdd-kit` z installed_plugins.json (wpis `scope: user`, inaczej pierwszy);
  brak pliku, zly JSON, brak wpisu -> ''. `pluginsFile(env)`: SDD_PLUGINS_FILE > CLAUDE_CONFIG_DIR/plugins/installed_plugins.json > ~/.claude/plugins/installed_plugins.json.
- AC-U14 (serwer): GET /api/version (i /demo/api/version) -> `{running, disk, plugin}`; `plugin` czytany przy kazdym zapytaniu.
- AC-U15: `versionBadge({running, disk, plugin})`: plugin rozny od disk -> `stale: true`, tekst z "plugin nieaktualny", dymek z
  obiema wersjami, `claude plugin update sdd@sdd-kit` i restartem sesji; plugin pusty -> bez ostrzezenia; serwer i plugin
  nieaktualne naraz -> oba napisy; zachowanie AC-U10 bez zmian.
- AC-U16 (zmiana 0.25.0, user: "po kliknieciu na wersji niech wyswietli sie strona z github z Release Notes"):
  `versionBadge` zwraca `href` = `https://github.com/SyBeer/sdd-kit/releases/tag/v<running>`; dymek konczy sie linia
  "Kliknij: opis zmian tej wersji na GitHubie". Wersja w pasku jest linkiem (`<a class="ver">`, nowa karta,
  `rel="noopener"`), wyglada jak dotad (podkreslenie przy najechaniu); ostrzezenia AC-U10/AC-U15 bez zmian.
  Od 0.41.0 przy ostrzezeniu (poza demo) link prowadzi do krokow w Konfiguracji - AC-U20.
  Strona Release istnieje dla wersji wypchnietych na GitHub (docs/specs/github-release.md).
- AC-U17 (reczne): klik wersji w pasku na panelu i tablicy otwiera w nowej karcie strone Release tej wersji.
- AC-U20 (0.41.0, user: "po kliknieciu na komunikat powinna sie otworzyc strona z informacja co zrobic"; wczesniej klik
  "plugin nieaktualny" prowadzil na GitHub, a dla niewydanej wersji - na strone glowna repo):
  `versionBadge(v, base)` przy `stale: true` zwraca `href` = `cfgHref(base) + '#wersja'` (Konfiguracja, karta Serwer),
  `local: true`, dymek konczy sie "Kliknij: co zrobić krok po kroku", oraz `steps` - lista krokow `{text, cmd?}`:
  plugin nieaktualny -> `claude plugin marketplace update sdd-kit`, `claude plugin update sdd@sdd-kit`, restart sesji;
  serwer nieaktualny -> restart sdd-board; stara sesja Claude -> zamknij i otworz nowa. Demo (`cfgHref` null) -> GitHub jak AC-U16.
  Bez ostrzezen - AC-U16 bez zmian (`local` false, `steps` puste). Link lokalny otwiera sie w tej samej karcie.
  Konfiguracja: karta Serwer ma `id="wersja"`; przy ostrzezeniu pod wersja ramka "Co zrobić" z numerowanymi krokami,
  komendy w polu z przyciskiem Kopiuj; wejscie z `#wersja` przewija do karty.
- AC-U22 (0.41.0, zdarzenie 2026-10-10: u usera `claude` to alias na inne narzedzie - "ccs: nieznany kontekst 'plugin'"):
  komendy w krokach i w dymku zaczynaja sie od `command claude` (omija aliasy i funkcje powloki bash/zsh); serwer w
  GET /api/version podaje `platform` (process.platform); `platform: 'win32'` -> zwykle `claude` (PowerShell/cmd nie znaja `command`).
- AC-U21 (reczne): plugin starszy niz kit -> klik "plugin nieaktualny" w pasku otwiera Konfiguracje na karcie Serwer z krokami;
  Kopiuj kopiuje komende; wszystko aktualne -> klik wersji otwiera Release Notes na GitHubie.
- AC-U18 (0.28.11, user: "dodaj ikone do aplikacji SDD-kit, zeby w przegladarce latwo bylo ja wyluskac"): ikona -
  ciemny zaokraglony kwadrat z czterema karteczkami w kolorach tablicy (zdarzenie, komenda, kto, pytanie).
  Serwer: `/favicon.svg` (image/svg+xml), `/favicon.png` 32x32 i `/favicon.ico` (PNG; przegladarki pytaja o ten adres
  same), `/apple-touch-icon.png` 180x180. Kazda strona (panel, tablica, info; takze demo) ma w `<head>`
  `<link rel="icon">` SVG i PNG oraz `apple-touch-icon`. Reczne: ikona na karcie w Safari i Chrome.
- AC-U19 (0.28.12, user: "dodaj nazwe modulu w tytule karty", potem: "kazda strona ma nazwe modulu: SDD: + fv-manager"):
  `tabTitle(modul, strona, demo)` -> "SDD: <modul>" na kazdej stronie (Panel, Tablica, Moduł, Jak to działa,
  Konfiguracja); demo -> "SDD: Demo"; bez modulu -> "SDD". Ustawiany przy kazdej zmianie modulu (przelacznik
  modulu w `modSwitch`), takze po zmianie modulu w innej karcie; panel nie nadpisuje go nazwa projektu.
- AC-U8 (reczne): na tablicy naglowek jak w panelu; zmiana modulu z tablicy pokazuje jego tablice i przelacza panel; "Nowy moduł…" otwiera formularz w panelu.
