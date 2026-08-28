import { supabase } from './supabase';
import type { Reservation } from './types';

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

interface Row {
  id: string; user_id: string; fishery_id: string; fishery_name: string; spots: number[] | null;
  date_from: string; date_to: string; days: number; date_label: string | null;
  price_per_day: number; total: number; payment: string | null; status: string;
  shared_with: string[] | null; confirmed_at: string | null;
  addons: { label: string; price: number }[] | null;
}

function mapRow(r: Row): Reservation {
  const status: Reservation['status'] = r.status === 'cancelled' ? 'cancelled' : (r.date_to < todayIso() ? 'completed' : 'upcoming');
  return {
    id: r.id, fisheryId: r.fishery_id, fishery: r.fishery_name, spots: r.spots ?? [],
    dateFrom: r.date_from, dateTo: r.date_to, days: r.days, dateLabel: r.date_label ?? '',
    pricePerDay: r.price_per_day, total: Number(r.total), payment: r.payment ?? 'cash', status,
    userId: r.user_id, sharedWith: r.shared_with ?? [], confirmedAt: r.confirmed_at,
    addons: r.addons ?? [],
  };
}

export async function fetchMyReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase.from('reservations').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(mapRow);
}

export interface BookingInput {
  userId: string; fisheryId: string; fishery: string; spots: number[];
  dateFrom: string; dateTo: string; days: number; dateLabel: string;
  stay?: 'doba' | 'dzien' | 'nocka'; addons?: string[];
  pricePerDay: number; total: number; payment: string; name: string; phone: string;
}

export async function addReservation(b: BookingInput): Promise<void> {
  // Walidacja po stronie serwera: anty-overbooking (advisory lock), sezon, reguły, blokady.
  // p_stay decyduje, którą cenę i jak liczyć (doba=noce, dzień/nocka=1 jednostka).
  // p_addons: etykiety dodatków — cenę dolicza serwer z cennika łowiska (anty-manipulacja).
  const { error } = await supabase.rpc('create_reservation', {
    p_fishery: b.fisheryId, p_spots: b.spots, p_date_from: b.dateFrom, p_date_to: b.dateTo,
    p_name: b.name, p_phone: b.phone, p_payment: b.payment, p_stay: b.stay ?? 'doba',
    p_addons: b.addons ?? [],
  });
  if (error) throw new Error(error.message);
}

export async function cancelReservation(id: string): Promise<void> {
  const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}

export type ShareResult = 'ok' | 'no_account' | 'self' | 'forbidden' | 'not_found' | 'already';
// Udostępnia rezerwację koledze (po e-mailu konta). RPC waliduje istnienie konta + własność.
export async function shareReservation(id: string, email: string): Promise<ShareResult> {
  const { data, error } = await supabase.rpc('share_reservation', { p_id: id, p_email: email });
  if (error) throw new Error(error.message);
  return data as ShareResult;
}

// Cofa udostępnienie (właściciel ma prawo UPDATE własnej rezerwacji).
export async function unshareReservation(id: string, current: string[], email: string): Promise<void> {
  const next = current.filter((e) => e.toLowerCase() !== email.toLowerCase());
  const { error } = await supabase.from('reservations').update({ shared_with: next }).eq('id', id);
  if (error) throw error;
}
