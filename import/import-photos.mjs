// =====================================================================
// Import zdjęć łowisk z lokalnych folderów do Supabase Storage
// (bucket 'fishery-photos') + wpięcie ich w tabelę public.fishery_photos.
//
// Układ plików na dysku:
//   import/photos/<folder>/<pliki .jpg/.jpeg/.png/.webp>
// gdzie <folder> to ALBO id łowiska, ALBO slug jego nazwy
//   (np. "Oczko Lachowskie" -> folder "oczko-lachowskie").
//
// Zdjęcia trafiają do Storage pod ścieżką:  <fishery_id>/0.jpg, 1.jpg, ...
// (kolejność = porządek alfabetyczny nazw plików w folderze).
//
// Idempotentny: dla danego łowiska najpierw KASUJE stare pliki w Storage
// i stare wiersze w fishery_photos, potem wgrywa od nowa — można puszczać
// wielokrotnie bez duplikatów.
//
// Użycie (z katalogu projektu):
//   SUPABASE_SERVICE_KEY="eyJ..." node import/import-photos.mjs
//        -> przetwarza WSZYSTKIE foldery w import/photos/
//   SUPABASE_SERVICE_KEY="eyJ..." node import/import-photos.mjs oczko-lachowskie
//        -> tylko podany folder (można podać kilka)
//
// Service key: Supabase → Project Settings → API → service_role (sekret!).
// =====================================================================
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const SUPABASE_URL = 'https://xiwiaiuiwpgxattrxknn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'fishery-photos';

if (!SERVICE_KEY) {
  console.error('Brak SUPABASE_SERVICE_KEY w środowisku. Uruchom:\n  SUPABASE_SERVICE_KEY="..." node import/import-photos.mjs [folder...]');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = join(__dirname, 'photos');

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const isImage = (f) => Object.prototype.hasOwnProperty.call(MIME, extname(f).toLowerCase());

// Slug: małe litery, polskie znaki -> ASCII, reszta -> myślniki.
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l').replace(/ø/g, 'o')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // zdejmij diakrytyki (ó,ą,ę,ś,ć,ż,ź,ń...)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1. Upewnij się, że bucket istnieje i jest publiczny.
{
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: '15MB' });
  if (error && !/already exists/i.test(error.message)) {
    console.error('Bucket error:', error.message);
    process.exit(1);
  }
}

// 2. Wczytaj łowiska do mapowania folder -> id (po id ALBO po slugu nazwy).
const { data: fisheries, error: fErr } = await supabase.from('fisheries').select('id, name');
if (fErr) { console.error('Nie udało się pobrać łowisk:', fErr.message); process.exit(1); }

const byId = new Map(fisheries.map((f) => [String(f.id), f]));
const bySlug = new Map();
for (const f of fisheries) {
  const slug = slugify(f.name);
  if (!bySlug.has(slug)) bySlug.set(slug, f); // pierwsze wygrywa; kolizje raportujemy niżej
}

function resolveFishery(folder) {
  if (byId.has(folder)) return byId.get(folder);
  const slug = slugify(folder);
  if (bySlug.has(slug)) return bySlug.get(slug);
  return null;
}

// 3. Ustal listę folderów do przetworzenia.
let folders;
const argFolders = process.argv.slice(2);
if (argFolders.length) {
  folders = argFolders;
} else {
  let entries;
  try {
    entries = await readdir(PHOTOS_DIR, { withFileTypes: true });
  } catch {
    console.error(`Brak folderu ${PHOTOS_DIR}. Utwórz import/photos/<folder>/ ze zdjęciami.`);
    process.exit(1);
  }
  folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

if (!folders.length) {
  console.error('Brak folderów ze zdjęciami w import/photos/.');
  process.exit(1);
}

// 4. Przetwarzaj kolejne łowiska.
let ok = 0, skipped = 0;
for (const folder of folders) {
  const fishery = resolveFishery(folder);
  if (!fishery) {
    console.warn(`✗ ${folder}: nie znaleziono łowiska o id/nazwie pasującej do folderu — pomijam.`);
    skipped++;
    continue;
  }
  const id = String(fishery.id);
  const dir = join(PHOTOS_DIR, folder);

  let files;
  try {
    files = (await readdir(dir)).filter(isImage).sort((a, b) => a.localeCompare(b, 'pl', { numeric: true }));
  } catch {
    console.warn(`✗ ${folder}: nie mogę odczytać folderu — pomijam.`);
    skipped++;
    continue;
  }
  if (!files.length) {
    console.warn(`✗ ${folder} (${fishery.name}): brak plików graficznych — pomijam.`);
    skipped++;
    continue;
  }

  // 4a. Wyczyść poprzedni stan tego łowiska (idempotencja).
  const { data: oldObjs } = await supabase.storage.from(BUCKET).list(id, { limit: 1000 });
  if (oldObjs?.length) {
    await supabase.storage.from(BUCKET).remove(oldObjs.map((o) => `${id}/${o.name}`));
  }
  await supabase.from('fishery_photos').delete().eq('fishery_id', id);

  // 4b. Wgraj pliki i zbierz wiersze.
  const rows = [];
  for (let i = 0; i < files.length; i++) {
    const ext = extname(files[i]).toLowerCase();
    const key = `${id}/${i}${ext}`;
    const bytes = await readFile(join(dir, files[i]));
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, bytes, { contentType: MIME[ext], upsert: true });
    if (upErr) {
      console.error(`  ✗ ${files[i]}: ${upErr.message}`);
      continue;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
    rows.push({ fishery_id: id, url: data.publicUrl, sort_order: i });
  }

  if (!rows.length) {
    console.warn(`✗ ${folder} (${fishery.name}): nic nie wgrano.`);
    skipped++;
    continue;
  }

  // 4c. Wpnij wiersze + ustaw image_url na pierwsze zdjęcie.
  const { error: insErr } = await supabase.from('fishery_photos').insert(rows);
  if (insErr) { console.error(`✗ ${folder}: insert fishery_photos: ${insErr.message}`); skipped++; continue; }
  await supabase.from('fisheries').update({ image_url: rows[0].url }).eq('id', id);

  console.log(`✓ ${fishery.name} (${id}) — ${rows.length} zdjęć`);
  ok++;
}

console.log(`\nGotowe. Łowisk z wgranymi zdjęciami: ${ok}, pominiętych: ${skipped}.`);
