// Brand zgodny z aplikacją mobilną (src/theme/colors.ts)
export const colors = {
  primary: '#1B4332',
  primaryLight: '#2D6A4F',
  accent: '#52B788',
  accentLight: '#95D5B2',
  accentSoft: '#E7F5EE',
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  water: '#1E88E5',
};

// Statusy rezerwacji: nowa (jaśniejszy zielony) → potwierdzona (ciemny zielony)
export type StatusKey = 'new' | 'confirmed' | 'block' | 'cancelled';

export const STATUS: Record<StatusKey, { label: string; color: string }> = {
  new:       { label: 'Nowa — do potwierdzenia', color: '#52B788' },
  confirmed: { label: 'Potwierdzona',            color: '#1B4332' },
  block:     { label: 'Zablokowane',             color: '#DC2626' },
  cancelled: { label: 'Anulowana',               color: '#EF4444' },
};

// Sposób płatności → etykieta + kolor
export type PayKind = 'cash' | 'online' | 'unknown';
export const PAY: Record<PayKind, { label: string; color: string }> = {
  cash:    { label: 'Gotówka',   color: '#F59E0B' },
  online:  { label: 'Online',    color: '#1E88E5' },
  unknown: { label: 'Nieokreślona', color: '#9CA3AF' },
};
