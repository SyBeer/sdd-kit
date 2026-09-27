# Spec: Widok postepu SDD (web, tylko podglad)

Status: zatwierdzony zakres 2026-09-26 (user: "na razie sam podglad")
Wersja docelowa: 0.2.0

## Cel
Prowadzacy widzi na jednej stronie, na ktorym etapie SDD jest projekt i jaka komende wpisac dalej,
bez otwierania plikow w `requirements/`.

## Zakres
1. Os 6 etapow: Intake, Interview, Domain, Spec, Validate, Handover. Kazdy ma status
   `todo` (nie zaczety) | `active` (w toku) | `done` (gotowy), liczony wylacznie z plikow.
2. Karta etapu: opis po ludzku (1 zdanie), liczniki, komenda do wpisania w Claude Code.
3. "Nastepny krok" = pierwszy etap nie-`done`, wyrozniony, z komenda.
4. Panel "Blokuje dev": Q `sprzeczne` + Q z etykieta `gate_blocking_status` (z SDD.yaml) w statusie `otwarte`/`zadane`.
5. Panel "Czeka na biznes": Q `zadane`, pogrupowane po roli ("Do kogo").
6. Ostatnie 5 wpisow z `requirements/CHANGELOG.md`.
7. Odswiezanie na zywo (SSE) po kazdej zmianie w `requirements/`.
8. Strona dziala w tym samym serwerze co tablica: `/` = postep, `/board` = tablica. Komenda `sdd-board` bez zmian.

## Poza zakresem
- Edycja czegokolwiek z przegladarki (odpowiedzi, zatwierdzanie) - kolejna wersja.
- Zaleznosci npm. Tylko Node stdlib.
- Parser YAML - SDD.yaml czytany regexem (pola plaskie: project, level, gate_blocking_status).

## Reguly statusu etapow
| Etap | todo | active | done |
|------|------|--------|------|
| Intake | 0 wierszy w INDEX.md i 0 plikow surowca | sa pliki surowca spoza INDEX.md | >=1 wiersz i 0 nieskatalogowanych |
| Interview | 0 Q i 0 D | Q `otwarte`/`zadane`/`sprzeczne` > 0 | >=1 Q lub D, zadne Q otwarte/zadane/sprzeczne |
| Domain | 0 hasel w GLOSSARY | hasla sa, nie wszystkie `zatwierdzone` | wszystkie hasla `zatwierdzone` |
| Spec | 0 R (PRD.md, przy light SPEC.md) | R sa, nie wszystkie `zatwierdzone` | wszystkie R `zatwierdzone` |
| Validate | brak `04-validation/validate-*.md` | jest raport, gotowosc < 100% | ostatni raport 100% |
| Handover | brak `04-validation/TRACEABILITY.md` | - | jest TRACEABILITY.md |

Wiersze szablonowe (zawierajace `<...>`, np. `### R-001 <tytul>`) nie licza sie.
Brak katalogu `requirements/` = komunikat "uruchom /sdd:init", bez bledu.

## Kryteria akceptacji (testy w `plugins/sdd/board/test/progress.test.js`)
- AC-1: swiezy `/sdd:init` (szablony) -> wszystkie etapy `todo`, nastepny krok Intake, komenda `/sdd:intake`.
- AC-2: plik w `00-intake/` spoza INDEX.md -> Intake `active`; po dopisaniu wiersza -> `done`, nastepny Interview.
- AC-3: liczniki Q po statusach zgadzaja sie z tabela QUESTIONS.md; `sprzeczne` i blokujace trafiaja do "Blokuje dev".
- AC-4: Q `zadane` z roli "sponsor" -> "Czeka na biznes: sponsor 1".
- AC-5: R z placeholderem `<tytul>` ignorowane; R z `Status: zatwierdzone` liczone jako zatwierdzone.
- AC-6: gotowosc czytana z najnowszego `validate-*.md` (np. "gotowosc: 60%").
- AC-7: brak `requirements/` -> `{ exists: false }`, bez wyjatku.
- AC-8 (reczne, w przegladarce): zmiana pliku w `requirements/` odswieza strone bez przeladowania; `/board` dalej dziala.

## Metryka produktowa
Prowadzacy przestaje otwierac pliki, zeby odpowiedziec "gdzie jestesmy" - weryfikacja w uzyciu na projekcie horizon.

## Wyglad
Brak DESIGN.md w kicie. Tokeny kolorow z `board/index.html` (`:root`) sa de facto systemem - te same, jasny i ciemny motyw.

---

# Zmiana 0.3.0 (2026-09-26): panel modulow, zalaczniki w Intake

Decyzje usera: moduly = osobne foldery obok siebie; upload do 25 MB; zasada "tylko podglad"
zniesiona WYLACZNIE dla (a) zalaczania plikow do `00-intake/` i (b) zakladania nowego modulu.

## Zakres
1. Naglowek panelu: "Wymagania do modułu: <nazwa>".
2. Przelacznik modulow. Modul = podfolder katalogu modulow zawierajacy `requirements/SDD.yaml`.
   Katalog modulow: `SDD_MODULES_ROOT` albo folder nadrzedny biezacego projektu.
   Wybor modulu przelacza postep i tablice (serwer pamieta biezacy modul).
3. "Nowy modul": formularz (nazwa, poziom full/light, kto zatwierdza wymagania/decyzje/slownik,
   kto zatwierdza caly PRD - opcjonalnie). Tworzy folder obok, kopiuje szablony jak `/sdd:init`,
   wpisuje SDD.yaml, CLAUDE.md, wpis w CHANGELOG, probuje `git init` (brak gita = nie blad). Po utworzeniu panel przelacza sie na nowy modul.
4. Intake: przycisk + przeciagnij-upusc plikow. Zapis do `requirements/00-intake/`.
   Nazwa oczyszczona (bez sciezek, bez znakow sterujacych, bez kropki na poczatku), bez nadpisywania (`-1`, `-2`).
   Limit 25 MB na plik (413). Po zapisie karta Intake pokazuje "czeka na spis" i podpowiada `/sdd:intake`.
5. Tablica: wyrazny przycisk powrotu do panelu w naglowku.

## Poza zakresem
- Katalogowanie pliku (INDEX.md) z przegladarki - to dalej robi `/sdd:intake` (AI).
- Usuwanie/zmiana nazwy modulow i plikow z przegladarki.

## Kryteria akceptacji (testy w `plugins/sdd/board/test/modules.test.js`)
- AC-9: `listModules(root)` zwraca tylko foldery z `requirements/SDD.yaml`, z nazwa projektu i poziomem.
- AC-10: `createModule` tworzy strukture: SDD.yaml (project, level, owners), przy full brak SPEC.md, przy light brak PRD.md, CLAUDE.md, wpis `init` w CHANGELOG.
- AC-11: `createModule` odrzuca nazwe z niedozwolonymi znakami i istniejacy folder.
- AC-12: `saveIntake` zapisuje do `00-intake/`, oczyszcza `../../etc/passwd` do bezpiecznej nazwy w `00-intake/`, nie nadpisuje (drugi plik o tej samej nazwie -> `-1`).
- AC-13 (reczne): upload w przegladarce -> plik w `00-intake/`, Intake "w toku" bez przeladowania; nowy modul z formularza -> panel pokazuje "Wymagania do modułu: <nowy>"; `/board` ma powrot do panelu.

---

# Zmiana 0.4.0 (2026-09-26): lista plikow w Intake, duplikaty, "Aktualny krok"

Uwagi usera: baner ma mowic "Aktualny krok", nie "Nastepny krok"; w Intake trzeba widziec,
co juz wrzucono, bo przy wielu plikach latwo o pomylki (ten sam plik dwa razy, nie wiadomo co jest).
Komendy wymagajace rozmowy zostaja w Claude Code - panel ich nie uruchamia.

## Zakres
1. Etykieta banera: "Aktualny krok" (przy komplecie dalej "Status").
2. Karta Intake pokazuje liste plikow z `00-intake/` (bez INDEX.md): nazwa, rozmiar,
   znacznik "dodane" / "czeka na spis". Najnowsze na gorze. Lista zwijana, z przewijaniem przy duzej liczbie.
3. Upload pomija plik o identycznej tresci jak plik juz obecny w `00-intake/` (porownanie SHA-256)
   i mowi, pod jaka nazwa juz jest. Plik o tej samej nazwie, ale innej tresci dalej dostaje `-1`.
4. Log uploadu przy wielu plikach: jedno zdanie podsumowania (zapisane / pominiete duplikaty / bledy),
   pod nim tylko duplikaty i bledy z nazwami.
5. Instrukcja "co zrobic w tym kroku" (2-4 krotkie punkty) w banerze aktualnego kroku.
   Przed kazda komenda dopisek "Uruchom w Claude Code:" - panel komend nie uruchamia, bo wymagaja rozmowy.

## Kryteria akceptacji
- AC-14: `readProgress` zwraca w etapie intake `files[]` z `name`, `size`, `indexed`, posortowane od najnowszego; INDEX.md nie ma na liscie.
- AC-15: `saveIntake` z trescia identyczna jak istniejacy plik zwraca `{ saved: null, duplicate: <nazwa> }` i nie tworzy pliku; inna tresc -> `{ saved: <nazwa> }`.
- AC-25: pliki `porownanie-*.md` w `00-intake/` to artefakty procesu (zapis porownania nowego
  zrodla z modelem), nie surowiec: nie sa liczone w `counts.files`, nie ma ich na liscie plikow
  i nie podnosza `unindexed` - inaczej panel w kolko zganialby je do spisu.
- AC-17: kazdy etap w `STAGES` ma `howto` - 2-4 kroki instrukcji dla prowadzacego; Intake mowi, zeby najpierw wrzucic wszystkie pliki, potem skopiowac komende.
- AC-18 (reczne): baner pokazuje instrukcje krokow i "Uruchom w Claude Code:" przed komenda; karty etapow tez maja ten dopisek.
- AC-16 (reczne): baner "Aktualny krok"; upload 3 plikow, w tym 1 duplikatu -> podsumowanie "zapisano 2, pominięto 1", lista plikow w karcie odswieza sie sama.

---

# Zmiana 0.4.1 (2026-09-26): przelacznik modulu w tytule

Uwaga usera: lista rozwijana "horizon (full)" + "+ Nowy moduł" po prawej dublowala nazwe z tytulu,
"(full)" to zargon z SDD.yaml, a kontrolki wisialy bez podpisu daleko od tytulu.

## Zakres
1. Nazwa modulu w tytule "Wymagania do modułu: <nazwa> ▾" jest przyciskiem przelacznika. Osobna lista i przycisk w naglowku znikaja.
2. Menu: lista modulow ze znacznikiem biezacego i poziomem po polsku ("pełny" / "lekki"), na dole "+ Nowy moduł…" (otwiera formularz jak dotad).
3. Zamykanie: klik poza menu, Escape. Strzalki gora/dol przechodza po pozycjach.
4. Meta pod tytulem: "poziom pełny" zamiast "poziom full".

## Kryteria akceptacji (reczne)
- AC-19: w naglowku nazwa modulu wystepuje raz; klik w nia otwiera menu z modulami i "Nowy moduł…"; wybor innego modulu przelacza panel.
- AC-20: w panelu nie ma slow "full"/"light" - tylko "pełny"/"lekki". Na telefonie menu miesci sie w ekranie.

---

# Zmiana 0.5.3 (2026-09-26): usuwanie pliku z Intake

Uwaga usera: "dodaj mozliwosc usuniecia pliku z intake". Znosi punkt "Poza zakresem: usuwanie plikow z przegladarki" z 0.3.0 - tylko dla plikow w `00-intake/`.

## Zakres
1. Usunac mozna TYLKO plik, ktory czeka na spis (nie ma go w INDEX.md) - decyzja usera: plik w spisie jest juz zrodlem,
   na ktore moga sie powolywac pytania i decyzje. Przy takich plikach przycisk "✕"; przy plikach "dodane" go nie ma.
2. Potwierdzenie przed usunieciem. Pod lista plikow informacja: "✕ usuwa tylko pliki, które czekają na spis.
   Plików już zaindeksowanych („dodane”) nie można usunąć." Ta sama zasada w skillu `/sdd:intake`.
3. Usuniecie jest ostateczne (decyzja usera: "usuniecie jest ostateczne, nie potrzebuje katalogu .usuniete") -
   plik jest kasowany z dysku. Potwierdzenie mowi wprost: "Tego nie da się cofnąć."
4. Serwer: `DELETE /api/intake?name=<nazwa z listy>`, tak samo chroniony jak inne zapisy (naglowek X-SDD, Host lokalny).
   Odrzuca INDEX.md, pliki juz w spisie, sciezki poza `00-intake/`, sciezki z kropka na poczatku i nieistniejace.

## Kryteria akceptacji (testy w `plugins/sdd/board/test/modules.test.js`)
- AC-21: `removeIntake(req, name)` kasuje plik z dysku (bez kopii), zwraca jego nazwe; plik znika z `readProgress().stages[intake].files`; nie powstaje zaden katalog pomocniczy.
- AC-24: `removeIntake` odrzuca plik, ktory jest w INDEX.md ("jest juz w spisie"); plik zostaje na miejscu.
- AC-22: `removeIntake` odrzuca INDEX.md, `../SDD.yaml`, `.ukryty/...` i nieistniejacy plik; plik w podfolderze (`maile/a.eml`) usuwa.
- AC-23 (reczne): brak ✕ przy plikach "dodane"; ✕ przy pliku -> potwierdzenie -> plik znika z listy bez przeladowania; zapytanie DELETE bez X-SDD -> 403.

---

# Zmiana 0.8.0 (2026-09-26): katalog produktow wskazuje uzytkownik

Uwaga usera: "sdd-kit to tylko aplikacja. Produkty tej aplikacji powinny znajdowac sie w innym katalogu,
wskazanym przez uzytkownika." Serwer uruchomiony w folderze kitu liczyl katalog modulow z biezacego
folderu (`./requirements` -> rodzic), wiec "Nowy modul" zakladalby foldery obok aplikacji.
Decyzje usera: katalog wskazuje sie w panelu przy starcie (wybor zapamietany); katalog wewnatrz
aplikacji = odmowa z komunikatem.

## Zakres
1. Katalog produktow (katalog modulow) ustalany w kolejnosci:
   `SDD_MODULES_ROOT` -> zapamietany wybor w `~/.sdd-kit/config.json` (`{"modulesRoot": "..."}`,
   sciezke pliku mozna zmienic `SDD_CONFIG`) -> rodzic projektu, jesli serwer wskazano na ISTNIEJACY
   `requirements/` (argument, `SDD_REQ` albo `./requirements`). Nic z tego = brak katalogu.
2. Katalog rowny folderowi aplikacji albo lezacy w nim jest odrzucany (jak brak katalogu).
   Tak samo modul, ktorego `requirements/` lezy w aplikacji. Folder aplikacji = 3 poziomy nad `board/`.
3. Brak katalogu -> panel pokazuje ekran "Gdzie trzymać wymagania?": pole na sciezke bezwzgledna
   (`~/` rozwijane), przycisk "Zapisz". Serwer sprawdza (pkt 2), zaklada brakujacy folder,
   zapisuje wybor w configu i przelacza sie na pierwszy modul z tego katalogu (albo zaden).
   Odrzucenie wraca jako komunikat pod polem.
4. Katalog jest ustawiony, ale nie ma w nim modulu -> panel mowi, gdzie jest katalog, i proponuje "Nowy moduł".
5. Zmiana katalogu pozniej: w menu modulow pozycja "Zmień katalog modułów…" otwiera ten sam ekran.
6. `POST /api/root {path}` - chroniony jak inne zapisy (X-SDD, Host lokalny).
7. Konsola serwera przy starcie: "Moduly w: <katalog>" albo "Moduly w: nie wybrano - wskaz katalog w panelu".

## Poza zakresem
- Tryb `--demo` (przykladowa tablica z folderu aplikacji) - zostaje jak jest.
- Przenoszenie istniejacych modulow miedzy katalogami.

## Kryteria akceptacji (testy w `plugins/sdd/board/test/root.test.js`)
- AC-26: `checkRoot` odrzuca sciezke pusta i wzgledna, folder aplikacji i jego podfolder; `~/x` rozwija do katalogu domowego;
  brakujacy folder zaklada; zwraca sciezke bezwzgledna.
- AC-27: `saveRoot` + `readRoot` przez plik configu; brak pliku albo zly JSON -> `null`.
- AC-28: `resolveRoot`: env wygrywa z configiem, config z rodzicem projektu; projekt bez `requirements/` -> `null`;
  katalog (z dowolnego zrodla) w aplikacji -> `null` z `rejected`.
- AC-29: serwer uruchomiony w folderze bez `requirements/`, bez configu -> `/api/progress` ma `needsRoot: true`,
  `modulesRoot: null`, nie zaklada zadnego folderu; `POST /api/root` z folderem aplikacji -> 400;
  z folderem tymczasowym -> 200, config zapisany, `/api/progress` ma ten `modulesRoot`; `POST /api/modules` bez katalogu -> 409.
- AC-30 (reczne): ekran wyboru w przegladarce, zapis, "Zmień katalog modułów…" w menu.

## Dopisane przed wydaniem 0.8.0: "Przeglądaj…"
Uwaga usera: "dodaj browse do wskazywania katalogu". Przegladarka nie zwraca sciezki bezwzglednej z systemowego
okna wyboru folderu, wiec przegladanie robi serwer (lokalny), a panel pokazuje wynik.

1. Obok pola "Katalog modułów" przycisk "Przeglądaj…". Otwiera okno z lista podfolderow: start w folderze z pola,
   a gdy go nie ma - w katalogu domowym. Klik w folder wchodzi do niego, "↑ wyżej" wraca, sciezka u gory.
2. Ukryte foldery (z kropka) pominiete. Folder aplikacji i jego podfoldery widoczne, ale wyszarzone z dopiskiem "aplikacja" -
   nie da sie ich wybrac ani do nich wejsc. Folder z `requirements/SDD.yaml` w srodku ma znacznik "moduł"
   (podpowiedz: wybierasz katalog NAD modulami).
3. "Wybierz ten folder" wpisuje biezaca sciezke do pola; zapis dalej przyciskiem "Zapisz" (ta sama walidacja co wyzej).
4. `GET /api/dirs?path=...` - tylko odczyt nazw folderow, ale chronione jak zapisy (X-SDD, Host lokalny), bo zdradza strukture dysku.

- AC-31: `listDirs(dir)`: tylko foldery, bez ukrytych, alfabetycznie; `parent` (dla `/` = null); `~` i pusta sciezka = katalog domowy;
  folder aplikacji ma `kit: true`, folder z modulami w srodku `module: true`; nieistniejaca sciezka -> blad; `inKit` gdy biezacy lezy w aplikacji.
- AC-32: `GET /api/dirs` bez X-SDD -> 403; z naglowkiem -> 200 z lista.
- AC-33 (reczne): Przeglądaj -> wejscie w folder, wyzej, wybor -> sciezka w polu -> Zapisz.

---

# Zmiana 0.9.0 (2026-09-27): otwarte pytania nie cofaja procesu

Uwaga usera (projekt horizon-zlecenia): "dlaczego z DOMAIN wrocilem do INTERVIEW. Musze miec mozliwosc
przerwania wywiadu". /sdd:domain (test spojnosci) i krok 1 /sdd:interview dopisuja pytania, wiec kazdy etap
cofal "Aktualny krok" do Interview. Proces nie jest liniowy - pytania powstaja na kazdym etapie.
Decyzja usera: blokuja tylko blokery.

## Zakres
1. Interview: `todo` = 0 Q i 0 D; `active` = sa blokery (Q `sprzeczne` albo `otwarte`/`zadane` z etykieta
   `gate_blocking_status`); `done` = sa Q lub D i nie ma blokerow. Zwykle otwarte i zadane pytania nie cofaja
   aktualnego kroku - widac je w licznikach karty ("otwarte", "zadane biznesowi") i w "Czeka na biznes".
2. Etykieta blokujaca liczy sie tylko wtedy, gdy nie jest zaprzeczona: "nie blokuje go-live" to nie bloker.
3. `/sdd:interview` live: "przerwij" / "stop" / "koniec" konczy warsztat od razu - bez zapisu niezatwierdzonej
   propozycji, z notka w sesji, podsumowaniem i nastepnym krokiem z panelu (moze to byc etap dalszy niz Interview).
4. Karta Interview: rozwijana lista pytan do wyjasnienia (`otwarte`, `zadane`, `sprzeczne`; bez odpowiedzianych
   i zaparkowanych) - numer, tresc, znacznik stanu (sprzeczne / blokuje / zadane / otwarte), do kogo, skad.
   Kolejnosc jak priorytet wywiadu: sprzeczne, blokujace, reszta; w grupie po numerze. Lista zwinieta przy > 8
   pozycjach, z przewijaniem. Uwaga user: "ale mam mozliwosc powrotu do pytan?" - lista pokazuje, do czego wracac.
5. Uwaga user: "musze miec mozliwosc podejrzenia wszystkich pytan". Przelacznik nad lista: "Do wyjaśnienia (N)" |
   "Wszystkie (M)". "Wszystkie" pokazuje tez odpowiedziane (znacznik "odpowiedziane" + czym zamkniete, np. D-012)
   i zaparkowane (znacznik "zaparkowane" + warunek). Kolejnosc: najpierw do wyjasnienia (jak wyzej), potem reszta po numerze.
   Wybor przelacznika pamietany do przeladowania strony.

## Kryteria akceptacji (testy w `plugins/sdd/board/test/progress.test.js`)
- AC-26b: otwarte pytanie bez etykiety blokujacej + decyzja -> Interview `done`, aktualny krok przechodzi dalej;
  licznik `open` dalej pokazuje to pytanie.
- AC-27b: pytanie `otwarte` z "blokuje go-live" -> Interview `active` i bloker; to samo z "nie blokuje go-live" -> nie bloker, `done`.
- AC-28b: pytanie `sprzeczne` -> Interview `active` (bez zmian wzgledem AC-3).
- AC-29b: `readProgress` zwraca w etapie interview `questions[]` - WSZYSTKIE pytania (id, text, kind, status, role, source,
  blocking, closedBy, pending). `pending` = otwarte/zadane/sprzeczne. Kolejnosc: pending wg priorytetu (sprzeczne, blokujace,
  reszta), potem pozostale po numerze.
- AC-30b (reczne): karta Interview pokazuje liste, rozwija sie i zwija; tresc pytania escapowana.

---

# Zmiana 0.10.0 (2026-09-27): karty etapow w jednej kolumnie, zwijane

Uwaga usera (zrzut panelu horizon-zlecenia): "Te prostokaty pod timelinem powinny byc jeden pod drugim i w jednej
kolumnie. Obsluzone tematy zwiniete, a aktualny rozwiniety."

## Zakres
1. Karty 6 etapow w jednej kolumnie (lewa czesc), jedna pod druga; prawa kolumna (Blokuje dev, Czeka na biznes,
   Ostatnie zmiany) bez zmian. Na waskim ekranie wszystko w jednej kolumnie jak dotad.
2. Karta = sekcja zwijana. Naglowek zawsze widoczny: numer, nazwa, status, a w zwinietej karcie jedna linia
   najwazniejszych licznikow (np. "2 zrodel w spisie · 0 czeka na spis").
3. Domyslnie rozwinieta tylko karta aktualnego kroku; pozostale zwiniete (gotowe i nie zaczete).
   Klik w naglowek rozwija/zwija; wybor pamietany do przeladowania strony albo zmiany modulu.
   Gdy zmieni sie aktualny krok, jego karta sie rozwija (wybor usera dla innych kart zostaje).
4. Klik w kolko etapu na osi czasu rozwija jego karte i przewija do niej.

## Kryteria akceptacji
- AC-31: `SddUI.cardOpen(key, current, toggled)` -> wybor usera z `toggled`, a bez niego `key === current`
  (test w `plugins/sdd/board/test/ui.test.js`).
- AC-32 (reczne): jedna kolumna kart; rozwinieta tylko aktualna; zwinieta pokazuje liczniki w jednej linii;
  klik w naglowek i w kolko osi dziala; lista plikow Intake i pytan Interview dzialaja w rozwinietej karcie.

---

# Zmiana 0.10.1 (2026-09-27): "gotowe, ale z otwartymi pytaniami" ma inny status i kolor

Uwaga usera: "tam gdzie mamy nieskonczone pytania (Interview) Gotowe powinno miec inny status i kolor".
Od 0.9.0 zwykle otwarte pytania nie cofaja procesu, wiec Interview bywa `done` mimo otwartych pytan - i wygladal
tak samo jak etap bez zadnych zaleglosci.

## Zakres
1. Etap moze byc `done` z zaleglosciami: pole `partial` = liczba pytan do wyjasnienia (otwarte + zadane).
   `partial > 0` nie zmienia `status` (dalej `done`, nie cofa aktualnego kroku).
2. Pigulka na karcie: "gotowe · N do wyjaśnienia" w innym kolorze niz czyste "gotowe".
3. Kolko na osi czasu: ten sam kolor co pigulka zamiast zielonego, z ✓.

## Kryteria akceptacji
- AC-33: Interview `done` z 3 pytaniami otwartymi i 1 zadanym -> `partial` = 4; bez takich pytan -> `partial` = 0
  (test w `plugins/sdd/board/test/progress.test.js`).
- AC-34 (reczne): pigulka i kolko osi dla Interview z otwartymi pytaniami maja inny kolor i tekst niz czyste "gotowe".

---

# Zmiana 0.11.0 (2026-09-27): demo "wynik" - jak wyglada modul po przejsciu SDD

Uwaga usera: "z tego co teraz jest zrob tablice demo - zeby operator mogl sobie podejrzec jaki ma osiagnac wynik".
Dotychczasowe `sdd-board --demo` pokazuje tablice z poczatku warsztatu (`example-zlecenia.json`) - bez plikow
`requirements/`, wiec panel postepu nie ma czego pokazac. Operator nie widzi, dokad zmierza.

## Zakres
1. Nowy tryb serwera `node server.js --demo [nazwa] [port]` (domyslna nazwa `zlecenia`): modul z
   `plugins/sdd/demo/<nazwa>/requirements/`. Komenda `sdd-board --demo wynik` uruchamia go; `sdd-board --demo`
   bez zmian (tablica startowa).
2. Tresc demo = kompletny modul po walidacji 100%, zbudowany z projektu horizon-zlecenia (stan 2026-09-27):
   intake, pytania z rundami live i async, decyzje, zalozenia, model domeny, PRD 18/18 zatwierdzone, raport walidacji,
   CHANGELOG oraz `01-interview/board.json` - docelowy model jako proces (pasy = procesy, karteczki wszystkich 6 typow,
   kazda z `ref` obecnym w pliku `file`, czyli ✓ na tablicy). Handover nie jest zrobiony - demo konczy sie na
   "aktualny krok: Handover", tak jak prawdziwy projekt.
3. Anonimizacja: w plikach demo nie ma nazw klienta, dostawcow ani liczb pozwalajacych rozpoznac firme.
   Zamiany: FlowLogist -> "Grupa spedycyjna", Base44 -> "prototyp no-code", Trans.eu / Timocom -> "Gielda A" / "Gielda B",
   DWK (Dzial Weryfikacji Kontrahenta) -> DR (Dzial Ryzyka), baza CBK -> "baza kredytowa", EHID -> "numer u ubezpieczyciela",
   horizon -> "zlecenia-demo", liczby zespolow/osob -> "kilkanascie zespolow, kilkaset osob". Nazwy plikow zrodel
   zmienione tak samo, odwolania w tresci zgodne z nowymi nazwami. Tytul `example-zlecenia.json` tez bez "Horizon".
4. Demo tylko do podgladu: kazdy zapis przez API (tablica, zalaczniki, moduly, katalog modulow, przegladanie katalogow)
   -> 403 "Demo - tylko podgląd.". Pliki demo w pluginie nie zmieniaja sie od ogladania.
5. Demo nie dotyka katalogu modulow usera: nie czyta ani nie zapisuje `~/.sdd-kit/config.json`, lista modulow = tylko demo.
6. Panel i tablica pokazuja pasek "DEMO - tylko podgląd" i nie oferuja "Nowy moduł…" ani "Zmień katalog modułów…".
7. Tablica w demo bez przyciskow edycji (+ Karteczka, + Proces, "+" w kolumnie, strzalki i usuwanie procesu,
   zmiana nazwy, przeciaganie, Zapisz/Usun w panelu karteczki). Karteczke mozna otworzyc do czytania (zrodlo, daty).
   Gdyby zapis jednak poszedl (np. stara karta przegladarki), serwer odmawia, a tablica wraca do stanu z serwera.

## Poza zakresem
- Demo "przebieg krok po kroku" (przelaczanie etapow) - osobna zmiana, jesli bedzie potrzebna.
- Tablica startowa (`sdd-board --demo`) zostaje edytowalna - jest do cwiczenia.

## Kryteria akceptacji
- AC-35: `readProgress(plugins/sdd/demo/zlecenia/requirements)` -> Intake, Interview, Domain, Spec, Validate `done`,
  gotowosc 100%, Handover `todo`, aktualny krok Handover; 0 blokerow (test w `test/demo.test.js`).
- AC-36: serwer `--demo`: GET `/api/progress` -> `demo: true`, `needsRoot: false`, modul `zlecenia`, lista modulow = 1;
  PUT `/api/board`, POST/DELETE `/api/intake`, POST `/api/root`, `/api/modules`, `/api/modules/select`, GET `/api/dirs`
  -> 403 z komunikatem "Demo - tylko podgląd." (test uruchamia serwer na wolnym porcie).
- AC-37: anonimizacja - zaden plik w `plugins/sdd/demo/` ani `example-zlecenia.json` nie zawiera (bez wzgledu na
  wielkosc liter): flowlogist, base44, trans.eu, timocom, horizon, dwk, cbk, ehid, 660.
- AC-38: `demo/zlecenia/requirements/01-interview/board.json` - sa wszystkie typy karteczek (ev, cmd, act, pol, rm, hot);
  kazda karteczka z `ref` i `file` ma ten `ref` w tresci pliku `file` (stan ✓ z `syncMap`).
- AC-40: `SddUI.modMenu(mods, cur, true)` bez "Nowy moduł…" i "Zmień katalog modułów…"; bez trzeciego argumentu - z nimi
  (test w `test/ui.test.js`).
- AC-39 (reczne): `sdd-board --demo wynik` -> panel ze 100%, pasek DEMO, menu modulu bez "Nowy moduł…" i
  "Zmień katalog modułów…"; tablica z procesami bez przyciskow edycji; karteczka otwiera sie do czytania, bez "Zapisz" i "Usuń".

---

# Zmiana 0.12.0 (2026-09-27): demo w tym samym serwerze - /demo i /demo/start

Uwaga usera: "czy mozemy zaplanowac, zeby DEMO nie bylo osobnym serwisem, tylko z tej samej instancji odpalane?
tak, zebym mogl uruchomic to w dwoch oknach przegladarki, ale nie z roznych adresow www". Decyzje: tablica startowa
tez pod /demo/start; link do demo w gornym pasku. Zmienia zakres 0.11.0 punkty 1, 4, 5 (osobny tryb `--demo`).

## Zakres
1. Jeden serwer, trzy konteksty po przedrostku sciezki, kazdy z wlasnym stanem i wlasnymi klientami podgladu na zywo:
   - `''` (Twoj modul): `/`, `/board`, `/api/...`, `/events`, `/progress-events` - bez zmian;
   - `/demo` (wynik): `/demo`, `/demo/board` - modul z `plugins/sdd/demo/zlecenia/requirements/`;
   - `/demo/start` (start warsztatu): `/demo/start` = tablica z `example-zlecenia.json`, bez plikow `requirements/`.
   API kontekstu demo pod jego przedrostkiem: `/demo/api/progress`, `/demo/api/board`, `/demo/events`, `/demo/progress-events`,
   `/demo/start/api/board`, `/demo/start/events`.
2. Konteksty demo sa stale i tylko do odczytu: kazdy zapis (i `/api/dirs`) pod `/demo...` -> 403 "Demo - tylko podgląd.".
   Wybor modulu, katalog modulow i zalaczniki dzialaja tylko w kontekscie Twoim; zmiana Twojego modulu nie rusza demo.
   Demo nie czyta ani nie zapisuje `~/.sdd-kit/config.json`.
3. Strony panelu i tablicy te same dla wszystkich kontekstow: przedrostek brany z adresu strony, wszystkie zapytania,
   podglad na zywo i zakladki "Panel | Tablica" ida z przedrostkiem. W `/demo/start` jest tylko zakladka Tablica
   (nie ma plikow, wiec nie ma panelu).
4. Gorny pasek: w Twoim kontekscie link "Przykład ↗" (dlugi: "Przykład gotowego modułu ↗") otwiera `/demo` w nowym oknie.
   W kontekscie demo w tym miejscu "← Twój moduł" (link do `/`). Pasek DEMO pod gornym paskiem ma przelacznik
   "Start warsztatu | Wynik" miedzy `/demo/start` a `/demo`.
5. Komenda: `sdd-board --demo` i `sdd-board --demo wynik` uruchamiaja zwykly serwer (jak `sdd-board`) i wypisuja
   adresy demo; serwer zawsze wypisuje adres `/demo`. Tryb serwera `--demo` z 0.11.0 znika.
6. Zajety port: zamiast bledu Node komunikat "Port N jest zajęty - pewnie działa już sdd-board. Demo jest pod
   http://localhost:N/demo. Inny port: sdd-board <plik> <port>." i kod wyjscia 1.
7. Instalator (sh i ps1): sprawdzenie pluginu przez `claude plugin list` (bez `--installed`, ktorego nie zna Claude Code 2.1.x).

## Poza zakresem
- Rozne moduly usera w dwoch oknach naraz (wybor modulu zostaje wspolny dla kontekstu Twojego).

## Kryteria akceptacji (test w `plugins/sdd/board/test/demo.test.js`, serwer uruchamiany na wolnym porcie)
- AC-41: jeden serwer: `/api/progress` - modul usera (lub `needsRoot`), `/demo/api/progress` - `demo: 'wynik'`, modul
  `zlecenia`, gotowosc 100%; `/demo/start/api/board` - tablica startowa (`_demo: 'start'`); strony `/demo`, `/demo/board`,
  `/demo/start` -> 200 HTML.
- AC-42: pod `/demo` i `/demo/start` kazdy zapis (PUT board, POST/DELETE intake, POST root, modules, modules/select)
  i GET `/demo/api/dirs` -> 403 "Demo - tylko podgląd."; w kontekscie usera PUT `/api/board` dalej dziala (204).
- AC-43: POST `/api/modules/select` w kontekscie usera nie zmienia `/demo/api/progress` (modul dalej `zlecenia`).
- AC-44: `SddUI.base(pathname)` -> `''`, `/demo`, `/demo/start`; `SddUI.tabs(page, base)` - hrefy z przedrostkiem,
  w `/demo/start` tylko zakladka Tablica (test w `test/ui.test.js`).
- AC-45: serwer na zajetym porcie konczy sie kodem 1 z komunikatem "Port N jest zajęty" (bez stosu bledu Node).
- AC-46 (reczne): dwa okna na jednym porcie - `/` (horizon-zlecenia) i `/demo`; przelaczanie Start/Wynik, "Przykład ↗"
  i "← Twój moduł" dzialaja; w demo brak przyciskow edycji jak w 0.11.0; szerokosc telefonu bez przewijania w bok.

---

# Zmiana 0.13.0 (2026-09-27): moduly spoza katalogu modulow i zapamietany ostatni modul

Uwagi usera: (1) "ma to dzialac dla aktualnego modulu" - po restarcie serwer ma otworzyc modul, w ktorym skonczyl,
a nie pierwszy alfabetycznie; (2) "takie samo cwiczenie ze zbieraniem wymagan moge zrobic dla istniejacej aplikacji,
np. fv-manager, i SDD-kit tam powinno stworzyc repozytorium wymagan". Decyzja: w istniejacej aplikacji wymagania leza
w jej repo (`<repo>/requirements/`); osobne repo wymagan (jak horizon-zlecenia) zostaje drugim wariantem.
`/sdd:init` w repo z istniejacym CLAUDE.md i intake "stan obecny z kodu" - osobna zmiana, poza tym zakresem.

## Zakres
1. Modul = folder z `requirements/SDD.yaml`, gdziekolwiek na dysku. Lista modulow = podfoldery katalogu modulow
   (jak dotad) + foldery dodane recznie, zapisane w `~/.sdd-kit/config.json` jako `modules: [sciezki]`.
   Ten sam folder raz; folder, ktorego juz nie ma (albo bez `requirements/SDD.yaml`), znika z listy bez bledu.
2. Menu modulu: "Dodaj istniejący projekt…" (nie w demo). Ekran jak wybor katalogu: pole sciezki + "Przeglądaj…".
   Dodac mozna folder z `requirements/SDD.yaml`; bez niego komunikat: "W tym folderze nie ma requirements/.
   Otwórz Claude Code w <folder> i wpisz /sdd:init, potem dodaj go tutaj." Folder w aplikacji sdd-kit - odmowa
   (jak katalog modulow). Po dodaniu panel przelacza sie na ten modul.
3. Modul w menu rozpoznawany po sciezce, nie po nazwie (dwa moduly moga miec ta sama nazwe folderu).
   Modul spoza katalogu modulow ma w menu dopisek "poza katalogiem" i pelna sciezke w podpowiedzi.
   `POST /api/modules/select` przyjmuje `{dir}` (i dalej `{name}` dla zgodnosci).
4. Ostatni modul: kazde wybranie modulu w Twoim kontekscie (start, przelaczenie, nowy, dodany) zapisuje sciezke
   `lastModule` w config.json. Start serwera: projekt z biezacego folderu (jak dotad) > `lastModule`, jesli dalej jest
   na liscie > pierwszy modul z listy.
5. Zapis config.json laczy pola (`modulesRoot`, `modules`, `lastModule`) - zmiana jednego nie kasuje pozostalych
   (dotad zapis katalogu modulow nadpisywal plik).

## Poza zakresem
- Usuwanie modulu z listy z panelu (usuniety folder znika sam; reczna edycja config.json).
- `/sdd:init` z panelu dla folderu bez `requirements/`.

## Kryteria akceptacji
- AC-47: `readConfig`/`writeConfig` - zapis `{lastModule}` zachowuje `modulesRoot` i `modules`; `saveRoot` zachowuje
  `modules` i `lastModule` (test w `test/root.test.js`).
- AC-48: `addModule(config, dir)` - folder z `requirements/SDD.yaml` trafia do `modules` raz (drugie dodanie bez
  duplikatu); folder bez `requirements/` -> blad z "/sdd:init"; folder w aplikacji -> blad; sciezka wzgledna -> blad.
- AC-49: `allModules(root, extra)` - moduly z katalogu + dodane, bez duplikatow (ten sam folder w obu), pomija
  nieistniejace i bez SDD.yaml; dodane maja `external: true`, pole `dir` w kazdym (test w `test/modules.test.js`).
- AC-50 (serwer): POST `/api/modules/add` z folderem spoza katalogu -> 200, `/api/progress` pokazuje ten modul
  i ma go na liscie `modules` (z `dir`); config.json ma go w `modules` i jako `lastModule`.
- AC-51 (serwer): restart serwera uruchomionego bez projektu w biezacym folderze otwiera `lastModule`;
  gdy `lastModule` nie istnieje - pierwszy modul z listy.
- AC-52: `SddUI.modMenu` - `data-dir` przy kazdym module, dopisek "poza katalogiem" przy `external`,
  "Dodaj istniejący projekt…" (id `addproj`) poza demo, w demo brak (test w `test/ui.test.js`).
- AC-53 (reczne): dodanie `~/_DEV_/repos/fv-manager` bez requirements/ -> komunikat z /sdd:init; dodanie folderu
  z requirements/ -> panel przelacza sie na niego; restart serwera -> ten sam modul.

# Zmiana 0.15.0 (2026-09-27): szczegoly licznikow na kartach

Uwaga usera (zrzut karty Interview i Spec): "76 pytan, 18 otwartych, 36 decyzji, 2 zalozen niepotwierdzonych, 1 obalonych;
18 wymagan, 17 zatwierdzonych, 1 do przegladu - czy po kliknieciu na te rzeczy moga wyswietlac sie informacje, czego dotycza?"
Decyzja: tak, dla Interview, Domain i Spec.

## Zakres
1. Licznik z pozycjami jest przyciskiem. Klik rozwija pod wierszem licznikow liste tego, co liczy; drugi klik (albo klik
   innego licznika) zwija / przelacza. Na karcie otwarta jedna lista naraz. Licznik z wartoscia 0 nie jest klikalny.
2. Naglowek listy: nazwa licznika, liczba i plik, z ktorego pochodzi (np. `01-interview/DECISIONS.md`) - wiadomo,
   gdzie poprawic. Pozycja: ID (jesli jest), tytul, znacznik statusu, jedna linia szczegolow.
3. Co pokazuje:
   - Interview: pytan / otwarte / zadane biznesowi / sprzeczne - pytania z QUESTIONS.md (jak lista "Pytania do wyjasnienia":
     pytanie, do kogo, skad); decyzji - D-xxx z DECISIONS.md: tytul, kto zdecydowal i kiedy, tresc decyzji, "brak powodu"
     wyrozniony; zalozen niepotw. / obalonych - A-xxx z ASSUMPTIONS.md: tresc, zrodlo, wymagania zalezne.
   - Domain: hasel / zatwierdzonych - pojecie i definicja z GLOSSARY.md; rol - rola i co robi z ACTORS.md;
     encji - naglowki z ENTITIES.md; regul - BR-xxx z RULES.md: tresc i wymagania.
   - Spec: wymagan / zatwierdzonych / do przegladu - R-xxx z PRD.md (SPEC.md przy `light`): tytul, status, opis;
     przy "do przegladu" powod z sekcji "6. Do przegladu", jesli jest.
4. Tylko do czytania - zmiany dalej przez `/sdd:...` w Claude Code. Nazwy plikow i tresci jak w plikach (bez tlumaczenia).
5. Panel odswieza sie na zywo; otwarta lista zostaje otwarta po odswiezeniu (do przeladowania strony albo zmiany modulu).

## Poza zakresem
- Edycja z panelu, przejscie do pliku w edytorze, liczniki Intake/Validate/Handover (Intake ma juz liste plikow).

## Kryteria akceptacji (test w `plugins/sdd/board/test/progress.test.js`)
- AC-54: `stage.details` Interview: `decisions` - pozycje D-xxx z tytulem, `status` z "Zdecydowal" i data, `note` z "Decyzja",
  `warn` gdy "Powod" pusty; szablon (D-xxx) pominiety; `unconfirmed` / `refuted` - tylko A o tym statusie; kazda lista z `file`.
- AC-55: `stage.details` Domain: `terms` wszystkie hasla, `approved` tylko zatwierdzone (tytul = pojecie, note = definicja);
  `actors`, `rules` (id BR-xxx), `entities` (naglowki bez placeholdera `<Encja>`); liczba pozycji = licznik.
- AC-56: `stage.details` Spec: `requirements` / `approved` / `review` - R-xxx z tytulem, statusem i opisem; `review` ma
  `note` z sekcji 6, gdy R jest tam wymienione; placeholder R pominiety; liczba pozycji = licznik.
- AC-57: `SddUI.countList(label, detail)` (ui.js) - HTML listy: naglowek z liczba i plikiem, pozycje z ID, tytulem, statusem
  i notatka, tekst escapowany, `warn` wyrozniony; pusta lista -> komunikat (test w `test/ui.test.js`).
- AC-58 (reczne): horizon-zlecenia - klik "36 decyzji" pokazuje 36 decyzji z D-036 "brak powodu"; klik "1 obalonych" -> A-006;
  "1 do przegladu" -> to R; "53 hasel" -> slownik; drugi klik zwija; licznik 0 nieklikalny; odswiezenie na zywo nie zwija listy;
  telefon bez poziomego przewijania, tryb ciemny czytelny.
