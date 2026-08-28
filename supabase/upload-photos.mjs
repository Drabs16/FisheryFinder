// =====================================================================
// Wgrywa zdjęcia łowisk z assets/ do bucketu Storage 'fishery-photos'.
// Wymaga SERVICE ROLE key (NIE anon) — ma uprawnienia do zapisu.
//
// Użycie (z katalogu projektu):
//   SUPABASE_SERVICE_KEY="eyJ..." node supabase/upload-photos.mjs
//
// Service key znajdziesz w: Supabase → Project Settings → API → service_role.
// =====================================================================
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SUPABASE_URL = 'https://xiwiaiuiwpgxattrxknn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'fishery-photos';

if (!SERVICE_KEY) {
  console.error('Brak SUPABASE_SERVICE_KEY. Uruchom:\n  SUPABASE_SERVICE_KEY="..." node supabase/upload-photos.mjs');
  process.exit(1);
}

const FILES = [
  { name: 'lowisko-nieznanowice_9ae51e0f.jpg', type: 'image/jpeg' },
  { name: '15.png', type: 'image/png' },
  { name: 'lowisko-borowa-014.jpg', type: 'image/jpeg' },
  { name: 'niedamowo-3.jpg', type: 'image/jpeg' },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// 1. Utwórz publiczny bucket (jeśli nie istnieje)
const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
  public: true,
  fileSizeLimit: '10MB',
});
if (bucketErr && !/already exists/i.test(bucketErr.message)) {
  console.error('Bucket error:', bucketErr.message);
  process.exit(1);
}
console.log(`Bucket '${BUCKET}' gotowy (publiczny).`);

// 2. Wgraj pliki
for (const f of FILES) {
  const bytes = await readFile(join(assetsDir, f.name));
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(f.name, bytes, { contentType: f.type, upsert: true });
  if (error) {
    console.error(`✗ ${f.name}: ${error.message}`);
  } else {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(f.name);
    console.log(`✓ ${f.name} → ${data.publicUrl}`);
  }
}
console.log('Gotowe.');
