import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOwnerData } from '../lib/useOwnerData';
import { cancelReservation, confirmReservation, paymentKind, removeBlock, reservationStatus, revenueSplit } from '../lib/api';
import { colors, PAY, STATUS, type StatusKey } from '../theme';
import Icon from '../components/Icon';
import Select from '../components/Select';
import ReservationModal from '../components/ReservationModal';
import NewReservationModal from '../components/NewReservationModal';
import { toast } from '../components/Toast';
import { confirmDialog } from '../components/Confirm';
import { downloadCsv, downloadXls } from '../lib/export';
import type { Reservation } from '../lib/types';
import Loader from '../components/Loader';

type Filter = 'all' | StatusKey;

const fmt = (d: string) => new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
const range = (r: Reservation) => (r.date_from === r.date_to ? fmt(r.date_from) : `${fmt(r.date_from)} – ${fmt(r.date_to)}`);
const zl = (n: number) => `${Math.round(Number(n)).toLocaleString('pl-PL')} zł`;
const initials = (s: string) => s.trim().split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase() || 'W';

export default function Reservations() {
  const { fisheries, reservations, loading, error, reload } = useOwnerData();
  const [params] = useSearchParams();
  const [fishery, setFishery] = useState(params.get('fishery') ?? 'all');
  const [spot, setSpot] = useState(params.get('spot') ?? 'all');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<Reservation | null>(null);
  const [creating, setCreating] = useState(false);

  // Stanowiska do filtra: dla wybranego łowiska jego liczba, dla „wszystkich" — max wśród łowisk.
  const maxSpots = useMemo(() => {
    const scope = fishery === 'all' ? fisheries : fisheries.filter((f) => f.id === fishery);
    return scope.reduce((m, f) => Math.max(m, f.total_spots || 0), 0);
  }, [fisheries, fishery]);
  const spotOptions = Array.from({ length: maxSpots }, (_, i) => i + 1);

  const scoped = useMemo(() => reservations
    .filter((r) => (fishery === 'all' ? true : r.fishery_id === fishery))
    .filter((r) => (spot === 'all' ? true : r.spots?.includes(Number(spot)))), [reservations, fishery, spot]);

  const rows = useMemo(() => scoped.filter((r) => filter === 'all' ? true : reservationStatus(r) === filter), [scoped, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of scoped) { const k = reservationStatus(r); c[k] = (c[k] ?? 0) + 1; }
    return c;
  }, [scoped]);
  const split = useMemo(() => revenueSplit(scoped), [scoped]);

  const act = async (fn: () => Promise<void>) => { try { await fn(); reload(); setOpen(null); } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); } };

  // Potwierdzenie / odrzucenie / anulowanie zawsze z pytaniem.
  const askConfirm = async (r: Reservation) => {
    if (!(await confirmDialog({ title: 'Potwierdzić rezerwację?', message: `Rezerwacja „${r.name || 'Wędkarz'}" w „${r.fishery_name}" (${range(r)}) zostanie potwierdzona. Wędkarz zobaczy potwierdzenie w aplikacji.`, confirmLabel: 'Potwierdź rezerwację', icon: 'check' }))) return;
    act(() => confirmReservation(r.id));
  };
  const askCancel = async (r: Reservation) => {
    const isNew = reservationStatus(r) === 'new';
    const ok = await confirmDialog(isNew
      ? { title: 'Odrzucić rezerwację?', message: `Zgłoszenie „${r.name || 'Wędkarz'}" (${range(r)}) zostanie odrzucone. Wędkarz dostanie informację w aplikacji.`, confirmLabel: 'Odrzuć', danger: true }
      : { title: 'Anulować potwierdzoną rezerwację?', message: `Rezerwacja „${r.name || 'Wędkarz'}" (${range(r)}) zostanie anulowana, a stanowisko zwolnione. Wędkarz dostanie informację o anulowaniu w aplikacji.`, confirmLabel: 'Anuluj rezerwację', danger: true });
    if (!ok) return;
    act(() => cancelReservation(r.id));
  };

  const exportRows = () => [['Klient', 'Telefon', 'Łowisko', 'Od', 'Do', 'Dni', 'Stanowiska', 'Kwota (zł)', 'Płatność', 'Status'],
    ...rows.map((r) => [r.name || '', r.phone || '', r.fishery_name, r.date_from, r.date_to, r.days, (r.spots || []).join(' '), Math.round(Number(r.total)), r.payment || '', STATUS[reservationStatus(r)].label])];

  const labels: Record<Filter, string> = { all: 'Wszystkie', new: 'Nowe', confirmed: 'Potwierdzone', cancelled: 'Anulowane', block: 'Blokady' };

  return (
    <>
      <div className="topbar">
        <div><h1>Rezerwacje</h1><div className="sub">Centrum zarządzania zgłoszeniami z Twoich łowisk</div></div>
        <div className="topbar-right">
          <button className="btn ghost" disabled={rows.length === 0} onClick={() => downloadXls('rezerwacje', 'Rezerwacje', exportRows())}><Icon name="arrowUp" size={16} /> Excel</button>
          <button className="btn ghost" disabled={rows.length === 0} onClick={() => downloadCsv('rezerwacje', exportRows())}><Icon name="arrowUp" size={16} /> CSV</button>
          <button className="btn accent" disabled={fisheries.length === 0} onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> Nowa rezerwacja
          </button>
        </div>
      </div>
      <div className="content">
        {error && <div className="notice err">{error}</div>}

        <div className="grid cols-4" style={{ marginBottom: 18 }}>
          <MiniStat icon="bell" label="Nowe — do potwierdzenia" value={String(counts.new ?? 0)} color={STATUS.new.color} />
          <MiniStat icon="check" label="Potwierdzone" value={String(counts.confirmed ?? 0)} color={STATUS.confirmed.color} />
          <MiniStat icon="tag" label="Przychód gotówka" value={zl(split.cash)} color={PAY.cash.color} />
          <MiniStat icon="globe" label="Przychód online" value={zl(split.online)} color={PAY.online.color} />
        </div>

        <div className="row" style={{ marginBottom: 16, alignItems: 'center' }}>
          <Select value={fishery} onChange={(v) => { setFishery(v); setSpot('all'); }} icon="fish" width={220}
            options={[{ value: 'all', label: 'Wszystkie łowiska' }, ...fisheries.map((f) => ({ value: f.id, label: f.name }))]} />
          <Select value={spot} onChange={setSpot} icon="layers" width={200} disabled={spotOptions.length === 0}
            options={[{ value: 'all', label: 'Wszystkie stanowiska' }, ...spotOptions.map((s) => ({ value: String(s), label: `Stanowisko ${s}` }))]} />
          <div className="row">
            {(['all', 'new', 'confirmed', 'cancelled', 'block'] as Filter[]).map((f) => (
              <span key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{labels[f]}</span>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          {loading ? <Loader label="Wczytywanie rezerwacji…" />
            : rows.length === 0 ? <div className="empty"><div className="big"><Icon name="list" size={26} /></div>Brak rezerwacji dla wybranych filtrów.</div>
              : (
                <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead><tr><th>Klient</th><th>Łowisko</th><th>Termin</th><th>Stan.</th><th>Kwota</th><th>Płatność</th><th>Status</th><th style={{ textAlign: 'right' }}>Akcje</th></tr></thead>
                  <tbody>
                    {rows.map((r) => {
                      const k = reservationStatus(r);
                      const st = STATUS[k];
                      const isBlock = k === 'block';
                      const pay = PAY[paymentKind(r)];
                      return (
                        <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(r)}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="ava-sm">{isBlock ? <Icon name="lock" size={15} /> : initials(r.name || 'W')}</div>
                              <div>
                                <div style={{ fontWeight: 700 }}>{r.name || (isBlock ? 'Blokada' : 'Wędkarz')}</div>
                                {r.phone && <div style={{ fontSize: 12.5, color: colors.textSecondary }}>{r.phone}</div>}
                              </div>
                            </div>
                          </td>
                          <td>{r.fishery_name}</td>
                          <td><span className="meta-chip date"><Icon name="calendar" size={12} /> {range(r)}</span> <span style={{ color: colors.textSecondary, fontSize: 12.5 }}>{r.days} d</span></td>
                          <td>{r.spots?.length ? <span className="spot-nums">{r.spots.map((s) => <span key={s} className="spot-pill">{s}</span>)}</span> : '—'}</td>
                          <td style={{ fontWeight: 700 }}>{isBlock ? '—' : zl(r.total)}</td>
                          <td>{isBlock ? '—' : <span className="badge" style={{ background: '#F3F4F6', color: pay.color }}><span className="dot" style={{ background: pay.color }} /> {pay.label}</span>}</td>
                          <td><span className="badge" style={{ background: '#F3F4F6', color: st.color }}><span className="dot" style={{ background: st.color }} /> {st.label}</span></td>
                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                              {isBlock ? (
                                <button className="btn ghost sm" onClick={() => act(() => removeBlock(r.id))}><Icon name="trash" size={14} /></button>
                              ) : k === 'cancelled' ? <span style={{ color: colors.textSecondary, fontSize: 13 }}>—</span>
                                : (
                                  <>
                                    {k === 'new' && <button className="btn accent sm" onClick={() => askConfirm(r)}><Icon name="check" size={14} /> Potwierdź</button>}
                                    <button className="btn ghost sm danger" title={k === 'new' ? 'Odrzuć' : 'Anuluj'} onClick={() => askCancel(r)}><Icon name="x" size={14} />{k === 'new' ? ' Odrzuć' : ''}</button>
                                  </>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
        </div>
      </div>

      {open && (
        <ReservationModal r={open} checkInHour={fisheries.find((f) => f.id === open.fishery_id)?.check_in_hour} onClose={() => setOpen(null)}
          onConfirm={() => askConfirm(open)}
          onCancel={() => askCancel(open)}
          onRemoveBlock={() => act(() => removeBlock(open.id))} />
      )}
      {creating && (
        <NewReservationModal fisheries={fisheries} reservations={reservations} defaultFisheryId={fishery !== 'all' ? fishery : undefined}
          defaultSpot={spot !== 'all' ? Number(spot) : undefined}
          onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />
      )}
    </>
  );
}

function MiniStat({ icon, label, value, color }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string; color: string }) {
  return (
    <div className="stat" style={{ padding: '15px 18px' }}>
      <div className="label"><Icon name={icon} size={15} color={color} /> {label}</div>
      <div className="value" style={{ fontSize: 24, marginTop: 5 }}>{value}</div>
    </div>
  );
}
