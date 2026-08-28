export type PlanId = 'basic' | 'premium' | 'pro';

export interface PlanDef {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number;   // zł/mc
  yearly: number;    // zł/rok
  features: { label: string; in: boolean }[];
}

// Wszystkie funkcje w jednym miejscu — kolejność spójna między planami.
const ALL = [
  'Wpis w katalogu (mapa, zdjęcia, opis, oceny)',
  'Rezerwacje online i kalendarz',
  'Mapa stanowisk i batymetryczna',
  'Powiadomienia o rezerwacjach',
  'Pulpit i podgląd dnia',
  'Baza klientów (CRM)',
  'Analityka, raporty i eksport',
  'Porównanie sezonów',
];

const mask = (n: number) => ALL.map((label, i) => ({ label, in: i < n }));

export const PLAN_RANK: Record<PlanId, number> = { basic: 0, premium: 1, pro: 2 };

export const PLANS: PlanDef[] = [
  { id: 'basic',   name: 'Basic',   tagline: 'Twoje łowisko w katalogu — za darmo',        monthly: 0,   yearly: 0,    features: mask(1) },
  { id: 'premium', name: 'Premium', tagline: 'Rezerwacje online i pełen kalendarz',        monthly: 99,  yearly: 990,  features: mask(5) },
  { id: 'pro',     name: 'Pro',     tagline: 'Wszystko + pełny CRM i analityka',           monthly: 149, yearly: 1490, features: mask(8) },
];

export const planById = (id: string): PlanDef => PLANS.find((p) => p.id === id) ?? PLANS[0];
