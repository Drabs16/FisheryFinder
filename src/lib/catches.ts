import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export interface CatchInput {
  fisheryId: string;
  species: string;
  weight?: number | null;
  spotNumber?: number | null;
  caughtOn: string;        // YYYY-MM-DD
  note?: string;
  photoBase64?: string | null;
  photoExt?: string;       // 'jpg' | 'png'
}

export interface CatchReport {
  id: string;
  fisheryId: string;
  fisheryName: string;
  species: string;
  weight: number | null;
  spotNumber: number | null;
  photoUrl: string | null;
  caughtOn: string;
  note: string | null;
}

async function uploadPhoto(uid: string, fisheryId: string, base64: string, ext: string): Promise<string> {
  const safeExt = ext === 'png' ? 'png' : 'jpg';
  const path = `${uid}/catches/${fisheryId}/${Date.now()}.${safeExt}`;
  const { error } = await supabase.storage.from('fishery-photos')
    .upload(path, decode(base64), { contentType: safeExt === 'png' ? 'image/png' : 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('fishery-photos').getPublicUrl(path).data.publicUrl;
}

export async function addCatch(input: CatchInput): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error('Musisz być zalogowany, aby dodać połów.');

  let photoUrl: string | null = null;
  if (input.photoBase64) photoUrl = await uploadPhoto(uid, input.fisheryId, input.photoBase64, input.photoExt || 'jpg');

  const { error } = await supabase.from('catch_reports').insert({
    fishery_id: input.fisheryId,
    user_id: uid,
    species: input.species,
    weight: input.weight ?? null,
    spot_number: input.spotNumber ?? null,
    photo_url: photoUrl,
    caught_on: input.caughtOn,
    note: input.note?.trim() || null,
  });
  if (error) throw error;
}

function mapRow(r: any): CatchReport {
  const f = r.fisheries ?? {};
  return {
    id: r.id, fisheryId: r.fishery_id, fisheryName: f.name ?? 'Łowisko', species: r.species,
    weight: r.weight != null ? Number(r.weight) : null, spotNumber: r.spot_number ?? null,
    photoUrl: r.photo_url ?? null, caughtOn: r.caught_on, note: r.note ?? null,
  };
}

const SELECT = 'id, fishery_id, species, weight, spot_number, photo_url, caught_on, note, fisheries(name)';

// Dziennik połowów zalogowanego wędkarza (RLS ogranicza do własnych)
export async function myCatches(): Promise<CatchReport[]> {
  const { data, error } = await supabase.from('catch_reports').select(SELECT)
    .order('caught_on', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function deleteCatch(id: string): Promise<void> {
  const { error } = await supabase.from('catch_reports').delete().eq('id', id);
  if (error) throw error;
}
