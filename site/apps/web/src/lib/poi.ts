import { supabase } from './supabase';

// Punkty zainteresowania na mapie (sklepy wędkarskie + łowiska PZW/ogólnodostępne).
// Dane pochodzą z OpenStreetMap (jednorazowy import → tabela public.map_pois); na froncie
// czytamy z naszej bazy po bbox aktualnego widoku mapy.
export type PoiKind = 'pzw' | 'shop';

export interface Poi {
  id: string;
  kind: PoiKind;
  name: string;
  lat: number;
  lon: number;
  address?: string | null;
  city?: string | null;
}

export interface Bbox { south: number; west: number; north: number; east: number }

export async function fetchPois(b: Bbox, kinds: PoiKind[], signal?: AbortSignal): Promise<Poi[]> {
  if (kinds.length === 0) return [];
  let q = supabase.from('map_pois')
    .select('id,kind,name,lat,lon,address,city')
    .in('kind', kinds)
    .gte('lat', b.south).lte('lat', b.north)
    .gte('lon', b.west).lte('lon', b.east)
    .limit(400);
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Poi[];
}
