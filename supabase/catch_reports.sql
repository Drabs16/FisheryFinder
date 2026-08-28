-- ============================================================
-- Catch reports (raporty połowów)
-- Zalogowany wędkarz dodaje połów na łowisku PREMIUM.
-- Z tego powstaje jego prywatny "catch report" (dziennik),
-- a właściciel widzi połowy na swoich łowiskach (panel — krok 2).
-- Zdjęcia trafiają do istniejącego bucketa `fishery-photos`
-- (ścieżka <uid>/catches/... spełnia obecne RLS), więc nie ma
-- osobnej migracji Storage.
-- Uruchom w Supabase → SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.catch_reports (
  id          uuid primary key default gen_random_uuid(),
  fishery_id  text not null references public.fisheries(id) on delete cascade,  -- fisheries.id jest TEXT
  user_id     uuid not null references auth.users(id) on delete cascade,
  species     text not null,
  weight      numeric,          -- kg (opcjonalne)
  length_cm   int,              -- długość w cm (opcjonalne)
  spot_number int,              -- stanowisko (opcjonalne)
  photo_url   text,
  caught_on   date not null default current_date,
  note        text,
  hidden      boolean not null default false,   -- moderacja właściciela (krok 2)
  created_at  timestamptz not null default now()
);

create index if not exists catch_reports_fishery_idx on public.catch_reports (fishery_id);
create index if not exists catch_reports_user_idx    on public.catch_reports (user_id);
create index if not exists catch_reports_caught_idx  on public.catch_reports (caught_on desc);

alter table public.catch_reports enable row level security;

-- Wędkarz dodaje TYLKO swoje połowy i TYLKO na łowiskach premium
drop policy if exists "catch insert own premium" on public.catch_reports;
create policy "catch insert own premium" on public.catch_reports
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.fisheries f where f.id = fishery_id and f.premium)
  );

-- Wędkarz widzi swoje połowy
drop policy if exists "catch read own" on public.catch_reports;
create policy "catch read own" on public.catch_reports
  for select to authenticated using (user_id = auth.uid());

-- Właściciel widzi połowy na swoich łowiskach
drop policy if exists "catch read owner" on public.catch_reports;
create policy "catch read owner" on public.catch_reports
  for select to authenticated using (
    exists (select 1 from public.fisheries f where f.id = fishery_id and f.owner_id = auth.uid())
  );

-- Publiczna galeria „co brało ostatnio": każdy widzi NIEukryte połowy.
-- Klient nie pobiera user_id, więc galeria pozostaje anonimowa (RODO).
drop policy if exists "catch read public" on public.catch_reports;
create policy "catch read public" on public.catch_reports
  for select to anon, authenticated using (hidden = false);

-- Wędkarz edytuje / usuwa swoje
drop policy if exists "catch update own" on public.catch_reports;
create policy "catch update own" on public.catch_reports
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "catch delete own" on public.catch_reports;
create policy "catch delete own" on public.catch_reports
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- Panel właściciela: lista połowów + moderacja (SECURITY DEFINER).
-- Nazwisko/telefon wędkarza widzi TYLKO właściciel swojego łowiska
-- (przez definer, z join do profiles) — publiczna galeria zostaje anonimowa.
-- ============================================================

create or replace function public.owner_list_catches(p_fishery text default null)
returns table (
  id uuid, fishery_id text, fishery_name text, species text, weight numeric,
  length_cm int, spot_number int, photo_url text, caught_on date, note text,
  hidden boolean, created_at timestamptz, angler_name text, angler_phone text
)
language sql security definer set search_path = public as $$
  select c.id, c.fishery_id, f.name, c.species, c.weight, c.length_cm, c.spot_number,
         c.photo_url, c.caught_on, c.note, c.hidden, c.created_at,
         coalesce(p.name, 'Wędkarz'), p.phone
  from public.catch_reports c
  join public.fisheries f on f.id = c.fishery_id
  left join public.profiles p on p.id = c.user_id
  where f.owner_id = auth.uid()
    and (p_fishery is null or c.fishery_id = p_fishery)
  order by c.caught_on desc, c.created_at desc;
$$;

create or replace function public.owner_set_catch_hidden(p_catch uuid, p_hidden boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.catch_reports c
     set hidden = p_hidden
   from public.fisheries f
   where c.id = p_catch and f.id = c.fishery_id and f.owner_id = auth.uid();
  if not found then
    raise exception 'Brak uprawnień do tego połowu';
  end if;
end;
$$;

revoke all on function public.owner_list_catches(text) from public, anon;
revoke all on function public.owner_set_catch_hidden(uuid, boolean) from public, anon;
grant execute on function public.owner_list_catches(text) to authenticated;
grant execute on function public.owner_set_catch_hidden(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
