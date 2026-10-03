# START TUTAJ - sdd-kit po ludzku

Jesli nie wiesz, co to plugin, marketplace albo skill, ten plik jest dla Ciebie.
Czytaj po kolei, 5 minut.

## 1. Co to w ogole jest

Zestaw osmiu komend dla Claude Code, ktore prowadza Cie przez zbieranie wymagan
biznesowych: od notatek i maili, przez pytania do biznesu, do specyfikacji, z ktorej
programisci (albo AI) buduja system. Wszystko trafia do plikow tekstowych w folderze
projektu, wiec masz historie i mozesz pracowac na kazdym komputerze.

## 2. Slowniczek (tylko to, czego naprawde potrzebujesz)

| Slowo | Po ludzku |
|-------|-----------|
| Claude Code | Program Anthropic uruchamiany w terminalu. Piszesz do niego jak na czacie, ale on widzi Twoje pliki i moze je tworzyc i zmieniac. |
| Terminal | Czarne okno z tekstem (na Macu: aplikacja Terminal, na Windows: PowerShell). |
| Repo / repozytorium | Folder z projektem, w ktorym Git zapisuje historie kazdej zmiany. Mozna cofnac, zobaczyc kto co zmienil. |
| Git | Program do tej historii. Zwykle juz jest na komputerze. |
| Plugin (dodatek) | Paczka komend dla Claude Code. Tu: dodatek 'sdd'. |
| Marketplace (zrodlo dodatkow) | Miejsce, skad Claude Code pobiera dodatki. Moze byc folder na dysku albo repo na GitHub. Ten kit jest jednoczesnie swoim wlasnym zrodlem. |
| Skill / komenda | Jedna czynnosc, ktora wywolujesz wpisujac /nazwa w Claude Code. Np. /sdd:status. |
| CLAUDE.md | Plik z zasadami, ktore Claude Code czyta na starcie kazdej rozmowy w tym projekcie. Tu: zasady pracy z wymaganiami. |
| Scope user | Dodatek zainstalowany "dla mnie", dziala w kazdym projekcie na tym komputerze. |
| Intake | Etap 1: wrzucasz surowe materialy, AI je kataloguje. |
| Interview | Etap 2: AI generuje pytania do biznesu, Ty wpisujesz odpowiedzi. |
| Domain | Etap 3: slownik pojec, kto jest kim, jakie sa reguly. |
| Spec / PRD | Etap 4: dokument z wymaganiami. PRD to wersja dla biznesu do przeczytania i zatwierdzenia. |
| Validate | Etap 5: automatyczna kontrola, czy spec jest kompletny. |
| Handover | Etap 6: zamiana specu na zadania dla zespolu. |
| Board / tablica | Lokalna strona z karteczkami, odswiezana na zywo, gdy agent pisze. Wymaga Node.js (program do uruchamiania takich stron, zwykle juz jest, bo Claude Code go potrzebuje). |
| R / Q / A / D | Numery: R-wymaganie, Q-pytanie, A-zalozenie, D-decyzja. Zeby dalo sie odwolac "chodzi o R-12". |
| [Biz] [App] [Dok] [AI] | Skad wiemy: Biz - biznes powiedzial, App - widac w dzialajacej aplikacji albo prototypie, Dok - z dokumentu, AI - domysl AI. Biz jest najpewniejsze. |

## 3. Instalacja w 3 krokach (tylko osoba prowadzaca)

Najpierw Claude Code (jesli go nie masz): https://docs.claude.com/en/docs/claude-code/setup
Windows: w PowerShell `irm https://claude.ai/install.ps1 | iex`, potem zamknij i otworz PowerShell na nowo.

1. Otworz terminal: Mac - aplikacja Terminal; Windows - PowerShell (Start -> wpisz "PowerShell").
2. Wklej jedna komende (kit pobierze sie sam):
   - Mac: `curl -fsSL https://raw.githubusercontent.com/SyBeer/sdd-kit/main/install.sh | bash`
   - Windows: `irm https://raw.githubusercontent.com/SyBeer/sdd-kit/main/install.ps1 | iex`

   Masz kit jako folder (ZIP)? Mac: `cd sciezka/do/sdd-kit` i `bash install.sh`. Windows: dwuklik `install.cmd`.
3. Odpowiadaj na pytania. Kreator sprawdza, co masz, wyjasnia kazdy krok, na koncu daje sciage.

Po instalacji masz w terminalu komende `sdd-board` (tablica) i w Claude Code komendy `/sdd:...`.
Na drugim komputerze powtorz punkty 1-3. Na Windows po instalacji otworz nowe okno PowerShell, zeby dzialalo `sdd-board`.
Biznes nie instaluje nic.

## 4. Pierwszy dzien z kitem, krok po kroku

1. Wejdz do folderu projektu w terminalu, wpisz `claude`. Otworzy sie czat.
2. Wpisz `/sdd:init`. Odpowiedz na pytanie o nazwe i poziom.
   - Pelny (full): dokument dla biznesu + osobne pliki dla programistow. Do pracy w firmie.
   - Lekki (light): jeden krotki plik. Do malych rzeczy i nauki.
3. Wrzuc materialy do folderu `requirements/00-intake/` (maile, notatki, zrzuty ekranu). Wpisz `/sdd:intake`.
   AI zrobi spis i powie, gdzie materialy sie ze soba klóca.
4. Wpisz `/sdd:interview live` jesli masz biznes obok siebie, albo `/sdd:interview async`
   jesli chcesz wyslac im pytania do wypelnienia. Odpowiedzi wpisujesz lub wklejasz.
5. Wpisz `/sdd:domain`. Powstanie slownik. Daj go biznesowi do zatwierdzenia.
6. Wpisz `/sdd:spec`. AI zaproponuje wymagania po kilka naraz, Ty mowisz tak/nie.
7. Wpisz `/sdd:validate`. Zobaczysz procent gotowosci i co jeszcze blokuje.
8. W kazdej chwili `/sdd:status` pokaze, gdzie jestescie, w 20 linijkach.

## 4a. Warsztat z tablica na zywo (bez Miro)

1. W drugim oknie terminala, w folderze projektu, wpisz `sdd-board`. W Claude Code wpisz `/sdd:board start`.
2. Otworz http://localhost:8012/board w przegladarce, najlepiej na rzutniku lub udostepnionym ekranie.
3. Rozmawiaj z biznesem, wpisuj do Claude Code, co mowia. Po kazdej wypowiedzi na tablicy pojawiaja sie karteczki:
   pomaranczowe "cos sie stalo", niebieskie "ktos cos robi", zolte "kto", fioletowe "regula", zielone "co oglada",
   czerwone "nie wiemy" (to przyszle pytania).
4. Biznes moze sam przesuwac i dopisywac karteczki w przegladarce. Agent to widzi.
5. Po warsztacie wpisz `/sdd:board sync`. Agent zaproponuje, co z karteczek trafia do ktorego pliku, Ty mowisz tak.
6. Chcesz zobaczyc, jak to wyglada, zanim zaczniesz? Przy dzialajacym `sdd-board` otworz
   http://localhost:8012/demo/start (poczatek warsztatu) i http://localhost:8012/demo (gotowy modul po SDD).
   W panelu jest tez link "Przykład ↗" w gornym pasku.

## 4b. Panel modulu - gdzie jestesmy

W folderze projektu wpisz w terminalu `sdd-board` i otworz http://localhost:8012.
Zobaczysz 6 etapow, co jest gotowe, co w toku i jaka komende wpisac dalej w Claude Code.
Strona odswieza sie sama, gdy agent zmienia pliki.
Materialy (maile, PDF, zrzuty) wrzucasz przeciagajac je na karte Intake, potem w Claude Code `/sdd:intake`.
Nowy modul (kolejny obszar wymagan) zakladasz, klikajac nazwe modulu w tytule i wybierajac "+ Nowy moduł…".
Moduly leza w katalogu, ktory wskazujesz w panelu przy pierwszym uruchomieniu (wpisz np. `~/wymagania` albo kliknij "Przeglądaj…") - nigdy w folderze sdd-kit.
Zmienisz go w tym samym menu: "Zmień katalog modułów…".

## 5. Trzy zasady, ktore trzeba pamietac

1. Wymaganie istnieje dopiero, gdy jest w pliku z data i zrodlem. Mail to nie wymaganie.
2. Jesli AI czegos nie wie, zapisuje to jako zalozenie i pyta. Nie zgaduje po cichu.
3. AI zapisuje samo tylko to, co da sie odtworzyc. Przed kazdym zapisem, ktory "tworzy prawde"
   (nowe wymaganie, decyzja, zmiana slownika), pyta Cie w 3-5 linijkach.

## 6. Gdy cos nie dziala

- Windows: "uruchamianie skryptow jest wylaczone w tym systemie" - uzyj `install.cmd` albo komendy `irm ... | iex` z punktu 3
  (nie `.\install.ps1`); obie omijaja blokade tylko na czas instalacji.
- Windows: "claude nie jest rozpoznawane" - zamknij i otworz PowerShell po instalacji Claude Code.
- `claude plugin list` pokazuje, czy 'sdd' jest zainstalowany.
- `claude plugin validate plugins/sdd` sprawdza, czy paczka jest poprawna.
- `claude plugin marketplace update sdd-kit` odswieza po zmianach w kicie.
- W Claude Code `/plugin` otwiera panel, gdzie widac bledy dodatkow.
