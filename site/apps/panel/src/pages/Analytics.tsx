import { useMemo, useState, type ReactNode } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  AreaChart, Area, ComposedChart, Line, Legend, Brush, PieChart, Pie,
} from 'recharts';
import Counter from '../components/Counter';
import { useOwnerData } from '../lib/useOwnerData';
import {
  revenueByMonth, revenueSplit,
  aggregateCustomers, demandByWeekday, avgLeadTimeDays, cancellationRate,
  periodOccupancy, spotOccupancy, pipelineStats, monthlyStats, customerStats,
} from '../lib/api';
import { colors, PAY } from '../theme';
import Icon, { type IconName } from '../components/Icon';
import Select from '../components/Select';
import ChartTooltip from '../components/ChartTooltip';
import { downloadCsv, downloadXls } from '../lib/export';
import type { Reservation } from '../lib/types';

const zl = (n: number) => `${Math.round(n).toLocaleString('pl-PL')} zł`;
// Kompaktowy format osi: 3480 → „3,5 tys", żeby oś przychodu była czytelna.
const kZl = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} tys` : String(Math.round(n)));
const isReal = (r: Reservation) => r.payment !== 'block' && r.status !== 'cancelled';
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const RANGES = [{ k: '30', l: '30 dni' }, { k: '90', l: '90 dni' }, { k: '365', l: 'Rok' }, { k: 'all', l: 'Całość' }];
const fmtDay = (iso: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');
const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (n === 1) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export default function Analytics() {
  const { fisheries, reservations, loading, error } = useOwnerData();
  const [fishery, setFishery] = useState('all');
  const [range, setRange] = useState('all');

  const cutoff = useMemo(() => {
    if (range === 'all') return '';
    const d = new Date(); d.setDate(d.getDate() - Number(range));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [range]);

  // Rezerwacje przefiltrowane łowiskiem (pełna historia — pipeline, sezonowość, retencja)
  const fScoped = useMemo(() => reservations.filter((r) => fishery === 'all' || r.fishery_id === fishery), [reservations, fishery]);
  // + dodatkowo zawężone wybranym zakresem czasu (przychody, klienci, obłożenie okna)
  const rs = useMemo(() => fScoped.filter((r) => range === 'all' || r.date_from >= cutoff), [fScoped, range, cutoff]);

  const occFisheries = useMemo(() => (fishery === 'all' ? fisheries : fisheries.filter((f) => f.id === fishery)), [fisheries, fishery]);
  const selFishery = fishery === 'all' ? null : fisheries.find((f) => f.id === fishery) ?? null;

  const months = useMemo(() => revenueByMonth(rs).map((m) => {
    const [y, mo] = m.month.split('-');
    return { ...m, label: `${MONTHS[Number(mo) - 1]} ${y.slice(2)}` };
  }), [rs]);
  const weekday = useMemo(() => demandByWeekday(rs), [rs]);
  const customers = useMemo(() => aggregateCustomers(rs), [rs]);
  const split = useMemo(() => revenueSplit(rs), [rs]);
  const cancel = useMemo(() => cancellationRate(rs), [rs]);
  const leadTime = useMemo(() => avgLeadTimeDays(rs), [rs]);

  // Okno obłożenia: zakres wstecz → [cutoff..dziś]; „Całość" → [pierwsza rezerwacja..dziś]
  const today = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }, []);
  const occFrom = useMemo(() => {
    if (range !== 'all') return cutoff;
    const past = rs.filter(isReal).map((r) => r.date_from).filter((d) => d <= today);
    return past.length ? past.reduce((m, d) => (d < m ? d : m), past[0]) : today;
  }, [range, cutoff, rs, today]);
  const occ = useMemo(() => periodOccupancy(rs, occFisheries, occFrom, today), [rs, occFisheries, occFrom, today]);
  const spotFill = useMemo(() => (selFishery?.total_spots ? spotOccupancy(rs, selFishery.total_spots, occFrom, today) : []), [selFishery, rs, occFrom, today]);
  const pipeline = useMemo(() => pipelineStats(fScoped), [fScoped]);
  const season = useMemo(() => monthlyStats(fScoped, occFisheries), [fScoped, occFisheries]);
  const cust = useMemo(() => customerStats(fScoped), [fScoped]);

  const real = rs.filter(isReal);
  const totalRevenue = real.reduce((s, r) => s + (Number(r.total) || 0), 0);
  // Rozdziel zarobione (pobyt już za nami) od nadchodzących (zakontraktowane, jeszcze przed nami)
  const earnedRevenue = real.filter((r) => r.date_to < today).reduce((s, r) => s + (Number(r.total) || 0), 0);
  const upcomingRevenue = Math.max(0, totalRevenue - earnedRevenue);
  const avg = real.length ? totalRevenue / real.length : 0;
  const onlinePct = split.total ? Math.round((split.online / split.total) * 100) : 0;
  const peakMonth = season.reduce((b, m) => (m.occPct > (b?.occPct ?? -1) ? m : b), null as (typeof season)[number] | null);
  const deadMonth = season.length > 1 ? season.reduce((b, m) => (m.occPct < (b?.occPct ?? 101) ? m : b), null as (typeof season)[number] | null) : null;

  const customerRows = () => [['Klient', 'Telefon', 'Rezerwacje', 'Stanowisko-dni', 'Przychód (zł)', 'Ostatnia wizyta'],
    ...customers.map((c) => [c.name, c.phone || '', c.bookings, c.spotNights, Math.round(c.total), c.lastVisit])];

  // Plain-language summary — żeby właściciel od razu wiedział, co i jak.
  const rangeLabel = (RANGES.find((r) => r.k === range)?.l ?? '').toLowerCase();
  const tip = deadMonth && deadMonth.month !== peakMonth?.month
    ? `Najsłabszy miesiąc to ${deadMonth.label} (${deadMonth.occPct}% obłożenia) — dobry moment na promocję.`
    : peakMonth ? `Najlepiej sprzedaje się ${peakMonth.label} (${peakMonth.occPct}% obłożenia).` : '';

  return (
    <>
      <div className="topbar">
        <div><h1>Analityka</h1><div className="sub">Przychody, klienci, popyt i sezonowość — w jednym miejscu</div></div>
        <Select value={fishery} onChange={setFishery} icon="fish" width={240}
          options={[{ value: 'all', label: 'Wszystkie łowiska' }, ...fisheries.map((f) => ({ value: f.id, label: f.name }))]} />
      </div>
      <div className="content">
        {error && <div className="notice err">{error}</div>}
        {loading ? (
          <>
            <div className="grid cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div className="skel-stat" key={i}>
                  <div className="skeleton" style={{ height: 13, width: '55%' }} />
                  <div className="skeleton" style={{ height: 26, width: '70%', marginTop: 12 }} />
                </div>
              ))}
            </div>
            <div className="card" style={{ marginTop: 18 }}><div className="skeleton" style={{ height: 220 }} /></div>
          </>
        ) : (
          <>
            <div className="seg" style={{ marginBottom: 18 }}>
              {RANGES.map((r) => (
                <button key={r.k} className={`seg-btn ${range === r.k ? 'on' : ''}`} onClick={() => setRange(r.k)}>{r.l}</button>
              ))}
            </div>

            {real.length === 0 ? (
              <div className="card empty"><div className="big"><Icon name="chart" size={26} /></div>Za mało danych w wybranym zakresie.</div>
            ) : (
              <>
                <div className="an-summary">
                  <div className="an-summary-ic"><Icon name="chart" size={20} /></div>
                  <div>
                    <div className="an-summary-main">W zakresie „{rangeLabel}" zarobiłeś <b>{zl(earnedRevenue)}</b>{upcomingRevenue > 0 && <> · w kalendarzu czeka jeszcze <b>{zl(upcomingRevenue)}</b> nadchodzących rezerwacji</>} · obłożenie <b>{Math.round(occ.pct)}%</b> · {cust.returningPct}% klientów wraca.</div>
                    {tip && <div className="an-summary-tip"><Icon name="sparkles" size={13} /> {tip}</div>}
                  </div>
                </div>
                <SectionTitle icon="dashboard" title="Przegląd" />
                <div className="grid cols-4">
                  <Stat icon="tag" label="Przychód łącznie" value={<Counter value={totalRevenue} format={zl} />} sub={`${zl(earnedRevenue)} zarobione · ${zl(upcomingRevenue)} nadchodzi`} />
                  <Stat icon="layers" label="Obłożenie" value={<Counter value={occ.pct} format={(n) => `${Math.round(n)}%`} />} sub={`${occ.bookedNights} z ${occ.capacityNights} stan.-dób`} />
                  <Stat icon="list" label="Rezerwacje" value={<Counter value={real.length} />} />
                  <Stat icon="trophy" label="Średnia rezerwacja" value={<Counter value={avg} format={zl} />} />
                </div>
                <div className="grid cols-4" style={{ marginTop: 14 }}>
                  <Stat icon="users" label="Klienci" value={<Counter value={cust.total} />} sub={`${cust.returning} wraca · ${cust.oneTime} jednorazowi`} />
                  <Stat icon="trophy" label="Powracający" value={<Counter value={cust.returningPct} format={(n) => `${Math.round(n)}%`} />} sub={`śr. ${cust.avgBookings.toFixed(1)} wizyt/klient`} />
                  <Stat icon="calendar" label="Zakontraktowane (30 dni)" value={<Counter value={pipeline.next30Revenue} format={zl} />} sub={`${pipeline.next30Count} rezerwacji w przód`} />
                  <Stat icon="globe" label="Udział online" value={<Counter value={onlinePct} format={(n) => `${Math.round(n)}%`} />} sub={zl(split.online)} />
                </div>
                <div className="grid cols-2" style={{ marginTop: 14 }}>
                  <Stat icon="clock" label="Śr. wyprzedzenie rezerwacji" value={<Counter value={leadTime} format={(n) => `${Math.round(n)} dni`} />} sub="ile dni wcześniej wędkarz rezerwuje" />
                  <Stat icon="x" label="Wskaźnik anulacji" value={<Counter value={cancel.rate} format={(n) => `${Math.round(n)}%`} />} sub={`${cancel.cancelled} z ${cancel.total} rezerwacji`} />
                </div>

                <SectionTitle icon="tag" title="Przychody" />
                <div className="card" style={{ marginBottom: 18 }}>
                  <div className="card-head"><div className="card-title"><span className="ico"><Icon name="tag" size={18} /></span> Zarobione vs nadchodzące</div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{zl(totalRevenue)}</div>
                  </div>
                  <div style={{ display: 'flex', height: 18, borderRadius: 999, overflow: 'hidden', background: '#F1F4F3' }}>
                    {totalRevenue > 0 && earnedRevenue > 0 && <div style={{ width: `${(earnedRevenue / totalRevenue) * 100}%`, background: colors.primary }} />}
                    {totalRevenue > 0 && upcomingRevenue > 0 && <div style={{ width: `${(upcomingRevenue / totalRevenue) * 100}%`, background: colors.accent }} />}
                  </div>
                  <div className="grid cols-2" style={{ marginTop: 16 }}>
                    <SplitBox color={colors.primary} icon="check" label="Zarobione (zrealizowane)" value={zl(earnedRevenue)} pct={totalRevenue ? Math.round((earnedRevenue / totalRevenue) * 100) : 0} />
                    <SplitBox color={colors.accent} icon="calendar" label="Nadchodzące (zaklepane)" value={zl(upcomingRevenue)} pct={totalRevenue ? Math.round((upcomingRevenue / totalRevenue) * 100) : 0} />
                  </div>
                </div>
                <div className="grid an-2col" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                  <div className="card">
                    <div className="card-head">
                      <div className="card-title"><span className="ico"><Icon name="chart" size={18} /></span> Przychód w czasie</div>
                      {months.length > 4 && <div className="card-hint">Przeciągnij suwak, aby zmienić zakres czasu</div>}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={months} margin={{ left: -6, right: 8, top: 8 }}>
                        <defs>
                          <linearGradient id="a-rev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} tickFormatter={kZl} width={48} />
                        <Tooltip content={<ChartTooltip money />} />
                        <Area type="monotone" dataKey="revenue" name="Przychód" stroke={colors.primary} strokeWidth={2.5} fill="url(#a-rev)" />
                        {months.length > 4 && (
                          <Brush
                            dataKey="label"
                            height={26}
                            travellerWidth={10}
                            gap={1}
                            stroke={colors.accent}
                            fill={colors.accentSoft}
                            startIndex={Math.max(0, months.length - 8)}
                            tickFormatter={() => ''}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card">
                    <div className="card-head"><div className="card-title"><span className="ico"><Icon name="calendar" size={18} /></span> Zakontraktowany przychód</div></div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: -4, marginBottom: 14 }}>Pieniądze już zaklepane na przyszłe rezerwacje</div>
                    <div className="pipe-hero">
                      <div className="pipe-big">{zl(pipeline.revenue)}</div>
                      <div className="pipe-cap">{pipeline.count} {plural(pipeline.count, 'rezerwacja', 'rezerwacje', 'rezerwacji')} w przód{pipeline.nextDate ? ` · najbliższa ${fmtDay(pipeline.nextDate)}` : ''}</div>
                    </div>
                    <div className="pipe-rows">
                      <PipeRow label="Najbliższe 7 dni" val={`${pipeline.next7Count} ${plural(pipeline.next7Count, 'rezerwacja', 'rezerwacje', 'rezerwacji')}`} />
                      <PipeRow label="Najbliższe 30 dni" val={zl(pipeline.next30Revenue)} sub={`${pipeline.next30Count} ${plural(pipeline.next30Count, 'rezerwacja', 'rezerwacje', 'rezerwacji')}`} />
                      <PipeRow label="Cały przyszły kalendarz" val={zl(pipeline.revenue)} sub={`${pipeline.count} ${plural(pipeline.count, 'rezerwacja', 'rezerwacje', 'rezerwacji')}`} />
                    </div>
                  </div>
                </div>

                <div className="card" style={{ marginTop: 18 }}>
                  <div className="card-head"><div className="card-title"><span className="ico"><Icon name="tag" size={18} /></span> Przychód: gotówka vs na konto</div></div>
                  {split.total === 0 ? (
                    <div className="empty">Brak przychodu w wybranym zakresie.</div>
                  ) : (
                    <div className="pay-donut-grid">
                      <div className="pay-donut">
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={[{ name: 'Gotówka', value: split.cash, color: PAY.cash.color }, { name: 'Online / na konto', value: split.online, color: PAY.online.color }]}
                              dataKey="value" nameKey="name" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
                              <Cell fill={PAY.cash.color} /><Cell fill={PAY.online.color} />
                            </Pie>
                            <Tooltip content={<ChartTooltip money />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pay-donut-center"><div className="pdc-v">{zl(split.total)}</div><div className="pdc-l">łącznie</div></div>
                      </div>
                      <div className="pay-donut-legend">
                        <SplitBox color={PAY.cash.color} icon="tag" label="Gotówka na miejscu" value={zl(split.cash)} pct={Math.round((split.cash / split.total) * 100)} />
                        <SplitBox color={PAY.online.color} icon="globe" label="Online / na konto" value={zl(split.online)} pct={onlinePct} />
                      </div>
                    </div>
                  )}
                </div>

                <SectionTitle icon="calendar" title="Sezon i popyt" />
                <div className="card occ-ring-card">
                  <div className="occ-ring">
                    <Ring pct={occ.pct} color={occ.pct >= 60 ? colors.primary : occ.pct >= 25 ? colors.accent : '#CBD5C9'} />
                    <div className="ring-center"><div className="ring-val">{Math.round(occ.pct)}%</div><div className="ring-lbl">obłożenie</div></div>
                  </div>
                  <div className="occ-ring-info">
                    <div className="card-title"><span className="ico"><Icon name="layers" size={18} /></span> Wykorzystanie stanowisk{rangeLabel ? ` · ${rangeLabel}` : ''}</div>
                    <p>Sprzedane <b>{occ.bookedNights}</b> z <b>{occ.capacityNights}</b> stanowisko-dób{selFishery ? '' : ' (wszystkie łowiska)'}.</p>
                    <p className="muted">{occ.pct >= 70 ? 'Świetne obłożenie — rozważ podniesienie ceny w szczycie.' : occ.pct >= 35 ? 'Solidnie, ale jest miejsce na więcej rezerwacji w słabsze dni.' : 'Dużo wolnych miejsc — promocja albo niższa cena może podbić obłożenie.'}</p>
                  </div>
                </div>
                <SeasonCompare reservations={fScoped} />
                {season.length > 0 && (
                  <div className="card">
                    <div className="card-head"><div className="card-title"><span className="ico"><Icon name="chart" size={18} /></span> Sezonowość — obłożenie i przychód wg miesiąca</div></div>
                    {(peakMonth || deadMonth) && (
                      <div className="season-call">
                        {peakMonth && <span className="sc hot"><b>Najlepszy miesiąc:</b> {peakMonth.label} · {peakMonth.occPct}% obłożenia</span>}
                        {deadMonth && deadMonth.month !== peakMonth?.month && <span className="sc cold"><b>Najspokojniejszy:</b> {deadMonth.label} · {deadMonth.occPct}% — dobry moment na promocję</span>}
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={season} margin={{ left: -6, right: 8, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="l" tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} tickFormatter={kZl} width={48} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend iconType="circle" />
                        <Bar yAxisId="l" dataKey="occPct" name="Obłożenie %" radius={[6, 6, 0, 0]} maxBarSize={42} fill={colors.accent}>
                          {season.map((m, i) => <Cell key={i} fill={m.occPct >= 60 ? colors.primary : m.occPct >= 25 ? colors.accent : '#CBD5C9'} />)}
                        </Bar>
                        <Line yAxisId="r" type="monotone" dataKey="revenue" name="Przychód" stroke="#E0992E" strokeWidth={2.5} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <OccupancyHeatmap reservations={fScoped} totalSpots={selFishery?.total_spots ?? 0} hasFishery={!!selFishery} />

                <div className="grid cols-2" style={{ marginTop: 18 }}>
                  <div className="card">
                    <div className="card-head"><div className="card-title"><span className="ico"><Icon name="layers" size={18} /></span> Obłożenie stanowisk</div>
                      {selFishery && <div className="card-hint">zimne → gorące</div>}
                    </div>
                    {!selFishery ? (
                      <div className="empty">Wybierz jedno łowisko u góry, aby zobaczyć, które stanowiska stoją puste.</div>
                    ) : spotFill.length === 0 ? <div className="empty">Brak stanowisk.</div> : (
                      <div style={{ marginTop: 4 }}>
                        {spotFill.map((s) => {
                          const tone = s.pct >= 60 ? 'hot' : s.pct >= 25 ? 'mid' : 'cold';
                          return (
                            <div className="occ-row" key={s.spot}>
                              <span className="occ-name">Stanowisko {s.spot}</span>
                              <span className="occ-bar"><span className={tone} style={{ width: `${Math.max(4, s.pct)}%` }} /></span>
                              <span className="occ-val">{s.pct}%<small> · {s.nights} dób</small></span>
                            </div>
                          );
                        })}
                        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Najzimniejsze stanowiska to kandydaci do niższej ceny lub promocji.</div>
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <div className="card-head"><div className="card-title"><span className="ico"><Icon name="calendar" size={18} /></span> Popyt wg dnia tygodnia</div></div>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={weekday} margin={{ left: -16, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(82,183,136,0.08)' }} />
                        <Bar dataKey="count" name="Rezerwacje" radius={[6, 6, 0, 0]}>
                          {weekday.map((w, i) => <Cell key={i} fill={w.count === Math.max(...weekday.map((x) => x.count)) && w.count > 0 ? colors.primary : colors.accent} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <SectionTitle icon="users" title="Klienci" />
                {cust.total > 0 && (
                  <div className="card">
                    <div className="card-head"><div className="card-title"><span className="ico"><Icon name="users" size={18} /></span> Lojalność klientów</div>
                      <div className="card-hint">{cust.returningPct}% wraca</div>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 18, alignItems: 'center' }}>
                      <div>
                        <div className="loyal-bar">
                          <span className="ret" style={{ width: `${cust.returningPct}%` }} />
                        </div>
                        <div className="loyal-legend">
                          <span><i className="dot ret" /> Powracający: <b>{cust.returning}</b></span>
                          <span><i className="dot one" /> Jednorazowi: <b>{cust.oneTime}</b></span>
                        </div>
                        <div className="loyal-kpis">
                          <div><div className="lk-v">{cust.newThisMonth}</div><div className="lk-l">nowych w tym miesiącu</div></div>
                          <div><div className="lk-v">{cust.avgBookings.toFixed(1)}</div><div className="lk-l">śr. wizyt na klienta</div></div>
                        </div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>Nowi klienci wg miesiąca (12 mies.)</div>
                        <ResponsiveContainer width="100%" height={150}>
                          <BarChart data={cust.newByMonth} margin={{ left: -22, right: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.textSecondary }} axisLine={false} tickLine={false} interval={0} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(82,183,136,0.08)' }} />
                            <Bar dataKey="count" name="Nowi" radius={[5, 5, 0, 0]} fill={colors.accent} maxBarSize={26} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                <div className="card" style={{ marginTop: 18 }}>
                  <div className="card-head">
                    <div className="card-title"><span className="ico"><Icon name="users" size={18} /></span> Najlepsi klienci</div>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn ghost sm" onClick={() => downloadXls('klienci-analityka', 'Klienci', customerRows())}><Icon name="arrowUp" size={14} /> Excel</button>
                      <button className="btn ghost sm" onClick={() => downloadCsv('klienci-analityka', customerRows())}><Icon name="arrowUp" size={14} /> CSV</button>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>Klient</th><th>Telefon</th><th style={{ textAlign: 'right' }}>Rezerwacje</th><th style={{ textAlign: 'right' }}>Doby</th><th style={{ textAlign: 'right' }}>Przychód</th><th>Ostatnia wizyta</th></tr>
                      </thead>
                      <tbody>
                        {customers.slice(0, 10).map((c) => (
                          <tr key={c.key}>
                            <td><b>{c.name}</b></td>
                            <td className="muted">{c.phone || '—'}</td>
                            <td style={{ textAlign: 'right' }}>{c.bookings}</td>
                            <td style={{ textAlign: 'right' }}>{c.spotNights}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: colors.primary }}>{zl(c.total)}</td>
                            <td className="muted">{fmtDay(c.lastVisit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <div className="an-section">
      <span className="an-section-ic"><Icon name={icon} size={16} /></span>
      <span className="an-section-t">{title}</span>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: IconName; label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="stat">
      <div className="label"><Icon name={icon} size={15} color={colors.accent} /> {label}</div>
      <div className="value" style={{ fontSize: 26 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Porównanie sezonów (rok do roku) — zestawienie w stylu kart planów + zgrupowany wykres miesięczny.
export function SeasonCompare({ reservations }: { reservations: Reservation[] }) {
  const real = useMemo(() => reservations.filter(isReal), [reservations]);
  const years = useMemo(() => [...new Set(real.map((r) => r.date_from.slice(0, 4)))].sort().reverse(), [real]);
  const [aSel, setASel] = useState('');
  const [bSel, setBSel] = useState('');
  const a = aSel || years[0] || '';
  const b = bSel || years[1] || years[0] || '';

  const statOf = (y: string) => {
    const rs = real.filter((r) => r.date_from.slice(0, 4) === y);
    const revenue = rs.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const nights = rs.reduce((s, r) => s + Math.max(1, r.days || 1) * (r.spots?.length || 1), 0);
    const clients = new Set(rs.map((r) => (r.phone || r.name || '').trim().toLowerCase()).filter(Boolean)).size;
    const byMonth = Array.from({ length: 12 }, () => 0);
    rs.forEach((r) => { const mi = Number(r.date_from.slice(5, 7)) - 1; if (mi >= 0 && mi < 12) byMonth[mi] += Number(r.total) || 0; });
    return { revenue, count: rs.length, nights, clients, avg: rs.length ? revenue / rs.length : 0, byMonth };
  };
  const A = statOf(a), B = statOf(b);
  const data = MONTHS.map((label, i) => ({ label, A: A.byMonth[i], B: B.byMonth[i] }));
  const opts = years.map((y) => ({ value: y, label: `Sezon ${y}` }));
  const same = a === b;

  if (years.length === 0) return null;

  const metrics: { label: string; av: number; bv: number; fmt: (n: number) => string }[] = [
    { label: 'Przychód', av: A.revenue, bv: B.revenue, fmt: zl },
    { label: 'Rezerwacje', av: A.count, bv: B.count, fmt: (n) => String(n) },
    { label: 'Stanowisko-doby', av: A.nights, bv: B.nights, fmt: (n) => String(n) },
    { label: 'Średnia wartość', av: A.avg, bv: B.avg, fmt: zl },
    { label: 'Klienci', av: A.clients, bv: B.clients, fmt: (n) => String(n) },
  ];

  return (
    <div className="card scmp">
      <div className="card-head">
        <div className="card-title"><span className="ico"><Icon name="chart" size={18} /></span> Porównanie sezonów</div>
        <div className="row" style={{ gap: 8 }}>
          <Select value={a} onChange={setASel} width={140} options={opts} />
          <span className="muted" style={{ fontWeight: 700 }}>vs</span>
          <Select value={b} onChange={setBSel} width={140} options={opts} />
        </div>
      </div>

      {same ? (
        <div className="muted" style={{ fontSize: 13, padding: '4px 2px 10px' }}>Wybierz dwa różne sezony, aby je porównać{years.length < 2 ? ' (na razie masz dane tylko z jednego sezonu).' : '.'}</div>
      ) : (
        <div className="scmp-table">
          <div className="scmp-row scmp-h">
            <span className="scmp-l" />
            <span className="scmp-av"><i className="scmp-key a" /> Sezon {a}</span>
            <span className="scmp-d">zmiana</span>
            <span className="scmp-bv"><i className="scmp-key b" /> Sezon {b}</span>
          </div>
          {metrics.map((m) => {
            const delta = m.bv ? Math.round(((m.av - m.bv) / m.bv) * 100) : (m.av ? 100 : 0);
            const dir = delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down';
            return (
              <div className="scmp-row" key={m.label}>
                <span className="scmp-l">{m.label}</span>
                <span className="scmp-av strong">{m.fmt(m.av)}</span>
                <span className={`scmp-d ${dir}`}>{dir === 'flat' ? '–' : dir === 'up' ? `▲ ${delta}%` : `▼ ${Math.abs(delta)}%`}</span>
                <span className="scmp-bv">{m.fmt(m.bv)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>Przychód miesiąc po miesiącu</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ left: 4, right: 8, top: 10 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} tickFormatter={kZl} width={56} />
            <Tooltip content={<ChartTooltip money />} cursor={{ fill: 'rgba(82,183,136,0.08)' }} />
            <Legend iconType="circle" />
            <Bar dataKey="A" name={`Sezon ${a}`} fill={colors.primary} radius={[5, 5, 0, 0]} maxBarSize={26} />
            {!same && <Bar dataKey="B" name={`Sezon ${b}`} fill="#E0992E" radius={[5, 5, 0, 0]} maxBarSize={26} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Mapa obłożenia — kalendarz miesiąca, dzień pokolorowany wg % zajętych stanowisk.
const HEAT_DOW = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const heatTier = (pct: number) => (pct <= 0 ? 0 : pct < 25 ? 1 : pct < 50 ? 2 : pct < 75 ? 3 : pct < 100 ? 4 : 5);
export function OccupancyHeatmap({ reservations, totalSpots, hasFishery, monthKey }: { reservations: Reservation[]; totalSpots: number; hasFishery: boolean; monthKey?: string }) {
  const now = new Date();
  const [stateYm, setStateYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const ym = monthKey ? { y: Number(monthKey.slice(0, 4)), m: Number(monthKey.slice(5, 7)) - 1 } : stateYm;
  const occ = useMemo(() => reservations.filter((r) => r.status !== 'cancelled'), [reservations]); // łącznie z blokadami = stanowisko niedostępne
  const monthLabel = new Date(ym.y, ym.m, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  const cells = useMemo(() => {
    const dim = new Date(ym.y, ym.m + 1, 0).getDate();
    const firstDow = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7;
    const out: ({ day: number; o: number; pct: number } | null)[] = Array.from({ length: firstDow }, () => null);
    for (let d = 1; d <= dim; d++) {
      const iso = `${ym.y}-${pad2(ym.m + 1)}-${pad2(d)}`;
      const s = new Set<number>();
      occ.forEach((r) => { if (r.date_from <= iso && r.date_to >= iso) (r.spots ?? []).forEach((x) => s.add(x)); });
      out.push({ day: d, o: s.size, pct: totalSpots ? Math.round((s.size / totalSpots) * 100) : 0 });
    }
    return out;
  }, [occ, ym.y, ym.m, totalSpots]);
  const shift = (n: number) => setStateYm((p) => { const d = new Date(p.y, p.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const busyDays = cells.filter((c) => c && c.pct >= 75).length;

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-head">
        <div className="card-title"><span className="ico"><Icon name="layers" size={18} /></span> Mapa obłożenia — {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
        {!monthKey && (
          <div className="monthnav">
            <button className="btn ghost icon" onClick={() => shift(-1)}><Icon name="chevronLeft" size={16} /></button>
            <button className="btn ghost icon" onClick={() => shift(1)}><Icon name="chevronRight" size={16} /></button>
          </div>
        )}
      </div>
      {!hasFishery ? (
        <div className="empty">Wybierz jedno łowisko u góry, aby zobaczyć dzień po dniu, kiedy masz komplet, a kiedy pustki.</div>
      ) : (
        <>
          <div className="heat-week">{HEAT_DOW.map((d) => <span key={d}>{d}</span>)}</div>
          <div className="heat-grid">
            {cells.map((c, i) => c === null
              ? <span key={`e${i}`} className="heat-cell empty-cell" />
              : <span key={c.day} className={`heat-cell t${heatTier(c.pct)}`} title={`${c.day} ${monthLabel} · ${c.o}/${totalSpots} zajętych (${c.pct}%)`}><b>{c.day}</b><small>{c.o}/{totalSpots}</small></span>)}
          </div>
          <div className="heat-foot">
            <div className="heat-legend"><span>Pusto</span>{[0, 1, 2, 3, 4, 5].map((t) => <i key={t} className={`hl t${t}`} />)}<span>Komplet</span></div>
            <span className="muted" style={{ fontSize: 12.5 }}>{busyDays} {plural(busyDays, 'dzień', 'dni', 'dni')} blisko kompletu w tym miesiącu</span>
          </div>
        </>
      )}
    </div>
  );
}

// Pierścień postępu (SVG) — np. obłożenie %.
export function Ring({ pct, size = 128, stroke = 13, color = colors.accent }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct / 100)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF3F0" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)' }} />
    </svg>
  );
}

function PipeRow({ label, val, sub }: { label: string; val: string; sub?: string }) {
  return (
    <div className="pipe-row">
      <span className="pr-label">{label}</span>
      <span className="pr-val">{val}{sub && <small> · {sub}</small>}</span>
    </div>
  );
}

function SplitBox({ color, icon, label, value, pct }: { color: string; icon: IconName; label: string; value: string; pct: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: `1px solid ${colors.border}`, borderRadius: 12 }}>
      <span style={{ width: 40, height: 40, borderRadius: 10, background: color + '22', color, display: 'grid', placeItems: 'center' }}><Icon name={icon} size={20} /></span>
      <div>
        <div style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>{label} · {pct}%</div>
        <div style={{ fontSize: 21, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );
}
