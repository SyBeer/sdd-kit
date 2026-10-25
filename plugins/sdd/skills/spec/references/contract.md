# Wymaganie rodzaju kontrakt

Kontrakt to obietnica miedzy aplikacja a innym systemem: jakie dane, w ktora strone, jak czesto i co przy awarii.

Kiedy:
- integracja `zewnetrzny` i wymiana plikow z `02-domain/SYSTEMS.md` (`reczny` z wpisem recznym: w `Wymagania`
  wpisz zwykle `R` formularza, bez kontraktu),
- przy `kind: service` w SDD.yaml takze kazde wejscie (kto nas wola) i wyjscie (komu dajemy dane).

Jak:
- linie `Rodzaj: kontrakt - wejscie|wyjscie` i `System: S-xxx`; numer R wpisz w kolumne `Wymagania` w SYSTEMS.md,
- obowiazkowe AC jezykiem biznesu: jakie dane (pojecia ze slownika), kierunek,
  czestotliwosc albo dopuszczalne opoznienie, zachowanie przy awarii; przy `service` dodatkowo
  zmiana wersji (co wolno zmienic bez uprzedzenia konsumenta, co wymaga uzgodnienia),
- Bez schematu technicznego: OpenAPI/AsyncAPI, pola, endpointy powstaja w budowie i wskazuja R - nie wchodza do PRD,
- kontrakt miedzy dwoma serwisami: zrodlo `[Biz]` (D wlascicieli obu stron), nie odczyt z kodu.
