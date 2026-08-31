import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllFisheries, fetchTakenCounts } from '../lib/fisheries';
import { fmtShort, haversineKm, todayIso, FISH_OPTIONS, nightsBetween, pluralDoby, cheapestStay, dobaPriceOf } from '../lib/constants';
import { matchCities } from '../lib/cities';
import { fetchPois, type Poi, type PoiKind } from '../lib/poi';
import Icon from '../components/Icon';
import Calendar from '../components/Calendar';
import FilterSheet, { type FilterValues, EMPTY_FILTERS, activeFilterCount } from '../components/FilterSheet';
import type { Fishery } from '../lib/types';
import { colors } from '../theme';

const STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

export default function MapPage() {
  const [all, setAll] = useState<Fishery[]>([]);
  const [taken, setTaken] = useState<Record<string, number>>({});
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locName, setLocName] = useState('Lokalizuję…');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selected, setSelected] = useState<Fishery | null>(null);
  const [sugOpen, setSugOpen] = useState(false);
  const [layers, setLayers] = useState<{ pzw: boolean; shop: boolean }>({ pzw: true, shop: true });
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [poiHint, setPoiHint] = useState<'' | 'zoom' | 'loading' | 'empty'>('');
  const nav = useNavigate();

  const elRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // pula markerów HTML dla NIEklastrowanych punktów (tylko widoczne — wydajność przy setkach łowisk)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poolRef = useRef<Record<string, { marker: any; pin: HTMLElement }>>({});
  const byIdRef = useRef<Record<string, Fishery>>({});
  const filteredRef = useRef<Fishery[]>([]);
  const selIdRef = useRef<string | null>(null);
  // aktualny termin (do etykiet cen na pinach — jak Booking: suma za okres)
  const dateRef = useRef<{ from: string | null; to: string | null }>({ from: null, to: null });
  const srcReady = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const youRef = useRef<any>(null);
  const fitOnce = useRef(false);
  // warstwy POI (PZW / sklepy) — osobna pula markerów + ref do aktualnych przełączników
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poiPoolRef = useRef<Record<string, { marker: any; pin: HTMLElement }>>({});
  const layersRef = useRef(layers);
  // Gdy aktywny jest filtr gatunku ryby — chowamy POI (PZW/sklepy nie mają gatunków, myliłyby wynik)
  const fishActiveRef = useRef(false);
  const poiAbortRef = useRef<AbortController | null>(null);
  const poiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selPoiRef = useRef<string | null>(null);

  const locate = () => {
    setLocName('Lokalizuję…');
    navigator.geolocation?.getCurrentPosition(async (p) => {
      const c = { lat: p.coords.latitude, lng: p.coords.longitude };
      setCoords(c);
      mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 11, speed: 1.2, curve: 1.4 });
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&accept-language=pl&lat=${c.lat}&lon=${c.lng}`);
        const d = await r.json(); const a = d.address ?? {};
        setLocName(a.city || a.town || a.village || a.county || a.state || 'Twoja okolica');
      } catch { setLocName('Twoja okolica'); }
    }, () => setLocName('Brak lokalizacji'), { enableHighAccuracy: false, timeout: 8000 });
  };

  useEffect(() => {
    fetchAllFisheries().then(setAll).catch(() => setAll([]));
    locate();
  }, []);
  useEffect(() => {
    const f = dateFrom || todayIso(); const t = dateTo || f;
    fetchTakenCounts(f, t).then(setTaken).catch(() => {});
    // Zmiana terminu → przelicz etykiety cen na pinach (suma za okres). Przebuduj pulę.
    dateRef.current = { from: dateFrom, to: dateTo };
    for (const id of Object.keys(poolRef.current)) { poolRef.current[id].marker.remove(); delete poolRef.current[id]; }
    syncHtmlMarkers();
  }, [dateFrom, dateTo]);

  // Podpowiedzi miast — natychmiastowy prefiks-match po liście PL miast („wro" → Wrocław → mapa leci tam).
  const cityMatches = useMemo(() => matchCities(search, 5), [search]);
  const goCity = (lat: number, lon: number) => { mapRef.current?.flyTo({ center: [lon, lat], zoom: 11, speed: 1.2, curve: 1.4 }); setSugOpen(false); };
  const goFishery = (f: Fishery) => { setSelected(f); mapRef.current?.flyTo({ center: [f.longitude, f.latitude], zoom: 12, speed: 1.1, offset: [0, -110] }); setSugOpen(false); };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((f) => {
      if (s && !(`${f.name} ${f.city}`.toLowerCase().includes(s))) return false;
      if (filters.types.length && !filters.types.some((t) => f.types.includes(t))) return false;
      if (filters.fish.length && !filters.fish.some((x) => f.fish.includes(x))) return false;
      if (filters.provinces.length && !filters.provinces.includes(f.province)) return false;
      if (filters.nokill && !f.nokill) return false;
      if (filters.online && !f.premium) return false;
      if (filters.amenities.length && !filters.amenities.every((m) => f.amenities.some((a) => a.toLowerCase().includes(m)))) return false;
      if (filters.priceMin != null && !(f.priceFrom > 0 && f.priceFrom >= filters.priceMin)) return false;
      if (filters.priceMax != null && !(f.priceFrom > 0 && f.priceFrom <= filters.priceMax)) return false;
      if (filters.minRating != null && (f.rating || 0) < filters.minRating) return false;
      return true;
    });
  }, [all, search, filters]);

  // init mapy
  useEffect(() => {
    const mg = window.maplibregl;
    if (!mg || !elRef.current || mapRef.current) return;
    const map = new mg.Map({
      container: elRef.current,
      style: STYLE,
      center: [19.4, 52.0],
      zoom: 5,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mg.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new mg.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('click', () => { setSelected(null); setSelectedPoi(null); });

    map.on('load', () => {
      map.addSource('fish-src', {
        type: 'geojson', data: { type: 'FeatureCollection', features: [] },
        cluster: true, clusterRadius: 56, clusterMaxZoom: 12,
      });
      // Poświata pod klastrem (renderowana najpierw → pod spodem)
      map.addLayer({
        id: 'clusters-halo', type: 'circle', source: 'fish-src', filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#52B788', 10, '#40916C', 30, '#2D6A4F'],
          'circle-radius': ['step', ['get', 'point_count'], 26, 10, 31, 30, 37],
          'circle-opacity': 0.18, 'circle-blur': 0.55,
        },
      });
      // Bąble klastrów — rozmiar i kolor wg liczby łowisk
      map.addLayer({
        id: 'clusters', type: 'circle', source: 'fish-src', filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#52B788', 10, '#40916C', 30, '#2D6A4F'],
          'circle-radius': ['step', ['get', 'point_count'], 17, 10, 21, 30, 26],
          'circle-stroke-width': 3, 'circle-stroke-color': '#fff',
        },
      });
      map.addLayer({
        id: 'cluster-count', type: 'symbol', source: 'fish-src', filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] },
        paint: { 'text-color': '#fff' },
      });
      map.on('click', 'clusters', (e: any) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const cid = feats[0]?.properties?.cluster_id;
        if (cid == null) return;
        map.getSource('fish-src').getClusterExpansionZoom(cid).then((z: number) => {
          map.easeTo({ center: feats[0].geometry.coordinates, zoom: z, duration: 500 });
        }).catch(() => {});
      });
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
      map.on('moveend', () => { syncHtmlMarkers(); schedulePois(); });
      map.on('sourcedata', (e: any) => { if (e.sourceId === 'fish-src' && map.isSourceLoaded('fish-src')) syncHtmlMarkers(); });
      srcReady.current = true;
      pushData();
    });
    return () => { map.remove(); mapRef.current = null; srcReady.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Buduje markery HTML tylko dla widocznych, NIEklastrowanych punktów (pula z recyklingiem)
  const syncHtmlMarkers = () => {
    const mg = window.maplibregl; const map = mapRef.current;
    if (!mg || !map || !map.getSource('fish-src') || !map.isSourceLoaded('fish-src')) return;
    const feats = map.querySourceFeatures('fish-src');
    const visible = new Set<string>();
    for (const ft of feats) {
      if (ft.properties?.cluster) continue;
      const id = ft.properties?.id as string;
      if (!id || visible.has(id)) continue;
      visible.add(id);
      if (poolRef.current[id]) {
        poolRef.current[id].pin.classList.toggle('sel', id === selIdRef.current);
        continue;
      }
      const f = byIdRef.current[id];
      if (!f) continue;
      const el = document.createElement('div');
      el.className = 'mg-marker';
      const pin = document.createElement('button');
      // etykieta: termin + łowisko na doby → suma za okres (cena doby × noce); inaczej cena najtańszego
      // produktu; partner bez ceny → „Partner".
      const stay = cheapestStay(f);
      const dobaP = dobaPriceOf(f);
      const d = dateRef.current;
      const label = d.from && dobaP > 0
        ? `${dobaP * nightsBetween(d.from, d.to)} zł`
        : stay && stay.price > 0 ? `${stay.price} zł` : (f.premium ? 'Partner' : '');
      pin.className = `mg-pin comm ${f.premium ? 'partner' : ''} ${label ? '' : 'nolabel'}`.replace(/\s+/g, ' ').trim();
      const img = document.createElement('img'); img.src = '/logo-fish.png'; img.alt = '';
      pin.appendChild(img);
      if (label) { const s = document.createElement('span'); s.textContent = label; pin.appendChild(s); }
      // dymek z nazwą na hover (textContent — bezpieczne wobec znaków w nazwie)
      const tip = document.createElement('i'); tip.className = 'mg-tip'; tip.textContent = f.name; pin.appendChild(tip);
      pin.classList.toggle('sel', id === selIdRef.current);
      pin.addEventListener('click', (ev) => {
        ev.stopPropagation();
        setSelectedPoi(null);
        setSelected(f);
        map.flyTo({ center: [f.longitude, f.latitude], zoom: Math.max(map.getZoom(), 12), speed: 1.1, offset: [0, -110] });
      });
      el.appendChild(pin);
      const marker = new mg.Marker({ element: el, anchor: 'bottom' }).setLngLat([f.longitude, f.latitude]).addTo(map);
      poolRef.current[id] = { marker, pin };
    }
    for (const id of Object.keys(poolRef.current)) {
      if (!visible.has(id)) { poolRef.current[id].marker.remove(); delete poolRef.current[id]; }
    }
  };

  // Wsadza aktualnie przefiltrowane łowiska do źródła klastrującego (czyta z refa — odporne na timing 'load')
  const pushData = () => {
    const map = mapRef.current;
    if (!map || !srcReady.current || !map.getSource('fish-src')) return;
    map.getSource('fish-src').setData({
      type: 'FeatureCollection',
      features: filteredRef.current.filter((f) => f.latitude && f.longitude).map((f) => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [f.longitude, f.latitude] },
        properties: { id: f.id },
      })),
    });
  };


  // ---------- Warstwy POI (łowiska PZW / sklepy wędkarskie) ----------
  const clearPoiMarkers = () => {
    for (const id of Object.keys(poiPoolRef.current)) { poiPoolRef.current[id].marker.remove(); delete poiPoolRef.current[id]; }
  };
  const renderPoiMarkers = (pois: Poi[]) => {
    const mg = window.maplibregl; const map = mapRef.current;
    if (!mg || !map) return;
    const want = new Set(pois.map((p) => p.id));
    for (const id of Object.keys(poiPoolRef.current)) {
      if (!want.has(id)) { poiPoolRef.current[id].marker.remove(); delete poiPoolRef.current[id]; }
    }
    for (const p of pois) {
      if (poiPoolRef.current[p.id]) { poiPoolRef.current[p.id].pin.classList.toggle('sel', p.id === selPoiRef.current); continue; }
      const el = document.createElement('div'); el.className = 'mg-marker';
      const pin = document.createElement('button');
      // ta sama pinezka co łowiska (logo rybki), tylko w kolorze typu (PZW niebieska, sklep żółta)
      pin.className = `mg-pin poi-fish ${p.kind} nolabel`;
      pin.title = p.name;
      const img = document.createElement('img'); img.src = '/logo-fish.png'; img.alt = ''; pin.appendChild(img);
      const tip = document.createElement('i'); tip.className = 'mg-tip'; tip.textContent = p.name; pin.appendChild(tip);
      pin.classList.toggle('sel', p.id === selPoiRef.current);
      pin.addEventListener('click', (ev) => {
        ev.stopPropagation();
        setSelected(null);
        setSelectedPoi(p);
        map.flyTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 13), speed: 1.1, offset: [0, -90] });
      });
      el.appendChild(pin);
      const marker = new mg.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lon, p.lat]).addTo(map);
      poiPoolRef.current[p.id] = { marker, pin };
    }
  };
  const runPoiFetch = () => {
    const map = mapRef.current;
    if (!map || !map.getBounds) return;
    if (fishActiveRef.current) { clearPoiMarkers(); setPoiHint(''); setSelectedPoi(null); return; }
    const kinds: PoiKind[] = [];
    if (layersRef.current.pzw) kinds.push('pzw');
    if (layersRef.current.shop) kinds.push('shop');
    if (kinds.length === 0) { clearPoiMarkers(); setPoiHint(''); setSelectedPoi(null); return; }
    if (map.getZoom() < 8) { clearPoiMarkers(); setPoiHint('zoom'); return; }
    const b = map.getBounds();
    const bbox = { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() };
    poiAbortRef.current?.abort();
    const ac = new AbortController(); poiAbortRef.current = ac;
    setPoiHint('loading');
    fetchPois(bbox, kinds, ac.signal).then((list) => {
      if (ac.signal.aborted) return;
      const inView = list.filter((p) => b.contains([p.lon, p.lat]));
      renderPoiMarkers(inView);
      setPoiHint(inView.length === 0 ? 'empty' : '');
    }).catch(() => { if (!ac.signal.aborted) setPoiHint(''); });
  };
  const schedulePois = () => {
    if (poiTimerRef.current) clearTimeout(poiTimerRef.current);
    poiTimerRef.current = setTimeout(runPoiFetch, 450);
  };
  // przełączniki warstw → odśwież od razu
  useEffect(() => { layersRef.current = layers; runPoiFetch(); /* eslint-disable-next-line */ }, [layers]);
  // podświetlenie wybranego POI
  useEffect(() => {
    selPoiRef.current = selectedPoi?.id ?? null;
    for (const [id, e] of Object.entries(poiPoolRef.current)) e.pin.classList.toggle('sel', id === selectedPoi?.id);
  }, [selectedPoi]);
  // sprzątanie
  useEffect(() => () => { poiAbortRef.current?.abort(); if (poiTimerRef.current) clearTimeout(poiTimerRef.current); }, []);

  // znacznik użytkownika
  useEffect(() => {
    const mg = window.maplibregl; const map = mapRef.current;
    if (!mg || !map || !coords) return;
    if (youRef.current) { youRef.current.setLngLat([coords.lng, coords.lat]); return; }
    const el = document.createElement('div');
    el.className = 'you-halo';
    el.innerHTML = '<div class="you-dot"></div>';
    youRef.current = new mg.Marker({ element: el }).setLngLat([coords.lng, coords.lat]).addTo(map);
  }, [coords]);

  // Zmiana listy (filtry/szukanie) → indeks po id + zasilenie źródła klastrującego + auto-fit raz
  useEffect(() => {
    const mg = window.maplibregl; const map = mapRef.current;
    filteredRef.current = filtered;
    byIdRef.current = Object.fromEntries(filtered.map((f) => [f.id, f]));
    // usuń z puli markery łowisk, których już nie ma w wynikach
    for (const id of Object.keys(poolRef.current)) {
      if (!byIdRef.current[id]) { poolRef.current[id].marker.remove(); delete poolRef.current[id]; }
    }
    pushData();
    syncHtmlMarkers();
    // filtr gatunku aktywny → schowaj POI; wyczyszczony → przywróć
    const fishNow = filters.fish.length > 0;
    if (fishNow !== fishActiveRef.current) { fishActiveRef.current = fishNow; runPoiFetch(); }
    if (mg && map && !fitOnce.current && filtered.length) {
      const bounds = new mg.LngLatBounds();
      filtered.forEach((f) => { if (f.latitude && f.longitude) bounds.extend([f.longitude, f.latitude]); });
      if (!bounds.isEmpty()) { map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 0 }); fitOnce.current = true; }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  // zaznaczenie — przełącz klasę .sel na markerze w puli (jeśli widoczny)
  useEffect(() => {
    selIdRef.current = selected?.id ?? null;
    for (const [id, e] of Object.entries(poolRef.current)) {
      e.pin.classList.toggle('sel', id === selected?.id);
    }
  }, [selected]);

  const toggleFish = (x: string) => { setSelected(null); setFilters((p) => ({ ...p, fish: p.fish.includes(x) ? p.fish.filter((i) => i !== x) : [...p.fish, x] })); };
  const clearQuick = () => { setSelected(null); setFilters((p) => ({ ...p, fish: [], nokill: false })); };
  const quickClean = filters.fish.length === 0 && !filters.nokill;

  const activeFilters = activeFilterCount(filters);
  const dateLabel = dateFrom ? (dateTo && dateTo !== dateFrom ? `${fmtShort(dateFrom)} – ${fmtShort(dateTo)}` : fmtShort(dateFrom)) : 'Termin';
  const selFree = selected ? Math.max(0, selected.totalSpots - (taken[selected.id] ?? 0)) : 0;
  const selDist = selected && coords ? haversineKm(coords.lat, coords.lng, selected.latitude, selected.longitude) : null;

  return (
    <div className="map-full">
      <div className="map-topbar">
        <div className="map-controls">
          <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
            <div className="searchbar" style={{ height: 44 }}>
              <Icon name="search" size={17} color={colors.textSecondary} />
              <input placeholder="Szukaj łowiska lub miasta…" value={search} onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSugOpen(true)} onBlur={() => setTimeout(() => setSugOpen(false), 150)} />
              {search && <button onMouseDown={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex' }}><Icon name="x" size={15} color={colors.textSecondary} /></button>}
            </div>
            {sugOpen && search.trim().length >= 2 && (filtered.length > 0 || cityMatches.length > 0) && (
              <div className="search-sug map-sug">
                {filtered.slice(0, 3).map((f) => (
                  <button key={`f${f.id}`} className="search-sug-item" onMouseDown={() => goFishery(f)}>
                    <span className="ssi-ic"><Icon name="fish" size={15} color="var(--ff-primary)" /></span>
                    <span className="ssi-main"><span className="ssi-name">{f.name}</span><span className="ssi-sub">{f.city} · łowisko</span></span>
                    {f.premium && <span className="ssi-badge">Partner</span>}
                  </button>
                ))}
                {cityMatches.map((c) => (
                  <button key={`c${c.name}`} className="search-sug-item" onMouseDown={() => goCity(c.lat, c.lon)}>
                    <span className="ssi-ic alt"><Icon name="pin" size={15} color="var(--ff-text-secondary)" /></span>
                    <span className="ssi-main"><span className="ssi-name">{c.name}</span><span className="ssi-sub">miasto — pokaż na mapie</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className={`chip date ${dateFrom ? 'active' : ''}`} onClick={() => setShowDate((s) => !s)}>
            <Icon name="calendar" size={14} color={dateFrom ? '#fff' : colors.accent} /> {dateLabel}
          </span>
          <span className={`chip ${activeFilters ? 'active' : ''}`} onClick={() => setShowFilters(true)}>
            <Icon name="sliders" size={14} color={activeFilters ? '#fff' : colors.text} /> Filtry{activeFilters ? ` · ${activeFilters}` : ''}
          </span>
          <span className="loc-pill" onClick={locate} style={{ height: 44 }}><Icon name="pin" size={15} color={colors.accent} /> <span className="lbl">{locName}</span></span>
        </div>

        <div className="quickbar">
          <span className={`qchip poi pzw ${layers.pzw ? 'on' : ''}`} onClick={() => setLayers((l) => ({ ...l, pzw: !l.pzw }))}><i className="poi-dot pzw" /> Łowiska PZW</span>
          <span className={`qchip poi shop ${layers.shop ? 'on' : ''}`} onClick={() => setLayers((l) => ({ ...l, shop: !l.shop }))}><i className="poi-dot shop" /> Sklepy</span>
          <span className="qbar-div" aria-hidden />
          <span className={`qchip ${quickClean ? 'on' : ''}`} onClick={clearQuick}><Icon name="list" size={13} /> Wszystkie</span>
          <span className={`qchip ${filters.nokill ? 'on' : ''}`} onClick={() => { setSelected(null); setFilters((p) => ({ ...p, nokill: !p.nokill })); }}><Icon name="sync" size={13} /> No Kill</span>
          {FISH_OPTIONS.map((s) => (
            <span key={s} className={`qchip ${filters.fish.includes(s) ? 'on' : ''}`} onClick={() => toggleFish(s)}><Icon name="fish" size={13} /> {s}</span>
          ))}
        </div>
      </div>

      {showDate && (
        <div className="date-pop" style={{ position: 'absolute', top: 110, left: 16, zIndex: 20 }} onClick={(e) => e.stopPropagation()}>
          <Calendar from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button className="btn ghost" onClick={() => { setDateFrom(null); setDateTo(null); }}>Wyczyść</button>
            <button className="btn" onClick={() => setShowDate(false)}>Gotowe</button>
          </div>
        </div>
      )}

      <div ref={elRef} className="map-el" />

      <div className="map-legend" aria-label="Legenda mapy">
        <span className="lg"><i className="poi-dot comm" /> Łowiska komercyjne</span>
        <span className="lg"><i className="poi-dot pzw" /> Łowiska PZW</span>
        <span className="lg"><i className="poi-dot shop" /> Sklepy wędkarskie</span>
      </div>


      {(layers.pzw || layers.shop) && poiHint && !selectedPoi && (
        <div className="poi-hint">
          {poiHint === 'loading' && <><span className="poi-hint-spin" /> Wczytuję punkty…</>}
          {poiHint === 'zoom' && <><Icon name="search" size={14} color={colors.primary} /> Przybliż mapę, aby wczytać łowiska PZW i sklepy</>}
          {poiHint === 'empty' && <><Icon name="pin" size={14} color={colors.textSecondary} /> Brak punktów w tym obszarze</>}
        </div>
      )}

      <button className="map-locate" onClick={locate} title="Moja lokalizacja"><Icon name="navigate" size={20} color={colors.primary} /></button>

      {selected && (
        <div className="map-card" onClick={(e) => e.stopPropagation()}>
          <button className="map-card-x" onClick={() => setSelected(null)}><Icon name="x" size={16} color={colors.textSecondary} /></button>
          <div className="map-card-img">
            {selected.image ? <img src={selected.image} alt={selected.name} /> : <div className="ph"><Icon name="fish" size={32} color={colors.primary} /></div>}
            {selected.premium && <span className="partner-badge" title="Łowisko partnerskie Fishery Finder"><img src="/logo-fish.png" alt="" /> Partner</span>}
          </div>
          <div className="map-card-body">
            <div className="map-card-top">
              <span className="nm">{selected.name}</span>
              <span className="rating"><Icon name="star" size={12} color="#F59E0B" fill /> {selected.rating || '—'}</span>
            </div>
            <div className="map-card-row"><Icon name="pin" size={13} color={colors.textSecondary} /> {selected.city}{selDist != null ? ` • ${selDist.toFixed(1)} km` : ''}</div>
            {selected.fish.length > 0 && (
              <div className="map-card-fish">
                {selected.fish.slice(0, 4).map((x) => <span key={x} className="fishtag">{x}</span>)}
                {selected.fish.length > 4 && <span className="fishtag">+{selected.fish.length - 4}</span>}
              </div>
            )}
            <div className="map-card-foot">
              <div>
                {selected.premium
                  ? <span style={{ color: selFree <= 3 ? colors.error : colors.success, fontWeight: 800, fontSize: 12.5 }}>{selFree} wolnych</span>
                  : <span style={{ color: colors.water, fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="phone" size={12} color={colors.water} /> Zapytaj o dostępność</span>}
                {dateFrom && selected.premium && dobaPriceOf(selected) > 0
                  ? <div className="pr">od <b>{dobaPriceOf(selected) * nightsBetween(dateFrom, dateTo)} zł</b> · {nightsBetween(dateFrom, dateTo)} {pluralDoby(nightsBetween(dateFrom, dateTo))}</div>
                  : cheapestStay(selected)
                    ? <div className="pr">od <b>{cheapestStay(selected)!.price} zł</b>/{cheapestStay(selected)!.label.toLowerCase()}</div>
                    : <div className="pr muted">Cena na miejscu</div>}
              </div>
              <button className="btn" onClick={() => nav(`/lowisko/${selected.id}`)}>Zobacz więcej <Icon name="arrowRight" size={15} color={colors.accent} /></button>
            </div>
          </div>
        </div>
      )}

      {selectedPoi && (
        <div className="map-card poi-card" onClick={(e) => e.stopPropagation()}>
          <button className="map-card-x" onClick={() => setSelectedPoi(null)}><Icon name="x" size={16} color={colors.textSecondary} /></button>
          <div className="poi-card-body">
            <span className={`poi-kind ${selectedPoi.kind}`}>
              <i className={`poi-dot ${selectedPoi.kind}`} /> {selectedPoi.kind === 'shop' ? 'Sklep wędkarski' : 'Łowisko PZW / ogólnodostępne'}
            </span>
            <div className="poi-card-name">{selectedPoi.name}</div>
            {selectedPoi.address && <div className="poi-card-row"><Icon name="pin" size={13} color={colors.textSecondary} /> {selectedPoi.address}</div>}
            <div className="poi-card-foot">
              <span className="poi-card-src">Dane: OpenStreetMap</span>
              <a className="btn sm" href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoi.lat},${selectedPoi.lon}`} target="_blank" rel="noreferrer">Nawiguj <Icon name="navigate" size={14} color={colors.accent} /></a>
            </div>
          </div>
        </div>
      )}

      {showFilters && <FilterSheet initial={filters} search={search} onApply={(v) => { setFilters(v); setShowFilters(false); }} onClose={() => setShowFilters(false)} />}
    </div>
  );
}
