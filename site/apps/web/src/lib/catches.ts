import { supabase } from './supabase';

export interface CatchInput {
  fisheryId: string;
  species: string;
  weight?: number | null;
  lengthCm?: number | null;
  spotNumber?: number | null;
  caughtOn: string;       // YYYY-MM-DD
  note?: string;
  file?: File | null;
}

export interface CatchReport {
  id: string;
  fisheryId: string;
  fisheryName: string;
  fisheryCity: string;
  species: string;
  weight: number | null;
  lengthCm: number | null;
  spotNumber: number | null;
  photoUrl: string | null;
  caughtOn: string;
  note: string | null;
  createdAt: string;
}

// Upload zdjęcia do istniejącego bucketa `fishery-photos` (ścieżka per-uid spełnia obecne RLS).
async function uploadCatchPhoto(uid: string, fisheryId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${uid}/catches/${fisheryId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('fishery-photos').upload(path, file, { upsert: false });
  if (error) throw error;
  return supabase.storage.from('fishery-photos').getPublicUrl(path).data.publicUrl;
}

export async function addCatch(input: CatchInput): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error('Musisz być zalogowany, aby dodać połów.');

  let photoUrl: string | null = null;
  if (input.file) photoUrl = await uploadCatchPhoto(uid, input.fisheryId, input.file);

  const { error } = await supabase.from('catch_reports').insert({
    fishery_id: input.fisheryId,
    user_id: uid,
    species: input.species,
    weight: input.weight ?? null,
    length_cm: input.lengthCm ?? null,
    spot_number: input.spotNumber ?? null,
    photo_url: photoUrl,
    caught_on: input.caughtOn,
    note: input.note?.trim() || null,
  });
  if (error) throw error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): CatchReport {
  const f = r.fisheries ?? {};
  return {
    id: r.id, fisheryId: r.fishery_id, fisheryName: f.name ?? 'Łowisko', fisheryCity: f.city ?? '',
    species: r.species, weight: r.weight != null ? Number(r.weight) : null,
    lengthCm: r.length_cm ?? null, spotNumber: r.spot_number ?? null,
    photoUrl: r.photo_url ?? null, caughtOn: r.caught_on, note: r.note ?? null, createdAt: r.created_at,
  };
}

const SELECT = 'id, fishery_id, species, weight, length_cm, spot_number, photo_url, caught_on, note, created_at, fisheries(name, city)';

// Dziennik połowów zalogowanego wędkarza.
// UWAGA: RLS ma też politykę „catch read public (hidden=false)" dla galerii na stronie łowiska,
// więc SAMO RLS NIE ogranicza do własnych — musimy jawnie filtrować po user_id.
export async function myCatches(): Promise<CatchReport[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('catch_reports').select(SELECT)
    .eq('user_id', user.id)
    .order('caught_on', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// Połowy na danym łowisku (do galerii / panelu — krok 2). Bez ukrytych.
export async function fisheryCatches(fisheryId: string, limit = 12): Promise<CatchReport[]> {
  const { data, error } = await supabase.from('catch_reports').select(SELECT)
    .eq('fishery_id', fisheryId).eq('hidden', false)
    .order('caught_on', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function deleteCatch(id: string): Promise<void> {
  const { error } = await supabase.from('catch_reports').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Tablice rywalizacji ---------- */
export interface CatchBoard { id: string; name: string; isOwner: boolean; memberCount: number; }
export interface LeaderRow { angler: string; isYou: boolean; catchCount: number; totalKg: number; bigSpecies: string | null; bigWeight: number | null; }
export type BoardAddResult = 'ok' | 'no_account' | 'self' | 'already' | 'forbidden' | 'not_found';

export async function fetchMyBoards(): Promise<CatchBoard[]> {
  const { data, error } = await supabase.rpc('my_catch_boards');
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((b: any) => ({ id: b.id, name: b.name, isOwner: b.is_owner, memberCount: b.member_count }));
}

export async function createBoard(name: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error('Zaloguj się.');
  const { error } = await supabase.from('catch_boards').insert({ owner_id: uid, name: name.trim() });
  if (error) throw error;
}

export async function deleteBoard(id: string): Promise<void> {
  const { error } = await supabase.from('catch_boards').delete().eq('id', id);
  if (error) throw error;
}

export async function addBoardMember(boardId: string, email: string): Promise<BoardAddResult> {
  const { data, error } = await supabase.rpc('board_add_member', { p_board: boardId, p_email: email });
  if (error) throw new Error(error.message);
  return data as BoardAddResult;
}

export async function removeBoardMember(boardId: string, email: string): Promise<void> {
  const { error } = await supabase.from('catch_board_members').delete().eq('board_id', boardId).eq('email', email.toLowerCase());
  if (error) throw error;
}

export interface BoardMember { email: string; status: string; }
export async function fetchBoardMembers(boardId: string): Promise<BoardMember[]> {
  const { data, error } = await supabase.from('catch_board_members').select('email, status').eq('board_id', boardId);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((m: any) => ({ email: m.email, status: m.status }));
}

export interface BoardInvite { id: string; name: string; ownerName: string; memberCount: number; }
export async function fetchPendingInvites(): Promise<BoardInvite[]> {
  const { data, error } = await supabase.rpc('pending_board_invites');
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((b: any) => ({ id: b.id, name: b.name, ownerName: b.owner_name, memberCount: b.member_count }));
}
export async function respondInvite(boardId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_board_invite', { p_board: boardId, p_accept: accept });
  if (error) throw error;
}

export async function fetchLeaderboard(boardId: string): Promise<LeaderRow[]> {
  const { data, error } = await supabase.rpc('board_leaderboard', { p_board: boardId });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({ angler: r.angler, isYou: r.is_you, catchCount: r.catch_count, totalKg: Number(r.total_kg), bigSpecies: r.big_species, bigWeight: r.big_weight != null ? Number(r.big_weight) : null }));
}
