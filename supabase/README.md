# Baza łowisk w Supabase — instrukcja wdrożenia

Łowiska nie są już zahardcodowane. Dane lecą z Supabase. Trzeba je raz wgrać.

## Kolejność kroków

### 1. Schemat
Supabase → **SQL Editor** → New query → wklej całość z `schema.sql` → **Run**.
Tworzy tabele: `fisheries`, `fishery_photos`, `fishery_spots`, `fish_species`,
`amenities`, `fishery_fish`, `fishery_amenities`, `reviews` + RLS (publiczny odczyt).

### 2. Zdjęcia → Storage
Aplikacja czyta zdjęcia z publicznego bucketu **`fishery-photos`**. Dwa sposoby:

**A. Skryptem (zalecane)** — z katalogu projektu:
```bash
SUPABASE_SERVICE_KEY="<service_role_key>" node supabase/upload-photos.mjs
```
Service key: Supabase → **Project Settings → API → `service_role`** (sekretny, nie commituj).
Skrypt tworzy bucket i wgrywa 4 zdjęcia z `assets/`.

**B. Ręcznie** — Supabase → **Storage** → New bucket → nazwa `fishery-photos`,
zaznacz **Public** → wgrać z `assets/` (zachowaj nazwy plików):
`lowisko-nieznanowice_9ae51e0f.jpg`, `15.png`, `lowisko-borowa-014.jpg`, `niedamowo-3.jpg`.

### 3. Seed danych
SQL Editor → wklej `seed.sql` → **Run**. Wstawia 6 łowisk, galerie, stanowiska,
powiązania gatunków/udogodnień i przykładowe opinie. Idempotentny (można puścić ponownie).

### 4. Rezerwacje + ulubione (realny kalendarz)
SQL Editor → wklej `reservations.sql` → **Run**. Tworzy:
- tabelę `reservations` (rezerwacje per użytkownik) z RLS — każdy widzi/zmienia
  swoje oraz te udostępnione mu mailem,
- funkcję `fishery_occupancy()` liczącą zajętość **per łowisko** (bez ujawniania
  danych osobowych) — to z niej kalendarz pobiera wolne/zajęte stanowiska,
- tabelę `favorites` (trwałe serduszka),
- przykładową zajętość demo, żeby kalendarze nie startowały puste
  (`delete from public.reservations where user_id is null;` żeby ją usunąć).

Po tym kroku rezerwowanie jest realne: rezerwacja zapisuje się do bazy, kalendarz
od razu pokazuje zajęte stanowisko, a inni użytkownicy widzą je jako zajęte.

## Sprawdzenie
SQL Editor:
```sql
select id, name, price_from, total_spots from public.fisheries order by id;
select count(*) from public.fishery_photos;   -- 24
select count(*) from public.fishery_spots;     -- 129
```
Potem odpal aplikację — lista, mapa, ulubione i szczegóły powinny działać jak wcześniej,
ale dane lecą z bazy.

## Dodanie nowego łowiska później
Wystarczy `insert` do `fisheries` (+ wiersze w `fishery_photos`, `fishery_fish`,
`fishery_amenities`, opcjonalnie `fishery_spots`). Aplikacja podciągnie automatycznie.
