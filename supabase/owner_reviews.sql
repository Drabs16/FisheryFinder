-- Moderacja opinii przez właściciela łowiska (ukryj/pokaż).
-- Właściciel widzi WSZYSTKIE opinie na swoich łowiskach (też ukryte) i może je
-- ukrywać/odkrywać. Web/apka i tak filtrują hidden=false (opinia znika z publicznych).
create or replace function public.owner_list_reviews(p_fishery text default null)
returns table (id bigint, fishery_id text, fishery_name text, author_name text, rating int, comment text, visited_on date, created_at timestamptz, hidden boolean)
language sql security definer set search_path = public as $$
  select r.id, r.fishery_id, f.name, r.author_name, r.rating, r.comment, r.visited_on, r.created_at, r.hidden
  from public.reviews r
  join public.fisheries f on f.id = r.fishery_id
  where f.owner_id = auth.uid()
    and (p_fishery is null or r.fishery_id = p_fishery)
  order by r.created_at desc;
$$;

create or replace function public.owner_set_review_hidden(p_id bigint, p_hidden boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.reviews r set hidden = p_hidden
  from public.fisheries f
  where r.id = p_id and f.id = r.fishery_id and f.owner_id = auth.uid();
  if not found then raise exception 'Brak uprawnień do tej opinii'; end if;
end $$;

revoke all on function public.owner_list_reviews(text) from public, anon;
revoke all on function public.owner_set_review_hidden(bigint, boolean) from public, anon;
grant execute on function public.owner_list_reviews(text) to authenticated;
grant execute on function public.owner_set_review_hidden(bigint, boolean) to authenticated;

notify pgrst, 'reload schema';
