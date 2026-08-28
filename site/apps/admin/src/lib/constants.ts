import type { IconName } from '../components/Icon';

// Link do publicznej strony wędkarza — jedno źródło prawdy w packages/shared.
export { APP_URL } from '@ff/shared';

// Dokładnie te same wartości co w aplikacji (src/components/FilterModal.tsx),
// żeby panel właściciela i apka wędkarza były spójne i połączone.

// Typy łowiska — JEDEN spójny słownik dla panelu, web i apki (No Kill jest osobnym przełącznikiem)
export const TYPE_OPTIONS = ['Komercyjne', 'Karpiowe', 'Spinningowe', 'Feederowe', 'Spławikowe', 'Muchowe', 'Specjalne'];

// Gatunki ryb — JEDEN spójny słownik dla panelu, web i apki
export const FISH_OPTIONS = [
  'Karp', 'Amur', 'Szczupak', 'Sandacz', 'Okoń', 'Sum', 'Lin', 'Leszcz', 'Karaś', 'Jesiotr', 'Węgorz', 'Pstrąg',
];

// Udogodnienia + ikony (etykiety = klucze w bazie public.amenities.name)
export const AMENITY_OPTIONS: { label: string; icon: IconName }[] = [
  { label: 'Domki', icon: 'home' },
  { label: 'Prąd na stanowisku', icon: 'bolt' },
  { label: 'Parking', icon: 'car' },
  { label: 'Toaleta', icon: 'droplet' },
  { label: 'WiFi', icon: 'wifi' },
  { label: 'Grill', icon: 'flame' },
  { label: 'Sklep z przynętami', icon: 'bag' },
];
