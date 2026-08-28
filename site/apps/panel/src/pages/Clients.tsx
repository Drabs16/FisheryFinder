import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useOwnerData } from '../lib/useOwnerData';
import { aggregateCustomers, customerStats, paymentKind, reservationStatus, ownerListBlocks, ownerBlockUser, ownerUnblock, type CustomerRow, type BlockRow } from '../lib/api';
import { colors, PAY, STATUS } from '../theme';
import Icon from '../components/Icon';
import Select from '../components/Select';
import ChartTooltip from '../components/ChartTooltip';
import { toast } from '../components/Toast';
import { downloadCsv, downloadXls } from '../lib/export';
import type { Reservation, Fishery } from '../lib/types';
import Loader from '../components/Loader';

const PAGE_SIZE = 20;

const SEASON_COLOR: Record<string, string> = { Wiosna: '#52B788', Lato: '#F59E0B', Jesień: '#B45309', Zima: '#1E88E5' };

const zl = (n: number) => `${Math.round(n).toLocaleString('pl-PL')} zł`;
const fmt = (iso: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');
const fmtLong = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });
const initials = (s: string) => s.trim().split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase() || 'W';
const custKey = (name: string | null, phone: string | null) => `${(name || 'Wędkarz').trim().toLowerCase()}|${(phone || '').trim()}`;

export default function Clients() {
  const { reservations, fisheries, loading, error } = useOwnerData();
  const [q, setQ] = useState('');
  const [fishery, setFishery] = useState('all');
  const [sel, setSel] = useState<CustomerRow | null>(null);
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [q, fishery]);

  // zawężenie do wybranego łowiska (klienci danego łowiska)
  const scopedRes = useMemo(() => (fishery === 'all' ? reservations : reservations.filter((r) => r.fishery_id === fishery)), [reservations, fishery]);

  const customers = useMemo(() => {
    const all = aggregateCustomers(scopedRes);
    const s = q.trim().toLowerCase();
    return s ? all.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(s)) : all;
  }, [scopedRes, q]);

  const stats = useMemo(() => customerStats(scopedRes), [scopedRes]);

  // Paginacja widoku (eksport i wyszukiwanie obejmują CAŁOŚĆ, nie tylko stronę).
  const pageCount = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = customers.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const selRes = useMemo(() => (sel
    ? scopedRes.filter((r) => r.payment !== 'block' && custKey(r.name, r.phone) === sel.key).sort((a, b) => b.date_from.localeCompare(a.date_from))
    : []), [sel, scopedRes]);

  // Eksport CAŁEJ przefiltrowanej listy (wszystkie strony, w jednym pliku).
  const exportRows = () => [['Klient', 'Telefon', 'Rezerwacje', 'Stanowisko-dni', 'Przychód (zł)', 'Ostatnia wizyta'],
    ...customers.map((c) => [c.name, c.phone || '', c.bookings, c.spotNights, Math.round(c.total), c.lastVisit])];

  return (
    <>
      <div className="topbar">
        <div><h1>Klienci</h1><div className="sub">Baza wędkarzy, którzy rezerwowali Twoje łowiska</div></div>
        <div className="topbar-right">
          {fisheries.length > 1 && (
            <Select value={fishery} onChange={(v) => { setFishery(v); setSel(null); }} icon="fish" width={200}
              options={[{ value: 'all', label: 'Wszystkie łowiska' }, ...fisheries.map((f) => ({ value: f.id, label: f.name }))]} />
          )}
          <div className="searchbox">
            <Icon name="search" size={16} color={colors.textSecondary} />
            <input placeholder="Szukaj klienta lub telefonu…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn ghost" disabled={fisheries.length === 0} onClick={() => setBlocksOpen(true)}><Icon name="lock" size={15} /> Zablokowani</button>
          <button className="btn ghost" disabled={customers.length === 0} onClick={() => downloadXls('klienci', 'Klienci', exportRows())}><Icon name="arrowUp" size={15} /> Excel</button>
          <button className="btn ghost" disabled={customers.length === 0} onClick={() => downloadCsv('klienci', exportRows())}><Icon name="arrowUp" size={15} /> CSV</button>
        </div>
      </div>
      {blocksOpen && <BlocksModal fisheries={fisheries} onClose={() => setBlocksOpen(false)} />}
      <div className="content">
        {error && <div className="notice err">{error}</div>}

        {!loading && stats.total > 0 && (
          <>
            <div className="grid cols-4" style={{ marginBottom: 14 }}>
              <StatBox icon="users" label="Klienci łącznie" value={String(stats.total)} hint={`${stats.oneTime} jednorazowych`} />
              <StatBox icon="trophy" label="Wracający" value={`${stats.returning}`} hint={`${stats.returningPct}% bazy wraca`} accent />
              <StatBox icon="sparkles" label="Nowi w tym miesiącu" value={String(stats.newThisMonth)} hint={`${stats.newThisYear} w tym roku`} />
              <StatBox icon="calendar" label="Śr. rezerwacji / klienta" value={stats.avgBookings.toFixed(1)} hint="lojalność" />
            </div>

            <div className="grid cols-2" style={{ marginBottom: 16, gap: 16 }}>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}><span className="ico"><Icon name="chart" size={18} /></span> Nowi klienci (12 miesięcy)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.newByMonth} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.textSecondary }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: colors.textSecondary }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip cursor={{ fill: 'rgba(82,183,136,0.08)' }} content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Nowi" fill={colors.accent} radius={[5, 5, 0, 0]} maxBarSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}><span className="ico"><Icon name="pin" size={18} /></span> Nowi klienci wg sezonu</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
                  {(() => {
                    const max = Math.max(1, ...stats.newBySeason.map((s) => s.count));
                    return stats.newBySeason.map((s) => (
                      <div key={s.season}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{s.season}</span>
                          <b>{s.count}</b>
                        </div>
                        <div style={{ height: 10, borderRadius: 6, background: colors.border, overflow: 'hidden' }}>
                          <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', background: SEASON_COLOR[s.season], borderRadius: 6 }} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </>
        )}

        {loading ? <Loader label="Wczytywanie klientów…" />
          : customers.length === 0 ? (
            <div className="card empty"><div className="big"><Icon name="users" size={26} /></div>
              {q ? 'Brak klientów dla tego wyszukiwania.' : 'Brak klientów — pojawią się po pierwszych rezerwacjach.'}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Klient</th><th>Telefon</th><th style={{ textAlign: 'right' }}>Rezerwacje</th><th style={{ textAlign: 'right' }}>Stan.-dni</th><th style={{ textAlign: 'right' }}>Przychód</th><th>Ostatnia</th><th /></tr>
                  </thead>
                  <tbody>
                    {pageRows.map((c) => (
                      <tr key={c.key} style={{ cursor: 'pointer' }} onClick={() => setSel(c)}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="ava-sm">{initials(c.name)}</div><b>{c.name}</b></div></td>
                        <td className="muted">{c.phone || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{c.bookings}</td>
                        <td style={{ textAlign: 'right' }}>{c.spotNights}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: colors.primary }}>{zl(c.total)}</td>
                        <td className="muted">{fmt(c.lastVisit)}</td>
                        <td style={{ textAlign: 'right' }}><Icon name="chevronRight" size={16} color={colors.textSecondary} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {customers.length > PAGE_SIZE && (
                <div className="pager">
                  <span className="pager-info">
                    {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, customers.length)} z {customers.length} klientów
                  </span>
                  <div className="pager-ctrl">
                    <button className="btn ghost icon sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="Poprzednia strona"><Icon name="chevronLeft" size={16} /></button>
                    <span className="pager-page">Strona {safePage + 1} z {pageCount}</span>
                    <button className="btn ghost icon sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} aria-label="Następna strona"><Icon name="chevronRight" size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {sel && <CustomerModal c={sel} res={selRes} onClose={() => setSel(null)} />}
    </>
  );
}

function CustomerModal({ c, res, onClose }: { c: CustomerRow; res: Reservation[]; onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="ava-sm" style={{ width: 46, height: 46, fontSize: 16 }}>{initials(c.name)}</div>
            <div>
              <h3 style={{ fontSize: 18 }}>{c.name}</h3>
              {c.phone ? <a className="muted" href={`tel:${c.phone}`} style={{ fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="phone" size={13} /> {c.phone}</a> : <span className="muted" style={{ fontSize: 13.5 }}>Brak telefonu</span>}
            </div>
          </div>
          <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div className="grid cols-3" style={{ marginTop: 16, gap: 10 }}>
          <MiniBox label="Rezerwacje" value={String(c.bookings)} />
          <MiniBox label="Przychód" value={zl(c.total)} />
          <MiniBox label="Stan.-dni" value={String(c.spotNights)} />
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', margin: '18px 0 8px' }}>Historia rezerwacji</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
          {res.map((r) => {
            const st = STATUS[reservationStatus(r)];
            const pay = PAY[paymentKind(r)];
            return (
              <div key={r.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <b style={{ fontSize: 14 }}>{r.fishery_name}</b>
                  <span className="badge" style={{ background: '#F3F4F6', color: st.color }}><span className="dot" style={{ background: st.color }} /> {st.label}</span>
                </div>
                <div className="meta-chips" style={{ marginTop: 8 }}>
                  <span className="meta-chip date"><Icon name="calendar" size={12} /> {fmtLong(r.date_from)}{r.date_from !== r.date_to ? ` – ${fmtLong(r.date_to)}` : ''}</span>
                  {r.spots?.length ? <span className="spot-nums">{r.spots.map((s) => <span key={s} className="spot-pill">{s}</span>)}</span> : null}
                </div>
                {r.status !== 'cancelled' && (
                  <div style={{ marginTop: 8, fontSize: 13, color: colors.textSecondary }}>{pay.label} · <b style={{ color: colors.primary }}>{zl(r.total)}</b></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, hint, accent }: { icon: string; label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.textSecondary, fontSize: 12.5, fontWeight: 600 }}>
        <Icon name={icon as never} size={15} color={accent ? colors.accent : colors.textSecondary} /> {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, color: accent ? colors.primary : colors.text }}>{value}</div>
      {hint && <div style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function BlocksModal({ fisheries, onClose }: { fisheries: Fishery[]; onClose: () => void }) {
  const [fid, setFid] = useState(fisheries[0]?.id ?? '');
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!fid) return;
    setLoading(true);
    ownerListBlocks(fid).then(setBlocks).catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error')).finally(() => setLoading(false));
  }, [fid]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!phone.trim() && !name.trim()) { toast('Podaj telefon lub nazwę wędkarza.', 'error'); return; }
    setBusy(true);
    try { await ownerBlockUser(fid, { phone: phone.trim() || null, name: name.trim() || null, reason: reason.trim() || null }); setName(''); setPhone(''); setReason(''); load(); toast('Dodano blokadę', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    try { await ownerUnblock(id); setBlocks((p) => p.filter((b) => b.id !== id)); toast('Blokada zdjęta', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h3 style={{ fontSize: 18 }}>Zablokowani wędkarze</h3><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Nie zarezerwują online wybranego łowiska.</div></div>
          <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        {fisheries.length > 1 && (
          <div style={{ marginTop: 14 }}>
            <Select value={fid} onChange={setFid} icon="fish" width="100%" options={fisheries.map((f) => ({ value: f.id, label: f.name }))} />
          </div>
        )}

        <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <input className="input" placeholder="Imię / nazwa" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
          <input className="input" placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
          <input className="input" placeholder="Powód (opcjonalnie)" value={reason} onChange={(e) => setReason(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
          <button className="btn accent" disabled={busy} onClick={add}><Icon name="plus" size={15} /> Dodaj</button>
        </div>

        <div style={{ marginTop: 16 }}>
          {loading ? <Loader label="Wczytywanie…" />
            : blocks.length === 0 ? <div className="muted" style={{ fontSize: 13.5, padding: '8px 0' }}>Brak zablokowanych wędkarzy.</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {blocks.map((b) => (
                    <div key={b.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{b.name || b.phone || 'Wędkarz'}</div>
                        <div className="muted" style={{ fontSize: 12.5 }}>{[b.phone, b.reason].filter(Boolean).join(' · ') || '—'}</div>
                      </div>
                      <button className="btn ghost sm" onClick={() => remove(b.id)}><Icon name="check" size={13} /> Odblokuj</button>
                    </div>
                  ))}
                </div>
              )}
        </div>
      </div>
    </div>
  );
}
