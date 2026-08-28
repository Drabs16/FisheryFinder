import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { useOwnerData } from '../lib/useOwnerData';
import { computeDashboard, revenueByMonth, occupancyLastDays, reservationStatus, todayGuests, ownerFisheryRank, type FisheryRank } from '../lib/api';
import { colors, STATUS } from '../theme';
import Icon, { type IconName } from '../components/Icon';
import ChartTooltip from '../components/ChartTooltip';
import Counter from '../components/Counter';
import type { Reservation } from '../lib/types';

const zl = (n: number) => `${Math.round(n).toLocaleString('pl-PL')} zł`;
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const monthLabel = (m: string) => { const [y, mo] = m.split('-'); return `${MONTHS[Number(mo) - 1]} ${y.slice(2)}`; };
// Lokalne „dziś" YYYY-MM-DD (toISOString dałoby zły dzień wieczorem w strefach +UTC, np. PL)
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const initials = (s: string) => s.trim().split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase() || 'W';

export default function Dashboard() {
  const { fisheries, reservations, loading, error } = useOwnerData();
  const [rank, setRank] = useState<FisheryRank | null>(null);
  const primaryId = fisheries[0]?.id;
  useEffect(() => {
    if (!primaryId) { setRank(null); return; }
    ownerFisheryRank(primaryId).then(setRank).catch(() => setRank(null));
  }, [primaryId]);

  if (loading) return (
    <Shell>
      <div className="grid cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div className="skel-stat" key={i}>
            <div className="skeleton" style={{ height: 13, width: '55%' }} />
            <div className="skeleton" style={{ height: 26, width: '70%', marginTop: 12 }} />
            <div className="skeleton" style={{ height: 11, width: '45%', marginTop: 12 }} />
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 18 }}><div className="skeleton" style={{ height: 180 }} /></div>
    </Shell>
  );
  if (error) return <Shell><div className="notice err">{error}</div></Shell>;

  if (fisheries.length === 0) {
    return (
      <Shell>
        <div className="card empty">
          <div className="big"><Icon name="fish" size={28} /></div>
          <h3>Przejmij swoje łowisko</h3>
          <p style={{ maxWidth: 460, margin: '8px auto 18px' }}>
            Twoje łowisko jest już w naszym katalogu. Poproś o dostęp lub wpisz kod od nas — gdy je przejmiesz,
            ustawisz stanowiska, ceny i ruszysz z rezerwacjami online.
          </p>
          <Link className="btn accent" to="/lowiska"><Icon name="search" size={16} /> Poproś o dostęp do łowiska</Link>
        </div>
      </Shell>
    );
  }

  const stats = computeDashboard(reservations, fisheries);
  const months = revenueByMonth(reservations).map((m) => ({ ...m, label: monthLabel(m.month) }));
  const occ = occupancyLastDays(reservations, fisheries, 7);
  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const upcoming = reservations
    .filter((r) => r.payment !== 'block' && r.status !== 'cancelled' && r.date_from >= today())
    .sort((a, b) => a.date_from.localeCompare(b.date_from))
    .slice(0, 6);
  const guests = todayGuests(reservations);

  return (
    <Shell>
      <div className="grid cols-4">
        <Stat icon="list" label="Rezerwacje dziś" value={<Counter value={stats.todayReservations} />} foot={`${stats.upcoming} nadchodzących`} />
        <Stat icon="tag" label="Przychód dziś" value={<Counter value={stats.todayRevenue} format={zl} />} foot={`${zl(stats.monthRevenue)} w tym miesiącu`} up />
        <Stat icon="layers" label="Obłożenie dziś" value={<Counter value={stats.occupancyPct} format={(n) => `${Math.round(n)}%`} />} foot={`${stats.todayOccupied} / ${stats.totalSpots} stanowisk`} />
        <Stat icon="fish" label="Łowiska" value={<Counter value={fisheries.length} />} foot={`${stats.totalSpots} stanowisk łącznie`} />
      </div>

      {rank && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head">
            <div className="card-title"><span className="ico"><Icon name="trophy" size={18} /></span> Twoja pozycja{fisheries.length > 1 ? ` — ${fisheries[0].name}` : ''}</div>
            <span className="muted" style={{ fontSize: 11.5 }}>pokazujemy wyłącznie Twoją pozycję (RODO)</span>
          </div>
          <div className="grid cols-3">
            <RankBox label="Popularność — Polska" rank={rank.popularity.rank} total={rank.total} sub={`${rank.popularity.value} rezerwacji / 90 dni`} />
            <RankBox label={`Popularność — ${rank.province}`} rank={rank.popularity.rank_province} total={rank.total_province} />
            <RankBox label="Ocena wędkarzy" rank={rank.rating.rank} total={rank.rating.ranked} sub={rank.rating.value > 0 ? `średnia ${rank.rating.value}` : 'brak ocen'} />
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <div className="card-title"><span className="ico"><Icon name="users" size={18} /></span> Dziś na łowisku</div>
          <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--primary)' }}>
            <span className="dot" style={{ background: colors.accent }} /> {guests.length} {guests.length === 1 ? 'osoba' : 'osób'}
          </span>
        </div>
        {guests.length === 0 ? (
          <div className="empty" style={{ padding: 22 }}>Dziś nikt nie ma rezerwacji na Twoich łowiskach.</div>
        ) : (
          <div className="today-grid">
            {guests.map((r) => (
              <div className="today-guest" key={r.id}>
                <div className="ava-sm">{initials(r.name || 'W')}</div>
                <div className="grow">
                  <div className="t1">{r.name || 'Wędkarz'}</div>
                  <div className="meta-chips">
                    <span className="meta-chip spot"><Icon name="layers" size={12} /> stan. {r.spots?.join(', ') || '—'}</span>
                    <span className="meta-chip date">{r.fishery_name}</span>
                  </div>
                </div>
                {r.phone && <a className="btn ghost sm" href={`tel:${r.phone}`} title={`Zadzwoń: ${r.phone}`}><Icon name="phone" size={15} /></a>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', marginTop: 18 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="ico"><Icon name="layers" size={18} /></span> Obłożenie stanowisk</div>
            <span className="muted" style={{ fontSize: 12.5 }}>ostatnie 7 dni</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={occ} margin={{ left: -18, right: 6, top: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'rgba(82,183,136,0.08)' }} />
              <Bar dataKey="pct" name="Obłożenie" radius={[6, 6, 0, 0]}>
                {occ.map((d, i) => <Cell key={i} fill={d.label === wdToday() ? colors.primary : colors.accent} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="ico"><Icon name="bell" size={18} /></span> Nadchodzące rezerwacje</div>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty" style={{ padding: 28 }}>Brak nadchodzących rezerwacji.</div>
          ) : (
            <div>{upcoming.map((r) => <UpcomingRow key={r.id} r={r} />)}</div>
          )}
          <Link className="btn ghost sm" to="/rezerwacje" style={{ marginTop: 14 }}>
            Wszystkie rezerwacje <Icon name="chevronRight" size={15} />
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <div className="card-title"><span className="ico"><Icon name="chart" size={18} /></span> Przychód w sezonie</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{zl(totalRevenue)}</div>
        </div>
        {months.length === 0 ? (
          <div className="empty">Brak danych o przychodzie w tym okresie.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={months} margin={{ left: -8, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.accent} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip money />} />
              <Area type="monotone" dataKey="revenue" name="Przychód" stroke={colors.primary} strokeWidth={2.5} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Shell>
  );
}

function wdToday() {
  return ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'][new Date().getDay()];
}

function UpcomingRow({ r }: { r: Reservation }) {
  const st = STATUS[reservationStatus(r)];
  const d = new Date(r.date_from).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
  return (
    <div className="lirow">
      <div className="ava-sm">{initials(r.name || 'Wędkarz')}</div>
      <div className="grow">
        <div className="t1">{r.name || 'Wędkarz'}</div>
        <div className="t2">{r.fishery_name}</div>
        <div className="meta-chips">
          <span className="meta-chip date"><Icon name="calendar" size={12} /> {d}</span>
          <span className="meta-chip spot"><Icon name="layers" size={12} /> stan. {r.spots?.join(', ') || '—'}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{zl(Number(r.total))}</div>
        <div className="t2" style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
          <span className="dot" style={{ background: st.color }} /> {st.label}
        </div>
      </div>
    </div>
  );
}

function RankBox({ label, rank, total, sub }: { label: string; rank: number | null; total: number; sub?: string }) {
  // percentyl: 100% = lider, niżej = dalej w stawce
  const pct = rank && total > 1 ? Math.round(((total - rank) / (total - 1)) * 100) : (rank === 1 ? 100 : 0);
  const top = rank === 1;
  return (
    <div className={`rankbox ${top ? 'top' : ''}`}>
      <div className="rank-mlabel">{label}</div>
      <div className="rank-line">
        <span className="rank-num">{rank == null ? '—' : rank}</span>
        {rank != null && <span className="rank-of">miejsce z {total}</span>}
        {top && <span className="rank-chip">lider</span>}
      </div>
      {rank != null && total > 1 && (
        <div className="rank-meter"><span style={{ width: `${Math.max(6, pct)}%` }} /></div>
      )}
      {sub && <div className="rank-msub">{sub}</div>}
    </div>
  );
}

function Stat({ icon, label, value, foot, up }: { icon: IconName; label: string; value: ReactNode; foot?: string; up?: boolean }) {
  return (
    <div className="stat">
      <div className="label"><Icon name={icon} size={15} color={colors.accent} /> {label}</div>
      <div className="value">{value}</div>
      {foot && (
        <div className={`foot ${up ? 'up' : 'flat'}`}>
          {up && <Icon name="arrowUp" size={13} />}{foot}
        </div>
      )}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="topbar">
        <div>
          <h1>Pulpit</h1>
          <div className="sub">Przegląd Twoich łowisk w czasie rzeczywistym</div>
        </div>
        <div className="topbar-right">
          <Link className="btn accent" to="/lowiska"><Icon name="waves" size={16} /> Moje łowiska</Link>
        </div>
      </div>
      <div className="content">{children}</div>
    </>
  );
}
