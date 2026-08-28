import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { addCatch } from '../lib/catches';
import { colors } from '../theme';
import type { Fishery } from '../lib/types';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function CatchModal({ fishery, onClose, onAdded }: {
  fishery: Fishery; onClose: () => void; onAdded?: () => void;
}) {
  const [species, setSpecies] = useState('');
  const [weight, setWeight] = useState('');
  const [spot, setSpot] = useState('');
  const [caughtOn, setCaughtOn] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // blokada scrolla tła + zamykanie Esc (okno przez portal → nie łapie go transform .route-view)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const spots = useMemo(() => Array.from({ length: fishery.totalSpots || 0 }, (_, i) => i + 1), [fishery.totalSpots]);

  const pickFile = (f: File | null) => {
    setFile(f);
    setPreview((p) => { if (p) URL.revokeObjectURL(p); return f ? URL.createObjectURL(f) : ''; });
  };

  const submit = async () => {
    setErr('');
    if (!species.trim()) { setErr('Podaj gatunek ryby.'); return; }
    const w = weight ? Number(weight.replace(',', '.')) : null;
    if (w != null && (Number.isNaN(w) || w <= 0)) { setErr('Waga musi być liczbą większą od zera.'); return; }
    if (caughtOn > todayLocal()) { setErr('Data połowu nie może być z przyszłości.'); return; }
    setBusy(true);
    try {
      await addCatch({
        fisheryId: fishery.id, species: species.trim(), weight: w,
        spotNumber: spot ? Number(spot) : null, caughtOn, note, file,
      });
      onAdded?.();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Nie udało się zapisać połowu.');
      setBusy(false);
    }
  };

  return createPortal(
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--ff-green-50)', color: 'var(--ff-primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="trophy" size={19} /></div>
          <div style={{ flex: 1 }}><b style={{ fontSize: 17 }}>Dodaj połów</b><div className="muted" style={{ fontSize: 13 }}>{fishery.name}</div></div>
          <button className="x" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="sheet-body">
          {err && <div className="notice err">{err}</div>}

          {/* Zdjęcie */}
          <button type="button" className="catch-drop" onClick={() => fileRef.current?.click()}>
            {preview
              ? <img src={preview} alt="podgląd" />
              : <div className="catch-drop-empty"><Icon name="fish" size={26} color={colors.primary} /><span>Dodaj zdjęcie ryby</span><small>opcjonalnie, ale robi robotę</small></div>}
          </button>
          {preview && <button type="button" className="catch-photo-clear" onClick={() => pickFile(null)}><Icon name="x" size={13} /> Usuń zdjęcie</button>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />

          <div className="field" style={{ marginTop: 14 }}>
            <label>Gatunek</label>
            <input className="input" list="catch-fish" value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="np. Karp" />
            {fishery.fish.length > 0 && <datalist id="catch-fish">{fishery.fish.map((f) => <option key={f} value={f} />)}</datalist>}
            {fishery.fish.length > 0 && (
              <div className="catch-chips">
                {fishery.fish.slice(0, 8).map((f) => (
                  <button type="button" key={f} className={`catch-chip ${species === f ? 'on' : ''}`} onClick={() => setSpecies(f)}>{f}</button>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <label>Waga <span className="muted" style={{ fontWeight: 400 }}>· kg, opcjonalnie</span></label>
            <div className="input-suffix">
              <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="np. 8,5" />
              <span className="sfx">kg</span>
            </div>
          </div>

          {spots.length > 0 && (
            <div className="field">
              <label>Stanowisko <span className="muted" style={{ fontWeight: 400 }}>· opcjonalnie</span></label>
              <div className="catch-spots">
                {spots.map((s) => (
                  <button type="button" key={s} className={`catch-spot ${spot === String(s) ? 'on' : ''}`}
                    onClick={() => setSpot((cur) => (cur === String(s) ? '' : String(s)))}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label>Data połowu</label>
            <input className="input" type="date" value={caughtOn} max={todayLocal()} onChange={(e) => setCaughtOn(e.target.value)} />
          </div>

          <div className="field">
            <label>Notatka <span className="muted" style={{ fontWeight: 400 }}>· opcj.</span></label>
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Przynęta, metoda, pora dnia…" style={{ resize: 'vertical', minHeight: 70 }} />
          </div>
        </div>
        <div className="sheet-foot">
          <button className="btn ghost" onClick={onClose}>Anuluj</button>
          <button className="btn" disabled={busy} onClick={submit}><Icon name="check" size={16} /> {busy ? 'Zapisywanie…' : 'Zapisz połów'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
