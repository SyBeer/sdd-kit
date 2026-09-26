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
