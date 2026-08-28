import { useEffect, useMemo, useRef, useState } from 'react';
import { useOwnerData } from '../lib/useOwnerData';
import { blockSpots, cancelReservation, confirmReservation, removeBlock, reservationStatus } from '../lib/api';
import { STATUS, type StatusKey } from '../theme';
import Icon from '../components/Icon';
import ReservationModal from '../components/ReservationModal';
import NewReservationModal from '../components/NewReservationModal';
import Select from '../components/Select';
import DateField from '../components/DateField';
import { toast } from '../components/Toast';
import type { Reservation } from '../lib/types';
import Loader from '../components/Loader';

const COL = 64;
const WINDOW = 35; // dni w przewijanym oknie (kalendarz nie skacze po miesiącach, tylko płynnie)
const LEAD = 14;   // ile dni przed „dziś" zaczyna się okno przy wyśrodkowaniu
const MONTH_ABBR = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
// Lokalna data YYYY-MM-DD (NIE toISOString — to przesuwałoby dzień w strefach +UTC, np. PL)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const windowStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return addDays(d, -LEAD); };
const shiftDay = (isoStr: string, n: number) => { const [y, m, dd] = isoStr.split('-').map(Number); return iso(new Date(y, m - 1, dd + n)); };
const dayLabel = (isoStr: string) => { const [y, m, dd] = isoStr.split('-').map(Number); const s = new Date(y, m - 1, dd).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); };
const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (n === 1) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export default function Calendar() {
  const { fisheries, reservations, loading, reload } = useOwnerData();
  const [fisheryId, setFisheryId] = useState('');
  const [start, setStart] = useState<Date>(windowStart); // początek przewijanego okna
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<'gantt' | 'spot'>('gantt');
  const [spotSel, setSpotSel] = useState(1);
  const [selDay, setSelDay] = useState(() => iso(new Date()));
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!fisheryId && fisheries.length) setFisheryId(fisheries[0].id); }, [fisheries, fisheryId]);
  const fishery = fisheries.find((f) => f.id === fisheryId);

  const days = useMemo(() => {
    const todayIso = iso(new Date());
    return Array.from({ length: WINDOW }, (_, i) => {
      const d = addDays(start, i);
      return { iso: iso(d), dn: d.getDate(), dow: d.getDay(), weekend: [0, 6].includes(d.getDay()), today: iso(d) === todayIso, monthStart: d.getDate() === 1, month: d.getMonth() };
    });
  }, [start]);

  const spots = fishery ? Array.from({ length: fishery.total_spots }, (_, i) => i + 1) : [];
  const first = days[0]?.iso ?? '';
  const last = days[days.length - 1]?.iso ?? '';
  const dayIndex = (d: string) => days.findIndex((x) => x.iso === d);

  // Trzymaj wybrany dzień w obrębie widocznego miesiąca (po zmianie miesiąca → dziś albo 1. dnia)
  useEffect(() => {
    if (!first) return;
    if (selDay < first || selDay > last) {
      const t = iso(new Date());
      setSelDay(t >= first && t <= last ? t : first);
    }
  }, [first, last, selDay]);

  // paski: dla każdej rezerwacji × stanowisko jeden pasek (przycięty do miesiąca)
  const bars = useMemo(() => {
    const out: { r: Reservation; spot: number; left: number; width: number; key: StatusKey; block: boolean; capL: boolean; capR: boolean }[] = [];
    const trackW = days.length * COL;
    for (const r of reservations) {
      if (r.fishery_id !== fisheryId || r.status === 'cancelled') continue;
      if (r.date_to < first || r.date_from > last) continue;
      const startsBefore = r.date_from < first;
      const endsAfter = r.date_to > last;
      const vs = startsBefore ? first : r.date_from;
      const ve = endsAfter ? last : r.date_to;
      const si = dayIndex(vs), ei = dayIndex(ve);
      if (si < 0 || ei < 0) continue;
      const key = reservationStatus(r);
      // Doba od południa do południa: zameldowanie w POŁOWIE kolumny date_from, wymeldowanie
      // w POŁOWIE kolumny dnia po date_to. Skośne końce (równoległobok) sprawiają, że dwie
      // rezerwacje dzień-po-dniu stykają się ukośnym szwem na wspólnej dobie. Blokady = pełnodniowe.
      const block = r.payment === 'block';
      const startOff = block ? 0 : 0.5;
      const endOff = block ? 1 : 1.5;
      const rawLeft = startsBefore ? 0 : (si + startOff) * COL;
      const rawRight = endsAfter ? trackW : Math.min((ei + endOff) * COL, trackW);
      const left = rawLeft;
      const width = Math.max(rawRight - rawLeft, COL * 0.5);
      for (const spot of r.spots ?? []) {
        out.push({ r, spot, left, width, key, block, capL: !startsBefore, capR: !endsAfter });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, fisheryId, first, last, days.length]);

  // Etykieta zakresu okna — pokazuje, że np. kończymy czerwiec i zaczynamy lipiec.
  const rangeLabel = (() => {
    const a = days[0], b = days[days.length - 1];
    if (!a || !b) return '';
    const capit = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const mName = (mo: number) => new Date(2000, mo, 1).toLocaleDateString('pl-PL', { month: 'long' });
    const by = b.iso.split('-')[0];
    if (a.month === b.month) return `${capit(mName(a.month))} ${by}`;
    return `${capit(mName(a.month))} – ${mName(b.month)} ${by}`;
  })();
  const shiftWindow = (n: number) => setStart((s) => addDays(s, n));
  const recenter = () => setStart(windowStart());
  const monthRes = reservations.filter((r) => r.fishery_id === fisheryId && r.status !== 'cancelled'
    && r.payment !== 'block' && r.date_to >= first && r.date_from <= last).length;

  // Auto-przewinięcie poziome tak, by „dziś" było na środku widocznego obszaru.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || view !== 'gantt' || loading) return;
    const ti = days.findIndex((d) => d.today);
    el.scrollLeft = ti < 0 ? 0 : Math.max(0, 78 + ti * COL + COL / 2 - el.clientWidth / 2);
  }, [days, view, fisheryId, loading]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Kalendarz rezerwacji</h1>
          <div className="sub">Dostępność stanowisk w czasie rzeczywistym — koniec z overbookingiem</div>
        </div>
        <div className="topbar-right">
          <button className="btn ghost" disabled={!fishery} onClick={() => setBlockOpen(true)}>
            <Icon name="lock" size={15} /> Zablokuj
          </button>
          <button className="btn accent" disabled={!fishery} onClick={() => setCreating(true)}>
            <Icon name="plus" size={15} /> Nowa rezerwacja
          </button>
        </div>
      </div>

      <div className="content">
        <div className="cal-toolbar">
          <Select value={fisheryId} onChange={setFisheryId} icon="fish" width={240}
            options={fisheries.map((f) => ({ value: f.id, label: f.name }))} placeholder="Wybierz łowisko" />
          <div className="seg">
            <button className={`seg-btn ${view === 'gantt' ? 'on' : ''}`} onClick={() => setView('gantt')}>Wszystkie</button>
            <button className={`seg-btn ${view === 'spot' ? 'on' : ''}`} onClick={() => setView('spot')}>Stanowisko</button>
          </div>
          {view === 'spot' && spots.length > 0 && (
            <Select value={String(spotSel)} onChange={(v) => setSpotSel(Number(v))} icon="layers" width={170}
              options={spots.map((s) => ({ value: String(s), label: `Stanowisko ${s}` }))} />
          )}
          <div className="monthnav">
            <button className="btn ghost icon" title="Wcześniej" onClick={() => shiftWindow(-14)}><Icon name="chevronLeft" size={16} /></button>
            <span className="lbl">{rangeLabel}</span>
            <button className="btn ghost icon" title="Później" onClick={() => shiftWindow(14)}><Icon name="chevronRight" size={16} /></button>
          </div>
          <button className="btn ghost sm" onClick={recenter}><Icon name="calendar" size={15} /> Dziś</button>
          {view === 'gantt' && (
            <div className="legend">
              {(['new', 'confirmed', 'block'] as StatusKey[]).map((k) => (
                <span className="it" key={k}>
                  <span className="sw" style={{
                    background: k === 'block'
                      ? 'repeating-linear-gradient(45deg,#EF4444 0 4px,#DC2626 4px 8px)'
                      : STATUS[k].color,
                  }} /> {STATUS[k].label}
                </span>
              ))}
            </div>
          )}
        </div>

        {fishery && spots.length > 0 && (
          <div style={{ display: 'flex', gap: 18, marginBottom: 12, fontSize: 13.5, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="layers" size={15} /> {spots.length} stanowisk</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="list" size={15} /> {monthRes} rezerwacji w tym miesiącu</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="pin" size={15} /> Kliknij numer stanowiska, aby zobaczyć tylko jego rezerwacje</span>
          </div>
        )}

        {!loading && fishery && spots.length > 0 && (
          <DayMovements day={selDay} reservations={reservations} fisheryId={fisheryId} spots={spots}
            checkInHour={fishery.check_in_hour} canPrev={selDay > first} canNext={selDay < last}
            onShift={(n) => setSelDay((d) => shiftDay(d, n))} onPick={setDetail} />
        )}

        {loading ? (
          <Loader label="Wczytywanie kalendarza…" />
        ) : !fishery ? (
          <div className="card empty">Najpierw dodaj łowisko, aby zobaczyć kalendarz.</div>
        ) : spots.length === 0 ? (
          <div className="card empty">To łowisko nie ma stanowisk. Ustaw ich liczbę w edycji łowiska.</div>
        ) : view === 'spot' ? (
          <SpotCalendar spot={spotSel} days={days} reservations={reservations} fisheryId={fisheryId} onPick={setDetail} />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="gantt-wrap" ref={wrapRef}>
              <div className="gantt" style={{ minWidth: 78 + days.length * COL }}>
                {/* nagłówek dni */}
                <div className="gantt-head">
                  <div className="spot-col head">Stan.</div>
                  {days.map((d) => (
                    <div key={d.iso} className={`day-cell clickable ${d.weekend ? 'weekend' : ''} ${d.today ? 'today' : ''} ${d.iso === selDay ? 'sel' : ''} ${d.monthStart ? 'month-start' : ''}`}
                      style={{ width: COL }} onClick={() => setSelDay(d.iso)} title="Pokaż przyjazdy i wyjazdy tego dnia">
                      {d.monthStart && <span className="month-flag">{MONTH_ABBR[d.month]}</span>}
                      <div className="dn">{d.dn}</div>
                      {['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'][d.dow]}
                    </div>
                  ))}
                </div>
                {/* wiersze stanowisk */}
                {spots.map((s) => (
                  <div className="gantt-row" key={s}>
                    <div className="spot-col clickable" title="Pokaż kalendarz tego stanowiska (wolne/zajęte)"
                      onClick={() => { setSpotSel(s); setView('spot'); }}>{s}</div>
                    <div className="gantt-track" style={{ width: days.length * COL }}>
                      {days.map((d) => (
                        <div key={d.iso} className={`gc ${d.weekend ? 'weekend' : ''} ${d.today ? 'today' : ''} ${d.iso === selDay ? 'sel' : ''} ${d.monthStart ? 'month-start' : ''}`} style={{ width: COL }} />
                      ))}
                      {bars.filter((b) => b.spot === s).map((b, i) => (
                        <div key={i} className={`gantt-bar ${b.block ? 'block' : 'doba'}`}
                          style={{ left: b.left, width: b.width, background: b.block ? undefined : STATUS[b.key].color }}
                          title={`${b.r.name || 'Rezerwacja'} · ${b.r.date_from}–${b.r.date_to}`}
                          onClick={() => setDetail(b.r)}>
                          <span className="gb-label">{b.block ? (b.r.name || 'Blokada') : (b.r.name || 'Wędkarz')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <ReservationModal r={detail} checkInHour={fishery?.check_in_hour} onClose={() => setDetail(null)}
          onConfirm={async () => { await confirmReservation(detail.id); setDetail(null); reload(); }}
          onCancel={async () => { await cancelReservation(detail.id); setDetail(null); reload(); }}
          onRemoveBlock={async () => { await removeBlock(detail.id); setDetail(null); reload(); }} />
      )}
      {blockOpen && fishery && (
        <BlockModal spots={spots} onClose={() => setBlockOpen(false)}
          onSubmit={async (sel, from, to, label) => { await blockSpots(fishery.id, sel, from, to, label); setBlockOpen(false); reload(); }} />
      )}
      {creating && fishery && (
        <NewReservationModal fisheries={fisheries} reservations={reservations} defaultFisheryId={fisheryId}
          onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />
      )}
    </>
  );
}

function DayMovements({ day, reservations, fisheryId, spots, checkInHour, canPrev, canNext, onShift, onPick }: {
  day: string; reservations: Reservation[]; fisheryId: string; spots: number[]; checkInHour: number | null;
  canPrev: boolean; canNext: boolean; onShift: (n: number) => void; onPick: (r: Reservation) => void;
}) {
  const hh = `${String(checkInHour ?? 12).padStart(2, '0')}:00`;
  const prev = shiftDay(day, -1);
  const real = reservations.filter((r) => r.fishery_id === fisheryId && r.status !== 'cancelled' && r.payment !== 'block');
  // Zajętość w wybranym dniu: rezerwacja obejmuje dzień, gdy date_from <= day <= date_to
  const occupied = new Set(real.filter((r) => r.date_from <= day && r.date_to >= day).flatMap((r) => r.spots ?? []));
  const blocked = new Set(reservations.filter((r) => r.fishery_id === fisheryId && r.payment === 'block' && r.date_from <= day && r.date_to >= day).flatMap((r) => r.spots ?? []));
  const freeSpots = spots.filter((s) => !occupied.has(s) && !blocked.has(s));
  // Doba: zameldowanie w dniu date_from o HH:00; wymeldowanie rano po ostatniej nocy (date_to + 1) o HH:00.
  const arrivals = real.filter((r) => r.date_from === day).sort((a, b) => (a.spots?.[0] ?? 0) - (b.spots?.[0] ?? 0));
  const departures = real.filter((r) => r.date_to === prev).sort((a, b) => (a.spots?.[0] ?? 0) - (b.spots?.[0] ?? 0));
  const staying = real.filter((r) => r.date_from < day && r.date_to >= day).length;
  const isToday = day === iso(new Date());

  const Row = ({ r, kind }: { r: Reservation; kind: 'in' | 'out' }) => (
    <button className="mv-item" onClick={() => onPick(r)} title={`${r.date_from} – ${r.date_to}`}>
      <span className="mv-name">{r.name || 'Wędkarz'}</span>
      <span className="mv-spots">
        {(r.spots ?? []).map((s) => (
          <span key={s} className="mv-spot" title={`Stanowisko ${s}`}>{s}</span>
        ))}
      </span>
      <span className="mv-time">{kind === 'in' ? `od ${hh}` : `do ${hh}`}</span>
    </button>
  );

  return (
    <div className="card mv-card">
      <div className="mv-head">
        <div className="mv-nav">
          <button className="btn ghost icon" disabled={!canPrev} onClick={() => onShift(-1)}><Icon name="chevronLeft" size={16} /></button>
          <div className="mv-daylabel">
            <Icon name="calendar" size={15} /> {dayLabel(day)}{isToday && <span className="mv-today">dziś</span>}
          </div>
          <button className="btn ghost icon" disabled={!canNext} onClick={() => onShift(1)}><Icon name="chevronRight" size={16} /></button>
        </div>
        <div className="mv-summary">
          <span className="mv-stat in"><b>{arrivals.length}</b> {plural(arrivals.length, 'przyjazd', 'przyjazdy', 'przyjazdów')}</span>
          <span className="mv-stat out"><b>{departures.length}</b> {plural(departures.length, 'wyjazd', 'wyjazdy', 'wyjazdów')}</span>
          <span className="mv-stat stay">{staying} na łowisku</span>
        </div>
      </div>

      {/* Dziś wolne / zajęte stanowiska — najważniejsza informacja dla właściciela */}
      <div className="mv-today-spots">
        <div className="mv-ts-head">
          <span className="mv-ts-count free"><b>{freeSpots.length}</b> wolnych</span>
          <span className="mv-ts-count taken"><b>{occupied.size + blocked.size}</b> zajętych</span>
          <span className="mv-ts-of">z {spots.length} stanowisk</span>
        </div>
        <div className="mv-ts-grid">
          {spots.map((s) => {
            const isBlocked = blocked.has(s);
            const isTaken = occupied.has(s);
            const st = isBlocked ? 'block' : isTaken ? 'taken' : 'free';
            return <span key={s} className={`mv-ts-spot ${st}`} title={isBlocked ? `Stanowisko ${s} · zablokowane` : isTaken ? `Stanowisko ${s} · zajęte` : `Stanowisko ${s} · wolne`}>{s}</span>;
          })}
        </div>
      </div>

      <div className="mv-cols">
        <div className="mv-col">
          <div className="mv-coltitle in"><span className="mv-arrow">↘</span> Przyjazdy <small>przyjazd od {hh}</small></div>
          {arrivals.length === 0 ? <div className="mv-empty">Nikt nie przyjeżdża</div>
            : arrivals.map((r) => <Row key={`i${r.id}`} r={r} kind="in" />)}
        </div>
        <div className="mv-col">
          <div className="mv-coltitle out"><span className="mv-arrow">↗</span> Wyjazdy <small>wyjazd do {hh}</small></div>
          {departures.length === 0 ? <div className="mv-empty">Nikt nie wyjeżdża</div>
            : departures.map((r) => <Row key={`o${r.id}`} r={r} kind="out" />)}
        </div>
      </div>
    </div>
  );
}

function SpotCalendar({ spot, days, reservations, fisheryId, onPick }: {
  spot: number;
  days: { iso: string; dn: number; dow: number; weekend: boolean; today: boolean }[];
  reservations: Reservation[]; fisheryId: string; onPick: (r: Reservation) => void;
}) {
  const WD = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
  const lead = days.length ? (days[0].dow + 6) % 7 : 0;
  const cells: (typeof days[number] | null)[] = [...Array(lead).fill(null), ...days];
  const resFor = (iso: string) => reservations.find((r) => r.fishery_id === fisheryId && r.status !== 'cancelled' && (r.spots?.includes(spot)) && r.date_from <= iso && r.date_to >= iso);
  const free = days.filter((d) => !resFor(d.iso)).length;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="spot-badge"><Icon name="layers" size={15} /> Stanowisko {spot}</span>
          <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>kalendarz dostępności</span>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>{free} z {days.length} dni wolnych</span>
      </div>
      <div className="df-wd" style={{ marginBottom: 6 }}>{WD.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="spotcal-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const r = resFor(d.iso);
          const isBlock = r?.payment === 'block';
          return (
            <button key={d.iso} className={`spotcal-day ${r ? 'taken' : 'free'} ${isBlock ? 'blocked' : ''} ${d.today ? 'today' : ''}`}
              onClick={() => r && onPick(r)} disabled={!r}
              title={r ? `${r.name || 'Rezerwacja'} · ${r.date_from}–${r.date_to}` : 'Wolne'}>
              <span className="scd-n">{d.dn}</span>
              {r
                ? <span className="scd-label">{isBlock ? 'blokada' : (r.name ? r.name.split(' ')[0] : 'zajęte')}</span>
                : <span className="scd-label">wolne</span>}
            </button>
          );
        })}
      </div>
      <div className="legend" style={{ marginTop: 14 }}>
        <span className="it"><span className="sw" style={{ background: '#22C55E' }} /> Wolne</span>
        <span className="it"><span className="sw" style={{ background: '#EF4444' }} /> Zajęte</span>
        <span className="it"><span className="sw" style={{ background: 'repeating-linear-gradient(45deg,#DC2626 0 4px,#991B1B 4px 8px)' }} /> Blokada właściciela</span>
      </div>
    </div>
  );
}

function BlockModal({ spots, onClose, onSubmit }: {
  spots: number[]; onClose: () => void; onSubmit: (spots: number[], from: string, to: string, label: string) => Promise<void>;
}) {
  const t = iso(new Date());
  const [sel, setSel] = useState<number[]>([]);
  const [from, setFrom] = useState(t);
  const [to, setTo] = useState(t);
  const [label, setLabel] = useState('Konserwacja');
  const [busy, setBusy] = useState(false);
  const toggle = (s: number) => setSel((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);
  const submit = async () => {
    if (sel.length === 0) { toast('Zaznacz przynajmniej jedno stanowisko', 'error'); return; }
    if (to < from) { toast('Data końcowa nie może być wcześniejsza niż początkowa', 'error'); return; }
    setBusy(true);
    try { await onSubmit(sel, from, to, label || 'Blokada'); } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); setBusy(false); }
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h3>Zablokuj stanowiska</h3><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Konserwacja, zawody — bez rezerwacji.</div></div>
          <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <label>Stanowiska</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
            {spots.map((s) => (
              <span key={s} className={`chip ${sel.includes(s) ? 'on' : ''}`} style={{ padding: '7px 12px' }} onClick={() => toggle(s)}>{s}</span>
            ))}
          </div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Od</label><DateField value={from} onChange={setFrom} /></div>
          <div className="field" style={{ flex: 1 }}><label>Do</label><DateField value={to} onChange={setTo} min={from} /></div>
        </div>
        <div className="field"><label>Opis</label><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Konserwacja" /></div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn ghost" onClick={onClose}>Anuluj</button>
          <button className="btn" disabled={busy} onClick={submit}>{busy ? 'Blokowanie…' : `Zablokuj (${sel.length})`}</button>
        </div>
      </div>
    </div>
  );
}
