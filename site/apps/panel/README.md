# Fishery Finder Biznes — panel właściciela

Webowy panel dla właścicieli łowisk (osobny od aplikacji mobilnej dla wędkarzy).
Logowanie/rejestracja, dodawanie i edycja łowisk, kalendarz rezerwacji z blokowaniem
stanowisk oraz analityka. Spięty z tym samym projektem Supabase co aplikacja (`FF's Project`).

## Uruchomienie

Część monorepo — odpalaj z katalogu `site/` (patrz `site/README.md`):

```bash
cd ../..             # = site/
npm install
npm run dev:panel    # http://localhost:5174
```

Build produkcyjny: `npm run build:panel` (wynik w `site/apps/panel/dist`).

## Stack
- Vite + React + TypeScript
- Supabase (auth + dane) — `src/lib/supabase.ts`
- recharts (wykresy)
- Leaflet (mapa OSM do wyboru lokalizacji, ładowana z CDN w `index.html` — wymaga internetu)
- react-router-dom
- Własny zestaw ikon SVG — `src/components/Icon.tsx` (bez zewnętrznych zależności)

## UI/UX (spójne z aplikacją mobilną)
- Sidebar w brandzie z liniowymi ikonami, kartą planu i profilem właściciela.
- Pulpit jak na materiałach marketingowych: karty statystyk, wykres obłożenia, lista nadchodzących, przychód w sezonie.
- Kalendarz w stylu Gantta: paski rezerwacji rozciągnięte na dni, kolorowe statusy (opłacone online / potwierdzone / oczekuje / zablokowane), nawigacja miesięcy, modal blokady i szczegóły rezerwacji.
- Formularz łowiska: mapa (klik = pinezka, przeciąganie), kafelki typów/ryb/udogodnień z ikonami.
- Typy łowiska, gatunki ryb i udogodnienia są dokładnie te same co w aplikacji wędkarza (`src/lib/constants.ts`).

## Architektura
- `src/lib/supabase.ts` — klient (URL + anon key, ten sam projekt co apka).
- `src/lib/api.ts` — warstwa danych: łowiska, rezerwacje, analityka.
- `src/lib/useOwnerData.ts` — wspólny hook: łowiska właściciela + ich rezerwacje.
- `src/context/AuthContext.tsx` — sesja, logowanie, rejestracja.
- `src/pages/*` — Pulpit, Moje łowiska, formularz łowiska, Kalendarz, Rezerwacje, Analityka.

## Baza — zmiany wprowadzone pod panel
Migracje w Supabase (`FF's Project`):
1. `owner_panel_ownership_and_policies` — kolumna `fisheries.owner_id`, RLS:
   właściciel zarządza swoimi łowiskami i widzi/zmienia rezerwacje tych łowisk.
2. `owner_save_fishery_and_blocks` — funkcja `owner_save_fishery(...)` (dodaj/edytuj
   całe łowisko jednym wywołaniem, ustawia `owner_id = auth.uid()`),
   `owner_block_spots(...)` (blokada stanowisk) + polityka usuwania blokad.

Konto właściciela = konto użytkownika Supabase, które posiada łowiska. Po rejestracji
trigger `handle_new_user` tworzy profil (imię, e-mail, telefon).

## Do dorobienia (kolejne kroki)
- Wgrywanie zdjęć plikiem do Storage `fishery-photos` (teraz: adresy URL).
- Przypisanie istniejących 3 demo-łowisk do konta (mają `owner_id = NULL`).
- Drag & drop w kalendarzu (teraz: klik = zaznacz/blokuj).
- Płatności online (Przelewy24/BLIK) i powiadomienia push/e-mail.
