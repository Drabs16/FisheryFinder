import { useEffect, useMemo, useState } from 'react';
import { adminListClaimRequests, adminReviewClaim } from '../../lib/api';
import { colors } from '../../theme';
import Icon from '../../components/Icon';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/Confirm';
import type { ClaimRequestRow } from '../../lib/types';
import Loader from '../../components/Loader';

const fmt = (iso: string) => new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function AdminRequests() {
  const [items, setItems] = useState<ClaimRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await adminListClaimRequests()); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd ładowania', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const pending = useMemo(() => items.filter((r) => r.status === 'pending'), [items]);
  const history = useMemo(() => items.filter((r) => r.status !== 'pending'), [items]);

  const review = async (r: ClaimRequestRow, approve: boolean) => {
    if (!approve && !(await confirmDialog({ title: 'Odrzucić wniosek?', message: `Wniosek o „${r.fishery_name}" od ${r.user_email ?? 'użytkownika'} zostanie odrzucony.`, confirmLabel: 'Odrzuć', danger: true }))) return;
    setBusyId(r.id);
    try { await adminReviewClaim(r.id, approve); await load(); toast(approve ? 'Zatwierdzono — łowisko przypisane' : 'Wniosek odrzucony', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Wnioski <span className="admin-badge">ADMIN</span></h1><div className="sub">Weryfikacja właścicieli — przypisanie łowisk do kont</div></div>
      </div>
      <div className="content">
        {loading ? <Loader label="Wczytywanie wniosków…" /> : (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', margin: '2px 0 10px' }}>
              Oczekujące ({pending.length})
            </div>
            {pending.length === 0 ? (
              <div className="card empty" style={{ marginBottom: 22 }}><div className="big"><Icon name="check" size={26} /></div>Brak nowych wniosków.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {pending.map((r) => (
                  <div key={r.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 260, flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{r.fishery_name}</div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{fmt(r.created_at)}</div>
                        <div style={{ marginTop: 12, display: 'grid', gap: 6, fontSize: 13.5 }}>
                          <Row icon="mail" v={r.user_email ?? '—'} />
                          <Row icon="card" v={r.business_name || '—'} label="Firma" />
                          <Row icon="tag" v={r.nip || '—'} label="NIP" />
                          <Row icon="phone" v={r.phone || '—'} />
                        </div>
                        {r.message && <div style={{ marginTop: 10, padding: '10px 12px', background: '#F6FAF8', borderRadius: 10, fontSize: 13.5, color: colors.text }}>„{r.message}"</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                        <button className="btn" disabled={busyId === r.id} onClick={() => review(r, true)}><Icon name="check" size={15} /> Zatwierdź</button>
                        <button className="btn ghost danger" disabled={busyId === r.id} onClick={() => review(r, false)}><Icon name="x" size={15} /> Odrzuć</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 800, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px', margin: '2px 0 10px' }}>Historia</div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead><tr><th>Łowisko</th><th>Wnioskodawca</th><th>Status</th><th>Data</th></tr></thead>
                    <tbody>
                      {history.map((r) => (
                        <tr key={r.id}>
                          <td><b>{r.fishery_name}</b></td>
                          <td className="muted">{r.user_email}</td>
                          <td><span className="badge" style={{ background: r.status === 'approved' ? '#EAF6EF' : '#FBE9E7', color: r.status === 'approved' ? colors.primary : colors.error }}>{r.status === 'approved' ? 'Zatwierdzony' : 'Odrzucony'}</span></td>
                          <td className="muted">{fmt(r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Row({ icon, v, label }: { icon: 'mail' | 'card' | 'tag' | 'phone'; v: string; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.text }}>
      <Icon name={icon} size={14} color={colors.textSecondary} />
      {label && <span className="muted" style={{ minWidth: 42 }}>{label}:</span>}
      <span>{v}</span>
    </div>
  );
}
