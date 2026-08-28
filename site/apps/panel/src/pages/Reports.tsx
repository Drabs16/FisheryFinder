import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { useOwnerData } from '../lib/useOwnerData';
import { topSpots, revenueSplit, reservationStatus, periodOccupancy } from '../lib/api';
import { colors, STATUS } from '../theme';
import Icon, { type IconName } from '../components/Icon';
import Select from '../components/Select';
import Loader from '../components/Loader';
import ChartTooltip from '../components/ChartTooltip';
import { OccupancyHeatmap } from './Analytics';
import type { Reservation } from '../lib/types';

const zl = (n: number) => `${Math.round(n).toLocaleString('pl-PL')} zł`;
const kZl = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} tys` : String(Math.round(n)));
const isReal = (r: Reservation) => r.payment !== 'block' && r.status !== 'cancelled';
const monthKeyOf = (r: Reservation) => (r.date_from || '').slice(0, 7);
const thisMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const shiftMonth = (key: string, by: number) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const daysInMonth = (key: string) => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); };

export default function Reports() {
  const { fisheries, reservations, loading, error } = useOwnerData();
  const [fishery, setFishery] = useState('all');
  const [month, setMonth] = useState(thisMonthKey());

  const scoped = useMemo(
    () => reservations.filter((r) => fishery === 'all' || r.fishery_id === fishery),
    [reservations, fishery],
  );
  const cur = useMemo(() => scoped.filter((r) => monthKeyOf(r) === month), [scoped, month]);
  const prevKey = shiftMonth(month, -1);
  const prev = useMemo(() => scoped.filter((r) => monthKeyOf(r) === prevKey), [scoped, prevKey]);

  const sum = (rs: Reservation[]) => rs.filter(isReal).reduce((s, r) => s + (Number(r.total) || 0), 0);
  const realCount = (rs: Reservation[]) => rs.filter(isReal).length;

  const revenue = sum(cur);
  const prevRevenue = sum(prev);
  const count = realCount(cur);
  const prevCount = realCount(prev);
  const avg = count ? revenue / count : 0;
  const split = useMemo(() => revenueSplit(cur), [cur]);
  const spots = useMemo(() => topSpots(cur, 6), [cur]);

  // Obłożenie miesiąca: udział sprzedanych stanowisko-dób w pojemności łowiska
  const occFisheries = useMemo(() => (fishery === 'all' ? fisheries : fisheries.filter((f) => f.id === fishery)), [fisheries, fishery]);
  const selFishery = fishery === 'all' ? null : fisheries.find((f) => f.id === fishery) ?? null;
  const monthEnd = (key: string) => `${key}-${String(daysInMonth(key)).padStart(2, '0')}`;
  const occ = useMemo(() => periodOccupancy(scoped, occFisheries, `${month}-01`, monthEnd(month)), [scoped, occFisheries, month]);
  const prevOcc = useMemo(() => periodOccupancy(scoped, occFisheries, `${prevKey}-01`, monthEnd(prevKey)), [scoped, occFisheries, prevKey]);
  const guests = useMemo(() => new Set(cur.filter(isReal).map((r) => (r.name || '').trim().toLowerCase()).filter(Boolean)).size, [cur]);

  // Przychód dzień po dniu w miesiącu
  const daily = useMemo(() => {
    const n = daysInMonth(month);
    const arr = Array.from({ length: n }, (_, i) => ({ day: i + 1, revenue: 0 }));
    for (const r of cur) {
      if (!isReal(r)) continue;
      const d = Number((r.date_from || '').slice(8, 10));
      if (d >= 1 && d <= n) arr[d - 1].revenue += Number(r.total) || 0;
    }
    return arr;
  }, [cur, month]);

  // Struktura statusów
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of cur) { const k = reservationStatus(r); if (k !== 'block') c[k] = (c[k] ?? 0) + 1; }
    return c;
  }, [cur]);

  const delta = (now: number, before: number) => {
    if (before === 0) return now === 0 ? null : 100;
    return Math.round(((now - before) / before) * 100);
  };
  const revDelta = delta(revenue, prevRevenue);
  const cntDelta = delta(count, prevCount);
  const occPp = occ.pct - prevOcc.pct; // różnica w punktach procentowych m/m
  const bestDay = daily.reduce((b, d) => (d.revenue > b.revenue ? d : b), { day: 0, revenue: 0 });
  const occNote = count > 0
    ? `Obłożenie ${occ.pct}% pojemności${prevOcc.pct > 0 ? ` (${occPp >= 0 ? '+' : ''}${occPp} p.p. m/m)` : ''}.`
    : '';

  // Podsumowanie miesiąca (rzeczowe)
  const narrative = (() => {
    if (count === 0) return 'Brak rezerwacji w wybranym miesiącu.';
    if (revDelta === null) return 'Pierwszy miesiąc z danymi — brak okresu do porównania.';
    if (revDelta > 0) return `Przychód wyższy o ${revDelta}% względem poprzedniego miesiąca.`;
    if (revDelta < 0) return `Przychód niższy o ${Math.abs(revDelta)}% względem poprzedniego miesiąca.`;
    return 'Przychód na poziomie poprzedniego miesiąca.';
  })();

  return (
    <>
      <div className="topbar">
        <div><h1>Raport miesięczny</h1><div className="sub">Zwięzłe podsumowanie miesiąca — gotowe do druku i archiwum</div></div>
        <div className="topbar-right">
          <button className="btn accent" disabled={count === 0} onClick={() => window.print()}><Icon name="arrowUp" size={16} /> Pobierz PDF</button>
        </div>
      </div>

      <div className="content report">
        {error && <div className="notice err">{error}</div>}

        {/* Nawigator miesiąca + łowisko */}
        <div className="row" style={{ marginBottom: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="month-nav">
            <button className="btn ghost icon" onClick={() => setMonth((m) => shiftMonth(m, -1))} title="Poprzedni miesiąc"><Icon name="chevronLeft" size={18} /></button>
            <span className="month-nav-label">{monthLabel(month)}</span>
            <button className="btn ghost icon" disabled={month >= thisMonthKey()} onClick={() => setMonth((m) => shiftMonth(m, 1))} title="Następny miesiąc"><Icon name="chevronRight" size={18} /></button>
            {month !== thisMonthKey() && <button className="btn ghost sm" onClick={() => setMonth(thisMonthKey())}>Ten miesiąc</button>}
          </div>
          {fisheries.length > 1 && (
            <Select value={fishery} onChange={setFishery} icon="fish" width={220}
              options={[{ value: 'all', label: 'Wszystkie łowiska' }, ...fisheries.map((f) => ({ value: f.id, label: f.name }))]} />
          )}
        </div>

        {loading ? <Loader label="Wczytywanie raportu…" /> : (
          <>
            {/* Nagłówek raportu + narracja */}
            <div className="report-hero card">
              <div>
                <div className="report-hero-kicker">Raport · {fishery === 'all' ? 'wszystkie łowiska' : fisheries.find((f) => f.id === fishery)?.name}</div>
                <h2 className="report-hero-title">{monthLabel(month)}</h2>
                <p className="report-hero-narr">{narrative}{occNote ? ` ${occNote}` : ''}</p>
              </div>
              <div className="report-hero-amount">
                <div className="muted" style={{ fontSize: 12.5 }}>Przychód miesiąca</div>
                <div className="report-hero-big">{zl(revenue)}</div>
                {revDelta !== null && <Delta v={revDelta} suffix="vs poprzedni miesiąc" />}
              </div>
            </div>

            {/* KPI */}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginTop: 16 }}>
              <Kpi icon="tag" label="Przychód" value={zl(revenue)} delta={revDelta} />
              <Kpi icon="layers" label="Obłożenie" value={`${occ.pct}%`} delta={prevOcc.pct > 0 ? occPp : undefined} deltaUnit="p.p." />
              <Kpi icon="list" label="Rezerwacje" value={String(count)} delta={cntDelta} />
              <Kpi icon="card" label="Średnia wartość" value={zl(avg)} />
              <Kpi icon="users" label="Unikalni goście" value={String(guests)} />
            </div>

            {count === 0 ? (
              <div className="card empty" style={{ marginTop: 16 }}>
                <div className="big"><Icon name="image" size={26} /></div>
                Brak rezerwacji w tym miesiącu. Wybierz inny miesiąc strzałkami powyżej.
              </div>
            ) : (
              <>
              <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', marginTop: 16 }}>
                {/* Przychód dzień po dniu */}
                <div className="card">
                  <div className="card-head">
                    <div className="card-title"><span className="ico"><Icon name="chart" size={18} /></span> Przychód dzień po dniu</div>
                    {bestDay.revenue > 0 && <div className="card-hint">Najlepszy dzień: {bestDay.day}. ({zl(bestDay.revenue)})</div>}
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={daily} margin={{ left: -14, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: colors.textSecondary }} axisLine={false} tickLine={false} interval={2} />
                      <YAxis tick={{ fontSize: 11, fill: colors.textSecondary }} axisLine={false} tickLine={false} tickFormatter={kZl} width={44} />
                      <Tooltip content={<ChartTooltip money />} cursor={{ fill: 'rgba(82,183,136,0.08)' }} />
                      <Bar dataKey="revenue" name="Przychód" radius={[5, 5, 0, 0]}>
                        {daily.map((d) => <Cell key={d.day} fill={d.day === bestDay.day && bestDay.revenue > 0 ? colors.primary : colors.accent} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Podział przychodu + statusy + stanowiska */}
                <div className="card">
                  <div className="card-head"><div className="card-title"><span className="ico"><Icon name="layers" size={18} /></span> Co złożyło się na miesiąc</div></div>
                  <div className="report-split">
                    <SplitRow color={colors.warning} label="Gotówka na miejscu" value={zl(split.cash)} pct={split.total ? Math.round((split.cash / split.total) * 100) : 0} />
                    <SplitRow color={colors.water} label="Płatności online" value={zl(split.online)} pct={split.total ? Math.round((split.online / split.total) * 100) : 0} />
                  </div>
                  <div className="report-mini-head">Rezerwacje wg statusu</div>
                  <div className="report-chips">
                    {(['new', 'confirmed', 'cancelled'] as const).map((k) => (
                      <span key={k} className="report-chip"><span className="dot" style={{ background: STATUS[k].color }} /> {STATUS[k].label.split(' —')[0]}: <b>{statusCounts[k] ?? 0}</b></span>
                    ))}
                  </div>
                  <div className="report-mini-head">Najpopularniejsze stanowiska</div>
                  {spots.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>Brak danych o stanowiskach.</div> : (
                    <div>
                      {spots.map((s, i) => {
                        const max = spots[0]?.count || 1;
                        return (
                          <div className={`rank-row ${i === 0 ? 'first' : ''}`} key={s.spot}>
                            <span className="rr-num">{i + 1}</span>
                            <span className="rr-name">Stanowisko {s.spot.replace('Nr ', '')}</span>
                            <span className="rr-bar"><span style={{ width: `${Math.max(8, (s.count / max) * 100)}%` }} /></span>
                            <span className="rr-val">{s.count} {s.count === 1 ? 'rezerwacja' : s.count < 5 ? 'rezerwacje' : 'rezerwacji'}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {selFishery
                ? <OccupancyHeatmap reservations={scoped} totalSpots={selFishery.total_spots} hasFishery monthKey={month} />
                : <div className="card" style={{ marginTop: 16 }}><div className="card-head"><div className="card-title"><span className="ico"><Icon name="layers" size={18} /></span> Mapa obłożenia</div></div><div className="empty">Wybierz jedno łowisko u góry, aby dołączyć do raportu mapę obłożenia dzień po dniu.</div></div>}
              </>
            )}

            <div className="hint" style={{ marginTop: 16 }}>
              <Icon name="lock" size={13} /> Raport liczony z Twoich rezerwacji w panelu. „Drukuj / PDF" tworzy czystą wersję do zapisania lub wysłania.
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Kpi({ icon, label, value, delta, deltaUnit }: { icon: IconName; label: string; value: string; delta?: number | null; deltaUnit?: string }) {
  return (
    <div className="stat">
      <div className="label"><Icon name={icon} size={15} color={colors.accent} /> {label}</div>
      <div className="value">{value}</div>
      {delta !== undefined && delta !== null && <Delta v={delta} suffix="vs poprzedni" unit={deltaUnit} />}
    </div>
  );
}

function Delta({ v, suffix, unit = '%' }: { v: number; suffix: string; unit?: string }) {
  const up = v >= 0;
  return (
    <div className={`report-delta ${up ? 'up' : 'down'}`}>
      <span className="report-delta-arrow" style={{ transform: up ? 'none' : 'rotate(180deg)' }}><Icon name="arrowUp" size={12} /></span>
      {up ? '+' : ''}{v}{unit} <span className="muted" style={{ fontWeight: 500 }}>{suffix}</span>
    </div>
  );
}

function SplitRow({ color, label, value, pct }: { color: string; label: string; value: string; pct: number }) {
  return (
    <div className="report-split-row">
      <div className="report-split-top"><span>{label}</span><b>{value}</b></div>
      <div className="report-bar"><span style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}
