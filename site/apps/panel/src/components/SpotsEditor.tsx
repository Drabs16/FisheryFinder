import { useEffect, useState } from 'react';
import { fetchSpots, saveSpotAttrs, saveLayoutImage, type SpotRow } from '../lib/api';
import Icon from './Icon';
import { toast } from './Toast';
import { colors } from '../theme';
import Loader from './Loader';

// Edytor stanowisk: cena i pojemność per stanowisko (VIP może być drożej) + opcjonalny plan (JPG).
// Bez rozstawiania pinów na mapie — tylko tabela atrybutów.
export default function SpotsEditor({ fisheryId, layoutImageUrl, totalSpots }: { fisheryId: string; layoutImageUrl: string | null; totalSpots: number }) {
  const [spots, setSpots] = useState<SpotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [img, setImg] = useState<string | null>(layoutImageUrl);
  const [imgBusy, setImgBusy] = useState(false);
  const [bulk, setBulk] = useState('');

  useEffect(() => {
    fetchSpots(fisheryId).then((s) => setSpots(s)).catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error')).finally(() => setLoading(false));
  }, [fisheryId]);

  const upd = (n: number, patch: Partial<SpotRow>) => { setSpots((p) => p.map((s) => (s.spot_number === n ? { ...s, ...patch } : s))); setDirty(true); };
  const applyAll = () => {
    const v = bulk.trim() === '' ? null : Math.max(0, Math.round(Number(bulk) || 0));
    setSpots((p) => p.map((s) => ({ ...s, price: v }))); setDirty(true);
  };
  const save = async () => {
    setSaving(true);
    try { await saveSpotAttrs(fisheryId, spots); setDirty(false); toast('Stanowiska zapisane', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Nie udało się zapisać', 'error'); }
    finally { setSaving(false); }
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setImgBusy(true);
    try { setImg(await saveLayoutImage(fisheryId, file)); toast('Plan łowiska zapisany', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Nie udało się wgrać planu', 'error'); }
    finally { setImgBusy(false); }
  };

  if (loading) return <Loader label="Wczytywanie stanowisk…" />;

  return (
    <div>
      {/* Plan łowiska (JPG) — sam podgląd, bez rozstawiania pinów */}
      <div style={{ marginBottom: 18 }}>
        <div className="hint" style={{ marginBottom: 10 }}>Opcjonalny plan/zdjęcie łowiska — wędkarz zobaczy je na stronie. To tylko obraz poglądowy (bez rozstawiania pinów).</div>
        {img && <img src={img} alt="Plan łowiska" style={{ width: '100%', maxWidth: 460, borderRadius: 12, border: `1px solid ${colors.border}`, marginBottom: 10, display: 'block' }} />}
        <label className="btn ghost sm" style={{ cursor: imgBusy ? 'default' : 'pointer', display: 'inline-flex', opacity: imgBusy ? 0.6 : 1, pointerEvents: imgBusy ? 'none' : 'auto' }}>
          <Icon name="image" size={15} /> {imgBusy ? 'Wgrywanie…' : (img ? 'Zmień plan (JPG)' : 'Wgraj plan (JPG)')}
          <input type="file" accept="image/*" disabled={imgBusy} style={{ display: 'none' }} onChange={(e) => { upload(e.target.files?.[0]); e.currentTarget.value = ''; }} />
        </label>
      </div>

      {spots.length === 0 ? (
        <div className="hint">Najpierw zapisz łowisko z liczbą stanowisk — wtedy pojawi się tu lista do ustawienia cen.</div>
      ) : (
        <>
          {spots.length !== totalSpots && (
            <div className="notice err" style={{ marginBottom: 12 }}>Liczba stanowisk w formularzu ({totalSpots}) różni się od zapisanej ({spots.length}). Zapisz łowisko, aby zsynchronizować listę.</div>
          )}
          <div className="row" style={{ alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: colors.textSecondary }}>Szybko ustaw wszystkim:</span>
            <div className="input-icon" style={{ width: 130 }}>
              <input className="input" type="number" min={0} placeholder="cena zł" value={bulk} onChange={(e) => setBulk(e.target.value)} style={{ paddingRight: 30 }} />
              <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary, fontSize: 13 }}>zł</span>
            </div>
            <button type="button" className="btn ghost sm" onClick={applyAll}>Zastosuj do wszystkich</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table spots-table">
              <thead>
                <tr><th>Stan.</th><th>Cena (zł)</th><th>Osób</th><th>VIP</th><th>Prąd</th><th>Notatka</th></tr>
              </thead>
              <tbody>
                {spots.map((s) => (
                  <tr key={s.spot_number} className={s.is_vip ? 'vip-row' : ''}>
                    <td style={{ fontWeight: 800, fontSize: 15 }}>{s.spot_number}</td>
                    <td>
                      <input className="input cell" type="number" min={0} placeholder="—" value={s.price ?? ''}
                        onChange={(e) => upd(s.spot_number, { price: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: 90 }} />
                    </td>
                    <td>
                      <input className="input cell" type="number" min={1} placeholder="1" value={s.capacity ?? ''}
                        onChange={(e) => upd(s.spot_number, { capacity: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: 70 }} />
                    </td>
                    <td><AttrToggle on={s.is_vip} icon="star" onClick={() => upd(s.spot_number, { is_vip: !s.is_vip })} /></td>
                    <td><AttrToggle on={s.has_power} icon="bolt" onClick={() => upd(s.spot_number, { has_power: !s.has_power })} /></td>
                    <td>
                      <input className="input cell" placeholder="np. przy pomoście" value={s.note ?? ''}
                        onChange={(e) => upd(s.spot_number, { note: e.target.value || null })} style={{ width: '100%', minWidth: 150 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" className="btn accent" disabled={saving || !dirty} onClick={save}>
              <Icon name="check" size={15} /> {saving ? 'Zapisywanie…' : 'Zapisz stanowiska'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AttrToggle({ on, icon, onClick }: { on: boolean; icon: 'star' | 'bolt'; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={on ? 'Włączone' : 'Wyłączone'}
      style={{
        width: 34, height: 30, borderRadius: 8, cursor: 'pointer', display: 'grid', placeItems: 'center',
        border: `1px solid ${on ? colors.accent : colors.border}`, background: on ? colors.accentSoft : '#fff',
        color: on ? colors.primary : colors.textSecondary,
      }}>
      <Icon name={icon} size={15} color={on ? colors.accent : colors.textSecondary} fill={on && icon === 'star'} />
    </button>
  );
}
