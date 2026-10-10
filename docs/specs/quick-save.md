# Spec: ikona "Zapisz wersję" przy zebatce i szybsze wczytywanie stron (zmiana 0.42.0)

Status: zlecone przez wlasciciela produktu 2026-10-10 ("Strasznie dlugo wczytuje sie konfiguracja. Ikona ZAPISZ
powinna byc przy Zebatce").

## Problem
1. "Zapisz wersję" (0.41.0) jest schowane na dole Konfiguracji -> "Kopia i wersje". Uzytkownik nie znalazl go sam.
2. Nowa karta panelu (np. Konfiguracja) wczytuje sie bardzo dlugo, gdy otwartych jest kilka kart. Przyczyna:
   przegladarka trzyma najwyzej 6 polaczen z jednym serwerem (HTTP/1.1), a kazda karta panelu trzyma stale polaczenie
   na zywe odswiezanie (`/events`, `/progress-events`, przy otwartym oknie Claude takze `/term-events`, `/chat-events`).
   Siodma prosba czeka, az ktores sie zwolni. Do tego Konfiguracja, Modul i "Jak to dziala" rysuja tresc dopiero po
   pierwszym zdarzeniu z takiego polaczenia. Zmierzone 2026-10-10: Safari mial 6 otwartych polaczen z portem 8012.

## Cel
- Zapis wersji jednym kliknieciem z kazdej strony, bez szukania w Konfiguracji.
- Nowa karta wczytuje sie od razu, niezaleznie od liczby otwartych kart.

Metryka: Konfiguracja wyswietla tresc w < 1 s przy 6+ otwartych kartach panelu (wczesniej: czekala na zwolnienie
polaczenia).

## Zakres
### A. Ikona "Zapisz wersję" w naglowku
- Ikona (dyskietka, SVG w `currentColor`) w naglowku tuz przed zebatka ⚙, na wszystkich stronach panelu Twojego modulu.
  W demo (`base` niepusty) ikony nie ma - demo jest tylko do odczytu.
- Klik otwiera okienko pod ikona: tytul "Zapisz wersję", jedno zdanie po co ("ważny moment z nazwą, np. pokazane
  biznesowi - wspólny dla zespołu"), pole nazwy, przycisk "Zapisz wersję", link "Zobacz poprzednie wersje" do
  `/config#kopia`. Fokus w polu nazwy.
- Enter = zapisz, Esc albo klik poza okienkiem = zamknij. Pusta nazwa = fokus w polu, bez zapytania.
- Zapis: `POST /api/copy/version {name}` (jak w Konfiguracji). Sukces: "Zapisano: <nazwa>" (z dopiskiem "na serwerze",
  gdy wersja zostala wyslana), pole czyszczone. Blad (np. duplikat, folder bez gita): komunikat serwera w okienku.
- Napisy bez slow "commit", "tag", "snapshot".

### B. Polaczenia na zywo i wczytywanie
- Wspolny pomocnik `SddUI.liveSource(url, handlers, env)`: otwiera `EventSource`; gdy karta jest schowana
  (`document.hidden`), zamyka polaczenie; gdy wraca na wierzch - otwiera je ponownie (serwer po polaczeniu wysyla pelny
  stan, wiec nic nie ginie). Nigdy dwa polaczenia naraz z jednej karty dla jednego adresu.
- Uzywaja go strony: Tablica (`/events`), Panel (`/progress-events`), Konfiguracja / Modul / Jak to dziala
  (`/progress-events`). Polaczenia okna Claude (`/term-events`, `/chat-events`) bez zmian - ich zamykanie mogloby
  zgubic wyjscie terminala.
- Konfiguracja, Modul i "Jak to dziala" wczytuja tresc od razu przy starcie strony, nie czekajac na pierwsze zdarzenie.

## Poza zakresem
Laczenie wszystkich strumieni w jeden, HTTP/2, wspoldzielenie polaczenia miedzy kartami (SharedWorker).

## Kryteria akceptacji
- **AC-QS1** `topbarHtml(page, '', t)` zawiera przycisk `.ic.save` (aria-label "Zapisz wersję") bezposrednio przed
  linkiem `.cfg`; dla `base` niepustego (demo) przycisku nie ma.
- **AC-QS2** Okienko zapisu: `SddUI.savePopHtml(b)` ma pole `#qs-name`, przycisk `#qs-save` "Zapisz wersję", link
  `<b>/config#kopia` "Zobacz poprzednie wersje" (2026-10-10, bylo "Wszystkie wersje"); bez slow commit/tag/snapshot.
- **AC-QS3** `SddUI.saveResult(res)`: sukces -> "Zapisano: <nazwa>" (+ "na serwerze" gdy `version.sent`), blad ->
  tresc bledu; nazwa escapowana.
- **AC-QS5** (2026-10-10, zgloszenie: "po kliknieciu Zapisz kursor z przekreslonym kolem i nic sie nie dzieje" - prosba
  czekala w kolejce przegladarki za 6 polaczeniami starych kart) W trakcie zapisu przycisk pokazuje "Zapisuję…";
  bez odpowiedzi po 15 s zapytanie jest przerywane, przycisk wraca, a `saveResult(null, {name:'AbortError'})` daje:
  "Serwer nie odpowiada. Zamknij albo odśwież inne karty panelu sdd-kit i spróbuj ponownie."
- **AC-QS4** Serwer: `POST /api/copy/version` z naglowkiem jak z panelu zapisuje wersje (istniejacy AC-RC10 - bez zmian).
- **AC-LC1** `liveSource`: otwiera jedno polaczenie; `hidden` -> `close()`; powrot -> nowe polaczenie i `onopen`;
  kolejne zdarzenie "widoczna" przy otwartym polaczeniu nie otwiera drugiego; `onmessage` przekazywane dalej.
- **AC-LC2** `index.html`, `progress.html`, `info.html` uzywaja `SddUI.liveSource`, nie `new EventSource` bezposrednio.
- **AC-LC3** `info.html` wywoluje `load()` przy starcie strony (nie tylko z `onmessage`).
- **AC-LC4** (reczne) Przy otwartych 6+ kartach panelu nowa karta Konfiguracji wyswietla tresc od razu; ikona zapisu
  zapisuje wersje i pokazuje ja na liscie w Konfiguracji.

## Weryfikacja
- 2026-10-10, testy: `quick-save.test.js` 8/8 (najpierw czerwone 7/7), pelny zestaw tablicy 319 OK, 0 bledow.
- 2026-10-10, zywa tablica fv-manager (port 8012): Konfiguracja pyta `/api/config` po 20 ms od startu (wczesniej
  230 ms, po pierwszym zdarzeniu); ikona dyskietki przed ⚙, okienko pod nia, pusta nazwa + Enter -> fokus w polu,
  Esc zamyka; karta schowana -> "łączę…" bez polaczenia, powrot -> "połączono" i Panel z 6 etapami. Zapis wersji na
  zywo nie wykonany (tworzylby wersje w repo fv-manager) - pokryty AC-RC10. AC-LC4 (6+ kart w Safari) - do sprawdzenia
  przez wlasciciela.

## Testy (TDD, przed kodem)
`board/test/quick-save.test.js` (AC-QS1..QS3, AC-LC1..LC3).
