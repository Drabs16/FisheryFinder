import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useInvites } from '../context/InvitesContext';
import { fetchMyReservations } from '../lib/reservations';
import type { Reservation } from '../lib/types';
import Icon, { type IconName } from './Icon';

// Dzwonek powiadomień w nagłówku (tylko dla zalogowanych). Agreguje 3 źródła:
//  - zaproszenia znajomych do tablic rywalizacji,
//  - rezerwacje (potwierdzenie / oczekiwanie na właściciela),
//  - ogłoszenia od nas (admin → announcements).
// Kliknięcie powiadomienia je usuwa (dismiss, zapisane lokalnie). Badge = liczba nieusuniętych.

interface Notif { id: string; icon: IconName; title: string; text?: string; to?: string; ts: number }
interface Ann { id: string; title: string; body: string }

const DISMISS_KEY = 'ff:notifDismissed';
const getDismissed = (): string[] => { try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch { return []; } };
const saveDismissed = (ids: string[]) => { try { localStorage.setItem(DISMISS_KEY, JSON.stringify(ids)); } catch { /* ignore */ } };

export default function NotificationsBell() {
  const { invites } = useInvites();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [anns, setAnns] = useState<Ann[]>([]);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMyReservations().then(setReservations).catch(() => {});
    supabase.rpc('active_announcements', { p_audience: 'anglers' })
      .then(({ data }) => { if (Array.isArray(data)) setAnns(data as Ann[]); }, () => {});
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const all = useMemo<Notif[]>(() => {
    const out: Notif[] = [];
    invites.forEach((iv) => out.push({
      id: `inv-${iv.id}`, icon: 'people', title: 'Zaproszenie do tablicy',
      text: `${iv.ownerName} zaprasza Cię do „${iv.name}"`, to: '/polowy', ts: Date.now(),
    }));
    reservations.filter((r) => r.status === 'upcoming').forEach((r) => {
      if (r.confirmedAt) out.push({
        id: `res-ok-${r.id}`, icon: 'check', title: 'Rezerwacja potwierdzona',
        text: `${r.fishery} — właściciel potwierdził Twoją rezerwację`, to: '/rezerwacje',
        ts: new Date(r.confirmedAt).getTime(),
      });
      else out.push({
        id: `res-wait-${r.id}`, icon: 'calendar', title: 'Rezerwacja oczekuje',
        text: `${r.fishery} — czeka na potwierdzenie właściciela`, to: '/rezerwacje', ts: Date.now(),
      });
    });
    anns.forEach((a) => out.push({ id: `ann-${a.id}`, icon: 'fish', title: a.title, text: a.body, ts: Date.now() }));
    return out.sort((a, b) => b.ts - a.ts).slice(0, 20);
  }, [invites, reservations, anns]);

  const items = useMemo(() => all.filter((i) => !dismissed.includes(i.id)), [all, dismissed]);

  const dismiss = (id: string) => {
    setDismissed((d) => { const next = d.includes(id) ? d : [...d, id]; saveDismissed(next); return next; });
  };
  const clearAll = () => {
    setDismissed((d) => { const next = Array.from(new Set([...d, ...items.map((i) => i.id)])); saveDismissed(next); return next; });
  };

  return (
    <div className="notif-wrap" ref={ref}>
      <button className="notif-btn" onClick={() => setOpen((o) => !o)} aria-label="Powiadomienia" aria-expanded={open}>
        <Icon name="bell" size={19} color="#fff" />
        {items.length > 0 && <span className="notif-badge">{items.length > 9 ? '9+' : items.length}</span>}
      </button>
      {open && (
        <div className="notif-panel" role="menu">
          <div className="notif-head">
            <span>Powiadomienia</span>
            {items.length > 0 && <button className="notif-clear" onClick={clearAll}>Wyczyść</button>}
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">
              <Icon name="bell" size={22} color="var(--ff-text-tertiary)" />
              <span>Brak nowych powiadomień.</span>
              <small>Tu pojawią się potwierdzenia rezerwacji, zaproszenia znajomych i informacje od nas.</small>
            </div>
          ) : (
            <div className="notif-list">
              {items.map((i) => {
                const body = (
                  <>
                    <span className="notif-ic"><Icon name={i.icon} size={16} color="var(--ff-primary)" /></span>
                    <span className="notif-main">
                      <span className="notif-title">{i.title}</span>
                      {i.text && <span className="notif-text">{i.text}</span>}
                    </span>
                  </>
                );
                return i.to
                  ? <Link key={i.id} to={i.to} className="notif-item" onClick={() => { dismiss(i.id); setOpen(false); }}>{body}</Link>
                  : <button key={i.id} type="button" className="notif-item" onClick={() => dismiss(i.id)}>{body}</button>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
