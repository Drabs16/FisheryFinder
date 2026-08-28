-- =====================================================================
-- Fishery Finder — rezerwacje (realny kalendarz)
-- Uruchom PO schema.sql i seed.sql. Bezpieczny do ponownego uruchomienia.
--
-- Daje:
--   • tabelę reservations (każda rezerwacja: łowisko, stanowiska, termin),
--   • RLS — użytkownik widzi/zmienia swoje + udostępnione mu mailem,
--   • funkcję fishery_occupancy() liczącą zajętość PER ŁOWISKO bez ujawniania
--     danych osobowych (do kalendarza dostępności),
--   • przykładową zajętość demo (user_id = null), żeby kalendarze nie były puste.
-- =====================================================================

drop table if exists public.reservations cascade;

create table public.reservations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,  -- null = blokada demo
  fishery_id    text not null references public.fisheries(id) on delete cascade,
  fishery_name  text not null,                 -- denormalizowane (do listy)
  spots         integer[] not null default '{}',
  date_from     date not null,
  date_to       date not null,                 -- włącznie
  days          integer not null default 1,
  date_label    text,
  price_per_day integer not null default 0,
  total         numeric(10,2) not null default 0,
  payment       text,
  name          text,
  phone         text,
  status        text not null default 'upcoming' check (status in ('upcoming','cancelled')),
  rating        integer check (rating between 1 and 5),
  shared_with   text[] not null default '{}',  -- maile, którym udostępniono
  created_at    timestamptz not null default now()
);

create index reservations_user_idx    on public.reservations (user_id);
create index reservations_fishery_idx on public.reservations (fishery_id);
create index reservations_dates_idx   on public.reservations (date_from, date_to);

-- --- RLS --------------------------------------------------------------
alter table public.reservations enable row level security;

-- Widzę swoje rezerwacje oraz te udostępnione na mój e-mail
create policy "read own or shared reservations" on public.reservations
  for select to authenticated
  using (
    user_id = auth.uid()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = any (shared_with)
  );

-- Mogę tworzyć tylko własne
create policy "insert own reservations" on public.reservations
  for insert to authenticated
  with check (user_id = auth.uid());

-- Mogę aktualizować (anulować / ocenić / udostępnić) tylko własne
create policy "update own reservations" on public.reservations
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Mogę usuwać tylko własne
create policy "delete own reservations" on public.reservations
  for delete to authenticated
  using (user_id = auth.uid());

-- =====================================================================
-- Funkcja zajętości: zwraca pary (dzień, stanowisko) zajęte dla łowiska
-- w danym zakresie. SECURITY DEFINER — widzi WSZYSTKIE rezerwacje (też
-- innych użytkowników), ale oddaje wyłącznie numer stanowiska i datę,
-- bez żadnych danych osobowych. Dzięki temu kalendarz jest wspólny/realny.
-- =====================================================================
create or replace function public.fishery_occupancy(p_fishery text, p_from date, p_to date)
returns table(d date, spot integer)
language sql
stable
security definer
set search_path = public
as $$
  select gs::date as d, s as spot
  from public.reservations r
  cross join lateral unnest(r.spots) as s
  cross join lateral generate_series(r.date_from, r.date_to, interval '1 day') as gs
  where r.fishery_id = p_fishery
    and r.status <> 'cancelled'
    and r.date_from <= p_to
    and r.date_to   >= p_from;
$$;

grant execute on function public.fishery_occupancy(text, date, date) to anon, authenticated;

-- =====================================================================
-- Demo-zajętość (user_id = null) — żeby kalendarze nie startowały puste.
-- Każde łowisko ma WŁASNY wzór zajętości. Możesz to usunąć:
--   delete from public.reservations where user_id is null;
-- =====================================================================
insert into public.reservations
  (user_id, fishery_id, fishery_name, spots, date_from, date_to, days, status, name)
values
  (null, '1', 'Kuter Port',     '{3,7,12}', '2026-06-05', '2026-06-06', 2, 'upcoming', 'Rezerwacja'),
  (null, '1', 'Kuter Port',     '{20,21}',  '2026-06-14', '2026-06-14', 1, 'upcoming', 'Rezerwacja'),
  (null, '2', 'Karpik Zator',   '{2,9}',    '2026-06-07', '2026-06-07', 1, 'upcoming', 'Rezerwacja'),
  (null, '2', 'Karpik Zator',   '{15}',     '2026-06-12', '2026-06-13', 2, 'upcoming', 'Rezerwacja'),
  (null, '3', 'Łowisko Borowa', '{1}',      '2026-06-08', '2026-06-08', 1, 'upcoming', 'Rezerwacja'),
  (null, '3', 'Łowisko Borowa', '{5,6}',    '2026-06-20', '2026-06-21', 2, 'upcoming', 'Rezerwacja'),
  (null, '4', 'Na Gołyszu',     '{4,8}',    '2026-06-06', '2026-06-06', 1, 'upcoming', 'Rezerwacja'),
  (null, '4', 'Na Gołyszu',     '{11}',     '2026-06-15', '2026-06-17', 3, 'upcoming', 'Rezerwacja'),
  (null, '5', 'Pstrążna',       '{3,10}',   '2026-06-09', '2026-06-09', 1, 'upcoming', 'Rezerwacja'),
  (null, '5', 'Pstrążna',       '{18}',     '2026-06-22', '2026-06-22', 1, 'upcoming', 'Rezerwacja'),
  (null, '6', 'Owczarnia',      '{2,7}',    '2026-06-10', '2026-06-11', 2, 'upcoming', 'Rezerwacja'),
  (null, '6', 'Owczarnia',      '{14}',     '2026-06-18', '2026-06-18', 1, 'upcoming', 'Rezerwacja');

-- =====================================================================
-- Ulubione łowiska (per użytkownik) — żeby serduszka były trwałe
-- =====================================================================
drop table if exists public.favorites cascade;

create table public.favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  fishery_id text not null references public.fisheries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, fishery_id)
);

alter table public.favorites enable row level security;

create policy "manage own favorites - select" on public.favorites
  for select to authenticated using (user_id = auth.uid());
create policy "manage own favorites - insert" on public.favorites
  for insert to authenticated with check (user_id = auth.uid());
create policy "manage own favorites - delete" on public.favorites
  for delete to authenticated using (user_id = auth.uid());
