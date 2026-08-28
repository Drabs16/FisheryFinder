import { useEffect, useMemo, useState } from 'react';
import { createReservation } from '../lib/api';
import { colors } from '../theme';
import Icon from './Icon';
import Select from './Select';
import DateField from './DateField';
import Toggle from './Toggle';
import { toast } from './Toast';
import type { Fishery, Reservation } from '../lib/types';

// Lokalna data YYYY-MM-DD (toISOString przesuwałby dzień w strefach +UTC, np. PL)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const PAYMENTS = ['Gotówka', 'Online', 'BLIK', 'Przelew'];

interface Props {
  fisheries: Fishery[];
  reservations?: Reservation[];
  defaultFisheryId?: string;
  defaultSpot?: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewReservationModal({ fisheries, reservations = [], defaultFisheryId, defaultSpot, onClose, onCreated }: Props) {
  const t = iso(new Date());
  const [fisheryId, setFisheryId] = useState(defaultFisheryId ?? fisheries[0]?.id ?? '');
  const fishery = fisheries.find((f) => f.id === fisheryId);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [spots, setSpots] = useState<number[]>(defaultSpot ? [defaultSpot] : []);
  const [from, setFrom] = useState(t);
  const [to, setTo] = useState(t);
  const [price, setPrice] = useState<number>(fishery?.price_from ?? 0);
  const [payment, setPayment] = useState('Gotówka');
  const [confirmed, setConfirmed] = useState(true);
  const [busy, setBusy] = useState(false);

  const spotOptions = useMemo(
    () => (fishery ? Array.from({ length: fishery.total_spots }, (_, i) => i + 1) : []),
    [fishery],
  );

  // stanowiska zajęte w wybranym terminie (te same reguły co owner_create_reservation)
  const taken = useMemo(() => {
    const set = new Set<number>();
    for (const r of reservations) {
      if (r.fishery_id !== fisheryId || r.status === 'cancelled') continue;
      if (r.date_from <= to && r.date_to >= from) for (const s of (r.spots ?? [])) set.add(s);
    }
    return set;
  }, [reservations, fisheryId, from, to]);

  // odznacz zajęte, gdy zmieni się termin/łowisko
  useEffect(() => { setSpots((p) => p.filter((s) => !taken.has(s))); }, [taken]);

  const days = Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / 86400000 + 1);
  const total = price * days * Math.max(1, spots.length);
  const freeCount = spotOptions.filter((s) => !taken.has(s)).length;

  const toggle = (s: number) => { if (taken.has(s)) return; setSpots((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s])); };

  const submit = async () => {
    if (!fishery) return;
    if (!name.trim()) { toast('Podaj imię/nazwę klienta', 'error'); return; }
    if (spots.length === 0) { toast('Zaznacz przynajmniej jedno stanowisko', 'error'); return; }
    if (to < from) { toast('Data końcowa jest wcześniejsza niż początkowa', 'error'); return; }
    setBusy(true);
    try {
      await createReservation({ fisheryId, name: name.trim(), phone: phone.trim(), spots, from, to, pricePerDay: price, payment, confirmed });
      onCreated();
    } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); setBusy(false); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h3>Nowa rezerwacja</h3><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Dodaj rezerwację telefoniczną lub na miejscu.</div></div>
          <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>Łowisko</label>
          <Select value={fisheryId} onChange={(v) => { setFisheryId(v); setSpots([]); }} icon="fish" width="100%"
            options={fisheries.map((f) => ({ value: f.id, label: f.name }))} />
        </div>

        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Imię i nazwisko klienta</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Kowalski" /></div>
          <div className="field" style={{ flex: 1 }}><label>Telefon</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48…" /></div>
        </div>

        <div className="field">
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Stanowiska</span>
            <span className="muted" style={{ fontWeight: 500, fontSize: 12.5 }}>{freeCount} z {spotOptions.length} wolnych w tym terminie</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 132, overflowY: 'auto' }}>
            {spotOptions.map((s) => {
              const isTaken = taken.has(s);
              return (
                <span key={s}
                  className={`chip ${spots.includes(s) ? 'on' : ''} ${isTaken ? 'disabled' : ''}`}
                  style={{ padding: '6px 11px', ...(isTaken ? { opacity: 0.45, textDecoration: 'line-through', cursor: 'not-allowed' } : {}) }}
                  title={isTaken ? 'Zajęte w tym terminie' : `Stanowisko ${s}`}
                  onClick={() => toggle(s)}>{s}</span>
              );
            })}
          </div>
          {freeCount === 0 && spotOptions.length > 0 && <div className="muted" style={{ fontSize: 12.5, marginTop: 6, color: colors.error }}>Wszystkie stanowiska zajęte w tym terminie — zmień daty.</div>}
        </div>

        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Od</label><DateField value={from} onChange={setFrom} /></div>
          <div className="field" style={{ flex: 1 }}><label>Do</label><DateField value={to} onChange={setTo} min={from} /></div>
          <div className="field" style={{ flex: 1 }}><label>Cena / dzień (zł)</label><input className="input" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
        </div>

        <div className="field">
          <label>Sposób płatności</label>
          <div className="row">
            {PAYMENTS.map((p) => <span key={p} className={`chip ${payment === p ? 'on' : ''}`} onClick={() => setPayment(p)}>{p}</span>)}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Toggle checked={confirmed} onChange={setConfirmed} label="Od razu potwierdzona" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--accent-soft)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, color: colors.primary }}>Do zapłaty</span>
          <b style={{ fontSize: 20, color: colors.primary }}>{Math.round(total).toLocaleString('pl-PL')} zł</b>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Anuluj</button>
          <button className="btn" disabled={busy} onClick={submit}><Icon name="check" size={15} /> {busy ? 'Zapisywanie…' : 'Utwórz rezerwację'}</button>
        </div>
      </div>
    </div>
  );
}
