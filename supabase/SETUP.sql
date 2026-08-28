-- ============================================================================
--  Fishery Finder — jednorazowy setup bazy do uruchomienia produkcji
--  Projekt Supabase: xiwiaiuiwpgxattrxknn ("FF's Project")
--
--  Co robi:
--   1) RLS Storage — upload zdjęć łowisk z panelu właściciela
--   2) Realtime — powiadomienia „na żywo" w apce wędkarza po potwierdzeniu rezerwacji
--   3) Mapka stanowisk — kolumny pozycji pegów (pos_x/pos_y)
--
--  Jak uruchomić: Supabase Dashboard → SQL Editor → New query → wklej całość → Run.
--  Skrypt jest idempotentny (można odpalić wielokrotnie bez błędów).
-- ============================================================================

-- 1) STORAGE: właściciel może wgrywać/edytować/usuwać zdjęcia w swoim „folderze"
--    (ścieżka z panelu: <auth.uid()>/<fishery_id>/<n>.<ext>). Odczyt jest publiczny
--    (bucket fishery-photos jest public), więc dodajemy tylko polityki zapisu.
drop policy if exists "fishery-photos owner insert" on storage.objects;
drop policy if exists "fishery-photos owner update" on storage.objects;
drop policy if exists "fishery-photos owner delete" on storage.objects;

create policy "fishery-photos owner insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'fishery-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "fishery-photos owner update"
on storage.objects for update to authenticated
using (
  bucket_id = 'fishery-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'fishery-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "fishery-photos owner delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'fishery-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 2) REALTIME: apka wędkarza dostaje zmianę rezerwacji od razu (baner przy otwartej apce).
--    Bez tego feed/plakietka i tak działają (odświeżają się przy powrocie apki).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservations'
  ) then
    alter publication supabase_realtime add table public.reservations;
  end if;
end $$;

-- 3) MAPKA STANOWISK: pozycje pegów na planie łowiska (0..1).
--    Plan/zdjęcie trzymamy w istniejącej kolumnie fisheries.spot_map_url.
alter table public.fishery_spots add column if not exists pos_x real;
alter table public.fishery_spots add column if not exists pos_y real;

-- Gotowe. Pozostaje wdrożyć Edge Function maila (patrz README → Go-live, krok 3).
