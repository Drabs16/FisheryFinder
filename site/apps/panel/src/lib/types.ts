export interface Fishery {
  id: string;
  owner_id: string | null;
  name: string;
  location: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  review_count: number | null;
  price_from: number;
  price_day: number | null;
  price_night: number | null;
  price_24h: number | null;
  price_tiers: PriceTier[] | null;
  extra_costs: PriceTier[] | null;
  premium: boolean;
  plan: 'basic' | 'premium' | 'pro';
  claim_code: string | null;
  description: string | null;
  rules: string | null;
  open_hours: string | null;
  total_spots: number;
  available_spots: number;
  nokill: boolean;
  area_ha: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  image_url: string | null;
  spot_map_url: string | null;
  bathy_map_url: string | null;
  types: string[];
  fish: string[];
  season_start: string | null;
  season_end: string | null;
  check_in_hour: number | null;
  min_nights: number | null;
  max_nights: number | null;
  lead_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  user_id: string | null;
  fishery_id: string;
  fishery_name: string;
  spots: number[];
  date_from: string;
  date_to: string;
  days: number;
  date_label: string | null;
  price_per_day: number;
  total: number;
  payment: string | null;
  name: string | null;
  phone: string | null;
  status: 'upcoming' | 'cancelled';
  confirmed_at: string | null;
  shared_with: string[] | null;
  addons: { label: string; price: number }[] | null;
  created_at: string;
}

export interface FisheryRecord {
  species: string;
  weight: number;
}

export interface PriceTier {
  label: string;
  price: number;
}

// Wartości formularza dodawania/edycji łowiska
export interface FisheryFormValues {
  id?: string;
  name: string;
  location: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  price_from: number;
  price_day: number | null;
  price_night: number | null;
  price_24h: number | null;
  price_tiers: PriceTier[];
  extra_costs: PriceTier[];
  total_spots: number;
  fish: string[];
  amenities: string[];
  types: string[];
  photos: string[];
  records: FisheryRecord[];
  description: string;
  rules: string;
  open_hours: string;
  nokill: boolean;
  phone: string;
  email: string;
  website: string;
  area_ha: number | null;
  premium?: boolean; // tylko w trybie admina (plan Basic/Premium)
}

export interface ClaimRequestRow {
  id: string; fishery_id: string; fishery_name: string; user_id: string; user_email: string | null;
  business_name: string | null; nip: string | null; phone: string | null; message: string | null;
  status: 'pending' | 'approved' | 'rejected'; created_at: string;
}

export interface Subscription {
  id: string; fishery_id: string | null; user_id: string; plan: string;
  status: 'active' | 'cancelled'; method: string | null; amount: number; billing: 'monthly' | 'yearly';
  current_period_end: string | null; created_at: string; cancelled_at: string | null;
}

// Subskrypcja na poziomie KONTA (account_subscription RPC)
export interface AccountSub {
  plan: 'basic' | 'premium' | 'pro'; billing: 'monthly' | 'yearly'; status: string;
  amount: number; current_period_end: string | null; created_at: string;
}

export interface AdminStats {
  users_total: number; anglers: number; owners: number; admins: number;
  new_users_30d: number; new_users_month: number;
  fisheries_total: number; fisheries_premium: number; fisheries_claimed: number;
  reservations_total: number; reservations_month: number; reservations_online: number; reservations_confirmed: number;
  gmv: number; commission_total: number; commission_month: number; mrr: number; revenue_month: number;
  series: { ym: string; users: number; reservations: number; gmv: number }[];
}

// Wiersz listy admina (z RPC admin_list_fisheries — zawiera e-mail właściciela)
export interface AdminFisheryRow {
  id: string;
  name: string;
  city: string;
  province: string;
  premium: boolean;
  plan: 'basic' | 'premium' | 'pro';
  owner_id: string | null;
  owner_email: string | null;
  owner_is_admin: boolean;
  claim_code: string | null;
  total_spots: number;
  price_from: number;
  created_at: string;
}

export const PROVINCES = [
  'Dolnośląskie', 'Kujawsko-pomorskie', 'Lubelskie', 'Lubuskie', 'Łódzkie',
  'Małopolskie', 'Mazowieckie', 'Opolskie', 'Podkarpackie', 'Podlaskie',
  'Pomorskie', 'Śląskie', 'Świętokrzyskie', 'Warmińsko-mazurskie',
  'Wielkopolskie', 'Zachodniopomorskie',
];

// Zgodne z TYPE_OPTIONS w lib/constants.ts (jedno źródło prawdy dla panelu/web/apki)
export const FISHERY_TYPES = [
  'Komercyjne', 'Karpiowe', 'Spinningowe', 'Feederowe', 'Spławikowe', 'Muchowe', 'Specjalne',
];
