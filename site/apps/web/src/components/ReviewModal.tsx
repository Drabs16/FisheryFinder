import { useState } from 'react';
import Icon from './Icon';
import { addReview } from '../lib/fisheries';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function ReviewModal({ fisheryId, fisheryName, onClose, onDone }: {
  fisheryId: string; fisheryName: string; onClose: () => void; onDone?: () => void;
}) {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const authorName = profile?.name || (user?.user_metadata?.name as string) || user?.email?.split('@')[0] || 'Wędkarz';

  const submit = async () => {
    setErr('');
    if (rating < 1) { setErr('Wybierz ocenę (1–5 gwiazdek).'); return; }
    setBusy(true);
    try {
      await addReview({ fisheryId, rating, comment, authorName, visitedOn: new Date().toISOString().slice(0, 10) });
      onDone?.();
      onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Nie udało się zapisać opinii.'); setBusy(false); }
  };

  const labels = ['', 'Słabo', 'Może być', 'Dobrze', 'Bardzo dobrze', 'Rewelacja'];
  const shown = hover || rating;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div><b style={{ fontSize: 17 }}>Oceń łowisko</b><div className="muted" style={{ fontSize: 13 }}>{fisheryName}</div></div>
          <button className="x" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="sheet-body">
          {err && <div className="notice err">{err}</div>}
          <div style={{ textAlign: 'center', padding: '6px 0 4px' }}>
            <div style={{ display: 'inline-flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }} aria-label={`${s} gwiazdek`}>
                  <Icon name="star" size={34} color={s <= shown ? '#F59E0B' : colors.border} fill={s <= shown} />
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13.5, color: colors.textSecondary, marginTop: 6, minHeight: 18, fontWeight: 600 }}>{labels[shown]}</div>
          </div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Komentarz <span className="muted" style={{ fontWeight: 400 }}>· opcjonalnie</span></label>
            <textarea className="input" rows={4} value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Jak było? Ryby, dojazd, stanowiska, obsługa…" style={{ resize: 'vertical', minHeight: 90 }} />
          </div>
          <div className="muted" style={{ fontSize: 12 }}>Podpiszemy opinię jako <b>{authorName}</b>.</div>
        </div>
        <div className="sheet-foot">
          <button className="btn ghost" onClick={onClose}>Anuluj</button>
          <button className="btn" disabled={busy} onClick={submit}><Icon name="check" size={16} /> {busy ? 'Zapisywanie…' : 'Opublikuj opinię'}</button>
        </div>
      </div>
    </div>
  );
}
