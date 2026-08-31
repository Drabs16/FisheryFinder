import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';
import FisheryCard from '../components/FisheryCard';
import SkeletonCard from '../components/SkeletonCard';
import Calendar from '../components/Calendar';
import FilterSheet, { type FilterValues, EMPTY_FILTERS, activeFilterCount } from '../components/FilterSheet';
import { fetchFisheriesPage, fetchFisheriesCount, fetchTakenCounts, type FisheryQuery } from '../lib/fisheries';
import { fmtShort, haversineKm, pluralFisheries, todayIso, AMENITY_OPTIONS, PANEL_URL } from '../lib/constants';
import { SORT_OPTIONS, type Fishery } from '../lib/types';
import { colors } from '../theme';

const ctrlBtn = (active: boolean): CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 16px', cursor: 'pointer',
  borderRadius: 'var(--ff-radius-md)', fontWeight: 700, fontSize: 14.5,
  border: active ? '1px solid var(--ff-primary)' : '1px solid var(--ff-border-strong)',
  background: active ? 'var(--ff-primary)' : 'var(--ff-surface)', color: active ? '#fff' : 'var(--ff-text)',
});

const PAGE = 12;
const amenityLabel = (m: string) => AMENITY_OPTIONS.find((a) => a.match === m)?.label ?? m;

const isoFrom = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
// najbliższy weekend (sob–niedz)
const nextWeekend = (): [string, string] => {
  const d = new Date(); const dow = d.getDay(); // 0=niedz
  const toSat = (6 - dow + 7) % 7; const sat = addDays(toSat); const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
  return [isoFrom(sat), isoFrom(sun)];
};

export default function Home() {
  const [items, setItems] = useState<Fishery[]>([]);
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sugOpen, setSugOpen] = useState(false);
  const [sortBy, setSortBy] = useState('distance');
  const [showSort, setShowSort] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locName, setLocName] = useState('Lokalizuję…');
  const [taken, setTaken] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const reqRef = useRef(0);
  const resultsTop = useRef<HTMLDivElement>(null);

  const locate = useCallback(() => {
    setLocName('Lokalizuję…');
    navigator.geolocation?.getCurrentPosition(async (p) => {
      setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&accept-language=pl&lat=${p.coords.latitude}&lon=${p.coords.longitude}`);
        const d = await r.json();
        const a = d.address ?? {};
        setLocName(a.city || a.town || a.village || a.county || a.state || 'Twoja okolica');
      } catch { setLocName('Twoja okolica'); }
    }, () => setLocName('Brak lokalizacji'), { enableHighAccuracy: false, timeout: 8000 });
  }, []);
  useEffect(() => { locate(); }, [locate]);

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    const f = dateFrom || todayIso(); const t = dateTo || f;
    fetchTakenCounts(f, t).then(setTaken).catch(() => setTaken({}));
  }, [dateFrom, dateTo]);

  const build = useCallback((offset: number): FisheryQuery => ({
    search: debounced, types: filters.types, fish: filters.fish, provinces: filters.provinces, nokill: filters.nokill,
    online: filters.online, amenities: filters.amenities, minPrice: filters.priceMin, maxPrice: filters.priceMax,
    minRating: filters.minRating, radiusKm: filters.radiusKm,
    sort: sortBy, lat: coords?.lat ?? null, lng: coords?.lng ?? null, limit: PAGE, offset,
  }), [debounced, filters, sortBy, coords]);

  // Zmiana kryteriów (szukanie / filtry / sort / lokalizacja) → wróć na pierwszą stronę
  useEffect(() => { setPage(0); }, [debounced, filters, sortBy, coords]);

  // Pobierz bieżącą stronę wyników + łączną liczbę pasujących łowisk (do numeracji stron)
  useEffect(() => {
    const my = ++reqRef.current;
    setLoading(true);
    const q = build(page * PAGE);
    Promise.all([fetchFisheriesPage(q), fetchFisheriesCount(q)])
      .then(([list, total]) => { if (my !== reqRef.current) return; setItems(list); setCount(total); })
      .catch(() => { if (my === reqRef.current) { setItems([]); setCount(0); } })
      .finally(() => { if (my === reqRef.current) setLoading(false); });
  }, [build, page]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE));
  const goPage = (p: number) => {
    const next = Math.min(Math.max(0, p), totalPages - 1);
    if (next === page) return;
    setPage(next);
    resultsTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const distOf = (f: Fishery) => (coords ? haversineKm(coords.lat, coords.lng, f.latitude, f.longitude) : f.distance);
  const freeOf = (f: Fishery) => Math.max(0, f.totalSpots - (taken[f.id] ?? 0));
  // Wszystkie filtry (w tym udogodnienia, cena, ocena, promień) liczy serwer (search_fisheries)
  const visible = items;
  const activeFilters = activeFilterCount(filters);
  const dateLabel = dateFrom ? (dateTo && dateTo !== dateFrom ? `${fmtShort(dateFrom)} – ${fmtShort(dateTo)}` : fmtShort(dateFrom)) : 'Termin';

  // Pasek aktywnych filtrów — każdy zdejmowalny jednym kliknięciem
  const patch = (p: Partial<FilterValues>) => setFilters((f) => ({ ...f, ...p }));
  const chips: { key: string; label: string; remove: () => void }[] = [
    ...(filters.online ? [{ key: 'online', label: 'Partnerskie', remove: () => patch({ online: false }) }] : []),
    ...(filters.nokill ? [{ key: 'nokill', label: 'No Kill', remove: () => patch({ nokill: false }) }] : []),
    ...(filters.priceMin != null || filters.priceMax != null ? [{ key: 'price', label: filters.priceMin != null && filters.priceMax != null ? `${filters.priceMin}–${filters.priceMax} zł` : filters.priceMin != null ? `od ${filters.priceMin} zł` : `do ${filters.priceMax} zł`, remove: () => patch({ priceMin: null, priceMax: null }) }] : []),
    ...(filters.minRating != null ? [{ key: 'rating', label: `${filters.minRating}+ ★`, remove: () => patch({ minRating: null }) }] : []),
    ...(filters.radiusKm != null ? [{ key: 'radius', label: `do ${filters.radiusKm} km`, remove: () => patch({ radiusKm: null }) }] : []),
    ...filters.types.map((t) => ({ key: `t-${t}`, label: t, remove: () => patch({ types: filters.types.filter((x) => x !== t) }) })),
    ...filters.fish.map((s) => ({ key: `f-${s}`, label: s, remove: () => patch({ fish: filters.fish.filter((x) => x !== s) }) })),
    ...filters.amenities.map((m) => ({ key: `a-${m}`, label: amenityLabel(m), remove: () => patch({ amenities: filters.amenities.filter((x) => x !== m) }) })),
    ...filters.provinces.map((p) => ({ key: `p-${p}`, label: p, remove: () => patch({ provinces: filters.provinces.filter((x) => x !== p) }) })),
  ];

  // Rail „Łowiska partnerskie" — promujemy partnerów (premium = Pro/Premium) przy domyślnym przeglądaniu
  const partnersAll = items.filter((f) => f.premium);
  const showRail = page === 0 && !debounced && activeFilters === 0 && !dateFrom && !loading && partnersAll.length >= 1 && items.length >= 2;
  const promoted = showRail
    ? [...partnersAll].sort((a, b) => (coords ? distOf(a) - distOf(b) : (b.rating || 0) - (a.rating || 0))).slice(0, 8)
    : [];

  return (
    <>
    <section className="home-hero">
      <div className="hero-fish" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6].map((i) => <img key={i} src="/logo-fish.png" alt="" className={`hf hf-${i}`} />)}
      </div>
      <div className="hero-inner">
        <div className="hero-copy">
          <span className="hero-eyebrow">Wędkarski marketplace #1 w Polsce</span>
          <h1 className="hero-h1">Znajdź, porównaj i&nbsp;zarezerwuj łowisko <span className="hl">— online.</span></h1>
          <p className="hero-sub">
            Setki łowisk komercyjnych, sklepów wędkarskich i&nbsp;wód PZW na jednej mapie. W&nbsp;łowiskach partnerskich sprawdzisz realną dostępność stanowisk i&nbsp;zarezerwujesz miejsce — bez telefonów i&nbsp;zeszytów.
          </p>
          <div className="hero-trust">
            {[['fish', 'Cała Polska w jednym miejscu'], ['calendar', 'Rezerwacja online u partnerów'], ['check', 'Realna dostępność stanowisk']].map(([ic, t]) => (
              <span key={t}><Icon name={ic as IconName} size={17} color="#95D5B2" /> {t}</span>
            ))}
          </div>
        </div>
        <aside className="hero-owner">
          <div className="ho-card">
            <span className="ho-ic"><img src="/logo-fish.png" alt="" /></span>
            <div className="ho-title">Masz łowisko?</div>
            <p className="ho-desc">Dołącz do marketplace, przyjmuj rezerwacje online i&nbsp;docieraj do wędkarzy z&nbsp;całej Polski.</p>
            <a className="ho-btn" href={`${PANEL_URL}/register`} target="_blank" rel="noreferrer">Załóż konto właściciela →</a>
            <a className="ho-link" href={PANEL_URL} target="_blank" rel="noreferrer">Mam już konto właściciela</a>
          </div>
        </aside>
      </div>
    </section>

    {/* uniesiona biała karta wyszukiwania (nachodzi na hero) */}
    <div style={{ maxWidth: 'var(--ff-container)', margin: '-70px auto 0', padding: '0 clamp(16px, 3vw, 28px)', position: 'relative', zIndex: 10 }} onClick={() => setShowSort(false)}>
      <div style={{ background: 'var(--ff-surface)', borderRadius: 'var(--ff-radius-2xl)', boxShadow: 'var(--ff-shadow-lg)', padding: 18 }}>
        <div style={{ display: 'flex', gap: 12 }} className="home-search-row">
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 54, padding: '0 16px', border: '1px solid var(--ff-border-strong)', borderRadius: 'var(--ff-radius-md)', background: 'var(--ff-surface)' }}>
              <Icon name="search" size={20} color="var(--ff-text-secondary)" />
              <input placeholder="Szukaj łowiska lub miasta…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSugOpen(true)} onBlur={() => setTimeout(() => setSugOpen(false), 150)}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: 'var(--ff-text)', background: 'transparent' }} />
              {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Icon name="x" size={16} color="var(--ff-text-secondary)" /></button>}
            </div>
            {sugOpen && search.trim().length >= 2 && visible.length > 0 && (
              <div className="search-sug">
                {visible.slice(0, 5).map((f) => (
                  <button key={f.id} className="search-sug-item" onMouseDown={() => { setSugOpen(false); nav(`/lowisko/${f.id}`); }}>
                    <span className="ssi-ic"><Icon name="fish" size={15} color="var(--ff-primary)" /></span>
                    <span className="ssi-main">
                      <span className="ssi-name">{f.name}</span>
                      <span className="ssi-sub">{f.city}{f.province ? `, ${f.province}` : ''}</span>
                    </span>
                    {f.premium && <span className="ssi-badge">Partner</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={locate} title="Odśwież lokalizację" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 54, padding: '0 18px', cursor: 'pointer', background: 'var(--ff-surface)', border: '1px solid var(--ff-border-strong)', borderRadius: 'var(--ff-radius-md)', fontWeight: 700, fontSize: 15, color: 'var(--ff-text)', maxWidth: 200 }}>
            <Icon name="pin" size={18} color="var(--ff-accent)" /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{locName}</span>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setShowDate((s) => !s)} style={ctrlBtn(!!dateFrom)}>
            <Icon name="calendar" size={18} color={dateFrom ? '#fff' : 'var(--ff-accent)'} /> {dateLabel}
            {dateFrom && <span onClick={(e) => { e.stopPropagation(); setDateFrom(null); setDateTo(null); }}><Icon name="x" size={14} color="#fff" /></span>}
          </button>
          <button onClick={() => setShowFilters(true)} style={ctrlBtn(activeFilters > 0)}>
            <Icon name="sliders" size={18} color={activeFilters ? '#fff' : 'var(--ff-text)'} /> Filtry{activeFilters ? ` · ${activeFilters}` : ''}
          </button>
          <div className="sort-wrap">
            <button onClick={() => setShowSort((s) => !s)} style={{ ...ctrlBtn(false), color: 'var(--ff-text)' }}>
              <Icon name="funnel" size={16} color="var(--ff-text-secondary)" /> <span style={{ color: 'var(--ff-text-secondary)', fontWeight: 600 }}>Sortuj:</span> {SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
              <Icon name={showSort ? 'chevronUp' : 'chevronDown'} size={13} color="var(--ff-text-secondary)" />
            </button>
            {showSort && (
              <div className="sort-dd">
                <div className="h">Sortuj według</div>
                {SORT_OPTIONS.map((s) => (
                  <div key={s.key} className={`opt ${sortBy === s.key ? 'on' : ''}`} onClick={() => { setSortBy(s.key); setShowSort(false); }}>
                    {s.label}{sortBy === s.key && <Icon name="check" size={16} color={colors.primary} />}
                  </div>
                ))}
              </div>
            )}
          </div>
          {showDate && (
            <div className="date-pop" style={{ position: 'absolute', top: 56, left: 0, zIndex: 60 }} onClick={(e) => e.stopPropagation()}>
              <div className="date-pop-head">
                {dateFrom
                  ? <><strong>{dateLabel}</strong>{!dateTo && <span className="date-hint"> · wybierz dzień wyjazdu</span>}</>
                  : <span className="date-hint">Kliknij dzień przyjazdu, potem wyjazdu</span>}
              </div>
              <div className="date-presets">
                <button onClick={() => { setDateFrom(todayIso()); setDateTo(null); }}>Dziś</button>
                <button onClick={() => { setDateFrom(isoFrom(addDays(1))); setDateTo(null); }}>Jutro</button>
                <button onClick={() => { const [s, e] = nextWeekend(); setDateFrom(s); setDateTo(e); }}>Weekend</button>
              </div>
              <Calendar from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <button className="btn ghost" onClick={() => { setDateFrom(null); setDateTo(null); }}>Wyczyść</button>
                <button className="btn" onClick={() => setShowDate(false)}>Gotowe</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="container" style={{ paddingTop: 44 }} onClick={() => setShowSort(false)}>

      {promoted.length > 0 && (
        <section className="rail-section">
          <div className="rail-head">
            <h2 className="rail-title"><img src="/logo-fish.png" alt="" className="rail-mark" /> Łowiska partnerskie</h2>
            <span className="rail-sub">Rezerwacja online i pewna dostępność stanowisk</span>
          </div>
          <div className="rail">
            {promoted.map((f) => (
              <div className="rail-item" key={`p-${f.id}`}>
                <FisheryCard fishery={f} availableSpots={freeOf(f)} distanceKm={distOf(f)} hasDate={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      {chips.length > 0 && (
        <div className="active-filters">
          {chips.map((c) => (
            <button key={c.key} className="af-chip" onClick={c.remove}>{c.label}<Icon name="x" size={13} /></button>
          ))}
          <button className="af-clear" onClick={() => setFilters(EMPTY_FILTERS)}>Wyczyść wszystko</button>
        </div>
      )}

      <div ref={resultsTop} className="results-bar">
        <span className="count">{loading && count === 0 ? 'Szukam łowisk…' : `${count} ${pluralFisheries(count)}`}</span>
        {totalPages > 1 && !loading && <span className="results-page">Strona {page + 1} z {totalPages}</span>}
      </div>

      {loading ? <div className="cards">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        : visible.length === 0 ? (
          <div className="notice-box" style={{ margin: '8px 0 24px' }}>
            <Icon name="search" size={28} color={colors.textSecondary} />
            <div style={{ marginTop: 4, fontWeight: 800, color: colors.text, fontSize: 15 }}>Nic nie pasuje do tych kryteriów</div>
            <div>Poluzuj filtry albo zmień termin — łowiska znów się pojawią.</div>
          </div>
        )
          : (
            <>
              <div className="cards">{visible.map((f) => <FisheryCard key={f.id} fishery={f} availableSpots={freeOf(f)} distanceKm={distOf(f)} hasDate={!!dateFrom} dateFrom={dateFrom} dateTo={dateTo} />)}</div>
              {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onGo={goPage} />}
            </>
          )}

      {showFilters && <FilterSheet initial={filters} search={debounced} lat={coords?.lat ?? null} lng={coords?.lng ?? null} onApply={(v) => { setFilters(v); setShowFilters(false); }} onClose={() => setShowFilters(false)} />}
    </div>
    </>
  );
}

// Numerowana paginacja (jak w typowym marketplace): ‹ 1 … 4 5 6 … 20 ›
function pageWindow(page: number, total: number): number[] {
  const set = new Set<number>([0, total - 1, page, page - 1, page + 1, page - 2, page + 2]);
  const arr = [...set].filter((p) => p >= 0 && p < total).sort((a, b) => a - b);
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i] - arr[i - 1] > 1) out.push(-1); // -1 = wielokropek
    out.push(arr[i]);
  }
  return out;
}

function Pagination({ page, totalPages, onGo }: { page: number; totalPages: number; onGo: (p: number) => void }) {
  const items = pageWindow(page, totalPages);
  return (
    <nav className="pagination" aria-label="Strony wyników">
      <button className="pg-btn nav" disabled={page === 0} onClick={() => onGo(page - 1)} aria-label="Poprzednia strona">
        <Icon name="chevronLeft" size={16} />
      </button>
      {items.map((p, i) => p === -1
        ? <span key={`gap-${i}`} className="pg-gap" aria-hidden>…</span>
        : <button key={p} className={`pg-btn ${p === page ? 'on' : ''}`} onClick={() => onGo(p)} aria-current={p === page ? 'page' : undefined}>{p + 1}</button>
      )}
      <button className="pg-btn nav" disabled={page === totalPages - 1} onClick={() => onGo(page + 1)} aria-label="Następna strona">
        <Icon name="chevronRight" size={16} />
      </button>
    </nav>
  );
}
