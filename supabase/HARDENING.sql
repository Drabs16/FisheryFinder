-- ============================================================================
--  Fishery Finder — opcjonalne utwardzenie bezpieczeństwa (z Supabase advisors)
--  Uruchom w SQL Editor PO przejrzeniu. Bezpieczne dla obecnego frontendu.
-- ============================================================================

-- 1) Funkcje-triggery NIE powinny być wołalne jako RPC przez nikogo.
--    (Działają automatycznie przy zmianach w tabelach; bezpośrednie wywołanie = ryzyko.)
revoke execute on function public.handle_new_user()      from anon, authenticated, public;
revoke execute on function public.sync_fishery_fish()    from anon, authenticated, public;
revoke execute on function public.sync_fishery_rating()  from anon, authenticated, public;
revoke execute on function public.sync_fishery_record()  from anon, authenticated, public;

-- 2) Funkcje zapisujące właściciela — niedostępne dla NIEzalogowanych (anon).
--    Zalogowani (panel) zachowują dostęp; funkcje i tak sprawdzają auth.uid() w środku.
revoke execute on function public.owner_save_fishery(
  text,text,text,text,text,double precision,double precision,integer,integer,
  text[],text[],text[],text[],jsonb,text,text,text,boolean,text,text,text,numeric,jsonb
) from anon;
revoke execute on function public.owner_block_spots(text,integer[],date,date,text) from anon;
revoke execute on function public.owner_claim_fishery(text) from anon;
revoke execute on function public.owner_create_reservation(
  text,text,text,integer[],date,date,integer,text,boolean
) from anon;

-- Uwaga: fishery_occupancy / fishery_taken_counts / is_fishery_owner zostawiamy dostępne
-- dla anon — publiczna strona pokazuje dzięki nim dostępność bez logowania.

-- 3) (Ręcznie, w panelu) Auth → Providers → Email → włącz „Leaked password protection"
--    (sprawdzanie haseł w HaveIBeenPwned). To przełącznik, nie SQL.

-- 4) (Opcjonalnie, wydajność „na skalę" — nie blokuje launchu)
--    Drobne lity: zduplikowany indeks na reviews, brak indeksów na FK, RLS auth.uid()
--    bez (select ...). Do zrobienia później; przy obecnym ruchu bez znaczenia.
