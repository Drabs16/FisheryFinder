-- ============================================================
-- Tablice rywalizacji: flow zaproszeń (pending → accepted)
-- Kolega dodany przez właściciela jest 'pending' i NIE liczy się
-- w rankingu, dopóki nie zaakceptuje. Akceptacja/odrzucenie przez RPC.
-- ============================================================
alter table public.catch_board_members
  add column if not exists status text not null default 'pending';

-- Dodanie kolegi = ZAPROSZENIE (pending)
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
  insert into public.catch_board_members (board_id, email, status) values (p_board, v_norm, 'pending');
  return 'ok';
end $$;

-- Moje tablice = własne + te, do których DOŁĄCZYŁEM (accepted)
create or replace function public.my_catch_boards()
returns table (id uuid, name text, is_owner boolean, member_count int, created_at timestamptz)
language sql security definer set search_path = public as $$
  select b.id, b.name, b.owner_id = auth.uid() as is_owner,
         (select count(*) from public.catch_board_members m where m.board_id = b.id and m.status = 'accepted')::int + 1 as member_count,
         b.created_at
  from public.catch_boards b
  where b.owner_id = auth.uid()
     or exists (select 1 from public.catch_board_members m
                where m.board_id = b.id and m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.status = 'accepted')
  order by b.created_at desc;
$$;

-- Ranking liczy właściciela + TYLKO zaakceptowanych członków
create or replace function public.board_leaderboard(p_board uuid)
returns table (angler text, is_you boolean, catch_count int, total_kg numeric, big_species text, big_weight numeric)
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  select owner_id into v_owner from public.catch_boards where id = p_board;
  if v_owner is null then return; end if;
  if v_owner <> auth.uid()
     and not exists (select 1 from public.catch_board_members where board_id = p_board and email = v_email and status = 'accepted')
  then return; end if;

  return query
  with people as (
    select v_owner as uid
    union
    select u.id from public.catch_board_members m join auth.users u on lower(u.email) = m.email
    where m.board_id = p_board and m.status = 'accepted'
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

-- Moje oczekujące zaproszenia
create or replace function public.pending_board_invites()
returns table (id uuid, name text, owner_name text, member_count int)
language sql security definer set search_path = public as $$
  select b.id, b.name, coalesce(pr.name, 'Wędkarz') as owner_name,
         (select count(*) from public.catch_board_members m2 where m2.board_id = b.id and m2.status = 'accepted')::int + 1
  from public.catch_board_members m
  join public.catch_boards b on b.id = m.board_id
  left join public.profiles pr on pr.id = b.owner_id
  where m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.status = 'pending'
  order by b.created_at desc;
$$;

-- Akceptacja / odrzucenie zaproszenia
create or replace function public.respond_board_invite(p_board uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if not exists (select 1 from public.catch_board_members where board_id = p_board and email = v_email and status = 'pending') then
    return 'not_found';
  end if;
  if p_accept then
    update public.catch_board_members set status = 'accepted' where board_id = p_board and email = v_email;
  else
    delete from public.catch_board_members where board_id = p_board and email = v_email;
  end if;
  return 'ok';
end $$;

revoke all on function public.pending_board_invites() from public, anon;
revoke all on function public.respond_board_invite(uuid, boolean) from public, anon;
grant execute on function public.pending_board_invites() to authenticated;
grant execute on function public.respond_board_invite(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
