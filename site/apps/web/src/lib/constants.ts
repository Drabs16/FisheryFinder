// Link do panelu właściciela — jedno źródło prawdy w packages/shared.
export { PANEL_URL } from '@ff/shared';

// JEDEN spójny słownik dla web, panelu i apki (No Kill osobny przełącznik)
export const TYPE_OPTIONS = ['Komercyjne', 'Karpiowe', 'Spinningowe', 'Feederowe', 'Spławikowe', 'Muchowe', 'Specjalne'];
export const FISH_OPTIONS = ['Karp', 'Amur', 'Szczupak', 'Sandacz', 'Okoń', 'Sum', 'Lin', 'Leszcz', 'Karaś', 'Jesiotr', 'Węgorz', 'Pstrąg'];
// Udogodnienia (jak w apce) — match = fragment do dopasowania w danych łowiska
export const AMENITY_OPTIONS: { label: string; icon: string; match: string }[] = [
  { label: 'Domki', icon: 'home', match: 'domki' },
  { label: 'Prąd na stanowisku', icon: 'bolt', match: 'prąd' },
  { label: 'Parking', icon: 'car', match: 'parking' },
  { label: 'Toaleta', icon: 'droplet', match: 'toaleta' },
  { label: 'WiFi', icon: 'wifi', match: 'wifi' },
  { label: 'Grill', icon: 'flame', match: 'grill' },
  { label: 'Sklep z przynętami', icon: 'bag', match: 'sklep' },
];

export const PROVINCES = [
  'Dolnośląskie', 'Kujawsko-pomorskie', 'Lubelskie', 'Lubuskie', 'Łódzkie',
  'Małopolskie', 'Mazowieckie', 'Opolskie', 'Podkarpackie', 'Podlaskie',
  'Pomorskie', 'Śląskie', 'Świętokrzyskie', 'Warmińsko-mazurskie',
  'Wielkopolskie', 'Zachodniopomorskie',
];

export const toRad = (d: number) => (d * Math.PI) / 180;
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
export const fmtShort = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
// Lokalne „dziś" (toISOString dałoby zły dzień wieczorem w strefach +UTC, np. PL) — spójne z panelem
export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Efektywna „cena od" — najniższa realna cena (priceFrom bywa 0/niedoliczony w danych),
// więc bierzemy minimum z dostępnych: doba/dzień/nocka/priceFrom/warianty.
type PriceLike = { priceFrom?: number | null; price24h?: number | null; priceDay?: number | null; priceNight?: number | null; priceTiers?: { price: number }[] | null };
export const priceFromOf = (f: PriceLike): number => {
  const vals = [f.priceFrom, f.price24h, f.priceDay, f.priceNight, ...(f.priceTiers ?? []).map((t) => t.price)]
    .map((v) => Number(v) || 0)
    .filter((v) => v > 0);
  return vals.length ? Math.min(...vals) : 0;
};

// ── Produkty pobytu: typ pobytu to PRODUKT, nie dodatek do dat ──────────────
// Doba = zakres (przyjazd→wyjazd, liczone w dobach/nocach). Dzień/Nocka = pojedynczy dzień/noc.
export type StayKey = 'doba' | 'dzien' | 'nocka';
export interface StayProduct { key: StayKey; label: string; sub: string; price: number; range: boolean }
type StaySrc = { price24h?: number | null; priceDay?: number | null; priceNight?: number | null; priceFrom?: number | null };

// Lista realnie oferowanych produktów (tylko z ceną > 0). Brak struktury cen → traktujemy „od" jako Dobę.
export const stayProductsOf = (f: StaySrc): StayProduct[] => {
  const defs: { key: StayKey; label: string; sub: string; price: number | null | undefined; range: boolean }[] = [
    { key: 'doba', label: 'Doba', sub: '24h', price: f.price24h, range: true },
    { key: 'dzien', label: 'Dzień', sub: 'dniówka', price: f.priceDay, range: false },
    { key: 'nocka', label: 'Nocka', sub: 'na noc', price: f.priceNight, range: false },
  ];
  const valid = defs.filter((d) => Number(d.price) > 0).map((d) => ({ ...d, price: Number(d.price) }));
  if (valid.length) return valid;
  const base = Number(f.priceFrom) || 0;
  return [{ key: 'doba', label: 'Doba', sub: '24h', price: base, range: true }];
};

// Najtańszy oferowany produkt — do „od X zł / <jednostka>" na karcie/mapie (jednostka spójna z ceną).
export const cheapestStay = (f: StaySrc): StayProduct | null => {
  const ps = stayProductsOf(f).filter((p) => p.price > 0);
  return ps.length ? ps.reduce((a, b) => (b.price < a.price ? b : a)) : null;
};

// Cena za DOBĘ (do sumy „za N dób"). 0 gdy łowisko sprzedaje wyłącznie na dzień/nockę — wtedy
// nie mnożymy przez doby (to byłoby mylące). Brak struktury cen → „od" traktujemy jako dobę.
export const dobaPriceOf = (f: StaySrc): number => {
  const p24 = Number(f.price24h) || 0;
  if (p24 > 0) return p24;
  const hasDayNight = (Number(f.priceDay) || 0) > 0 || (Number(f.priceNight) || 0) > 0;
  return hasDayNight ? 0 : (Number(f.priceFrom) || 0);
};

// Liczba dób w terminie (jak Booking: przyjazd→wyjazd; weekend Sob→Nd = 1 doba). Brak „do" → 1 doba.
export const nightsBetween = (from?: string | null, to?: string | null): number => {
  if (!from) return 1;
  if (!to || to === from) return 1;
  const ms = new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime();
  return Math.max(1, Math.round(ms / 86400000));
};
// Suma „od" za cały wybrany termin = cena od (za dobę) × liczba dób.
export const periodFromPrice = (f: PriceLike, from?: string | null, to?: string | null): number => priceFromOf(f) * nightsBetween(from, to);
// Polska odmiana dób: 1 doba, 2-4 doby, 5+ dób
export const pluralDoby = (n: number): string => {
  const t = n % 10, h = n % 100;
  if (n === 1) return 'doba';
  if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return 'doby';
  return 'dób';
};

// Polska odmiana: 1 łowisko, 2-4 łowiska, 5+ łowisk
export const pluralFisheries = (n: number): string => {
  const t = n % 10, h = n % 100;
  if (n === 1) return 'łowisko';
  if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return 'łowiska';
  return 'łowisk';
};
