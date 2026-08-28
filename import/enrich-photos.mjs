// =====================================================================
// Rehosting zdjęć łowisk z ZEWNĘTRZNYCH adresów (hotlink) do naszego Storage.
//
// Po wzbogaceniu danych (data enrichment) tabela public.fishery_photos zawiera
// linki do zdjęć na cudzych serwerach (strony łowisk, katalogi). Hotlink bywa
// zawodny: część hostów blokuje gorące linkowanie (np. areafish.com), część
// serwuje po http (mixed-content na produkcji https). Ten skrypt ŚCIĄGA każde
// takie zdjęcie SERWEROWO (z nagłówkiem User-Agent/Referer — omija większość
// blokad hotlink), wgrywa je do bucketu 'fishery-photos' i podmienia adres
// w fishery_photos.url oraz fisheries.image_url na trwały link ze Storage.
//
// Idempotentny: zdjęcia już leżące w naszym Storage są pomijane.
//
// Użycie (z katalogu projektu):
//   SUPABASE_SERVICE_KEY="eyJ..." node import/enrich-photos.mjs
//        -> przetwarza wszystkie łowiska z zewnętrznymi zdjęciami
//   SUPABASE_SERVICE_KEY="eyJ..." node import/enrich-photos.mjs <fishery_id> [...]
//        -> tylko podane łowiska
//
// Service key: Supabase → Project Settings → API → service_role (sekret!).
// =====================================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xiwiaiuiwpgxattrxknn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'fishery-photos';

if (!SERVICE_KEY) {
  console.error('Brak SUPABASE_SERVICE_KEY. Uruchom:\n  SUPABASE_SERVICE_KEY="..." node import/enrich-photos.mjs [fishery_id...]');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const EXT_BY_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'image/gif': '.gif' };
const isOurStorage = (url) => url.includes(`/storage/v1/object/public/${BUCKET}/`);
const extFromUrl = (url) => { const m = url.split('?')[0].match(/\.(jpe?g|png|webp|avif|gif)$/i); return m ? `.${m[1].toLowerCase().replace('jpeg', 'jpg')}` : null; };

// Pobierz bajty zdjęcia, udając przeglądarkę (omija blokady hotlink po Referer/User-Agent).
async function fetchImage(url) {
  let origin = '';
  try { origin = new URL(url).origin; } catch { /* ignore */ }
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/png,image/jpeg,*/*',
      'Referer': origin ? origin + '/' : url,
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (ct && !ct.startsWith('image/')) throw new Error(`nie-obraz (${ct})`);
  const ext = EXT_BY_MIME[ct] || extFromUrl(url) || '.jpg';
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 512) throw new Error('plik zbyt mały (prawdopodobnie placeholder)');
  return { buf, ext, contentType: ct || 'image/jpeg' };
}

// Lista łowisk z zewnętrznymi zdjęciami.
const argIds = process.argv.slice(2);
let q = supabase.from('fishery_photos').select('fishery_id, url, sort_order');
if (argIds.length) q = q.in('fishery_id', argIds);
const { data: photos, error } = await q;
if (error) { console.error('Nie udało się pobrać fishery_photos:', error.message); process.exit(1); }

const byFishery = new Map();
for (const p of photos) {
  if (!byFishery.has(p.fishery_id)) byFishery.set(p.fishery_id, []);
  byFishery.get(p.fishery_id).push(p);
}

let okF = 0, okImg = 0, fail = 0, skipped = 0;
for (const [fisheryId, rows] of byFishery) {
  rows.sort((a, b) => a.sort_order - b.sort_order);
  if (rows.every((r) => isOurStorage(r.url))) { skipped++; continue; }  // już zrehostowane

  // wyczyść stare obiekty Storage tego łowiska (idempotencja)
  const { data: oldObjs } = await supabase.storage.from(BUCKET).list(fisheryId, { limit: 1000 });
  if (oldObjs?.length) await supabase.storage.from(BUCKET).remove(oldObjs.map((o) => `${fisheryId}/${o.name}`));

  const newRows = [];
  for (let i = 0; i < rows.length; i++) {
    const src = rows[i].url;
    try {
      const { buf, ext, contentType } = await fetchImage(src);
      const key = `${fisheryId}/${i}${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, buf, { contentType, upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
      newRows.push({ fishery_id: fisheryId, url: data.publicUrl, sort_order: i });
      okImg++;
    } catch (e) {
      console.warn(`  ✗ ${fisheryId} [${i}] ${src} — ${e.message}`);
      fail++;
    }
  }

  if (!newRows.length) { console.warn(`✗ ${fisheryId}: nie udało się pobrać żadnego zdjęcia.`); continue; }

  await supabase.from('fishery_photos').delete().eq('fishery_id', fisheryId);
  const { error: insErr } = await supabase.from('fishery_photos').insert(newRows);
  if (insErr) { console.error(`✗ ${fisheryId}: insert: ${insErr.message}`); continue; }
  await supabase.from('fisheries').update({ image_url: newRows[0].url }).eq('id', fisheryId);
  console.log(`✓ ${fisheryId} — ${newRows.length} zdjęć w Storage`);
  okF++;
}

console.log(`\nGotowe. Łowisk zrehostowanych: ${okF} (${okImg} zdjęć), pominiętych (już w Storage): ${skipped}, błędów zdjęć: ${fail}.`);
