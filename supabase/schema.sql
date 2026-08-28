-- =====================================================================
-- Fishery Finder — schemat bazy łowisk (relacyjny)
-- Uruchom w Supabase: SQL Editor → New query → wklej całość → Run.
-- Bezpieczny do wielokrotnego uruchamiania (DROP ... IF EXISTS na początku).
-- =====================================================================

-- --- Sprzątanie (kolejność ze względu na klucze obce) -----------------
drop table if exists public.reviews            cascade;
drop table if exists public.fishery_amenities  cascade;
drop table if exists public.fishery_fish        cascade;
drop table if exists public.fishery_spots       cascade;
drop table if exists public.fishery_photos      cascade;
drop table if exists public.fisheries           cascade;
drop table if exists public.amenities           cascade;
drop table if exists public.fish_species        cascade;

-- =====================================================================
-- Tabele słownikowe (lookup)
-- =====================================================================

-- Gatunki ryb — słownik do walidacji i filtrów
create table public.fish_species (
  name text primary key                       -- np. 'Karp', 'Szczupak'
);

-- Udogodnienia — słownik z nazwą i ikoną (Ionicons)
create table public.amenities (
  name text primary key,                      -- etykieta wyświetlana, np. 'Parking'
  icon text                                   -- nazwa ikony Ionicons (opcjonalnie)
);

-- =====================================================================
-- Tabela główna: łowiska
-- =====================================================================
create table public.fisheries (
  id              text primary key,           -- stabilne id ('1'..'6'); zgodne z aplikacją
  name            text not null,
  location        text not null,              -- pełny adres
  city            text not null,
  province        text not null,              -- województwo (pełna nazwa)
  latitude        double precision not null,
  longitude       double precision not null,
  distance        numeric(6,1) default 0,     -- km (na razie statyczne; docelowo liczone)
  rating          numeric(2,1) default 0,     -- cache średniej oceny
  review_count    integer default 0,          -- cache liczby opinii
  price_from      integer not null,           -- zł / dzień
  description     text,
  rules           text,
  open_hours      text,
  total_spots     integer not null default 0,
  available_spots integer not null default 0, -- cache (docelowo liczone z rezerwacji)
  nokill          boolean not null default false,
  record_weight   numeric(5,1) default 0,     -- rekord w kg
  area_ha         numeric(6,1),               -- powierzchnia (ha) — pole rozszerzone
  phone           text,                        -- kontakt — pole rozszerzone
  email           text,                        -- kontakt — pole rozszerzone
  website         text,                        -- www — pole rozszerzone
  image_url       text,                        -- zdjęcie główne (Supabase Storage URL)
  spot_map_url    text,                        -- mapa stanowisk (URL, może być null)
  bathy_map_url   text,                        -- mapa batymetryczna (URL, może być null)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index fisheries_province_idx on public.fisheries (province);
create index fisheries_nokill_idx   on public.fisheries (nokill);

-- =====================================================================
-- Galeria zdjęć (1:N)
-- =====================================================================
create table public.fishery_photos (
  id          bigint generated always as identity primary key,
  fishery_id  text not null references public.fisheries(id) on delete cascade,
  url         text not null,                  -- Supabase Storage URL
  sort_order  integer not null default 0      -- kolejność w sliderze
);

create index fishery_photos_fishery_idx on public.fishery_photos (fishery_id, sort_order);

-- =====================================================================
-- Stanowiska wędkarskie (1:N) — pod realną dostępność/rezerwacje
-- =====================================================================
create table public.fishery_spots (
  id          bigint generated always as identity primary key,
  fishery_id  text not null references public.fisheries(id) on delete cascade,
  spot_number integer not null,               -- numer stanowiska (1..N)
  capacity    integer not null default 1,     -- ile osób
  has_power   boolean not null default false, -- prąd na stanowisku
  is_vip      boolean not null default false,
  note        text,
  unique (fishery_id, spot_number)
);

create index fishery_spots_fishery_idx on public.fishery_spots (fishery_id);

-- =====================================================================
-- Junction: łowisko ↔ gatunki ryb (N:M)
-- =====================================================================
create table public.fishery_fish (
  fishery_id text not null references public.fisheries(id)  on delete cascade,
  species    text not null references public.fish_species(name) on delete cascade,
  primary key (fishery_id, species)
);

-- =====================================================================
-- Junction: łowisko ↔ udogodnienia (N:M)
-- =====================================================================
create table public.fishery_amenities (
  fishery_id text not null references public.fisheries(id) on delete cascade,
  amenity    text not null references public.amenities(name) on delete cascade,
  primary key (fishery_id, amenity)
);

-- =====================================================================
-- Opinie (1:N) — schemat gotowy; aplikacja na razie pokazuje opinie
-- z rezerwacji, docelowo wpięcie tutaj
-- =====================================================================
create table public.reviews (
  id          bigint generated always as identity primary key,
  fishery_id  text not null references public.fisheries(id) on delete cascade,
  author_name text not null,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  visited_on  date,
  created_at  timestamptz not null default now()
);

create index reviews_fishery_idx on public.reviews (fishery_id);

-- =====================================================================
-- RLS — publiczny odczyt katalogu łowisk, brak zapisu dla anon
-- (zapis/edycję dorobimy z rolą właściciela / service role)
-- =====================================================================
alter table public.fisheries          enable row level security;
alter table public.fishery_photos     enable row level security;
alter table public.fishery_spots      enable row level security;
alter table public.fishery_fish       enable row level security;
alter table public.fishery_amenities  enable row level security;
alter table public.fish_species       enable row level security;
alter table public.amenities          enable row level security;
alter table public.reviews            enable row level security;

-- Polityki: SELECT dla wszystkich (anon + zalogowani)
create policy "public read fisheries"        on public.fisheries         for select using (true);
create policy "public read photos"           on public.fishery_photos    for select using (true);
create policy "public read spots"            on public.fishery_spots     for select using (true);
create policy "public read fishery_fish"     on public.fishery_fish      for select using (true);
create policy "public read fishery_amen"     on public.fishery_amenities for select using (true);
create policy "public read fish_species"     on public.fish_species      for select using (true);
create policy "public read amenities"        on public.amenities         for select using (true);
create policy "public read reviews"          on public.reviews           for select using (true);

-- Zalogowani użytkownicy mogą dodawać opinie (na przyszłość)
create policy "auth insert reviews" on public.reviews
  for insert to authenticated with check (true);
