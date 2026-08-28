import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminListOwners, adminListAnglers, type OwnerRow, type AnglerRow } from '../../lib/api';
import { toast } from '../../components/Toast';
import Loader from '../../components/Loader';
import Icon from '../../components/Icon';
import { colors } from '../../theme';

const zl = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('pl-PL')} zł`;
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const initials = (s: string) => (s || '?').trim().split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();

const PLAN_LABEL: Record<string, string> = { basic: 'Basic', premium: 'Premium', pro: 'Pro' };
function PlanPill({ plan }: { plan: string }) {
  const bg = plan === 'pro' ? colors.primary : plan === 'premium' ? colors.accent : '#E5E7EB';
  const fg = plan === 'basic' ? colors.textSecondary : '#fff';
  return <span className="badge" style={{ background: bg, color: fg }}>{PLAN_LABEL[plan] ?? plan}</span>;
}

export default function AdminUsers() {
  const nav = useNavigate();
  const [tab, setTab] = useState<'owners' | 'anglers'>('owners');
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [anglers, setAnglers] = useState<AnglerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'basic' | 'premium' | 'pro'>('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([adminListOwners(), adminListAnglers()])
      .then(([o, a]) => { setOwners(o); setAnglers(a); })
      .catch((e) => toast(e instanceof Error ? e.message : 'Błąd ładowania', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const fOwners = useMemo(() => {
    const s = q.trim().toLowerCase();
    return owners
      .filter((o) => planFilter === 'all' || o.plan === planFilter)
      .filter((o) => !s || `${o.name} ${o.email} ${o.business_name} ${o.fisheries.map((f) => f.name).join(' ')}`.toLowerCase().includes(s));
  }, [owners, q, planFilter]);
  const fAnglers = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? anglers.filter((a) => `${a.name} ${a.email} ${a.phone}`.toLowerCase().includes(s)) : anglers;
  }, [anglers, q]);

  const mrr = owners.reduce((s, o) => s + (o.monthly_total || 0), 0);

  const exportCsv = () => {
    const csvCell = (x: unknown) => `"${String(x ?? '').replace(/"/g, '""')}"`;
    const fmtCsvDate = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
    let rows: (string | number)[][];
    let fname: string;
    if (tab === 'owners') {
      rows = [['Nazwa/Firma', 'Imie', 'Email', 'NIP', 'Telefon', 'Lowiska', 'Liczba lowisk', 'Plan', 'Placi nam (zl/mc)', 'Dolaczyl'],
        ...fOwners.map((o) => [o.business_name || '', o.name || '', o.email || '', o.nip || '', o.phone || '',
          o.fisheries.map((f) => `${f.name} (${f.plan})`).join('; '), o.fisheries.length, o.plan, o.monthly_total, fmtCsvDate(o.created_at)])];
      fname = 'wlasciciele';
    } else {
      rows = [['Imie i nazwisko', 'Email', 'Telefon', 'Wojewodztwo', 'Rezerwacje', 'Wydal (zl)', 'Ostatnia wizyta', 'Dolaczyl'],
        ...fAnglers.map((a) => [a.name || '', a.email || '', a.phone || '', a.province || '', a.reservations_count,
          Math.round(Number(a.total_spent) || 0), fmtCsvDate(a.last_visit), fmtCsvDate(a.created_at)])];
      fname = 'wedkarze';
    }
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${fname}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Użytkownicy</h1><div className="sub">Właściciele łowisk i wędkarze — pełny podgląd, płatności i faktury</div></div>
        <div className="topbar-right">
          <button className="btn ghost" disabled={loading || (tab === 'owners' ? fOwners.length === 0 : fAnglers.length === 0)} onClick={exportCsv}>
            <Icon name="arrowUp" size={15} /> Eksport (Excel)
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>Przychód miesięczny (MRR)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colors.primary }}>{zl(mrr)}</div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="row" style={{ marginBottom: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="row" style={{ alignItems: 'center', gap: 12 }}>
            <div className="seg">
              <button className={`seg-btn ${tab === 'owners' ? 'on' : ''}`} onClick={() => setTab('owners')}>Właściciele · {owners.length}</button>
              <button className={`seg-btn ${tab === 'anglers' ? 'on' : ''}`} onClick={() => setTab('anglers')}>Wędkarze · {anglers.length}</button>
            </div>
            {tab === 'owners' && (
              <div className="row" style={{ gap: 6 }}>
                {(['all', 'pro', 'premium', 'basic'] as const).map((p) => (
                  <span key={p} className={`chip ${planFilter === p ? 'on' : ''}`} onClick={() => setPlanFilter(p)}>
                    {p === 'all' ? 'Wszystkie' : p === 'pro' ? 'Pro' : p === 'premium' ? 'Premium' : 'Basic'}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="searchbar" style={{ maxWidth: 280 }}>
            <Icon name="search" size={16} color={colors.textSecondary} />
            <input placeholder="Szukaj po nazwisku, e-mailu…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {loading ? <Loader label="Wczytywanie użytkowników…" /> : tab === 'owners' ? (
          fOwners.length === 0 ? <div className="card empty">Brak właścicieli w bazie.</div> : (
            <div className="card" style={{ padding: 0 }}>
              <table className="tbl">
                <thead><tr><th>Właściciel</th><th>Łowiska</th><th>Plan</th><th>Płaci nam</th><th style={{ textAlign: 'right' }}></th></tr></thead>
                <tbody>
                  {fOwners.map((o) => (
                    <tr key={o.user_id} style={{ cursor: 'pointer' }} onClick={() => nav(`/uzytkownik/${o.user_id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="ava-sm">{initials(o.name || o.email || '?')}</div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{o.business_name || o.name || 'Właściciel'}</div>
                            <div style={{ fontSize: 12.5, color: colors.textSecondary }}>{o.email}{o.nip ? ` · NIP ${o.nip}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 600 }}>{o.fisheries.length}</span> <span style={{ color: colors.textSecondary, fontSize: 12.5 }}>{o.fisheries.map((f) => f.name).join(', ')}</span></td>
                      <td><PlanPill plan={o.plan} /></td>
                      <td style={{ fontWeight: 700, color: o.monthly_total > 0 ? colors.primary : colors.textSecondary }}>{o.monthly_total > 0 ? `${zl(o.monthly_total)}/mc` : '—'}</td>
                      <td style={{ textAlign: 'right' }}><Icon name="chevronRight" size={18} color={colors.textSecondary} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          fAnglers.length === 0 ? <div className="card empty">Brak wędkarzy w bazie.</div> : (
            <div className="card" style={{ padding: 0 }}>
              <table className="tbl">
                <thead><tr><th>Wędkarz</th><th>Rezerwacje</th><th>Wydał</th><th>Ostatnia wizyta</th><th>Dołączył</th><th style={{ textAlign: 'right' }}></th></tr></thead>
                <tbody>
                  {fAnglers.map((a) => (
                    <tr key={a.user_id} style={{ cursor: 'pointer' }} onClick={() => nav(`/uzytkownik/${a.user_id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="ava-sm">{initials(a.name || a.email || '?')}</div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{a.name || 'Wędkarz'}</div>
                            <div style={{ fontSize: 12.5, color: colors.textSecondary }}>{a.email}{a.phone ? ` · ${a.phone}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{a.reservations_count}</td>
                      <td style={{ fontWeight: 700 }}>{zl(a.total_spent)}</td>
                      <td>{fmtDate(a.last_visit)}</td>
                      <td style={{ color: colors.textSecondary, fontSize: 12.5 }}>{fmtDate(a.created_at)}</td>
                      <td style={{ textAlign: 'right' }}><Icon name="chevronRight" size={18} color={colors.textSecondary} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </>
  );
}
