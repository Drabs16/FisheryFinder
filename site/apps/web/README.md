# Fishery Finder — strona internetowa (dla wędkarzy)

Publiczna, webowa wersja aplikacji mobilnej Fishery Finder. Te same dane i konta
(Supabase, projekt „FF's Project"), te same kolory i układ co apka.

- Przeglądanie **bez logowania**: lista łowisk, filtry, mapa, szczegóły.
- **Rezerwacja wymaga konta** (to samo logowanie co w aplikacji). Po kliknięciu
  „Zarezerwuj" niezalogowany użytkownik trafia na logowanie.
- Styl Booking: lista + mapa z markerami (rybka jak w apce), kalendarz dostępności,
  wybór stanowisk, płatność (gotówka / BLIK / Przelewy24, +5% przy online).

## Uruchomienie
Część monorepo — odpalaj z katalogu `site/` (patrz `site/README.md`):
```bash
cd ../..          # = site/
npm install
npm run dev:web   # http://localhost:5173
```

## Stack
- Vite + React + TypeScript
- Supabase (wspólne konta i dane z apką) — `src/lib/supabase.ts`
- Leaflet (mapa OSM, z CDN w `index.html`) — markery w stylu apki
- react-router-dom

## Mapa / Google Maps
Mapa używa OpenStreetMap (Leaflet) — bez klucza API, działa od razu. Przycisk
„Nawiguj" otwiera trasę w Google Maps. Jeśli chcesz kafelki Google Maps zamiast OSM,
trzeba dodać klucz API Google (płatny) — wtedy podmienimy warstwę mapy.

## Struktura
- `src/lib/fisheries.ts` — lista (RPC `search_fisheries`), detal, zajętość.
- `src/lib/reservations.ts` — rezerwacje (zapis identyczny jak w apce).
- `src/pages/` — Home (lista+filtry), MapPage (mapa), FisheryDetail (detal+rezerwacja),
  MyReservations, Profile, Login, Register.
- `src/components/` — Header, FisheryCard, BookingModal, Icon.

Fonty: aplikacja mobilna używa systemowych — strona też (ten sam font stack), więc wygląd jest spójny.
