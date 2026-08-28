import { supabase } from './supabase';
import type { Fishery, Reservation, FisheryFormValues, AdminFisheryRow, AdminStats, ClaimRequestRow, Subscription, AccountSub } from './types';

// ---------------------------------------------------------------------------
// ŁOWISKA WŁAŚCICIELA
// ---------------------------------------------------------------------------

export async function fetchMyFisheries(ownerId: string): Promise<Fishery[]> {
  const { data, error } = await supabase
    .from('fisheries')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Fishery[];
}

export async function fetchFishery(id: string): Promise<Fishery | null> {
  const { data, error } = await supabase.from('fisheries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Fishery) ?? null;
}

export async function fetchFisheryRelations(id: string) {
  const [amen, recs, phts] = await Promise.all([
    supabase.from('fishery_amenities').select('amenity').eq('fishery_id', id),
    supabase.from('fishery_records').select('species, weight').eq('fishery_id', id),
    supabase.from('fishery_photos').select('url').eq('fishery_id', id).order('sort_order'),
  ]);
  if (amen.error) throw amen.error;
  if (recs.error) throw recs.error;
  if (phts.error) throw phts.error;
  return {
    amenities: (amen.data ?? []).map((r: { amenity: string }) => r.amenity),
    records: (recs.data ?? []).map((r: { species: string; weight: number }) => ({
      species: r.species,
      weight: Number(r.weight),
    })),
    photos: (phts.data ?? []).map((r: { url: string }) => r.url),
  };
}

// Upload zdjęcia łowiska do bucketu Storage (owner-scoped path: <uid>/<fisheryId>/<n>.<ext>).
// Zwraca publiczny URL do zapisania w v.photos. Zdjęcia trzymamy we własnym Storage,
// nie hotlinkujemy obcych adresów (te bywają blokowane / nie są plikami obrazów).
export async function uploadFisheryPhoto(fisheryId: string, file: File): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Brak zalogowanego użytkownika');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${uid}/${fisheryId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('fishery-photos')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  return supabase.storage.from('fishery-photos').getPublicUrl(path).data.publicUrl;
}

// --- Stanowiska (cena/pojemność per stanowisko) ----------------------------
export interface SpotRow {
  spot_number: number;
  pos_x: number | null; // 0..1 względem planu (zostaje w bazie, nieedytowane już ręcznie)
  pos_y: number | null;
  has_power: boolean;
  is_vip: boolean;
  note: string | null;
  capacity: number | null; // ile osób na stanowisku
  price: number | null;    // cena za to konkretne stanowisko (VIP może być drożej)
}
export interface ExtraCost { label: string; price: number }

export async function fetchSpots(fisheryId: string): Promise<SpotRow[]> {
  const { data, error } = await supabase
    .from('fishery_spots')
    .select('spot_number, pos_x, pos_y, has_power, is_vip, note, capacity, price')
    .eq('fishery_id', fisheryId)
    .order('spot_number');
  if (error) throw error;
  return (data ?? []) as SpotRow[];
}

// Zapis atrybutów stanowisk (cena, pojemność, VIP, prąd, notatka). Pozycje na planie zostają nietknięte.
export async function saveSpotAttrs(fisheryId: string, spots: SpotRow[]): Promise<void> {
  const results = await Promise.all(spots.map((s) =>
    supabase.from('fishery_spots')
      .update({ has_power: s.has_power, is_vip: s.is_vip, note: s.note, capacity: s.capacity, price: s.price })
      .eq('fishery_id', fisheryId).eq('spot_number', s.spot_number)));
  const err = results.find((r) => r.error)?.error;
  if (err) throw err;
}

// Koszty dodatkowe (np. wynajem pontonu) — zapis bezpośredni (RLS „owner update fisheries").
export async function saveExtraCosts(fisheryId: string, costs: ExtraCost[]): Promise<void> {
  const clean = costs.filter((c) => c.label.trim() !== '').map((c) => ({ label: c.label.trim(), price: Math.max(0, Math.round(Number(c.price) || 0)) }));
  const { error } = await supabase.from('fisheries').update({ extra_costs: clean }).eq('id', fisheryId);
  if (error) throw error;
}

// Wgrywa plan/zdjęcie łowiska (JPG) i zapisuje URL w fisheries.spot_map_url.
export async function saveLayoutImage(fisheryId: string, file: File): Promise<string> {
  const url = await uploadFisheryPhoto(fisheryId, file);
  const { error } = await supabase.from('fisheries').update({ spot_map_url: url }).eq('id', fisheryId);
  if (error) throw error;
  return url;
}

// Wgrywa mapę batymetryczną (głębokości) i zapisuje URL w fisheries.bathy_map_url.
export async function saveBathyImage(fisheryId: string, file: File): Promise<string> {
  const url = await uploadFisheryPhoto(fisheryId, file);
  const { error } = await supabase.from('fisheries').update({ bathy_map_url: url }).eq('id', fisheryId);
  if (error) throw error;
  return url;
}

function rpcParams(v: FisheryFormValues) {
  return {
    p_id: v.id ?? null,
    p_name: v.name, p_location: v.location, p_city: v.city, p_province: v.province,
    p_lat: v.latitude, p_lng: v.longitude, p_price_from: v.price_from, p_total_spots: v.total_spots,
    p_fish: v.fish, p_amenities: v.amenities, p_types: v.types, p_photos: v.photos, p_records: v.records,
    p_description: v.description, p_rules: v.rules, p_open_hours: v.open_hours, p_nokill: v.nokill,
    p_phone: v.phone || null, p_email: v.email || null, p_website: v.website || null, p_area_ha: v.area_ha,
    p_price_tiers: v.price_tiers ?? [],
    p_price_day: v.price_day, p_price_night: v.price_night, p_price_24h: v.price_24h,
  };
}

export async function saveFishery(v: FisheryFormValues): Promise<string> {
  const { data, error } = await supabase.rpc('owner_save_fishery', rpcParams(v));
  if (error) throw error;
  return data as string;
}

export async function deleteFishery(id: string): Promise<void> {
  const { error } = await supabase.from('fisheries').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// ADMIN (właściciel produktu)
// ---------------------------------------------------------------------------

// Wszystkie łowiska w bazie z e-mailem właściciela (admin).
export async function adminFetchAllFisheries(): Promise<AdminFisheryRow[]> {
  const { data, error } = await supabase.rpc('admin_list_fisheries');
  if (error) throw error;
  return (data ?? []) as AdminFisheryRow[];
}

// Zapis łowiska jako admin (nowe -> owner=admin; plan premium/basic z v.premium).
export async function adminSaveFishery(v: FisheryFormValues): Promise<string> {
  const { data, error } = await supabase.rpc('admin_save_fishery', { ...rpcParams(v), p_premium: v.premium ?? false });
  if (error) throw error;
  return data as string;
}

// Opinie o łowiskach właściciela (do powiadomień). Publiczny odczyt RLS.
export interface OwnerReview { id: number; fishery_id: string; author_name: string | null; rating: number; comment: string | null; created_at: string | null; }
export async function fetchOwnerReviews(fisheryIds: string[]): Promise<OwnerReview[]> {
  if (fisheryIds.length === 0) return [];
  const { data, error } = await supabase.from('reviews')
    .select('id, fishery_id, author_name, rating, comment, created_at')
    .in('fishery_id', fisheryIds).not('hidden', 'is', true)
    .order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return (data ?? []) as OwnerReview[];
}

// Moderacja opinii przez właściciela — widzi WSZYSTKIE (też ukryte) na swoich łowiskach.
export interface OwnerReviewRow { id: number; fishery_id: string; fishery_name: string; author_name: string | null; rating: number; comment: string | null; comment_original: string | null; visited_on: string | null; created_at: string | null; hidden: boolean; }
export async function ownerListReviews(fisheryId?: string): Promise<OwnerReviewRow[]> {
  const { data, error } = await supabase.rpc('owner_list_reviews', { p_fishery: fisheryId ?? null });
  if (error) throw error;
  return (data ?? []) as OwnerReviewRow[];
}
export async function ownerSetReviewHidden(id: number, hidden: boolean): Promise<void> {
  const { error } = await supabase.rpc('owner_set_review_hidden', { p_id: id, p_hidden: hidden });
  if (error) throw error;
}
// Cenzura słów: zapisuje zamaskowaną treść (propaguje na web/apkę), oryginał zachowany.
export async function ownerCensorReview(id: number, comment: string): Promise<void> {
  const { error } = await supabase.rpc('owner_censor_review', { p_id: id, p_comment: comment });
  if (error) throw error;
}
export async function ownerRestoreReviewComment(id: number): Promise<void> {
  const { error } = await supabase.rpc('owner_restore_review_comment', { p_id: id });
  if (error) throw error;
}

// Ranking łowiska — TYLKO pozycja właściciela + rozmiar puli (RODO: zero danych konkurencji).
export interface FisheryRank {
  total: number; total_province: number; province: string;
  rating: { value: number; rank: number | null; ranked: number };
  popularity: { value: number; rank: number; rank_province: number };
}
export async function ownerFisheryRank(fisheryId: string): Promise<FisheryRank> {
  const { data, error } = await supabase.rpc('owner_fishery_rank', { p_fishery: fisheryId });
  if (error) throw error;
  return data as FisheryRank;
}

// Reguły rezerwacji + sezon (osobny RPC — nie rusza wielkiego owner_save_fishery).
export interface FisheryRules {
  season_start: string; season_end: string; check_in_hour: number;
  min_nights: number; max_nights: number | null; lead_days: number;
}
export async function setFisheryRules(id: string, r: FisheryRules): Promise<void> {
  const { error } = await supabase.rpc('owner_set_fishery_rules', {
    p_id: id, p_season_start: r.season_start || null, p_season_end: r.season_end || null,
    p_check_in_hour: r.check_in_hour, p_min_nights: r.min_nights, p_max_nights: r.max_nights, p_lead_days: r.lead_days,
  });
  if (error) throw error;
}

// --- Blokady wędkarzy na łowisku ---
export interface BlockRow { id: string; user_id: string | null; phone: string | null; name: string | null; reason: string | null; created_at: string | null; }
export async function ownerListBlocks(fisheryId: string): Promise<BlockRow[]> {
  const { data, error } = await supabase.rpc('owner_list_blocks', { p_fishery: fisheryId });
  if (error) throw error;
  return (data ?? []) as BlockRow[];
}
export async function ownerBlockUser(fisheryId: string, opts: { userId?: string | null; phone?: string | null; name?: string | null; reason?: string | null }): Promise<void> {
  const { error } = await supabase.rpc('owner_block_user', {
    p_fishery: fisheryId, p_user_id: opts.userId ?? null, p_phone: opts.phone ?? null, p_name: opts.name ?? null, p_reason: opts.reason ?? null,
  });
  if (error) throw error;
}
export async function ownerUnblock(id: string): Promise<void> {
  const { error } = await supabase.rpc('owner_unblock', { p_id: id });
  if (error) throw error;
}

// Generuje kod do przejęcia łowiska przez właściciela.
export async function adminGenerateCode(fisheryId: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_generate_claim_code', { p_fishery: fisheryId });
  if (error) throw error;
  return data as string;
}

// Pełna analityka biznesowa (admin).
export async function adminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('admin_stats');
  if (error) throw error;
  return data as AdminStats;
}

// --- Użytkownicy (admin CRM) ---
export interface OwnerRow {
  user_id: string; email: string | null; name: string | null; business_name: string | null;
  nip: string | null; phone: string | null; created_at: string | null;
  fisheries: { id: string; name: string; plan: string; city: string | null }[];
  plan: string; monthly_total: number;
}
export interface AnglerRow {
  user_id: string; email: string | null; name: string | null; phone: string | null;
  province: string | null; created_at: string | null;
  reservations_count: number; total_spent: number; last_visit: string | null;
}
export interface UserDetail {
  profile: { id: string; name: string | null; email: string | null; phone: string | null;
    business_name: string | null; nip: string | null; province: string | null; city: string | null;
    role: string | null; admin_status: string | null; created_at: string | null } | null;
  is_owner: boolean;
  fisheries: { id: string; name: string; plan: string; premium: boolean; city: string | null; total_spots: number; price_from: number | null }[];
  subscriptions: { id: string; fishery_id: string; fishery_name: string | null; plan: string; billing: string | null;
    amount: number | null; status: string; method: string | null; current_period_end: string | null; created_at: string | null; cancelled_at: string | null }[];
  reservations: { id: string; fishery_name: string | null; spots: number[] | null; date_from: string; date_to: string;
    total: number; status: string; payment: string | null; created_at: string | null }[];
  notes: { id: string; body: string; author_email: string | null; created_at: string | null }[];
}

export async function adminListOwners(): Promise<OwnerRow[]> {
  const { data, error } = await supabase.rpc('admin_list_owners');
  if (error) throw error;
  return (data ?? []) as OwnerRow[];
}
export async function adminListAnglers(): Promise<AnglerRow[]> {
  const { data, error } = await supabase.rpc('admin_list_anglers');
  if (error) throw error;
  return (data ?? []) as AnglerRow[];
}
export async function adminUserDetail(userId: string): Promise<UserDetail> {
  const { data, error } = await supabase.rpc('admin_user_detail', { p_user_id: userId });
  if (error) throw error;
  return data as UserDetail;
}

// --- Notatki + status (admin CRM) ---
export async function adminAddUserNote(userId: string, body: string): Promise<void> {
  const { error } = await supabase.rpc('admin_add_user_note', { p_user_id: userId, p_body: body });
  if (error) throw error;
}
export async function adminDeleteUserNote(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user_note', { p_id: id });
  if (error) throw error;
}
export async function adminSetUserStatus(userId: string, status: string): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_status', { p_user_id: userId, p_status: status });
  if (error) throw error;
}

// --- Moderacja opinii (admin) ---
export interface AdminReviewRow {
  id: number; fishery_id: string; fishery_name: string | null; author_name: string | null;
  rating: number; comment: string | null; visited_on: string | null; created_at: string | null; hidden: boolean;
}
export async function adminListReviews(): Promise<AdminReviewRow[]> {
  const { data, error } = await supabase.rpc('admin_list_reviews');
  if (error) throw error;
  return (data ?? []) as AdminReviewRow[];
}
export async function adminSetReviewHidden(id: number, hidden: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_review_hidden', { p_id: id, p_hidden: hidden });
  if (error) throw error;
}

// --- Rozszerzony pulpit admina ---
export interface DashboardExtra {
  plan_dist: { plan: string; count: number }[];
  top_fisheries: { name: string; revenue: number; reservations: number }[];
}
export async function adminDashboardExtra(): Promise<DashboardExtra> {
  const { data, error } = await supabase.rpc('admin_dashboard_extra');
  if (error) throw error;
  return data as DashboardExtra;
}

// „Wykupienie"/nadanie lub odebranie premium.
export async function adminSetPremium(fisheryId: string, premium: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_premium', { p_fishery: fisheryId, p_premium: premium });
  if (error) throw error;
}

// Odepnij właściciela (z powrotem do katalogu).
export async function adminUnassignOwner(fisheryId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_unassign_owner', { p_fishery: fisheryId });
  if (error) throw error;
}

// Słowniki (do podpowiedzi w formularzu)
export async function fetchDictionaries() {
  const [fish, amen] = await Promise.all([
    supabase.from('fish_species').select('name').order('name'),
    supabase.from('amenities').select('name').order('name'),
  ]);
  return {
    fish: (fish.data ?? []).map((r: { name: string }) => r.name),
    amenities: (amen.data ?? []).map((r: { name: string }) => r.name),
  };
}

// ---------------------------------------------------------------------------
// REZERWACJE
// ---------------------------------------------------------------------------

// Rezerwacje dla łowisk właściciela. Bez fisheryId — dla wszystkich jego łowisk.
export async function fetchReservations(fisheryIds: string[], fisheryId?: string): Promise<Reservation[]> {
  if (fisheryIds.length === 0) return [];
  let q = supabase.from('reservations').select('*');
  q = fisheryId ? q.eq('fishery_id', fisheryId) : q.in('fishery_id', fisheryIds);
  const { data, error } = await q.order('date_from', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Reservation[];
}

export async function cancelReservation(id: string): Promise<void> {
  const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}

export async function confirmReservation(id: string): Promise<void> {
  const { error } = await supabase
    .from('reservations')
    .update({ confirmed_at: new Date().toISOString(), status: 'upcoming' })
    .eq('id', id);
  if (error) throw error;
  // Powiadom wędkarza e-mailem (best-effort — brak/awaria funkcji nie blokuje potwierdzenia).
  try {
    await supabase.functions.invoke('reservation-confirmed', { body: { reservationId: id } });
  } catch (e) {
    console.warn('reservation-confirmed e-mail nie wysłany:', e);
  }
}

export async function createReservation(args: {
  fisheryId: string; name: string; phone: string; spots: number[];
  from: string; to: string; pricePerDay: number; payment: string; confirmed: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('owner_create_reservation', {
    p_fishery: args.fisheryId, p_name: args.name, p_phone: args.phone || null,
    p_spots: args.spots, p_from: args.from, p_to: args.to,
    p_price_per_day: args.pricePerDay, p_payment: args.payment, p_confirmed: args.confirmed,
  });
  if (error) throw error;
}

export async function claimFishery(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('owner_claim_fishery', { p_code: code });
  if (error) throw error;
  return data as string;
}

// --- Profil właściciela (dane biznesowe) ---
export interface OwnerProfile { name: string; business_name: string | null; nip: string | null; phone: string | null; email: string | null; }
export async function fetchProfile(): Promise<OwnerProfile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from('profiles').select('name, business_name, nip, phone, email').eq('id', uid).maybeSingle();
  if (error) throw error;
  return (data as OwnerProfile) ?? null;
}
export async function saveProfile(p: { name: string; business_name: string; nip: string; phone: string }): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Brak zalogowanego użytkownika');
  const { error } = await supabase.from('profiles')
    .update({ name: p.name, business_name: p.business_name || null, nip: p.nip || null, phone: p.phone || null })
    .eq('id', uid);
  if (error) throw error;
}

// --- Wnioski o przejęcie łowiska (weryfikacja) ---
// Wyszukiwarka katalogu (odczyt publiczny) — właściciel znajduje swoje łowisko.
export async function searchCatalog(q: string): Promise<{ id: string; name: string; city: string; owner_id: string | null }[]> {
  const s = q.trim();
  if (!s) return [];
  const { data, error } = await supabase.from('fisheries')
    .select('id, name, city, owner_id').or(`name.ilike.%${s}%,city.ilike.%${s}%`).limit(20);
  if (error) throw error;
  return (data ?? []) as { id: string; name: string; city: string; owner_id: string | null }[];
}
export async function requestFisheryClaim(fisheryId: string, businessName: string, nip: string, phone: string, message: string): Promise<void> {
  const { error } = await supabase.rpc('request_fishery_claim', {
    p_fishery: fisheryId, p_business_name: businessName, p_nip: nip, p_phone: phone, p_message: message,
  });
  if (error) throw error;
}

// Moje wnioski o dostęp do łowiska (status do pokazania właścicielowi).
export interface MyClaimRequest { id: string; fisheryId: string; fisheryName: string; city: string; businessName: string | null; status: string; createdAt: string; }
export async function fetchMyClaimRequests(): Promise<MyClaimRequest[]> {
  const { data, error } = await supabase.from('claim_requests')
    .select('id, fishery_id, business_name, status, created_at').order('created_at', { ascending: false });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map((r) => r.fishery_id))];
  const { data: fs } = await supabase.from('fisheries').select('id, name, city').in('id', ids);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byId = new Map(((fs ?? []) as any[]).map((f) => [f.id, f]));
  return rows.map((r) => ({ id: r.id, fisheryId: r.fishery_id, fisheryName: byId.get(r.fishery_id)?.name ?? 'Łowisko', city: byId.get(r.fishery_id)?.city ?? '', businessName: r.business_name, status: r.status, createdAt: r.created_at }));
}
export async function adminListClaimRequests(): Promise<ClaimRequestRow[]> {
  const { data, error } = await supabase.rpc('admin_list_claim_requests');
  if (error) throw error;
  return (data ?? []) as ClaimRequestRow[];
}
export async function adminReviewClaim(requestId: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_review_claim', { p_request: requestId, p_approve: approve });
  if (error) throw error;
}

// --- Subskrypcja (mock płatności) ---
export async function fetchSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('status', 'active');
  if (error) throw error;
  return (data ?? []) as Subscription[];
}
export async function subscribeFishery(fisheryId: string, plan: 'premium' | 'pro', billing: 'monthly' | 'yearly'): Promise<void> {
  const { error } = await supabase.rpc('subscribe_fishery', { p_fishery: fisheryId, p_plan: plan, p_billing: billing });
  if (error) throw error;
}
export async function adminSetPlan(fisheryId: string, plan: 'basic' | 'premium' | 'pro'): Promise<void> {
  const { error } = await supabase.rpc('admin_set_plan', { p_fishery: fisheryId, p_plan: plan });
  if (error) throw error;
}
export async function cancelSubscription(fisheryId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_subscription', { p_fishery: fisheryId });
  if (error) throw error;
}

// --- Subskrypcja na poziomie KONTA (plan dziedziczą wszystkie łowiska właściciela) ---
export async function fetchAccountSubscription(): Promise<AccountSub | null> {
  const { data, error } = await supabase.rpc('account_subscription');
  if (error) throw error;
  const row = (data ?? [])[0];
  return row ? (row as AccountSub) : null;
}
export async function subscribeAccount(plan: 'premium' | 'pro', billing: 'monthly' | 'yearly'): Promise<void> {
  const { error } = await supabase.rpc('subscribe_account', { p_plan: plan, p_billing: billing });
  if (error) throw error;
}
export async function cancelAccountSubscription(): Promise<void> {
  const { error } = await supabase.rpc('cancel_account_subscription');
  if (error) throw error;
}

export async function blockSpots(
  fisheryId: string, spots: number[], from: string, to: string, label = 'Blokada',
): Promise<void> {
  const { error } = await supabase.rpc('owner_block_spots', {
    p_fishery: fisheryId, p_spots: spots, p_from: from, p_to: to, p_label: label,
  });
  if (error) throw error;
}

export async function removeBlock(id: string): Promise<void> {
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// ANALITYKA (liczona po stronie klienta z rezerwacji)
// ---------------------------------------------------------------------------

const isReal = (r: Reservation) => r.payment !== 'block' && r.status !== 'cancelled';
// Lokalna data YYYY-MM-DD (toISOString przesuwałby dzień w strefach +UTC, np. PL)
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Status rezerwacji: nowa (z aplikacji, do potwierdzenia) → potwierdzona (przez właściciela)
export type StatusKey = 'new' | 'confirmed' | 'block' | 'cancelled';
export function reservationStatus(r: Reservation): StatusKey {
  if (r.status === 'cancelled') return 'cancelled';
  if (r.payment === 'block') return 'block';
  if (r.confirmed_at) return 'confirmed';
  return 'new';
}

// Rodzaj płatności (gotówka vs online/na konto)
export type PayKind = 'cash' | 'online' | 'unknown';
export function paymentKind(r: Reservation): PayKind {
  const p = (r.payment ?? '').toLowerCase();
  if (!p || p === 'block') return 'unknown';
  if (['gotow', 'gotów', 'cash', 'miejsc'].some((k) => p.includes(k))) return 'cash';
  if (['blik', 'online', 'card', 'karta', 'przelew', 'p24', 'konto'].some((k) => p.includes(k))) return 'online';
  return 'unknown';
}

// Obłożenie (% zajętych stanowisk) dla ostatnich N dni
export interface DayOccupancy { day: string; label: string; pct: number; }
export function occupancyLastDays(reservations: Reservation[], fisheries: Fishery[], n = 7): DayOccupancy[] {
  const totalSpots = fisheries.reduce((s, f) => s + (f.total_spots || 0), 0);
  const wd = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  const out: DayOccupancy[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const day = ymd(d);
    let occ = 0;
    for (const r of reservations) {
      if (!isReal(r)) continue;
      if (r.date_from <= day && r.date_to >= day) occ += r.spots?.length ?? 0;
    }
    out.push({ day, label: wd[d.getDay()], pct: totalSpots ? Math.round((occ / totalSpots) * 100) : 0 });
  }
  return out;
}

export interface DashboardStats {
  todayReservations: number;
  todayRevenue: number;
  todayOccupied: number;
  totalSpots: number;
  occupancyPct: number;
  monthRevenue: number;
  monthReservations: number;
  upcoming: number;
}

export function computeDashboard(reservations: Reservation[], fisheries: Fishery[]): DashboardStats {
  const today = ymd(new Date());
  const monthPrefix = today.slice(0, 7);
  const totalSpots = fisheries.reduce((s, f) => s + (f.total_spots || 0), 0);

  let todayReservations = 0, todayRevenue = 0, todayOccupied = 0;
  let monthRevenue = 0, monthReservations = 0, upcoming = 0;

  for (const r of reservations) {
    if (!isReal(r)) continue;
    const coversToday = r.date_from <= today && r.date_to >= today;
    if (coversToday) {
      todayOccupied += r.spots?.length ?? 0;
    }
    if (r.date_from === today) {
      todayReservations += 1;
      todayRevenue += Number(r.total) || 0;
    }
    if (r.date_from.startsWith(monthPrefix)) {
      monthReservations += 1;
      monthRevenue += Number(r.total) || 0;
    }
    if (r.date_from >= today) upcoming += 1;
  }

  return {
    todayReservations, todayRevenue, todayOccupied, totalSpots,
    occupancyPct: totalSpots ? Math.round((todayOccupied / totalSpots) * 100) : 0,
    monthRevenue, monthReservations, upcoming,
  };
}

export interface MonthPoint { month: string; revenue: number; count: number; }

export function revenueByMonth(reservations: Reservation[]): MonthPoint[] {
  const map = new Map<string, MonthPoint>();
  for (const r of reservations) {
    if (!isReal(r)) continue;
    const m = r.date_from.slice(0, 7);
    const cur = map.get(m) ?? { month: m, revenue: 0, count: 0 };
    cur.revenue += Number(r.total) || 0;
    cur.count += 1;
    map.set(m, cur);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

// Podział przychodu: gotówka vs online (na konto)
export interface RevenueSplit { cash: number; online: number; unknown: number; total: number; }
export function revenueSplit(reservations: Reservation[]): RevenueSplit {
  const out: RevenueSplit = { cash: 0, online: 0, unknown: 0, total: 0 };
  for (const r of reservations) {
    if (!isReal(r)) continue;
    const v = Number(r.total) || 0;
    out[paymentKind(r)] += v;
    out.total += v;
  }
  return out;
}

export interface SpotPoint { spot: string; count: number; }

export function topSpots(reservations: Reservation[], limit = 8): SpotPoint[] {
  const map = new Map<number, number>();
  for (const r of reservations) {
    if (!isReal(r)) continue;
    for (const s of r.spots ?? []) map.set(s, (map.get(s) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([spot, count]) => ({ spot: `Nr ${spot}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// --- Rozszerzona analityka (CRM) ---

// Klienci zagregowani z rezerwacji (po imieniu + telefonie)
export interface CustomerRow {
  key: string; name: string; phone: string;
  bookings: number; total: number; spotNights: number; lastVisit: string; online: number; cash: number;
}
export function aggregateCustomers(reservations: Reservation[]): CustomerRow[] {
  const map = new Map<string, CustomerRow>();
  for (const r of reservations) {
    if (!isReal(r)) continue;
    const name = (r.name || 'Wędkarz').trim();
    const phone = (r.phone || '').trim();
    const key = `${name.toLowerCase()}|${phone}`;
    const cur = map.get(key) ?? { key, name, phone, bookings: 0, total: 0, spotNights: 0, lastVisit: '', online: 0, cash: 0 };
    cur.bookings += 1;
    cur.total += Number(r.total) || 0;
    cur.spotNights += (r.spots?.length ?? 0) * (r.days || 1);
    if (r.date_from > cur.lastVisit) cur.lastVisit = r.date_from;
    if (paymentKind(r) === 'online') cur.online += 1; else if (paymentKind(r) === 'cash') cur.cash += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

// Statystyki bazy klientów: ilu łącznie, ilu wraca, nowi miesięcznie i sezonowo.
// „Nowy klient" = miesiąc/sezon jego PIERWSZEJ rezerwacji (najwcześniejsze date_from).
const M_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const SEASONS = ['Wiosna', 'Lato', 'Jesień', 'Zima'] as const;
// mc 0-11 → sezon: zima(12,1,2) wiosna(3,4,5) lato(6,7,8) jesień(9,10,11)
const seasonOf = (m: number) => (m <= 1 || m === 11 ? 'Zima' : m <= 4 ? 'Wiosna' : m <= 7 ? 'Lato' : 'Jesień');

export interface CustomerStats {
  total: number; returning: number; oneTime: number; returningPct: number; avgBookings: number;
  newThisMonth: number; newThisYear: number;
  newByMonth: { ym: string; label: string; count: number }[];
  newBySeason: { season: string; count: number }[];
}
export function customerStats(reservations: Reservation[]): CustomerStats {
  const map = new Map<string, { bookings: number; first: string }>();
  for (const r of reservations) {
    if (!isReal(r)) continue;
    const key = `${(r.name || 'Wędkarz').trim().toLowerCase()}|${(r.phone || '').trim()}`;
    const cur = map.get(key) ?? { bookings: 0, first: r.date_from };
    cur.bookings += 1;
    if (r.date_from < cur.first) cur.first = r.date_from;
    map.set(key, cur);
  }
  const arr = [...map.values()];
  const total = arr.length;
  const returning = arr.filter((c) => c.bookings >= 2).length;
  const totalBookings = arr.reduce((s, c) => s + c.bookings, 0);

  const now = new Date();
  const curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthCount = new Map<string, number>();
  const seasonCount = new Map<string, number>();
  let newThisMonth = 0, newThisYear = 0;
  for (const c of arr) {
    const d = new Date(`${c.first}T12:00:00`);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthCount.set(ym, (monthCount.get(ym) ?? 0) + 1);
    seasonCount.set(seasonOf(d.getMonth()), (seasonCount.get(seasonOf(d.getMonth())) ?? 0) + 1);
    if (ym === curYm) newThisMonth += 1;
    if (d.getFullYear() === now.getFullYear()) newThisYear += 1;
  }
  const newByMonth = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { ym, label: M_SHORT[d.getMonth()], count: monthCount.get(ym) ?? 0 };
  });
  const newBySeason = SEASONS.map((s) => ({ season: s, count: seasonCount.get(s) ?? 0 }));

  return {
    total, returning, oneTime: total - returning,
    returningPct: total ? Math.round((returning / total) * 100) : 0,
    avgBookings: total ? totalBookings / total : 0,
    newThisMonth, newThisYear, newByMonth, newBySeason,
  };
}

// Popyt wg dnia tygodnia (Pn-pierwszy)
export interface WeekdayPoint { day: string; count: number; revenue: number; }
export function demandByWeekday(reservations: Reservation[]): WeekdayPoint[] {
  const wd = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
  const arr = wd.map((day) => ({ day, count: 0, revenue: 0 }));
  for (const r of reservations) {
    if (!isReal(r)) continue;
    const idx = (new Date(`${r.date_from}T12:00:00`).getDay() + 6) % 7;
    arr[idx].count += 1;
    arr[idx].revenue += Number(r.total) || 0;
  }
  return arr;
}

// Średnie wyprzedzenie rezerwacji (dni między utworzeniem a datą wizyty)
export function avgLeadTimeDays(reservations: Reservation[]): number {
  let sum = 0, n = 0;
  for (const r of reservations) {
    if (!isReal(r) || !r.created_at) continue;
    const days = Math.round((new Date(`${r.date_from}T12:00:00`).getTime() - new Date(r.created_at).getTime()) / 86400000);
    if (days >= 0) { sum += days; n += 1; }
  }
  return n ? Math.round(sum / n) : 0;
}

// Goście obecni dziś na łowisku (rezerwacja obejmuje dzisiejszą datę)
export function todayGuests(reservations: Reservation[]): Reservation[] {
  const t = ymd(new Date());
  return reservations
    .filter((r) => isReal(r) && r.date_from <= t && r.date_to >= t)
    .sort((a, b) => (a.fishery_name || '').localeCompare(b.fishery_name || '') || (a.name || '').localeCompare(b.name || ''));
}

// Nowe rezerwacje do potwierdzenia (powiadomienia)
export function newReservations(reservations: Reservation[]): Reservation[] {
  return reservations
    .filter((r) => reservationStatus(r) === 'new')
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

// Wskaźnik anulacji
export function cancellationRate(reservations: Reservation[]): { rate: number; cancelled: number; total: number } {
  let cancelled = 0, total = 0;
  for (const r of reservations) {
    if (r.payment === 'block') continue;
    total += 1;
    if (r.status === 'cancelled') cancelled += 1;
  }
  return { rate: total ? Math.round((cancelled / total) * 100) : 0, cancelled, total };
}

// --- Obłożenie (occupancy) ---
// Stanowisko-doba jest „obsadzona", gdy rezerwacja obejmuje dany dzień (date_from..date_to włącznie).
// Okno [fromYmd..toYmd] włącznie; capacity = suma total_spots × liczba dni okna.
const daySpan = (fromYmd: string, toYmd: string) =>
  Math.max(1, Math.round((new Date(`${toYmd}T12:00:00`).getTime() - new Date(`${fromYmd}T12:00:00`).getTime()) / 86400000) + 1);

export interface OccupancyStats { pct: number; bookedNights: number; capacityNights: number; days: number; totalSpots: number; }
export function periodOccupancy(reservations: Reservation[], fisheries: Fishery[], fromYmd: string, toYmd: string): OccupancyStats {
  const totalSpots = fisheries.reduce((s, f) => s + (f.total_spots || 0), 0);
  const days = daySpan(fromYmd, toYmd);
  const start = new Date(`${fromYmd}T12:00:00`);
  let booked = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const day = ymd(d);
    for (const r of reservations) {
      if (!isReal(r)) continue;
      if (r.date_from <= day && r.date_to >= day) booked += r.spots?.length ?? 0;
    }
  }
  const capacityNights = totalSpots * days;
  return { pct: capacityNights ? Math.round((booked / capacityNights) * 100) : 0, bookedNights: booked, capacityNights, days, totalSpots };
}

// Obłożenie per stanowisko (sensowne dla jednego łowiska — numery stanowisk są wtedy unikalne).
// Zwraca od najzimniejszego (najmniej obsadzonego) do najgorętszego.
export interface SpotFill { spot: number; nights: number; pct: number; }
export function spotOccupancy(reservations: Reservation[], totalSpots: number, fromYmd: string, toYmd: string): SpotFill[] {
  const days = daySpan(fromYmd, toYmd);
  const start = new Date(`${fromYmd}T12:00:00`);
  const nights = new Map<number, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const day = ymd(d);
    for (const r of reservations) {
      if (!isReal(r)) continue;
      if (r.date_from <= day && r.date_to >= day) for (const s of r.spots ?? []) nights.set(s, (nights.get(s) ?? 0) + 1);
    }
  }
  const out: SpotFill[] = [];
  for (let s = 1; s <= totalSpots; s++) { const n = nights.get(s) ?? 0; out.push({ spot: s, nights: n, pct: days ? Math.round((n / days) * 100) : 0 }); }
  return out.sort((a, b) => a.nights - b.nights);
}

// --- Zakontraktowany przychód (pipeline przyszłych rezerwacji) ---
export interface PipelineStats { count: number; revenue: number; next30Count: number; next30Revenue: number; next7Count: number; nextDate: string; }
export function pipelineStats(reservations: Reservation[]): PipelineStats {
  const today = ymd(new Date());
  const c30 = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return ymd(d); })();
  const c7 = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return ymd(d); })();
  let count = 0, revenue = 0, n30 = 0, r30 = 0, n7 = 0, nextDate = '';
  for (const r of reservations) {
    if (!isReal(r)) continue;
    if (r.date_from >= today) {
      count += 1; revenue += Number(r.total) || 0;
      if (r.date_from <= c30) { n30 += 1; r30 += Number(r.total) || 0; }
      if (r.date_from <= c7) n7 += 1;
      if (!nextDate || r.date_from < nextDate) nextDate = r.date_from;
    }
  }
  return { count, revenue, next30Count: n30, next30Revenue: r30, next7Count: n7, nextDate };
}

// --- Sezonowość: przychód i obłożenie wg miesiąca kalendarzowego (po nocach) ---
export interface MonthOcc { month: string; label: string; revenue: number; nights: number; occPct: number; }
export function monthlyStats(reservations: Reservation[], fisheries: Fishery[]): MonthOcc[] {
  const totalSpots = fisheries.reduce((s, f) => s + (f.total_spots || 0), 0);
  const real = reservations.filter(isReal);
  if (!real.length) return [];
  const rev = new Map<string, number>();
  const nights = new Map<string, number>();
  for (const r of real) {
    rev.set(r.date_from.slice(0, 7), (rev.get(r.date_from.slice(0, 7)) ?? 0) + (Number(r.total) || 0));
    const start = new Date(`${r.date_from}T12:00:00`);
    const span = daySpan(r.date_from, r.date_to);
    const cnt = r.spots?.length ?? 0;
    for (let i = 0; i < span; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const m = ymd(d).slice(0, 7);
      nights.set(m, (nights.get(m) ?? 0) + cnt);
    }
  }
  const months = [...new Set([...rev.keys(), ...nights.keys()])].sort();
  return months.map((m) => {
    const [y, mo] = m.split('-');
    const dim = new Date(Number(y), Number(mo), 0).getDate();
    const cap = totalSpots * dim;
    const nb = nights.get(m) ?? 0;
    return { month: m, label: `${M_SHORT[Number(mo) - 1]} ${y.slice(2)}`, revenue: rev.get(m) ?? 0, nights: nb, occPct: cap ? Math.round((nb / cap) * 100) : 0 };
  });
}

// --- Połowy (catch reports) widoczne dla właściciela ---
export interface OwnerCatch {
  id: string; fisheryId: string; fisheryName: string; species: string; weight: number | null;
  lengthCm: number | null; spotNumber: number | null; photoUrl: string | null; caughtOn: string;
  note: string | null; hidden: boolean; createdAt: string; anglerName: string; anglerPhone: string | null;
}
export async function ownerListCatches(fisheryId?: string): Promise<OwnerCatch[]> {
  const { data, error } = await supabase.rpc('owner_list_catches', { p_fishery: fisheryId ?? null });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id, fisheryId: r.fishery_id, fisheryName: r.fishery_name, species: r.species,
    weight: r.weight != null ? Number(r.weight) : null, lengthCm: r.length_cm ?? null,
    spotNumber: r.spot_number ?? null, photoUrl: r.photo_url ?? null, caughtOn: r.caught_on,
    note: r.note ?? null, hidden: !!r.hidden, createdAt: r.created_at,
    anglerName: r.angler_name ?? 'Wędkarz', anglerPhone: r.angler_phone ?? null,
  }));
}
export async function ownerSetCatchHidden(id: string, hidden: boolean): Promise<void> {
  const { error } = await supabase.rpc('owner_set_catch_hidden', { p_catch: id, p_hidden: hidden });
  if (error) throw error;
}
