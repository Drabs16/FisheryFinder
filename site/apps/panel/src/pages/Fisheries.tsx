import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { claimFishery, deleteFishery, fetchMyFisheries, fetchMyClaimRequests, type MyClaimRequest } from '../lib/api';
import { APP_URL } from '../lib/constants';
import type { Fishery } from '../lib/types';
import { colors } from '../theme';
import Icon from '../components/Icon';
import { toast } from '../components/Toast';
import ClaimRequestModal from '../components/ClaimRequestModal';
import Loader from '../components/Loader';

export default function Fisheries() {
  const { user } = useAuth();
  const [items, setItems] = useState<Fishery[]>([]);
  const [requests, setRequests] = useState<MyClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [claimOpen, setClaimOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<Fishery | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [fs, reqs] = await Promise.all([fetchMyFisheries(user.id), fetchMyClaimRequests().catch(() => [])]);
      setItems(fs);
      // pokazuj tylko wnioski do łowisk, których jeszcze nie mam przypisanych
      const ownedIds = new Set(fs.map((f) => f.id));
      setRequests(reqs.filter((r) => !ownedIds.has(r.fisheryId)));
    }
    catch (e) { setErr(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const doRemove = async () => {
    if (!delTarget) return;
    const f = delTarget;
    setDelTarget(null);
    try { await deleteFishery(f.id); setItems((p) => p.filter((x) => x.id !== f.id)); toast('Łowisko usunięte', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Nie udało się usunąć', 'error'); }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Moje łowiska</h1>
          <div className="sub">Profile łowisk widoczne dla wędkarzy w aplikacji</div>
        </div>
        <div className="topbar-right">
          <button className="btn ghost" onClick={() => setClaimOpen(true)}><Icon name="key" size={16} /> Mam kod łowiska</button>
          <button className="btn accent" onClick={() => setRequestOpen(true)}><Icon name="search" size={16} /> Poproś o dostęp do łowiska</button>
        </div>
      </div>
      <div className="content">
        {err && <div className="notice err">{err}</div>}

        {requests.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: colors.textSecondary, marginBottom: 10 }}>Wnioski o dostęp</div>
            {requests.map((r) => {
              const pending = r.status === 'pending';
              return (
                <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', marginBottom: 8 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center', background: pending ? '#FEF3C7' : '#FEE2E2', color: pending ? '#B45309' : colors.error }}>
                    <Icon name={pending ? 'clock' : 'x'} size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{r.fisheryName}{r.city ? <span className="muted" style={{ fontWeight: 400 }}> · {r.city}</span> : null}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>{pending ? 'Wniosek w trakcie weryfikacji — damy znać po akceptacji.' : 'Wniosek odrzucony. Skontaktuj się z nami lub spróbuj ponownie.'}</div>
                  </div>
                  <span className="badge" style={{ background: pending ? '#FEF3C7' : '#FEE2E2', color: pending ? '#B45309' : colors.error }}>{pending ? 'W weryfikacji' : 'Odrzucony'}</span>
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <Loader label="Wczytywanie łowisk…" />
        ) : items.length === 0 ? (
          <div className="card empty">
            <div className="big"><Icon name="search" size={28} /></div>
            <h3>Znajdź swoje łowisko</h3>
            <p style={{ margin: '8px 0 18px', maxWidth: 460 }}>Wszystkie łowiska są już w bazie Fishery Finder. Wyszukaj swoje i poproś o dostęp — zweryfikujemy, że jesteś właścicielem, i przypiszemy je do Twojego konta.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn accent" onClick={() => setRequestOpen(true)}><Icon name="search" size={16} /> Poproś o dostęp</button>
              <button className="btn ghost" onClick={() => setClaimOpen(true)}><Icon name="key" size={16} /> Mam kod</button>
            </div>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {items.map((f) => (
              <div key={f.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  height: 150, background: f.image_url ? `center/cover url(${f.image_url})` : colors.accentLight,
                  display: 'grid', placeItems: 'center', color: colors.primary,
                }}>
                  {!f.image_url && <Icon name="fish" size={36} />}
                </div>
                <div style={{ padding: 18 }}>
                  <h3 style={{ fontSize: 17 }}>{f.name}</h3>
                  <div style={{ color: colors.textSecondary, fontSize: 13.5, marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="pin" size={14} /> {f.city}, {f.province}
                  </div>
                  <div className="row" style={{ marginTop: 16 }}>
                    <Link className="btn sm" to={`/lowiska/${f.id}`}><Icon name="edit" size={14} /> Edytuj</Link>
                    <a className="btn ghost sm" href={`${APP_URL}/lowisko/${f.id}`} target="_blank" rel="noreferrer" title="Zobacz jak widzą wędkarze"><Icon name="globe" size={14} /> Podgląd</a>
                    <button className="btn ghost sm danger" onClick={() => setDelTarget(f)}><Icon name="trash" size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {claimOpen && <ClaimModal onClose={() => setClaimOpen(false)} onClaimed={() => { setClaimOpen(false); load(); }} />}
      {requestOpen && <ClaimRequestModal onClose={() => setRequestOpen(false)} />}

      {delTarget && (
        <div className="modal-back" onClick={() => setDelTarget(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18 }}>Usunąć łowisko?</h3>
            <p className="muted" style={{ fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>„{delTarget.name}" zostanie trwale usunięte wraz z danymi. Tej operacji nie można cofnąć.</p>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn ghost" onClick={() => setDelTarget(null)}>Anuluj</button>
              <button className="btn danger" onClick={doRemove}><Icon name="trash" size={15} /> Usuń łowisko</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ClaimModal({ onClose, onClaimed }: { onClose: () => void; onClaimed: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    if (!code.trim()) return;
    setBusy(true); setErr('');
    try { const name = await claimFishery(code.trim()); toast(`Przypisano łowisko: ${name}`, 'success'); onClaimed(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Błąd'); setBusy(false); }
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h3>Przypisz istniejące łowisko</h3>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Masz już łowisko w bazie Fishery Finder? Wpisz kod, który od nas dostałeś.</div></div>
          <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        {err && <div className="notice err" style={{ marginTop: 14 }}>{err}</div>}
        <div className="field" style={{ marginTop: 14 }}>
          <label>Kod łowiska</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="np. BOROWA-2026"
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Anuluj</button>
          <button className="btn" disabled={busy} onClick={submit}><Icon name="key" size={15} /> {busy ? 'Przypisywanie…' : 'Przypisz łowisko'}</button>
        </div>
      </div>
    </div>
  );
}
