import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { adminStats, adminDashboardExtra, type DashboardExtra } from '../../lib/api';
import { colors } from '../../theme';
import Icon, { type IconName } from '../../components/Icon';
import ChartTooltip from '../../components/ChartTooltip';
import { toast } from '../../components/Toast';
import type { AdminStats } from '../../lib/types';
import Loader from '../../components/Loader';

const PLAN_META: Record<string, { label: string; color: string }> = {
  basic: { label: 'Basic', color: '#9CA3AF' },
  premium: { label: 'Premium', color: '#52B788' },
  pro: { label: 'Pro', color: '#1B4332' },
};

const M = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const ymLabel = (ym: string) => { const [, m] = ym.split('-'); return M[Number(m) - 1] ?? ym; };
const zl = (n: number) => `${Math.round(n).toLocaleString('pl-PL')} zł`;
const nf = (n: number) => Number(n || 0).toLocaleString('pl-PL');

export default function AdminDashboard({ preview }: { preview?: AdminStats } = {}) {
  const [s, setS] = useState<AdminStats | null>(preview ?? null);
  const [extra, setExtra] = useState<DashboardExtra | null>(null);
  const [loading, setLoading] = useState(!preview);

  useEffect(() => {
    if (preview) return;
    (async () => {
      try {
        const [st, ex] = await Promise.all([adminStats(), adminDashboardExtra()]);
        setS(st); setExtra(ex);
      } catch (e) { toast(e instanceof Error ? e.message : 'Błąd ładowania analityki', 'error'); }
      finally { setLoading(false); }
    })();
  }, [preview]);

  const chart = useMemo(() => (s?.series ?? []).map((r) => ({ ...r, label: ymLabel(r.ym) })), [s]);
  const visits = useMemo(() => (s?.visits_series ?? []).map((r) => ({ ...r, label: r.d })), [s]);
  const planDist = useMemo(() => (extra?.plan_dist ?? []).map((p) => ({ ...p, label: PLAN_META[p.plan]?.label ?? p.plan, color: PLAN_META[p.plan]?.color ?? colors.accent })), [extra]);
  const topFisheries = extra?.top_fisheries ?? [];
  const maxRev = Math.max(1, ...topFisheries.map((f) => f.revenue));
  const planTotal = planDist.reduce((a, b) => a + b.count, 0);

  return (
    <>
      <div className="topbar">
        <div><h1>Analityka <span className="admin-badge">ADMIN</span></h1><div className="sub">Pełen obraz platformy — baza, społeczność, ruch i przychód</div></div>
      </div>
      <div className="content">
        {loading || !s ? <Loader label="Wczytywanie statystyk…" /> : (
          <>
            {/* BAZA DANYCH */}
            <SectionTitle icon="layers">Baza danych</SectionTitle>
            <div className="grid cols-4">
              <Stat icon="waves" color={colors.accent} label="Łowiska" value={nf(s.fisheries_total)} hint={`${s.fisheries_premium} premium · ${s.fisheries_catalog} katalog`} />
              <Stat icon="bag" color={colors.warning} label="Sklepy wędkarskie" value={nf(s.shops)} hint="punkty na mapie" />
              <Stat icon="droplet" color={colors.water} label="Wody PZW" value={nf(s.pzw_waters)} hint="łowiska licencyjne PZW" />
              <Stat icon="pin" color={colors.primary} label="Punkty POI razem" value={nf(s.pois_total)} hint={`${nf(s.shops)} sklepów + ${nf(s.pzw_waters)} PZW`} />
            </div>

            {/* SPOŁECZNOŚĆ */}
            <SectionTitle icon="users">Społeczność</SectionTitle>
            <div className="grid cols-4">
              <Stat icon="dashboard" color={colors.primary} label="Wszystkich kont" value={nf(s.users_total)} hint={`+${s.new_users_30d} w 30 dni`} />
              <Stat icon="users" color={colors.accent} label="Wędkarze" value={nf(s.anglers)} hint="konta wędkarzy" />
              <Stat icon="card" color={colors.water} label="Właściciele (biznes)" value={nf(s.owners)} hint="z przejętym łowiskiem" />
              <Stat icon="sparkles" color={colors.warning} label="Nowi w tym mies." value={nf(s.new_users_month)} hint="rejestracje" />
            </div>

            {/* RUCH NA WEB */}
            <SectionTitle icon="eye">Ruch na stronie (web)</SectionTitle>
            <div className="card">
              <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <MiniStat icon="eye" label="Dziś" value={nf(s.visits_today)} color={colors.accent} />
                <MiniStat icon="calendar" label="Ten miesiąc" value={nf(s.visits_month)} color={colors.water} />
                <MiniStat icon="chart" label="Łącznie" value={nf(s.visits_total)} color={colors.primary} />
              </div>
              {s.visits_total === 0 ? (
                <div className="empty" style={{ padding: '20px 0' }}>Zbieramy dane — odwiedziny pojawią się, gdy wędkarze zaczną wchodzić na stronę.</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={visits} margin={{ top: 6, right: 10, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.textSecondary }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: colors.textSecondary }} axisLine={false} tickLine={false} width={34} />
                    <Tooltip cursor={{ stroke: colors.accent, strokeWidth: 1 }} content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="visits" name="Odwiedziny" stroke={colors.accent} strokeWidth={2.5} fill="url(#vg)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* NASZ PRZYCHÓD */}
            <SectionTitle icon="card">Nasz przychód</SectionTitle>
            <div className="card" style={{ background: colors.primary, color: '#fff' }}>
              <div className="grid cols-4">
                <RevBox label="Przychód / mies. (szac.)" value={zl(s.revenue_month)} big />
                <RevBox label="Subskrypcje (MRR)" value={zl(s.mrr)} hint={`${s.fisheries_claimed} przejętych łowisk`} />
                <RevBox label="Prowizje 5% (ten mies.)" value={zl(s.commission_month)} hint={`razem ${zl(s.commission_total)}`} />
                <RevBox label="Obrót (GMV)" value={zl(s.gmv)} hint="suma rezerwacji" />
              </div>
            </div>

            {/* AKTYWNOŚĆ */}
            <SectionTitle icon="list">Aktywność</SectionTitle>
            <div className="grid cols-4">
              <Stat icon="list" color={colors.primary} label="Rezerwacje (razem)" value={nf(s.reservations_total)} hint={`${s.reservations_month} w tym mies.`} />
              <Stat icon="check" color={colors.success} label="Potwierdzone" value={nf(s.reservations_confirmed)} hint={`${s.reservations_online} online`} />
              <Stat icon="star" color={colors.warning} label="Opinie" value={nf(s.reviews_total)} hint="oceny wędkarzy" />
              <Stat icon="fish" color={colors.water} label="Zgłoszone połowy" value={nf(s.catches_total)} hint="tablice rywalizacji" />
            </div>

            {/* Wykres 6 mies. */}
            <SectionTitle icon="chart">Ostatnie 6 miesięcy</SectionTitle>
            <div className="card">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chart} margin={{ top: 6, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: colors.textSecondary }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip cursor={{ fill: 'rgba(82,183,136,0.08)' }} content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="users" name="Nowi użytkownicy" fill={colors.accent} radius={[5, 5, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="reservations" name="Rezerwacje" fill={colors.primary} radius={[5, 5, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Konwersja planów + top łowiska */}
            <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', marginTop: 16 }}>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}><span className="ico"><Icon name="layers" size={18} /></span> Rozkład planów łowisk</div>
                {planTotal === 0 ? <div className="empty">Brak łowisk.</div> : (
                  <>
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie data={planDist} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={52} outerRadius={84} paddingAngle={2}>
                          {planDist.map((p) => <Cell key={p.plan} fill={p.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="row" style={{ justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                      {planDist.map((p) => (
                        <span key={p.plan} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} /> {p.label}: <b>{p.count}</b>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 14 }}><span className="ico"><Icon name="trophy" size={18} /></span> Najlepsze łowiska wg przychodu</div>
                {topFisheries.length === 0 ? <div className="empty">Brak danych o przychodzie.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {topFisheries.map((f, i) => (
                      <div key={i}>
                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5, fontSize: 13.5 }}>
                          <span style={{ fontWeight: 600 }}>{i + 1}. {f.name}</span>
                          <span><b>{zl(f.revenue)}</b> <span style={{ color: colors.textSecondary, fontSize: 12 }}>· {f.reservations} rez.</span></span>
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: 'var(--background)', overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', width: `${Math.max(3, (f.revenue / maxRev) * 100)}%`, background: i === 0 ? colors.primary : colors.accent, borderRadius: 999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: IconName }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '22px 2px 12px', color: colors.textSecondary, fontSize: 12.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      <Icon name={icon} size={14} color={colors.accent} /> {children}
    </div>
  );
}

function Stat({ icon, label, value, hint, color = colors.accent }: { icon: IconName; label: string; value: string; hint?: string; color?: string }) {
  return (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span style={{ width: 44, height: 44, borderRadius: 12, background: `${color}1A`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={20} color={color} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: colors.textSecondary, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2, lineHeight: 1.1, color: colors.text }}>{value}</div>
        {hint && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{hint}</div>}
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, color }: { icon: IconName; label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12, background: `${color}12`, flex: '1 1 160px' }}>
      <Icon name={icon} size={18} color={color} />
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: colors.text }}>{value}</div>
        <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function RevBox({ label, value, hint, big }: { label: string; value: string; hint?: string; big?: boolean }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 12.5, color: colors.accentLight, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: big ? 30 : 22, fontWeight: 800, marginTop: 4, color: '#fff' }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
