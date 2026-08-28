import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { AMENITY_OPTIONS, FISH_OPTIONS, PROVINCES, TYPE_OPTIONS, pluralFisheries } from '../lib/constants';
import { fetchFisheriesCount } from '../lib/fisheries';

export interface FilterValues {
  types: string[]; fish: string[]; provinces: string[]; amenities: string[];
  nokill: boolean; online: boolean;
  priceMin: number | null; priceMax: number | null; minRating: number | null; radiusKm: number | null;
}

export const EMPTY_FILTERS: FilterValues = {
  types: [], fish: [], provinces: [], amenities: [], nokill: false, online: false,
  priceMin: null, priceMax: null, minRating: null, radiusKm: null,
};

// Liczba aktywnych kryteriów (do plakietek).
export const activeFilterCount = (v: FilterValues): number =>
  v.types.length + v.fish.length + v.provinces.length + v.amenities.length
  + (v.nokill ? 1 : 0) + (v.online ? 1 : 0)
  + (v.priceMin != null || v.priceMax != null ? 1 : 0) + (v.minRating != null ? 1 : 0) + (v.radiusKm != null ? 1 : 0);

const RATINGS = [3, 4, 4.5];
const RADII = [25, 50, 100];

interface Props { initial: FilterValues; search?: string; lat?: number | null; lng?: number | null; onApply: (v: FilterValues) => void; onClose: () => void; }

export default function FilterSheet({ initial, search = '', lat = null, lng = null, onApply, onClose }: Props) {
  const [types, setTypes] = useState(initial.types);
  const [fish, setFish] = useState(initial.fish);
  const [provinces, setProvinces] = useState(initial.provinces);
  const [amenities, setAmenities] = useState(initial.amenities);
  const [nokill, setNokill] = useState(initial.nokill);
  const [online, setOnline] = useState(initial.online);
  const [priceMin, setPriceMin] = useState<number | null>(initial.priceMin);
  const [priceMax, setPriceMax] = useState<number | null>(initial.priceMax);
  const [minRating, setMinRating] = useState<number | null>(initial.minRating);
  const [radiusKm, setRadiusKm] = useState<number | null>(initial.radiusKm);
  const [resultCount, setResultCount] = useState<number | null>(null);

  // blokada scrolla tła + zamykanie Esc
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  // licznik wyników na żywo (debounce) — odzwierciedla WSZYSTKIE bieżące kryteria + wyszukiwarkę
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      fetchFisheriesCount({ search, types, fish, provinces, nokill, online, amenities, minPrice: priceMin, maxPrice: priceMax, minRating, radiusKm, lat, lng })
        .then((n) => { if (alive) setResultCount(n); })
        .catch(() => { if (alive) setResultCount(null); });
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [search, types, fish, provinces, nokill, online, amenities, priceMin, priceMax, minRating, radiusKm, lat, lng]);

  const toggle = (arr: string[], x: string, set: (v: string[]) => void) => set(arr.includes(x) ? arr.filter((i) => i !== x) : [...arr, x]);
  const current: FilterValues = { types, fish, provinces, amenities, nokill, online, priceMin, priceMax, minRating, radiusKm };
  const count = activeFilterCount(current);
  const reset = () => { setTypes([]); setFish([]); setProvinces([]); setAmenities([]); setNokill(false); setOnline(false); setPriceMin(null); setPriceMax(null); setMinRating(null); setRadiusKm(null); };
  const num = (v: string): number | null => { const n = Number(v.replace(/[^\d]/g, '')); return v.trim() === '' || !Number.isFinite(n) || n <= 0 ? null : n; };

  const applyLabel = resultCount === null ? 'Pokaż wyniki'
    : resultCount === 0 ? 'Brak wyników'
    : `Pokaż ${resultCount} ${pluralFisheries(resultCount)}`;

  return createPortal(
    <div className="drawer-back" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div style={{ fontWeight: 800, fontSize: 19 }}>Filtry{count ? <span className="drawer-count">{count}</span> : null}</div>
          <button onClick={onClose} aria-label="Zamknij" className="drawer-x"><Icon name="x" size={18} /></button>
        </div>

        <div className="drawer-body">
          <button className={`online-toggle ${online ? 'on' : ''}`} onClick={() => setOnline((v) => !v)} role="switch" aria-checked={online}>
            <span className="online-toggle-logo"><img src="/logo-fish.png" alt="" /></span>
            <span className="online-toggle-txt">
              <span className="online-toggle-title">Tylko łowiska partnerskie</span>
              <span className="online-toggle-sub">Rezerwacja online — pewna dostępność stanowisk</span>
            </span>
            <span className="switch" aria-hidden><span className="knob">{online && <Icon name="check" size={12} color="var(--ff-primary)" />}</span></span>
          </button>

          <Group title="Cena za dobę (zł)">
            <div className="price-range">
              <input className="price-input" inputMode="numeric" placeholder="od" value={priceMin ?? ''} onChange={(e) => setPriceMin(num(e.target.value))} />
              <span className="price-dash">–</span>
              <input className="price-input" inputMode="numeric" placeholder="do" value={priceMax ?? ''} onChange={(e) => setPriceMax(num(e.target.value))} />
            </div>
          </Group>

          <Group title="Minimalna ocena">
            <Chip label="Każda" active={minRating === null} onClick={() => setMinRating(null)} />
            {RATINGS.map((r) => (
              <Chip key={r} label={`${r}+ ★`} active={minRating === r} onClick={() => setMinRating(minRating === r ? null : r)} />
            ))}
          </Group>

          {lat != null && lng != null && (
            <Group title="Odległość od Ciebie">
              <Chip label="Bez limitu" active={radiusKm === null} onClick={() => setRadiusKm(null)} />
              {RADII.map((r) => (
                <Chip key={r} label={`do ${r} km`} active={radiusKm === r} onClick={() => setRadiusKm(radiusKm === r ? null : r)} />
              ))}
            </Group>
          )}

          <Group title="Typ łowiska">
            <Chip label="No Kill" active={nokill} onClick={() => setNokill((v) => !v)} />
            {TYPE_OPTIONS.map((t) => <Chip key={t} label={t} active={types.includes(t)} onClick={() => toggle(types, t, setTypes)} />)}
          </Group>
          <Group title="Gatunki ryb">
            {FISH_OPTIONS.map((s) => <Chip key={s} label={s} active={fish.includes(s)} onClick={() => toggle(fish, s, setFish)} />)}
          </Group>
          <Group title="Udogodnienia">
            {AMENITY_OPTIONS.map((a) => <Chip key={a.match} label={a.label} active={amenities.includes(a.match)} onClick={() => toggle(amenities, a.match, setAmenities)} />)}
          </Group>
          <Group title="Województwo">
            {PROVINCES.map((p) => <Chip key={p} label={p} active={provinces.includes(p)} onClick={() => toggle(provinces, p, setProvinces)} />)}
          </Group>
        </div>

        <div className="drawer-foot">
          <button onClick={reset} className="drawer-clear">Wyczyść</button>
          <button onClick={() => onApply(current)} disabled={resultCount === 0} className="drawer-apply">
            {applyLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="filter-group">
      <div className="filter-group-title">{title}</div>
      <div className="chip-wrap">{children}</div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`filter-chip ${active ? 'on' : ''}`}>
      {active && <Icon name="check" size={14} color="#fff" />}
      {label}
    </button>
  );
}
