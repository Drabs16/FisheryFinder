import { useEffect, useRef, useState } from 'react';
import { fetchSpots, saveSpotLayout, saveLayoutImage, type SpotRow } from '../lib/api';
import Icon from './Icon';
import { toast } from './Toast';

// Edytor rozmieszczenia stanowisk na planie/zdjęciu łowiska.
// Pozycje zapisywane jako pos_x/pos_y w zakresie 0..1 (względem obrazu).
export default function SpotMapEditor({ fisheryId, layoutImageUrl }: { fisheryId: string; layoutImageUrl: string | null }) {
  const [img, setImg] = useState<string | null>(layoutImageUrl);
  const [spots, setSpots] = useState<SpotRow[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try { setSpots(await fetchSpots(fisheryId)); }
      catch (e) { toast(e instanceof Error ? e.message : 'Błąd ładowania stanowisk', 'error'); }
      finally { setLoading(false); }
    })();
  }, [fisheryId]);

  const placed = spots.filter((s) => s.pos_x != null && s.pos_y != null);
  const unplaced = spots.filter((s) => s.pos_x == null || s.pos_y == null);
  const selSpot = spots.find((s) => s.spot_number === sel) ?? null;

  const update = (n: number, patch: Partial<SpotRow>) => {
    setSpots((prev) => prev.map((s) => (s.spot_number === n ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const coordsFromEvent = (e: { clientX: number; clientY: number }) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return null;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try { setImg(await saveLayoutImage(fisheryId, file)); toast('Plan łowiska wgrany', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Nie udało się wgrać planu', 'error'); }
    finally { setUploading(false); }
  };

  const placeOnMap = (n: number) => { update(n, { pos_x: 0.5, pos_y: 0.5 }); setSel(n); };
  const removeFromMap = (n: number) => { update(n, { pos_x: null, pos_y: null }); setSel(null); };

  const save = async () => {
    setBusy(true);
    try { await saveSpotLayout(fisheryId, spots); setDirty(false); toast('Rozmieszczenie zapisane', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Nie udało się zapisać', 'error'); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="hint">Ładowanie stanowisk…</div>;
  if (spots.length === 0) return <div className="hint">Najpierw zapisz łowisko z liczbą stanowisk — potem rozstawisz je tutaj.</div>;

  return (
    <div>
      <div className="hint" style={{ marginBottom: 10 }}>
        Wgraj plan/zdjęcie łowiska z lotu ptaka i przeciągnij numerowane piny na stanowiska.
        Wędkarz zobaczy tę mapę przy rezerwacji.
      </div>

      {!img ? (
        <label className={`btn ghost sm`} style={{ cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto' }}>
          <Icon name="image" size={15} /> {uploading ? 'Wgrywanie…' : 'Wgraj plan łowiska'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { onUpload(e.target.files?.[0]); e.currentTarget.value = ''; }} />
        </label>
      ) : (
        <>
          <div
            ref={boxRef}
            className="spotmap"
            style={{ backgroundImage: `url(${img})` }}
            onPointerMove={(e) => { if (dragRef.current != null) { const c = coordsFromEvent(e); if (c) update(dragRef.current, { pos_x: c.x, pos_y: c.y }); } }}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerLeave={() => { dragRef.current = null; }}
          >
            {placed.map((s) => (
              <button
                key={s.spot_number}
                type="button"
                className={`spotpin ${sel === s.spot_number ? 'sel' : ''} ${s.is_vip ? 'vip' : ''}`}
                style={{ left: `${(s.pos_x ?? 0) * 100}%`, top: `${(s.pos_y ?? 0) * 100}%` }}
                onPointerDown={(e) => { dragRef.current = s.spot_number; setSel(s.spot_number); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
                title={`Stanowisko ${s.spot_number}`}
              >
                {s.spot_number}
                {s.has_power && <span className="spotpin-bolt"><Icon name="bolt" size={9} color="#fff" /></span>}
              </button>
            ))}
          </div>

          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
            <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
              <Icon name="image" size={14} /> Zmień plan
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { onUpload(e.target.files?.[0]); e.currentTarget.value = ''; }} />
            </label>
            <span className="hint" style={{ alignSelf: 'center' }}>{placed.length}/{spots.length} rozstawionych</span>
          </div>
        </>
      )}

      {/* Tacka nierozstawionych */}
      {img && unplaced.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="hint" style={{ marginBottom: 6 }}>Do rozstawienia (kliknij, by dodać na mapę):</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unplaced.map((s) => (
              <button key={s.spot_number} type="button" className="chip" onClick={() => placeOnMap(s.spot_number)}>
                <Icon name="plus" size={12} /> {s.spot_number}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Panel wybranego stanowiska */}
      {selSpot && selSpot.pos_x != null && (
        <div className="card" style={{ marginTop: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <b>Stanowisko {selSpot.spot_number}</b>
            <button type="button" className="btn ghost sm" onClick={() => removeFromMap(selSpot.spot_number)}>
              <Icon name="trash" size={13} /> Zdejmij z mapy
            </button>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className={`chip ${selSpot.has_power ? 'on' : ''}`} onClick={() => update(selSpot.spot_number, { has_power: !selSpot.has_power })}>
              <Icon name="bolt" size={13} /> Prąd
            </button>
            <button type="button" className={`chip ${selSpot.is_vip ? 'on' : ''}`} onClick={() => update(selSpot.spot_number, { is_vip: !selSpot.is_vip })}>
              <Icon name="trophy" size={13} /> VIP
            </button>
          </div>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <button type="button" className="btn" disabled={busy || !dirty} onClick={save}>
          {busy ? 'Zapisywanie…' : 'Zapisz rozmieszczenie'}
        </button>
      </div>
    </div>
  );
}
