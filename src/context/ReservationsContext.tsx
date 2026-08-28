import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const SEEN_KEY = 'ff:notifsSeenAt';

export type PaymentMethod = 'cash' | 'blik' | 'p24' | 'applepay' | 'googlepay';

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Gotówka na miejscu',
  blik: 'BLIK',
  p24: 'Przelewy24',
  applepay: 'Apple Pay',
  googlepay: 'Google Pay',
};

export const isOnline = (m: PaymentMethod) => m !== 'cash';
export const SERVICE_FEE = 0.05;

export interface Reservation {
  id: string;
  fisheryId: string;
  fishery: string;
  spots: number[];
  dateFrom: string;   // ISO YYYY-MM-DD
  dateTo: string;     // ISO YYYY-MM-DD (inclusive)
  days: number;
  dateLabel: string;
  pricePerDay: number;
  total: number;
  payment: PaymentMethod;
  name: string;
  phone: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  rating?: number;
  sharedWith: string[];
  createdAt: number;
  confirmedAt?: number;   // ms; ustawione gdy właściciel potwierdził rezerwację
}

interface AddInput {
  fisheryId: string;
  fishery: string;
  spots: number[];
  dateFrom: string;
  dateTo: string;
  days: number;
  dateLabel: string;
  pricePerDay: number;
  total: number;
  payment: PaymentMethod;
  name: string;
  phone: string;
}

interface Ctx {
  reservations: Reservation[];
  loading: boolean;
  addReservation: (input: AddInput) => Promise<void>;
  cancelReservation: (id: string) => Promise<void>;
  rateReservation: (id: string, rating: number) => Promise<void>;
  shareReservation: (id: string, email: string) => Promise<void>;
  reload: () => Promise<void>;
  // Powiadomienia o potwierdzeniach
  notifications: Reservation[];        // potwierdzone rezerwacje, najnowsze pierwsze
  unreadCount: number;                 // potwierdzenia nowsze niż „ostatnio widziane"
  markNotificationsSeen: () => void;
  freshConfirmation: Reservation | null; // świeże potwierdzenie do banera
  dismissFreshConfirmation: () => void;
}

const ReservationsContext = createContext<Ctx | null>(null);

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Status w bazie to tylko 'upcoming' / 'cancelled'. „Zakończona" wynika z daty —
// liczymy ją przy odczycie, żeby historia rosła sama z czasem.
function deriveStatus(dbStatus: string, dateTo: string): Reservation['status'] {
  if (dbStatus === 'cancelled') return 'cancelled';
  return dateTo < todayIso() ? 'completed' : 'upcoming';
}

type Row = {
  id: string; fishery_id: string; fishery_name: string; spots: number[] | null;
  date_from: string; date_to: string; days: number; date_label: string | null;
  price_per_day: number; total: number; payment: string | null;
  name: string | null; phone: string | null; status: string;
  rating: number | null; shared_with: string[] | null; created_at: string;
  confirmed_at: string | null;
};

function mapRow(r: Row): Reservation {
  return {
    id: r.id,
    fisheryId: r.fishery_id,
    fishery: r.fishery_name,
    spots: r.spots ?? [],
    dateFrom: r.date_from,
    dateTo: r.date_to,
    days: r.days,
    dateLabel: r.date_label ?? '',
    pricePerDay: r.price_per_day,
    total: Number(r.total),
    payment: (r.payment ?? 'cash') as PaymentMethod,
    name: r.name ?? '',
    phone: r.phone ?? '',
    status: deriveStatus(r.status, r.date_to),
    rating: r.rating ?? undefined,
    sharedWith: r.shared_with ?? [],
    createdAt: new Date(r.created_at).getTime(),
    confirmedAt: r.confirmed_at ? new Date(r.confirmed_at).getTime() : undefined,
  };
}

export function ReservationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [seenAt, setSeenAt] = useState(0);
  const [freshConfirmation, setFreshConfirmation] = useState<Reservation | null>(null);
  const confirmedIdsRef = useRef<Set<string>>(new Set()); // do wykrycia NOWYCH potwierdzeń
  const firstLoadRef = useRef(true);

  // Mapuje wiersze i wykrywa nowe potwierdzenia (poza pierwszym ładowaniem → baner).
  const applyRows = useCallback((rows: Row[], initial: boolean) => {
    const mapped = rows.map(mapRow);
    const confirmed = mapped.filter((r) => r.confirmedAt);
    if (initial) {
      confirmedIdsRef.current = new Set(confirmed.map((r) => r.id));
    } else {
      const fresh = confirmed.find((r) => !confirmedIdsRef.current.has(r.id));
      confirmed.forEach((r) => confirmedIdsRef.current.add(r.id));
      if (fresh) setFreshConfirmation(fresh);
    }
    setReservations(mapped);
  }, []);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setReservations([]); confirmedIdsRef.current = new Set(); firstLoadRef.current = true; setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const initial = firstLoadRef.current;
      firstLoadRef.current = false;
      applyRows(data as Row[], initial);
    }
    setLoading(false);
  }, [user?.id, applyRows]);

  useEffect(() => { reload(); }, [reload]);

  // „Ostatnio widziane" powiadomienia — z AsyncStorage.
  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY).then((v) => { if (v) setSeenAt(Number(v) || 0); }).catch(() => {});
  }, []);

  // Realtime: natychmiastowy baner + aktualizacja, gdy właściciel potwierdzi rezerwację.
  // (Wymaga tabeli w publikacji supabase_realtime — patrz supabase/SETUP.sql.
  //  Bez tego działa fallback: refetch przy powrocie apki na pierwszy plan.)
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`resv-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reservations', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Row;
          if (!n?.id) return;
          const mapped = mapRow(n);
          const isNewConfirm = !!mapped.confirmedAt && !confirmedIdsRef.current.has(mapped.id);
          if (mapped.confirmedAt) confirmedIdsRef.current.add(mapped.id);
          setReservations((prev) =>
            prev.some((r) => r.id === mapped.id)
              ? prev.map((r) => (r.id === mapped.id ? mapped : r))
              : [mapped, ...prev],
          );
          if (isNewConfirm) setFreshConfirmation(mapped);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // Powrót apki na pierwszy plan → odśwież (fallback bez realtime).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') reload(); });
    return () => sub.remove();
  }, [reload]);

  const addReservation = useCallback(async (input: AddInput) => {
    if (!user?.id) return;
    const { error } = await supabase.from('reservations').insert({
      user_id: user.id,
      fishery_id: input.fisheryId,
      fishery_name: input.fishery,
      spots: input.spots,
      date_from: input.dateFrom,
      date_to: input.dateTo,
      days: input.days,
      date_label: input.dateLabel,
      price_per_day: input.pricePerDay,
      total: input.total,
      payment: input.payment,
      name: input.name,
      phone: input.phone,
      status: 'upcoming',
    });
    if (!error) await reload();
  }, [user?.id, reload]);

  const cancelReservation = useCallback(async (id: string) => {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)));
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id);
  }, []);

  const rateReservation = useCallback(async (id: string, rating: number) => {
    let res: Reservation | undefined;
    setReservations((prev) => {
      res = prev.find((r) => r.id === id);
      return prev.map((r) => (r.id === id ? { ...r, rating } : r));
    });
    await supabase.from('reservations').update({ rating }).eq('id', id);
    // Zapis realnej opinii (1 na usera/łowisko) — z niej liczy się ocena łowiska
    if (user?.id && res) {
      await supabase.from('reviews').upsert(
        {
          fishery_id: res.fisheryId,
          user_id: user.id,
          rating,
          author_name: res.name || 'Wędkarz',
          visited_on: res.dateFrom,
        },
        { onConflict: 'fishery_id,user_id' },
      );
    }
  }, [user?.id]);

  const shareReservation = useCallback(async (id: string, email: string) => {
    const e = email.trim().toLowerCase();
    let next: string[] = [];
    setReservations((prev) =>
      prev.map((r) => {
        if (r.id === id && !r.sharedWith.includes(e)) {
          next = [...r.sharedWith, e];
          return { ...r, sharedWith: next };
        }
        return r;
      }),
    );
    if (next.length > 0) {
      await supabase.from('reservations').update({ shared_with: next }).eq('id', id);
    }
  }, []);

  const notifications = useMemo(
    () => reservations.filter((r) => r.confirmedAt).sort((a, b) => (b.confirmedAt ?? 0) - (a.confirmedAt ?? 0)),
    [reservations],
  );
  const unreadCount = useMemo(
    () => notifications.filter((r) => (r.confirmedAt ?? 0) > seenAt).length,
    [notifications, seenAt],
  );

  const markNotificationsSeen = useCallback(() => {
    const now = Date.now();
    setSeenAt(now);
    AsyncStorage.setItem(SEEN_KEY, String(now)).catch(() => {});
  }, []);
  const dismissFreshConfirmation = useCallback(() => setFreshConfirmation(null), []);

  return (
    <ReservationsContext.Provider
      value={{
        reservations, loading, addReservation, cancelReservation, rateReservation, shareReservation, reload,
        notifications, unreadCount, markNotificationsSeen, freshConfirmation, dismissFreshConfirmation,
      }}
    >
      {children}
    </ReservationsContext.Provider>
  );
}

export function useReservations() {
  const ctx = useContext(ReservationsContext);
  if (!ctx) throw new Error('useReservations must be used within ReservationsProvider');
  return ctx;
}
