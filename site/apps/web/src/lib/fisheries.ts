import { supabase } from './supabase';
import type { Fishery } from './types';

const SELECT = `
  id, name, location, city, province, latitude, longitude,
  distance, price_from, price_tiers, description, rules,
  open_hours, check_in_hour, season_start, season_end, total_spots, available_spots, nokill, record_weight,
  types, phone, email, website, premium, price_day, price_night, price_24h, extra_costs,
  image_url, spot_map_url, bathy_map_url,
  fishery_photos ( url, sort_order ),
  fishery_fish ( species ),
  fishery_amenities ( amenity ),
  fishery_records ( species, weight ),
  reviews ( rating )
`;

interface Row {
  id: string; name: string; location: string; city: string; province: string;
  latitude: number; longitude: number; distance: number | null;
  price_from: number; price_tiers: { label: string; price: number }[] | null;
  description: string | null; rules: string | null; open_hours: string | null;
  check_in_hour: number | null; season_start: string | null; season_end: string | null;
  total_spots: number; available_spots: number; nokill: boolean;
  record_weight: number | null; image_url: string | null;
  premium: boolean | null; price_day: number | null; price_night: number | null; price_24h: number | null;
  extra_costs: { label: string; price: number }[] | null;
  types: string[] | null; phone: string | null; email: string | null; website: string | null;
  spot_map_url: string | null; bathy_map_url: string | null;
  fishery_photos: { url: string; sort_order: number }[] | null;
  fishery_fish: { species: string }[] | null;
  fishery_amenities: { amenity: string }[] | null;
  fishery_records: { species: string; weight: number }[] | null;
  reviews: { rating: number }[] | null;
}

function mapRow(r: Row): Fishery {
  const photos = (r.fishery_photos ?? []).slice().sort((a, b) => a.sort_order - b.sort_order).map((p) => p.url);
  const reviews = r.reviews ?? [];
  const reviewCount = reviews.length;
  const rating = reviewCount ? Math.round((reviews.reduce((s, x) => s + x.rating, 0) / reviewCount) * 10) / 10 : 0;
  const records = (r.fishery_records ?? []).map((x) => ({ species: x.species, weight: Number(x.weight) })).sort((a, b) => b.weight - a.weight);
  return {
    id: r.id, name: r.name, location: r.location, city: r.city, province: r.province,
    latitude: r.latitude, longitude: r.longitude, distance: Number(r.distance ?? 0),
    rating, reviewCount, priceFrom: r.price_from, priceTiers: r.price_tiers ?? [],
    description: r.description ?? '', rules: r.rules ?? '', openHours: r.open_hours ?? '',
    checkInHour: r.check_in_hour ?? 12, seasonStart: r.season_start ?? null, seasonEnd: r.season_end ?? null,
    totalSpots: r.total_spots, availableSpots: r.available_spots, nokill: r.nokill,
    recordWeight: records[0]?.weight ?? Number(r.record_weight ?? 0),
    types: r.types ?? [], phone: r.phone ?? undefined, email: r.email ?? undefined, website: r.website ?? undefined,
    records, fish: (r.fishery_fish ?? []).map((f) => f.species),
    amenities: (r.fishery_amenities ?? []).map((a) => a.amenity),
    image: r.image_url ?? (photos[0] ?? undefined), photos,
    spotMap: r.spot_map_url ?? undefined, bathyMap: r.bathy_map_url ?? undefined,
    premium: r.premium ?? false,
    priceDay: r.price_day ?? undefined, priceNight: r.price_night ?? undefined, price24h: r.price_24h ?? undefined,
    extraCosts: r.extra_costs ?? [],
  };
}

export interface FisheryQuery {
  search?: string; types?: string[]; fish?: string[]; provinces?: string[];
  nokill?: boolean; sort?: string; lat?: number | null; lng?: number | null;
  limit?: number; offset?: number;
  online?: boolean; minPrice?: number | null; maxPrice?: number | null;
  amenities?: string[]; minRating?: number | null; radiusKm?: number | null;
}

export async function fetchFisheriesPage(q: FisheryQuery): Promise<Fishery[]> {
  const { data: idRows, error: idErr } = await supabase.rpc('search_fisheries', {
    p_search: q.search ?? '', p_types: q.types ?? [], p_fish: q.fish ?? [],
    p_provinces: q.provinces ?? [], p_nokill: q.nokill ?? false, p_sort: q.sort ?? 'distance',
    p_lat: q.lat ?? null, p_lng: q.lng ?? null, p_limit: q.limit ?? 20, p_offset: q.offset ?? 0,
    p_online_only: q.online ?? false, p_min_price: q.minPrice ?? null, p_max_price: q.maxPrice ?? null,
    p_amenities: q.amenities ?? [], p_min_rating: q.minRating ?? null, p_radius_km: q.radiusKm ?? null,
  });
  if (idErr) throw idErr;
  const ids: string[] = ((idRows ?? []) as { id: string }[]).map((r) => r.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('fisheries').select(SELECT).in('id', ids);
  if (error) throw error;
  const byId = new Map<string, Row>(((data ?? []) as Row[]).map((d) => [d.id, d]));
  return ids.map((id) => byId.get(id)).filter((d): d is Row => Boolean(d)).map(mapRow);
}

// Liczba łowisk pasujących do bieżących filtrów (licznik „Pokaż X łowisk").
export async function fetchFisheriesCount(q: FisheryQuery): Promise<number> {
  const { data, error } = await supabase.rpc('count_fisheries', {
    p_search: q.search ?? '', p_types: q.types ?? [], p_fish: q.fish ?? [],
    p_provinces: q.provinces ?? [], p_nokill: q.nokill ?? false,
    p_online_only: q.online ?? false, p_min_price: q.minPrice ?? null, p_max_price: q.maxPrice ?? null,
    p_amenities: q.amenities ?? [], p_min_rating: q.minRating ?? null, p_radius_km: q.radiusKm ?? null,
    p_lat: q.lat ?? null, p_lng: q.lng ?? null,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

// Wszystkie łowiska (dla mapy) — bez stronicowania
export async function fetchAllFisheries(): Promise<Fishery[]> {
  const { data, error } = await supabase.from('fisheries').select(SELECT).order('id');
  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapRow);
}

export async function fetchFisheriesByIds(ids: string[]): Promise<Fishery[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('fisheries').select(SELECT).in('id', ids);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapRow);
}

export async function fetchFishery(id: string): Promise<Fishery | null> {
  const { data, error } = await supabase.from('fisheries').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Row) : null;
}

// Stanowiska łowiska z pozycją na planie (do wizualnego wyboru przy rezerwacji).
export interface SpotInfo { spot_number: number; pos_x: number | null; pos_y: number | null; has_power: boolean; is_vip: boolean; price: number | null; capacity: number | null; }
export async function fetchSpots(fisheryId: string): Promise<SpotInfo[]> {
  const { data, error } = await supabase
    .from('fishery_spots')
    .select('spot_number, pos_x, pos_y, has_power, is_vip, price, capacity')
    .eq('fishery_id', fisheryId)
    .order('spot_number');
  if (error) return [];
  return (data ?? []) as SpotInfo[];
}

// Zajętość stanowisk łowiska: mapa dzień(ISO) -> zajęte numery stanowisk
export async function fetchOccupancy(fisheryId: string, from: string, to: string): Promise<Record<string, number[]>> {
  const { data, error } = await supabase.rpc('fishery_occupancy', { p_fishery: fisheryId, p_from: from, p_to: to });
  if (error || !data) return {};
  const map: Record<string, number[]> = {};
  for (const row of data as { d: string; spot: number }[]) (map[row.d] ??= []).push(row.spot);
  return map;
}

// Zajętość zbiorcza (liczba zajętych stanowisk per łowisko) dla terminu
export async function fetchTakenCounts(from: string, to: string): Promise<Record<string, number>> {
  const { data } = await supabase.rpc('fishery_taken_counts', { p_from: from, p_to: to });
  const m: Record<string, number> = {};
  (data ?? []).forEach((r: { fishery_id: string; taken: number }) => { m[r.fishery_id] = r.taken; });
  return m;
}

export async function fetchReviews(fisheryId: string) {
  const { data } = await supabase.from('reviews')
    .select('author_name, rating, visited_on, comment')
    .eq('fishery_id', fisheryId).not('hidden', 'is', true).order('created_at', { ascending: false });
  return (data ?? []) as { author_name: string; rating: number; visited_on: string | null; comment: string | null }[];
}

// Czy zalogowany wędkarz już ocenił to łowisko
export async function myReviewFor(fisheryId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('reviews').select('id').eq('fishery_id', fisheryId).eq('user_id', user.id).limit(1);
  return (data?.length ?? 0) > 0;
}

// Dodaj/zaktualizuj opinię (1 opinia na łowisko na użytkownika)
export async function addReview(input: { fisheryId: string; rating: number; comment: string; visitedOn?: string | null; authorName: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Zaloguj się, aby dodać opinię.');
  const { error } = await supabase.from('reviews').upsert({
    fishery_id: input.fisheryId, user_id: user.id, author_name: input.authorName || 'Wędkarz',
    rating: input.rating, comment: input.comment.trim() || null, visited_on: input.visitedOn ?? null,
  }, { onConflict: 'fishery_id,user_id' });
  if (error) throw error;
}
