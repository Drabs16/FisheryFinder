import { useEffect, useMemo, useState } from 'react';
import { adminListCatches, adminSetCatchHidden, type AdminCatchRow } from '../../lib/api';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/Confirm';
import Loader from '../../components/Loader';
import Icon from '../../components/Icon';
import Select from '../../components/Select';
import { colors } from '../../theme';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function AdminCatches() {
  const [rows, setRows] = useState<AdminCatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [q, setQ] = useState('');
  const [fisheryId, setFisheryId] = useState<string>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminListCatches(filter === 'all' ? undefined : filter, q || undefined)
      .then(setRows)
      .catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [filter]);

  const fisheryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) if (r.fishery_id && !seen.has(r.fishery_id)) seen.set(r.fishery_id, r.fishery_name || '—');
    const opts = [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'pl'));
    return [{ value: 'all', label: 'Wszystkie łowiska' }, ...opts];
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => (!s || `${r.species} ${r.fishery_name ?? ''} ${r.angler ?? ''}`.toLowerCase().includes(s)) && (fisheryId === 'all' || r.fishery_id === fisheryId));
  }, [rows, q, fisheryId]);

  const hiddenCount = rows.filter((r) => r.hidden).length;

  const toggle = async (r: AdminCatchRow) => {
    if (!r.hidden && !(await confirmDialog({ title: 'Ukryć połów?', message: 'Zgłoszenie zniknie z tablicy rywalizacji, ale zostanie w bazie. Możesz je przywrócić.', confirmLabel: 'Ukryj', danger: true }))) return;
    setBusy(r.id);
    try {
      await adminSetCatchHidden(r.id, !r.hidden);
      setRows((p) => p.map((x) => (x.id === r.id ? { ...x, hidden: !x.hidden } : x)));
      toast(r.hidden ? 'Połów przywrócony' : 'Połów ukryty', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Błąd', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Połowy — moderacja <span className="admin-badge">ADMIN</span></h1><div className="sub">Zgłoszenia z tablic rywalizacji</div></div>
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
                {f === 'all' ? 'Wszystkie' : f === 'visible' ? 'Widoczne' : `Ukryte · ${hiddenCount}`}
              </span>
            ))}
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <Select value={fisheryId} onChange={setFisheryId} options={fisheryOptions} width={240} icon="waves" placeholder="Łowisko" />
            <div className="searchbar" style={{ maxWidth: 280 }}>
              <Icon name="search" size={16} color={colors.textSecondary} />
              <input placeholder="Szukaj (gatunek, łowisko, wędkarz)…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? <Loader label="Wczytywanie połowów…" />
          : filtered.length === 0 ? (
            <div className="card empty"><div className="big"><Icon name="fish" size={26} /></div>{rows.length === 0 ? 'Brak zgłoszonych połowów.' : 'Brak połowów dla tego filtra.'}</div>
          ) : (
            <div className="grid cols-4" style={{ gap: 14 }}>
              {filtered.map((r) => (
                <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden', opacity: r.hidden ? 0.6 : 1 }}>
                  {r.photo_url ? (
                    <img
                      src={r.photo_url}
                      alt={r.species}
                      style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = 'none';
                        const ph = el.nextElementSibling as HTMLElement | null;
                        if (ph) ph.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div style={{ height: 150, background: colors.accentSoft, display: r.photo_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="fish" size={30} color={colors.primary} />
                  </div>

                  <div style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <b>{r.species}</b>
                      <span style={{ fontSize: 13, color: colors.textSecondary, whiteSpace: 'nowrap' }}>
                        {r.weight != null ? `${r.weight} kg` : r.length_cm != null ? `${r.length_cm} cm` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                      {r.angler || 'Wędkarz'}{r.fishery_name ? ` · ${r.fishery_name}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{fmtDate(r.caught_on)}</div>

                    {r.hidden && (
                      <span className="badge" style={{ background: '#FEE2E2', color: colors.error, marginTop: 8, display: 'inline-block' }}>Ukryty</span>
                    )}

                    <button className="btn ghost sm" style={{ marginTop: 10, width: '100%' }} disabled={busy === r.id} onClick={() => toggle(r)}>
                      {r.hidden ? <><Icon name="check" size={13} /> Przywróć</> : <><Icon name="x" size={13} /> Ukryj</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </>
  );
}
