-- =====================================================================
-- Funkcja add_fishery() — dodaje (lub aktualizuje) całe łowisko JEDNYM
-- wywołaniem. Rozkłada dane do tabel: fisheries, fishery_photos,
-- fishery_fish, fishery_amenities, fishery_spots, fishery_records.
-- Typ łowiska, kontakt (tel/mail/www) i rekordy są obsługiwane.
-- Nowe gatunki/udogodnienia trafiają automatycznie do słowników.
-- Pola wyliczane (fish[], record_weight) utrzymują triggery.
-- Uruchom PO schema.sql. Przykład na końcu pliku.
-- =====================================================================

create or replace function public.add_fishery(
  p_id            text,
  p_name          text,
  p_location      text,
  p_city          text,
  p_province      text,
  p_lat           double precision,
  p_lng           double precision,
  p_price_from    integer,
  p_total_spots   integer,
  p_fish          text[],
  p_amenities     text[] default '{}',
  p_types         text[] default '{}',
  p_photos        text[] default '{}',
  p_records       jsonb  default '[]',         -- [{"species":"Karp","weight":24}, ...]
  p_description   text default '',
  p_rules         text default '',
  p_open_hours    text default '',
  p_nokill        boolean default false,
  p_phone         text default null,
  p_email         text default null,
  p_website       text default null,
  p_area_ha       numeric default null,
  p_distance      numeric default 0
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_img text := case when array_length(p_photos, 1) >= 1 then p_photos[1] else null end;
begin
  insert into public.fisheries (
    id, name, location, city, province, latitude, longitude, distance,
    price_from, description, rules, open_hours, total_spots, available_spots,
    nokill, area_ha, types, phone, email, website, image_url
  ) values (
    p_id, p_name, p_location, p_city, p_province, p_lat, p_lng, p_distance,
    p_price_from, p_description, p_rules, p_open_hours, p_total_spots, p_total_spots,
    p_nokill, p_area_ha, coalesce(p_types, '{}'), p_phone, p_email, p_website, v_img
  )
  on conflict (id) do update set
    name = excluded.name, location = excluded.location, city = excluded.city,
    province = excluded.province, latitude = excluded.latitude, longitude = excluded.longitude,
    distance = excluded.distance, price_from = excluded.price_from,
    description = excluded.description, rules = excluded.rules, open_hours = excluded.open_hours,
    total_spots = excluded.total_spots, available_spots = excluded.available_spots,
    nokill = excluded.nokill, area_ha = excluded.area_ha, types = excluded.types,
    phone = excluded.phone, email = excluded.email, website = excluded.website,
    image_url = excluded.image_url, updated_at = now();

  delete from public.fishery_photos   where fishery_id = p_id;
  delete from public.fishery_fish      where fishery_id = p_id;
  delete from public.fishery_amenities where fishery_id = p_id;
  delete from public.fishery_spots     where fishery_id = p_id;
  delete from public.fishery_records   where fishery_id = p_id;

  insert into public.fish_species (name)
    select x from unnest(coalesce(p_fish, '{}')) x on conflict (name) do nothing;
  insert into public.fishery_fish (fishery_id, species)
    select p_id, x from unnest(coalesce(p_fish, '{}')) x on conflict do nothing;

  insert into public.amenities (name)
    select x from unnest(coalesce(p_amenities, '{}')) x on conflict (name) do nothing;
  insert into public.fishery_amenities (fishery_id, amenity)
    select p_id, x from unnest(coalesce(p_amenities, '{}')) x on conflict do nothing;

  insert into public.fishery_photos (fishery_id, url, sort_order)
    select p_id, p_photos[i], i - 1 from generate_subscripts(p_photos, 1) i;

  insert into public.fishery_spots (fishery_id, spot_number, capacity)
    select p_id, g, 2 from generate_series(1, p_total_spots) g;

  insert into public.fishery_records (fishery_id, species, weight)
    select p_id, e->>'species', (e->>'weight')::numeric
    from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) e
    where coalesce(e->>'species', '') <> '';
end;
$$;

-- Tylko service_role (import / SQL editor) — nie zwykli użytkownicy aplikacji:
revoke execute on function public.add_fishery(
  text, text, text, text, text, double precision, double precision, integer, integer,
  text[], text[], text[], text[], jsonb, text, text, text, boolean, text, text, text, numeric, numeric
) from public, anon, authenticated;
grant execute on function public.add_fishery(
  text, text, text, text, text, double precision, double precision, integer, integer,
  text[], text[], text[], text[], jsonb, text, text, text, boolean, text, text, text, numeric, numeric
) to service_role;

-- =====================================================================
-- PRZYKŁAD:
-- =====================================================================
-- select public.add_fishery(
--   p_id => '7', p_name => 'Łowisko Przykładowe',
--   p_location => 'ul. Wędkarska 1, Miastko', p_city => 'Miastko', p_province => 'Mazowieckie',
--   p_lat => 52.20, p_lng => 21.00, p_price_from => 110, p_total_spots => 20,
--   p_fish => array['Karp','Szczupak','Sandacz'],
--   p_amenities => array['Parking','Toaleta','Domki'],
--   p_types => array['Karpiowe','Spinningowe'],
--   p_photos => array['https://.../foto1.jpg','https://.../foto2.jpg'],
--   p_records => '[{"species":"Karp","weight":24},{"species":"Szczupak","weight":11}]'::jsonb,
--   p_description => 'Opis...', p_rules => 'Regulamin...', p_open_hours => 'Całą dobę',
--   p_nokill => true, p_phone => '+48 600 100 200', p_email => 'biuro@przyklad.pl',
--   p_website => 'https://przyklad.pl'
-- );
