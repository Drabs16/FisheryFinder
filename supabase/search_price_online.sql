-- Rozszerzenie wyszukiwarki łowisk o: filtr ceny (od/do), filtr "tylko online" (premium)
-- oraz funkcję liczenia wyników (licznik na żywo w pasku filtrów).
-- Semantyka ceny: price_from = 0 oznacza "Cena na miejscu" (nieznana) — przy aktywnym
-- filtrze ceny takie łowiska są pomijane (liczą się tylko realne ceny > 0).

-- Stary podpis trzeba usunąć, bo dokładamy parametry (inaczej powstałby drugi overload
-- i wywołania z nazwanymi argumentami byłyby niejednoznaczne).
drop function if exists public.search_fisheries(
  text, text[], text[], text[], boolean, text, double precision, double precision, integer, integer
);

create or replace function public.search_fisheries(
  p_search text default ''::text,
  p_types text[] default '{}'::text[],
  p_fish text[] default '{}'::text[],
  p_provinces text[] default '{}'::text[],
  p_nokill boolean default false,
  p_sort text default 'distance'::text,
  p_lat double precision default null::double precision,
  p_lng double precision default null::double precision,
  p_limit integer default 20,
  p_offset integer default 0,
  p_min_price integer default null::integer,
  p_max_price integer default null::integer,
  p_online_only boolean default false
)
returns table(id text)
language sql
stable
set search_path to 'public'
as $function$
  select f.id
  from public.fisheries f
  where (coalesce(p_search,'') = '' or f.name ilike '%'||p_search||'%' or f.city ilike '%'||p_search||'%')
    and (coalesce(array_length(p_types,1),0) = 0 or f.types && p_types)
    and (coalesce(array_length(p_fish,1),0)  = 0 or f.fish  && p_fish)
    and (coalesce(array_length(p_provinces,1),0) = 0 or f.province = any(p_provinces))
    and (not p_nokill or f.nokill)
    and (not p_online_only or f.premium)
    and (p_min_price is null or (f.price_from is not null and f.price_from > 0 and f.price_from >= p_min_price))
    and (p_max_price is null or (f.price_from is not null and f.price_from > 0 and f.price_from <= p_max_price))
  order by
    (case when p_sort='price'  then f.price_from end) asc nulls last,
    (case when p_sort='rating' then f.rating end) desc nulls last,
    (case when p_sort='record' then f.record_weight end) desc nulls last,
    (case when p_sort='distance' and p_lat is not null then
       6371 * acos(least(1, greatest(-1,
         cos(radians(p_lat))*cos(radians(f.latitude))*cos(radians(f.longitude)-radians(p_lng))
         + sin(radians(p_lat))*sin(radians(f.latitude))
       )))
     end) asc nulls last,
    f.id asc
  limit greatest(1, p_limit) offset greatest(0, p_offset);
$function$;

grant execute on function public.search_fisheries(
  text, text[], text[], text[], boolean, text, double precision, double precision, integer, integer, integer, integer, boolean
) to anon, authenticated, service_role;

-- Licznik wyników dla bieżących filtrów (bez sortowania / stronicowania).
create or replace function public.count_fisheries(
  p_search text default ''::text,
  p_types text[] default '{}'::text[],
  p_fish text[] default '{}'::text[],
  p_provinces text[] default '{}'::text[],
  p_nokill boolean default false,
  p_min_price integer default null::integer,
  p_max_price integer default null::integer,
  p_online_only boolean default false
)
returns integer
language sql
stable
set search_path to 'public'
as $function$
  select count(*)::int
  from public.fisheries f
  where (coalesce(p_search,'') = '' or f.name ilike '%'||p_search||'%' or f.city ilike '%'||p_search||'%')
    and (coalesce(array_length(p_types,1),0) = 0 or f.types && p_types)
    and (coalesce(array_length(p_fish,1),0)  = 0 or f.fish  && p_fish)
    and (coalesce(array_length(p_provinces,1),0) = 0 or f.province = any(p_provinces))
    and (not p_nokill or f.nokill)
    and (not p_online_only or f.premium)
    and (p_min_price is null or (f.price_from is not null and f.price_from > 0 and f.price_from >= p_min_price))
    and (p_max_price is null or (f.price_from is not null and f.price_from > 0 and f.price_from <= p_max_price));
$function$;

grant execute on function public.count_fisheries(
  text, text[], text[], text[], boolean, integer, integer, boolean
) to anon, authenticated, service_role;
