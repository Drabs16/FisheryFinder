import { supabase } from './supabase';
import { Fishery } from '../data/mockData';

// Pobiera łowiska z Supabase wraz z galerią, gatunkami i udogodnieniami,
// mapując zagnieżdżone wiersze na płaski typ `Fishery` (zgodny z UI).
export async function fetchFisheries(): Promise<Fishery[]> {
  const { data, error } = await supabase
    .from('fisheries')
    .select(`
      id, name, location, city, province, latitude, longitude,
      distance, price_from, description, rules,
      open_hours, check_in_hour, total_spots, available_spots, nokill, record_weight,
      types, phone, email, website, premium, price_day, price_night, price_24h,
      image_url, spot_map_url, bathy_map_url,
      fishery_photos ( url, sort_order ),
      fishery_fish ( species ),
      fishery_amenities ( amenity ),
      fishery_records ( species, weight ),
      reviews ( rating )
    `)
    .order('id', { ascending: true });

  if (error) throw error;

  return (data ?? []).map(mapRow);
}

type Row = {
  id: string; name: string; location: string; city: string; province: string;
  latitude: number; longitude: number; distance: number | null;
  price_from: number;
  description: string | null; rules: string | null; open_hours: string | null; check_in_hour: number | null;
  total_spots: number; available_spots: number; nokill: boolean;
  record_weight: number | null; image_url: string | null;
  types: string[] | null; phone: string | null; email: string | null; website: string | null;
  premium: boolean | null; price_day: number | null; price_night: number | null; price_24h: number | null;
  spot_map_url: string | null; bathy_map_url: string | null;
  fishery_photos: { url: string; sort_order: number }[] | null;
  fishery_fish: { species: string }[] | null;
  fishery_amenities: { amenity: string }[] | null;
  fishery_records: { species: string; weight: number }[] | null;
  reviews: { rating: number }[] | null;
};

function mapRow(r: Row): Fishery {
  const photos = (r.fishery_photos ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => p.url);

  const reviews = r.reviews ?? [];
  const reviewCount = reviews.length;
  const rating = reviewCount
    ? Math.round((reviews.reduce((s, x) => s + x.rating, 0) / reviewCount) * 10) / 10
    : 0;

  const records = (r.fishery_records ?? [])
    .map((x) => ({ species: x.species, weight: Number(x.weight) }))
    .sort((a, b) => b.weight - a.weight);

  return {
    id: r.id,
    name: r.name,
    location: r.location,
    city: r.city,
    province: r.province,
    latitude: r.latitude,
    longitude: r.longitude,
    distance: Number(r.distance ?? 0),
    rating,
    reviewCount,
    priceFrom: r.price_from,
    priceDay: r.price_day ?? undefined,
    priceNight: r.price_night ?? undefined,
    price24h: r.price_24h ?? undefined,
    premium: r.premium ?? false,
    description: r.description ?? '',
    rules: r.rules ?? '',
    openHours: r.open_hours ?? '',
    checkInHour: r.check_in_hour ?? 12,
    totalSpots: r.total_spots,
    availableSpots: r.available_spots,
    nokill: r.nokill,
    recordWeight: records[0]?.weight ?? Number(r.record_weight ?? 0),
    types: r.types ?? [],
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    website: r.website ?? undefined,
    records,
    fish: (r.fishery_fish ?? []).map((f) => f.species),
    amenities: (r.fishery_amenities ?? []).map((a) => a.amenity),
    image: r.image_url ?? (photos[0] ?? undefined),
    photos,
    spotMap: r.spot_map_url ?? undefined,
    bathyMap: r.bathy_map_url ?? undefined,
  };
}

// --- Lista stronicowana + filtry po stronie bazy (skaluje się do tysięcy) ---
const FISHERY_SELECT = `
  id, name, location, city, province, latitude, longitude,
  distance, price_from, description, rules,
  open_hours, total_spots, available_spots, nokill, record_weight,
  types, phone, email, website, premium, price_day, price_night, price_24h,
  image_url, spot_map_url, bathy_map_url,
  fishery_photos ( url, sort_order ),
  fishery_fish ( species ),
  fishery_amenities ( amenity ),
  fishery_records ( species, weight ),
  reviews ( rating )
`;

export interface FisheryQuery {
  search?: string;
  types?: string[];
  fish?: string[];
  provinces?: string[];
  nokill?: boolean;
  sort?: string;                 // 'distance' | 'rating' | 'price' | 'record'
  lat?: number | null;
  lng?: number | null;
  limit?: number;
  offset?: number;
}

// Pobiera jedną stronę łowisk: baza filtruje, sortuje i stronicuje (RPC),
// a potem dociągamy pełne dane tylko dla zwróconych ID (≤ limit wierszy).
export async function fetchFisheriesPage(q: FisheryQuery): Promise<Fishery[]> {
  const { data: idRows, error: idErr } = await supabase.rpc('search_fisheries', {
    p_search: q.search ?? '',
    p_types: q.types ?? [],
    p_fish: q.fish ?? [],
    p_provinces: q.provinces ?? [],
    p_nokill: q.nokill ?? false,
    p_sort: q.sort ?? 'distance',
    p_lat: q.lat ?? null,
    p_lng: q.lng ?? null,
    p_limit: q.limit ?? 20,
    p_offset: q.offset ?? 0,
  });
  if (idErr) throw idErr;

  const ids: string[] = ((idRows ?? []) as { id: string }[]).map((r) => r.id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from('fisheries').select(FISHERY_SELECT).in('id', ids);
  if (error) throw error;

  const byId = new Map<string, Row>(((data ?? []) as Row[]).map((d) => [d.id, d]));
  return ids
    .map((id) => byId.get(id))
    .filter((d): d is Row => Boolean(d))
    .map(mapRow);
}
