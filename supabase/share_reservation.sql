-- Udostępnianie rezerwacji koledze posiadającemu konto.
-- DB ma już kolumnę reservations.shared_with (text[] e-maili) + politykę RLS
-- „read own or shared reservations": lower(jwt email) = ANY(shared_with) → obdarowany czyta.
-- Ten RPC dokłada e-mail do tablicy, ale tylko gdy: caller jest właścicielem rezerwacji,
-- konto z tym e-mailem istnieje i to nie jest e-mail wywołującego.
create or replace function public.share_reservation(p_id uuid, p_email text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner uuid;
  v_norm  text := lower(trim(p_email));
  v_exists boolean;
  v_current text[];
begin
  select user_id, coalesce(shared_with, '{}') into v_owner, v_current
    from public.reservations where id = p_id;
  if v_owner is null then return 'not_found'; end if;
  if v_owner <> auth.uid() then return 'forbidden'; end if;
  if v_norm = lower(coalesce(auth.jwt() ->> 'email', '')) then return 'self'; end if;
  if v_norm = any(v_current) then return 'already'; end if;
  select exists(select 1 from auth.users where lower(email) = v_norm) into v_exists;
  if not v_exists then return 'no_account'; end if;
  update public.reservations
    set shared_with = (select array(select distinct e from unnest(v_current || v_norm) e))
    where id = p_id;
  return 'ok';
end
$function$;

grant execute on function public.share_reservation(uuid, text) to authenticated;
