import { useEffect, useRef, useState } from 'react';
import { colors } from '../theme';
import Icon from './Icon';

// Leaflet ładowany z CDN w index.html → dostępny jako window.L
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { L: any } }

interface Props {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}

interface GeoResult { display_name: string; lat: string; lon: string; }

const round = (n: number) => Math.round(n * 1e6) / 1e6;

// Mapa OSM z wyszukiwarką adresów (geokodowanie Nominatim — bez klucza API).
export default function MapPicker({ lat, lng, onChange, height = 320 }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeIcon = (L: any) => L.divIcon({
    className: 'ff-pin',
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${colors.primary};
      border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.4)"></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placeMarker = (L: any, map: any, la: number, ln: number) => {
    if (!markerRef.current) {
      markerRef.current = L.marker([la, ln], { draggable: true, icon: makeIcon(L) }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        onChangeRef.current(round(p.lat), round(p.lng));
      });
    } else {
      markerRef.current.setLatLng([la, ln]);
    }
  };

  useEffect(() => {
    const L = window.L;
    if (!L || !elRef.current || mapRef.current) return;
    const start: [number, number] = [lat || 52.0, lng || 19.4];
    const map = L.map(elRef.current, { scrollWheelZoom: false }).setView(start, lat && lng ? 13 : 6);
    mapRef.current = map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20, subdomains: 'abcd', detectRetina: true, attribution: '© OpenStreetMap, © CARTO',
    }).addTo(map);
    if (lat && lng) placeMarker(L, map, lat, lng);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on('click', (e: any) => {
      placeMarker(L, map, e.latlng.lat, e.latlng.lng);
      onChangeRef.current(round(e.latlng.lat), round(e.latlng.lng));
    });
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = window.L; const map = mapRef.current;
    if (L && map && lat && lng) placeMarker(L, map, lat, lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  const search = async () => {
    if (!q.trim()) return;
    setSearching(true); setResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=pl&accept-language=pl&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      setResults(await res.json());
    } catch { setResults([]); } finally { setSearching(false); }
  };

  const pick = (r: GeoResult) => {
    const la = round(Number(r.lat)), ln = round(Number(r.lon));
    const L = window.L, map = mapRef.current;
    if (L && map) { map.setView([la, ln], 14); placeMarker(L, map, la, ln); }
    onChangeRef.current(la, ln);
    setResults([]); setQ(r.display_name.split(',').slice(0, 2).join(','));
  };

  const hasLeaflet = typeof window !== 'undefined' && window.L;

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <div className="input-icon">
          <span className="ic"><Icon name="search" size={16} /></span>
          <input className="input" value={q} placeholder="Szukaj adresu lub miejscowości…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
            style={{ paddingRight: 92 }} />
        </div>
        <button type="button" className="btn sm" onClick={search} disabled={searching}
          style={{ position: 'absolute', right: 5, top: 5 }}>
          {searching ? '…' : 'Szukaj'}
        </button>
        {results.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: '#fff',
            border: `1px solid ${colors.border}`, borderRadius: 10, marginTop: 4, boxShadow: '0 10px 30px rgba(0,0,0,.12)', overflow: 'hidden' }}>
            {results.map((r, i) => (
              <div key={i} onClick={() => pick(r)} style={{ padding: '10px 13px', fontSize: 13.5, cursor: 'pointer', borderBottom: i < results.length - 1 ? `1px solid ${colors.border}` : 'none', display: 'flex', gap: 8, alignItems: 'center' }}
                onMouseDown={(e) => e.preventDefault()}>
                <Icon name="pin" size={14} color={colors.accent} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!hasLeaflet && (
        <div className="notice" style={{ background: '#FFFBEB', color: colors.warning, border: '1px solid #FDE68A' }}>
          Mapa wymaga połączenia z internetem. Współrzędne możesz też wpisać ręcznie poniżej.
        </div>
      )}
      <div ref={elRef} style={{ height, borderRadius: 12, overflow: 'hidden', border: `1px solid ${colors.border}` }} />
      <div className="hint" style={{ marginTop: 8 }}>Wyszukaj adres lub kliknij na mapie. Pinezkę możesz przeciągnąć, by doprecyzować miejsce.</div>
    </div>
  );
}
