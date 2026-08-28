import { useEffect, useMemo, useState } from 'react';
import { adminListReviews, adminSetReviewHidden, type AdminReviewRow } from '../../lib/api';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/Confirm';
import Loader from '../../components/Loader';
import Icon from '../../components/Icon';
import { colors } from '../../theme';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function AdminReviews() {
  const [rows, setRows] = useState<AdminReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    adminListReviews().then(setRows).catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => filter === 'all' || (filter === 'hidden' ? r.hidden : !r.hidden))
      .filter((r) => !s || `${r.author_name} ${r.fishery_name} ${r.comment}`.toLowerCase().includes(s));
  }, [rows, filter, q]);

  const hiddenCount = rows.filter((r) => r.hidden).length;

  const toggle = async (r: AdminReviewRow) => {
    if (!r.hidden && !(await confirmDialog({ title: 'Ukryć opinię?', message: 'Opinia zniknie ze strony łowiska, ale zostanie w bazie. Możesz ją przywrócić.', confirmLabel: 'Ukryj', danger: true }))) return;
    setBusy(r.id);
    try { await adminSetReviewHidden(r.id, !r.hidden); setRows((p) => p.map((x) => (x.id === r.id ? { ...x, hidden: !x.hidden } : x))); toast(r.hidden ? 'Opinia przywrócona' : 'Opinia ukryta', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusy(null); }
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Opinie <span className="admin-badge">ADMIN</span></h1><div className="sub">Moderacja opinii wędkarzy o łowiskach</div></div>
        <div className="topbar-right">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>Ukryte</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: hiddenCount ? colors.error : colors.primary }}>{hiddenCount}</div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="row" style={{ marginBottom: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 6 }}>
            {(['all', 'visible', 'hidden'] as const).map((f) => (
              <span key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? `Wszystkie · ${rows.length}` : f === 'visible' ? 'Widoczne' : `Ukryte · ${hiddenCount}`}
              </span>
            ))}
          </div>
          <div className="searchbar" style={{ maxWidth: 280 }}>
            <Icon name="search" size={16} color={colors.textSecondary} />
            <input placeholder="Szukaj w opiniach…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {loading ? <Loader label="Wczytywanie opinii…" />
          : filtered.length === 0 ? (
            <div className="card empty"><div className="big"><Icon name="star" size={26} /></div>{rows.length === 0 ? 'Brak opinii w bazie.' : 'Brak opinii dla tego filtra.'}</div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <table className="tbl">
                <thead><tr><th>Łowisko</th><th>Autor</th><th>Ocena</th><th>Komentarz</th><th>Data</th><th>Status</th><th style={{ textAlign: 'right' }}>Akcja</th></tr></thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} style={{ opacity: r.hidden ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 600 }}>{r.fishery_name || '—'}</td>
                      <td>{r.author_name || 'Wędkarz'}</td>
                      <td><span style={{ display: 'inline-flex', gap: 1 }}>{[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" size={13} color={s <= r.rating ? '#F59E0B' : colors.border} fill={s <= r.rating} />)}</span></td>
                      <td style={{ maxWidth: 320, fontSize: 13 }}>{r.comment || <span className="muted">—</span>}</td>
                      <td style={{ fontSize: 12.5, color: colors.textSecondary }}>{fmtDate(r.visited_on || r.created_at)}</td>
                      <td><span className="badge" style={{ background: r.hidden ? '#FEE2E2' : colors.accentSoft, color: r.hidden ? colors.error : colors.primary }}>{r.hidden ? 'Ukryta' : 'Widoczna'}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn ghost sm" disabled={busy === r.id} onClick={() => toggle(r)}>
                          {r.hidden ? <><Icon name="check" size={13} /> Przywróć</> : <><Icon name="x" size={13} /> Ukryj</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </>
  );
}
