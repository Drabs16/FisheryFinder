import { useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { shareReservation, unshareReservation, type ShareResult } from '../lib/reservations';
import type { Reservation } from '../lib/types';

const ERR: Partial<Record<ShareResult, string>> = {
  no_account: 'Nie znaleziono konta z tym adresem. Kolega musi mieć konto Fishery Finder.',
  self: 'To Twój własny adres e-mail.',
  already: 'Ta osoba ma już dostęp do tej rezerwacji.',
  forbidden: 'Możesz udostępniać tylko własne rezerwacje.',
  not_found: 'Nie znaleziono rezerwacji.',
};
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

interface Props { reservation: Reservation; onClose: () => void; onChanged: () => void; }

export default function ShareModal({ reservation, onClose, onChanged }: Props) {
  const [email, setEmail] = useState('');
  const [shared, setShared] = useState<string[]>(reservation.sharedWith);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const e = email.trim().toLowerCase();
    if (!isEmail(e)) { setError('Podaj poprawny adres e-mail.'); return; }
    setBusy(true); setError('');
    try {
      const res = await shareReservation(reservation.id, e);
      if (res === 'ok') { setShared((s) => [...s, e]); setEmail(''); onChanged(); }
      else setError(ERR[res] ?? 'Nie udało się udostępnić.');
    } catch { setError('Coś poszło nie tak. Spróbuj ponownie.'); }
    finally { setBusy(false); }
  };

  const remove = async (e: string) => {
    setBusy(true); setError('');
    try { await unshareReservation(reservation.id, shared, e); setShared((s) => s.filter((x) => x !== e)); onChanged(); }
    catch { setError('Nie udało się cofnąć udostępnienia.'); }
    finally { setBusy(false); }
  };

  return createPortal(
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" style={{ maxWidth: 460 }} onClick={(ev) => ev.stopPropagation()}>
        <div className="sheet-head">
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--ff-green-50)', color: 'var(--ff-primary)', display: 'grid', placeItems: 'center' }}><Icon name="people" size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Udostępnij rezerwację</div>
            <div style={{ fontSize: 13, color: 'var(--ff-text-secondary)' }}>{reservation.fishery}</div>
          </div>
          <button className="x" onClick={onClose} aria-label="Zamknij"><Icon name="x" size={18} /></button>
        </div>

        <div className="sheet-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--ff-text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Podaj e-mail kolegi <b style={{ color: 'var(--ff-text)' }}>z kontem Fishery Finder</b> — zobaczy tę rezerwację w swoich „Rezerwacjach" (na stronie i w aplikacji).
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email" inputMode="email" placeholder="kolega@email.pl" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              style={{ flex: 1, height: 48, padding: '0 14px', border: `1px solid ${error ? 'var(--ff-error)' : 'var(--ff-border-strong)'}`, borderRadius: 'var(--ff-radius-md)', fontSize: 15, outline: 'none', background: 'var(--ff-surface)', color: 'var(--ff-text)' }}
            />
            <button onClick={submit} disabled={busy || !email.trim()} className="btn" style={{ height: 48, padding: '0 18px', opacity: busy || !email.trim() ? 0.6 : 1 }}>Udostępnij</button>
          </div>
          {error && <div style={{ fontSize: 13, color: 'var(--ff-error)', display: 'flex', alignItems: 'center', gap: 6, marginTop: -8 }}><Icon name="x" size={14} color="var(--ff-error)" /> {error}</div>}

          {shared.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--ff-text-secondary)', marginBottom: 10 }}>Udostępniono ({shared.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {shared.map((e) => (
                  <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--ff-bg)', borderRadius: 'var(--ff-radius-md)' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--ff-primary)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{e[0]?.toUpperCase()}</div>
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--ff-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e}</span>
                    <button onClick={() => remove(e)} disabled={busy} title="Cofnij dostęp" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ff-text-secondary)', display: 'grid', placeItems: 'center', padding: 4 }}><Icon name="x" size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
