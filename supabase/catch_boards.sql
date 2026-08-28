-- ============================================================
-- Tablice rywalizacji połowów (catch boards)
-- Wędkarz tworzy tablicę, dodaje kolegów (po e-mailu konta),
-- a leaderboard pokazuje per-osoba: liczbę połowów, sumę kg, big fish.
-- Dostęp do agregatów cudzych połowów TYLKO przez RPC (security definer)
-- i tylko dla członków tablicy. Połowy per-user pozostają prywatne (RLS).
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists public.catch_boards (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.catch_board_members (
  board_id   uuid not null references public.catch_boards(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  primary key (board_id, email)
);

alter table public.catch_boards enable row level security;
alter table public.catch_board_members enable row level security;
grant select, insert, update, delete on public.catch_boards to authenticated;
grant select, insert, update, delete on public.catch_board_members to authenticated;

-- RLS: właściciel zarządza swoimi tablicami i ich członkami (resztę robią RPC definer)
drop policy if exists "board owner all" on public.catch_boards;
create policy "board owner all" on public.catch_boards for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "board members owner all" on public.catch_board_members;
create policy "board members owner all" on public.catch_board_members for all to authenticated
  using (exists (select 1 from public.catch_boards b where b.id = board_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.catch_boards b where b.id = board_id and b.owner_id = auth.uid()));

-- Lista tablic wędkarza (własne + te, w których jest członkiem po e-mailu)
create or replace function public.my_catch_boards()
returns table (id uuid, name text, is_owner boolean, member_count int, created_at timestamptz)
language sql security definer set search_path = public as $$
  select b.id, b.name, b.owner_id = auth.uid() as is_owner,
         (select count(*) from public.catch_board_members m where m.board_id = b.id)::int + 1 as member_count,
         b.created_at
  from public.catch_boards b
  where b.owner_id = auth.uid()
     or exists (select 1 from public.catch_board_members m
                where m.board_id = b.id and m.email = lower(coalesce(auth.jwt() ->> 'email', '')))
  order by b.created_at desc;
$$;

-- Dodanie kolegi do tablicy (po e-mailu istniejącego konta) — tylko właściciel
create or replace function public.board_add_member(p_board uuid, p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_norm text := lower(trim(p_email)); v_exists boolean;
begin
  select owner_id into v_owner from public.catch_boards where id = p_board;
  if v_owner is null then return 'not_found'; end if;
  if v_owner <> auth.uid() then return 'forbidden'; end if;
  if v_norm = lower(coalesce(auth.jwt() ->> 'email', '')) then return 'self'; end if;
  if exists (select 1 from public.catch_board_members where board_id = p_board and email = v_norm) then return 'already'; end if;
  select exists (select 1 from auth.users where lower(email) = v_norm) into v_exists;
  if not v_exists then return 'no_account'; end if;
  insert into public.catch_board_members (board_id, email) values (p_board, v_norm);
  return 'ok';
end $$;

-- Ranking tablicy: per osoba (właściciel + członkowie z kontem) liczba połowów, suma kg, big fish
create or replace function public.board_leaderboard(p_board uuid)
returns table (angler text, is_you boolean, catch_count int, total_kg numeric, big_species text, big_weight numeric)
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  select owner_id into v_owner from public.catch_boards where id = p_board;
  if v_owner is null then return; end if;
  -- tylko właściciel lub członek widzi ranking
  if v_owner <> auth.uid()
     and not exists (select 1 from public.catch_board_members where board_id = p_board and email = v_email)
  then return; end if;

  return query
  with people as (
    select v_owner as uid
    union
    select u.id from public.catch_board_members m join auth.users u on lower(u.email) = m.email
    where m.board_id = p_board
  )
  select coalesce(pr.name, 'Wędkarz') as angler,
         p.uid = auth.uid() as is_you,
         count(c.id)::int as catch_count,
         coalesce(sum(c.weight), 0) as total_kg,
         (select c2.species from public.catch_reports c2 where c2.user_id = p.uid and c2.weight is not null order by c2.weight desc limit 1) as big_species,
         (select max(c2.weight) from public.catch_reports c2 where c2.user_id = p.uid) as big_weight
  from people p
  left join public.catch_reports c on c.user_id = p.uid
  left join public.profiles pr on pr.id = p.uid
  group by p.uid, pr.name
  order by total_kg desc, catch_count desc;
end $$;

revoke all on function public.my_catch_boards() from public, anon;
revoke all on function public.board_add_member(uuid, text) from public, anon;
revoke all on function public.board_leaderboard(uuid) from public, anon;
grant execute on function public.my_catch_boards() to authenticated;
grant execute on function public.board_add_member(uuid, text) to authenticated;
grant execute on function public.board_leaderboard(uuid) to authenticated;

notify pgrst, 'reload schema';
