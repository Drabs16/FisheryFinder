import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://xiwiaiuiwpgxattrxknn.supabase.co',
  'sb_publishable_EF1hUi3692bSDvc0Sh6N5Q_ZECpr8eH'
);
const tables = ['fisheries','fishery_photos','fishery_spots','fish_species','amenities','reviews','reservations','favorites'];
for (const t of tables) {
  const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
  if (error) console.log(`X ${t}: ${error.message}`);
  else console.log(`OK ${t}: ${count} wierszy`);
}
const { error: rpcErr } = await supabase.rpc('fishery_occupancy', { p_fishery: '1', p_from: '2026-06-01', p_to: '2026-06-30' });
console.log(rpcErr ? `X fishery_occupancy(): ${rpcErr.message}` : 'OK fishery_occupancy() dziala');
