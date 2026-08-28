export interface FisheryRecord { species: string; weight: number; }
export interface PriceTier { label: string; price: number; }

// Płaski typ zgodny z UI aplikacji
export interface Fishery {
  id: string;
  name: string;
  location: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  distance: number;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  priceDay?: number;
  priceNight?: number;
  price24h?: number;
  priceTiers: PriceTier[];
  extraCosts: PriceTier[];
  premium: boolean;
  description: string;
  rules: string;
  openHours: string;
  checkInHour: number;
  seasonStart: string | null;
  seasonEnd: string | null;
  totalSpots: number;
  availableSpots: number;
  nokill: boolean;
  recordWeight: number;
  types: string[];
  phone?: string;
  email?: string;
  website?: string;
  records: FisheryRecord[];
  fish: string[];
  amenities: string[];
  image?: string;
  photos: string[];
  spotMap?: string;
  bathyMap?: string;
}

export type PaymentMethod = 'cash' | 'blik' | 'p24';
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Gotówka na miejscu',
  blik: 'BLIK',
  p24: 'Przelewy24',
};
export const SERVICE_FEE = 0.05;

export interface Reservation {
  id: string;
  fisheryId: string;
  fishery: string;
  spots: number[];
  dateFrom: string;
  dateTo: string;
  days: number;
  dateLabel: string;
  pricePerDay: number;
  total: number;
  payment: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  confirmedAt: string | null;  // null = oczekuje na potwierdzenie właściciela
  userId: string;          // właściciel rezerwacji
  sharedWith: string[];    // e-maile, którym udostępniono
  addons: { label: string; price: number }[];  // dobrane koszty dodatkowe
}

export const SORT_OPTIONS = [
  { label: 'Najbliższe', key: 'distance' },
  { label: 'Ocena', key: 'rating' },
  { label: 'Cena: od najniższej', key: 'price' },
  { label: 'Cena: od najwyższej', key: 'price_desc' },
  { label: 'Największa ryba', key: 'record' },
];
