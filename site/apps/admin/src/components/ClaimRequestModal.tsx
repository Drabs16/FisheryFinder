import { useEffect, useState } from 'react';
import { searchCatalog, requestFisheryClaim } from '../lib/api';
import Icon from './Icon';
import { colors } from '../theme';

type Hit = { id: string; name: string; city: string; owner_id: string | null };

export default function ClaimRequestModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [sel, setSel] = useState<Hit | null>(null);
  const [business, setBusiness] = useState('');
  const [nip, setNip] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (sel || q.trim().length < 2) { setHits([]); return; }
    let live = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try { const r = await searchCatalog(q); if (live) setHits(r); }
      catch { /* ignore */ }
      finally { if (live) setSearching(false); }
    }, 280);
    return () => { live = false; clearTimeout(t); };
  }, [q, sel]);

  const submit = async () => {
    if (!sel) return;
    setBusy(true); setErr('');
    try { await requestFisheryClaim(sel.id, business.trim(), nip.trim(), phone.trim(), message.trim()); setDone(true); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Nie udało się wysłać wniosku'); setBusy(false); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '8px 4px' }}>
            <div className="warnIcon" style={{ background: '#EAF6EF', color: colors.primary, margin: '0 auto 10px' }}><Icon name="check" size={26} /></div>
            <h3>Wniosek wysłany</h3>
            <p className="muted" style={{ fontSize: 14, margin: '8px 0 18px', lineHeight: 1.5 }}>
              Zweryfikujemy, że jesteś właścicielem „{sel?.name}". Po zatwierdzeniu łowisko pojawi się w „Moje łowiska".
            </p>
            <button className="btn" onClick={onClose}>Gotowe</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><h3>Poproś o dostęp do łowiska</h3>
                <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Znajdź swoje łowisko w bazie i złóż wniosek — zweryfikujemy własność.</div></div>
              <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16} /></button>
            </div>

            {!sel ? (
              <div className="field" style={{ marginTop: 16 }}>
                <label>Wyszukaj łowisko</label>
                <div className="searchbox" style={{ width: '100%' }}>
                  <Icon name="search" size={16} color={colors.textSecondary} />
                  <input autoFocus placeholder="Nazwa łowiska lub miasto…" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                {searching && <div className="hint" style={{ marginTop: 8 }}>Szukam…</div>}
                {hits.length > 0 && (
                  <div style={{ marginTop: 8, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    {hits.map((h) => (
                      <button key={h.id} type="button" className="catalog-hit" onClick={() => setSel(h)}
                        style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fff', border: 'none', borderTop: `1px solid ${colors.border}`, cursor: 'pointer', textAlign: 'left' }}>
                        <span><b>{h.name}</b> <span className="muted" style={{ fontSize: 13 }}>· {h.city}</span></span>
                        {h.owner_id ? <span className="muted" style={{ fontSize: 12 }}>zajęte</span> : <Icon name="chevronRight" size={16} color={colors.textSecondary} />}
                      </button>
                    ))}
                  </div>
                )}
                {q.trim().length >= 2 && !searching && hits.length === 0 && (
                  <div className="hint" style={{ marginTop: 8 }}>Brak wyników. Nie ma Twojego łowiska? Napisz do nas — dodamy je do bazy.</div>
                )}
              </div>
            ) : (
              <>
                <div style={{ marginTop: 16, padding: '10px 12px', background: '#EAF6EF', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><b>{sel.name}</b> <span className="muted" style={{ fontSize: 13 }}>· {sel.city}</span></span>
                  <button className="btn ghost sm" onClick={() => { setSel(null); setHits([]); }}>Zmień</button>
                </div>
                {sel.owner_id && <div className="notice err" style={{ marginTop: 12 }}>To łowisko ma już przypisanego właściciela. Jeśli to pomyłka — opisz to w wiadomości.</div>}
                {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}
                <div className="row" style={{ marginTop: 12 }}>
                  <div className="field" style={{ flex: 1 }}><label>Nazwa firmy</label><input className="input" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="np. Łowisko Borowa Sp. z o.o." /></div>
                  <div className="field" style={{ flex: 1 }}><label>NIP</label><input className="input" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="np. 1234567890" /></div>
                </div>
                <div className="field"><label>Telefon kontaktowy</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48…" /></div>
                <div className="field"><label>Wiadomość (potwierdź, że jesteś właścicielem)</label><textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Kilka słów, jak możemy Cię zweryfikować…" /></div>
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                  <button className="btn ghost" onClick={onClose}>Anuluj</button>
                  <button className="btn" disabled={busy} onClick={submit}><Icon name="check" size={15} /> {busy ? 'Wysyłanie…' : 'Wyślij wniosek'}</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
