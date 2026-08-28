// =====================================================================
// Import łowisk z arkusza (CSV) do bazy Supabase.
// Czyta plik CSV wyeksportowany z „szablon-lowiska.xlsx" i dla każdego
// wiersza woła funkcję add_fishery() (rozkłada dane do wszystkich tabel:
// łowisko, typ, ryby, udogodnienia, zdjęcia, stanowiska, rekordy, kontakt).
// ID łowisk nadaje automatycznie.
//
// Użycie (z katalogu projektu):
//   SUPABASE_SERVICE_KEY="eyJ..." node import/import-lowiska.mjs sciezka/do/lowiska.csv
//
// Service key: Supabase → Project Settings → API → service_role (sekret!).
// =====================================================================
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const SUPABASE_URL = 'https://xiwiaiuiwpgxattrxknn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const csvPath = process.argv[2];

if (!SERVICE_KEY) { console.error('Brak SUPABASE_SERVICE_KEY w środowisku.'); process.exit(1); }
if (!csvPath)     { console.error('Podaj ścieżkę do pliku CSV. Przykład:\n  SUPABASE_SERVICE_KEY="..." node import/import-lowiska.mjs lowiska.csv'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// --- parser CSV (RFC4180: cudzysłowy, przecinki, nowe linie) ---
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = []; let field = ''; let i = 0; let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQuotes = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const list = (s) => (s ?? '').split(';').map((x) => x.trim()).filter(Boolean);
const num  = (s) => { const v = parseFloat(String(s ?? '').replace(',', '.')); return Number.isFinite(v) ? v : null; };
const int  = (s) => { const v = parseInt(String(s ?? '').replace(/[^0-9-]/g, ''), 10); return Number.isFinite(v) ? v : null; };
const yes  = (s) => /^(tak|yes|true|1)$/i.test(String(s ?? '').trim());
// "Karp:24; Szczupak:11" -> [{species,weight}]
const records = (s) =>
  list(s).map((part) => {
    const [sp, w] = part.split(':');
    const weight = num(w);
    return sp && weight != null ? { species: sp.trim(), weight } : null;
  }).filter(Boolean);

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
if (rows.length < 2) { console.error('Plik nie zawiera danych.'); process.exit(1); }

// Kolejność kolumn zgodna z szablonem; pomijamy nagłówek i wiersz PRZYKŁAD
const dataRows = rows.slice(1).filter((r) => {
  const name = (r[0] ?? '').trim();
  return name && !/^PRZYKŁAD/i.test(name);
});

const { data: existing, error: exErr } = await supabase.from('fisheries').select('id');
if (exErr) { console.error('Błąd odczytu istniejących łowisk:', exErr.message); process.exit(1); }
let nextId = existing.reduce((m, r) => Math.max(m, parseInt(r.id, 10) || 0), 0) + 1;

let ok = 0; const errors = [];
for (const r of dataRows) {
  const id = String(nextId++);
  const params = {
    p_id: id,
    p_name: (r[0] ?? '').trim(),
    p_location: (r[1] ?? '').trim(),
    p_city: (r[2] ?? '').trim(),
    p_province: (r[3] ?? '').trim(),
    p_lat: num(r[4]),
    p_lng: num(r[5]),
    p_price_from: int(r[6]) ?? 0,
    p_total_spots: int(r[7]) ?? 0,
    p_types: list(r[8]),
    p_fish: list(r[9]),
    p_amenities: list(r[10]),
    p_description: (r[11] ?? '').trim(),
    p_rules: (r[12] ?? '').trim(),
    p_open_hours: (r[13] ?? '').trim(),
    p_nokill: yes(r[14]),
    p_records: records(r[15]),
    p_phone: (r[16] ?? '').trim() || null,
    p_email: (r[17] ?? '').trim() || null,
    p_website: (r[18] ?? '').trim() || null,
    p_area_ha: num(r[19]),
    p_photos: list(r[20]),
  };
  if (!params.p_name || params.p_lat === null || params.p_lng === null) {
    errors.push(`Pominięto „${params.p_name || '(brak nazwy)'}": brak nazwy lub współrzędnych.`);
    nextId--;
    continue;
  }
  const { error } = await supabase.rpc('add_fishery', params);
  if (error) errors.push(`„${params.p_name}": ${error.message}`);
  else { ok++; console.log(`✓ [${id}] ${params.p_name}`); }
}

console.log(`\nGotowe. Dodano/zaktualizowano: ${ok}. Błędów: ${errors.length}.`);
if (errors.length) console.log('Szczegóły:\n- ' + errors.join('\n- '));
