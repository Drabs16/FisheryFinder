import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOwnerData } from './useOwnerData';
import { fetchOwnerReviews, fetchSubscriptions, reservationStatus, type OwnerReview } from './api';
import type { IconName } from '../components/Icon';
import type { Subscription } from './types';

export type NotifType = 'reservation' | 'review' | 'subscription' | 'season';
export interface NotifItem {
  id: string; type: NotifType; title: string; sub: string;
  ts: number; icon: IconName; color: string; to: string;
}

const SEEN_KEY = 'ff:notifSeenAt';
const MS_DAY = 86400000;
const fmtD = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' }) : '—');

export function useNotifications() {
  const { reservations, fisheries } = useOwnerData();
  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [seenAt, setSeenAt] = useState<number>(() => Number(localStorage.getItem(SEEN_KEY) || 0));

  const fisheryIds = useMemo(() => fisheries.map((f) => f.id), [fisheries]);
  const nameOf = useMemo(() => Object.fromEntries(fisheries.map((f) => [f.id, f.name])), [fisheries]);

  useEffect(() => {
    if (fisheryIds.length === 0) { setReviews([]); return; }
    fetchOwnerReviews(fisheryIds).then(setReviews).catch(() => setReviews([]));
  }, [fisheryIds]);
  useEffect(() => {
    fetchSubscriptions().then(setSubs).catch(() => setSubs([]));
  }, []);

  const items = useMemo<NotifItem[]>(() => {
    const out: NotifItem[] = [];
    const now = Date.now();

    // Nowe rezerwacje do potwierdzenia
    for (const r of reservations) {
      if (r.payment === 'block' || r.status === 'cancelled') continue;
      if (reservationStatus(r) !== 'new') continue;
      out.push({
        id: `res:${r.id}`, type: 'reservation', icon: 'bell', color: '#52B788',
        title: `Nowa rezerwacja — ${r.name || 'Wędkarz'}`,
        sub: `${r.fishery_name} · wizyta ${fmtD(r.date_from)} · stan. ${r.spots?.join(', ') || '—'}`,
        ts: r.created_at ? new Date(r.created_at).getTime() : now, to: '/rezerwacje',
      });
    }
    // Nowe opinie
    for (const v of reviews) {
      out.push({
        id: `rev:${v.id}`, type: 'review', icon: 'star', color: '#F59E0B',
        title: `Nowa opinia — ${v.rating}★`,
        sub: `${nameOf[v.fishery_id] ?? 'Łowisko'} · ${v.author_name || 'Wędkarz'}${v.comment ? ` · „${v.comment.slice(0, 40)}${v.comment.length > 40 ? '…' : ''}"` : ''}`,
        ts: v.created_at ? new Date(v.created_at).getTime() : now, to: '/lowiska',
      });
    }
    // Zbliżająca się płatność subskrypcji (≤7 dni)
    for (const s of subs) {
      if (s.status !== 'active' || !s.current_period_end) continue;
      const end = new Date(s.current_period_end).getTime();
      const days = Math.ceil((end - now) / MS_DAY);
      if (days >= 0 && days <= 7) {
        out.push({
          id: `sub:${s.id}`, type: 'subscription', icon: 'card', color: '#1E88E5',
          title: 'Zbliża się płatność subskrypcji',
          sub: `${nameOf[s.fishery_id] ?? 'Łowisko'} · odnowienie za ${days} dni (${fmtD(s.current_period_end)})`,
          ts: end, to: '/subskrypcja',
        });
      }
    }
    // Koniec sezonu (≤14 dni)
    const td = new Date(); const mmToday = `${String(td.getMonth() + 1).padStart(2, '0')}-${String(td.getDate()).padStart(2, '0')}`;
    for (const f of fisheries) {
      if (!f.season_end) continue;
      const [em, ed] = f.season_end.split('-').map(Number);
      const endThisYear = new Date(td.getFullYear(), em - 1, ed).getTime();
      const days = Math.ceil((endThisYear - now) / MS_DAY);
      if (f.season_end >= mmToday && days >= 0 && days <= 14) {
        out.push({
          id: `season:${f.id}`, type: 'season', icon: 'calendar', color: '#B45309',
          title: 'Sezon dobiega końca',
          sub: `${f.name} · sezon kończy się za ${days} dni`,
          ts: endThisYear, to: `/lowiska/${f.id}`,
        });
      }
    }

    return out.sort((a, b) => b.ts - a.ts);
  }, [reservations, reviews, subs, fisheries, nameOf]);

  const unread = useMemo(() => items.filter((i) => i.ts <= Date.now() && i.ts > seenAt).length, [items, seenAt]);
  const markSeen = useCallback(() => { const t = Date.now(); localStorage.setItem(SEEN_KEY, String(t)); setSeenAt(t); }, []);

  return { items, unread, markSeen };
}
