// Typ łowiska. Dane NIE są już tutaj — pochodzą z Supabase
// (patrz: src/lib/fisheries.ts oraz src/context/FisheriesContext.tsx).
// Ten plik zostaje jako jedno źródło typu `Fishery` dla ekranów.

export interface Fishery {
  id: string;
  name: string;
  location: string;
  city: string;
  distance: number;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  priceDay?: number;
  priceNight?: number;
  price24h?: number;
  premium?: boolean;     // true = zarządzane (rezerwacje online); false = wpis katalogowy
  fish: string[];
  amenities: string[];
  image: any;            // URL ze Storage (string) lub lokalny require (fallback)
  latitude: number;
  longitude: number;
  description: string;
  rules: string;
  openHours: string;
  checkInHour?: number;
  totalSpots: number;
  availableSpots: number;
  province: string;
  nokill: boolean;
  recordWeight: number;
  types: string[];       // typ łowiska: Karpiowe / Spinningowe / Feederowe / Spławikowe
  phone?: string;        // kontakt
  email?: string;
  website?: string;
  records?: { species: string; weight: number }[]; // rekordy (gatunek + waga)
  photos?: string[];     // galeria (URL-e ze Storage)
  spotMap?: any;         // URL mapy stanowisk lub require
  bathyMap?: any;        // URL mapy batymetrycznej lub require
}
