import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fetchFishery, fetchReviews } from '../lib/fisheries';
import { cheapestStay } from '../lib/constants';
import BookingModal from '../components/BookingModal';
import ReviewModal from '../components/ReviewModal';
import CatchModal from '../components/CatchModal';
import { fisheryCatches, type CatchReport } from '../lib/catches';
import Icon, { type IconName } from '../components/Icon';
import { colors } from '../theme';
import type { Fishery } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';

const AMENITIES: { label: string; match: string }[] = [
  { label: 'Prąd na stanowisku', match: 'prąd' },
  { label: 'Parking', match: 'parking' },
  { label: 'Domki', match: 'domki' },
  { label: 'Toaleta', match: 'toaleta' },
  { label: 'Pomost', match: 'pomost' },
  { label: 'WiFi', match: 'wifi' },
  { label: 'Grill', match: 'grill' },
  { label: 'Sklep z przynętami', match: 'sklep' },
];
const MS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const fmtDate = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return `${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear()}`; };
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const HEAD = 62; // wysokość naszego sticky nagłówka

export default function FisheryDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const presetFrom = params.get('from');
  const presetTo = params.get('to');
  const nav = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [f, setF] = useState<Fishery | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [mapZoom, setMapZoom] = useState<string | null>(null);
  const [allCatchesOpen, setAllCatchesOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [catchOpen, setCatchOpen] = useState(false);
  const [catchDone, setCatchDone] = useState(false);
  const [done, setDone] = useState(false);
  const [reviews, setReviews] = useState<{ author_name: string; rating: number; visited_on: string | null; comment: string | null }[]>([]);
  const [catches, setCatches] = useState<CatchReport[]>([]);
  const [active, setActive] = useState('opis');
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const mapEl = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setActive('opis');
    fetchFishery(id).then(setF).catch(() => setF(null)).finally(() => setLoading(false));
    fetchReviews(id).then(setReviews).catch(() => {});
    fisheryCatches(id, 60).then(setCatches).catch(() => setCatches([]));
  }, [id]);
  const reloadCatches = () => { if (id) fisheryCatches(id, 60).then(setCatches).catch(() => {}); };

  // mapa — inicjalizacja gdy łowisko gotowe (single-scroll, div zawsze w DOM)
  useEffect(() => {
    const mg = window.maplibregl;
    if (!mg || !f || !mapEl.current || mapRef.current) return;
    const map = new mg.Map({ container: mapEl.current, style: MAP_STYLE, center: [f.longitude, f.latitude], zoom: 12.5, attributionControl: false, scrollZoom: false });
    mapRef.current = map;
    map.addControl(new mg.NavigationControl({ showCompass: false }), 'top-right');
    const el = document.createElement('div'); el.className = 'ff-pin-bubble';
    el.innerHTML = `<img src="/logo-fish.png" alt="" style="width:24px;height:24px;object-fit:contain" />`;
    new mg.Marker({ element: el, anchor: 'bottom' }).setLngLat([f.longitude, f.latitude]).addTo(map);
    map.once('load', () => map.resize());
    return () => { map.remove(); mapRef.current = null; };
  }, [f]);

  // scroll-spy: aktywna zakładka podąża za przewijaniem
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + HEAD + 90;
      let cur = 'opis';
      for (const sid of Object.keys(refs.current)) { const el = refs.current[sid]; if (el && el.offsetTop <= y) cur = sid; }
      setActive((p) => (p === cur ? p : cur));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [f]);

  const goTo = (sid: string) => {
    setActive(sid);
    const el = refs.current[sid];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (HEAD + 58), behavior: 'smooth' });
  };

  const reviewDist = useMemo(() => {
    const d: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) if (d[r.rating] != null) d[r.rating]++;
    return d;
  }, [reviews]);

  if (loading) return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--ff-text-secondary)' }}>Ładowanie…</div>;
  if (!f) return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--ff-text-secondary)' }}>Nie znaleziono łowiska.</div>;

  const gallery = (f.photos.length > 0 ? f.photos : (f.image ? [f.image] : [])).slice(0, 8);
  const fav = isFavorite(f.id);
  const onHeart = () => { toggleFavorite(f.id); }; // gość też może zapisać (localStorage)
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`;
  const isCatalog = !f.premium;
  const free = Math.max(0, f.availableSpots);
  const availStatus: 'free' | 'low' | 'full' = free <= 0 ? 'full' : free <= 3 ? 'low' : 'free';

  // Najtańszy oferowany produkt — „od X zł" z jednostką spójną z ceną (doba/dzień/nocka).
  const stay = cheapestStay(f);
  const od = stay?.price ?? 0;
  const odUnit = stay ? stay.label.toLowerCase() : 'doba';
  const benefits = (() => {
    const out = ['Rezerwacja online', 'Potwierdzenie właściciela'];
    if (f.nokill) out.push('No-kill');
    else if (f.types[0]) out.push(f.types[0]); // np. „Karpiowe"
    if (out.length < 4 && f.amenities.some((a) => a.toLowerCase().includes('prąd'))) out.push('Prąd na stanowisku');
    out.push(`Doba od ${String(f.checkInHour).padStart(2, '0')}:00`);
    return out.slice(0, 4);
  })();

  const recordTop = [...f.records].sort((a, b) => b.weight - a.weight)[0] || null;
  const priceRows: [string, string][] = [];
  if (f.price24h) priceRows.push(['Doba (24h)', `${f.price24h} zł`]);
  if (f.priceDay) priceRows.push(['Dzień', `${f.priceDay} zł`]);
  if (f.priceNight) priceRows.push(['Nocka', `${f.priceNight} zł`]);
  f.priceTiers.filter((t) => t.label.trim() && t.price > 0).forEach((t) => priceRows.push([t.label, `${t.price} zł`]));
  if (priceRows.length === 0 && f.priceFrom) priceRows.push(['Doba (stanowisko)', `${f.priceFrom} zł`]);

  // Katalogowe łowisko też pokazuje wzbogacone info (cennik/rekordy/udogodnienia), gdy są dane.
  const catalogInfoTabs = [
    ...(f.amenities.length > 0 ? [{ id: 'udogodnienia', label: 'Udogodnienia' }] : []),
    ...(f.records.length > 0 ? [{ id: 'rekordy', label: 'Rekordy' }] : []),
    ...(priceRows.length ? [{ id: 'cennik', label: 'Cennik' }] : []),
  ];
  const tabs = isCatalog
    ? [{ id: 'opis', label: 'O łowisku' }, ...catalogInfoTabs, { id: 'kontakt', label: 'Kontakt' }]
    : [
        { id: 'opis', label: 'Opis' },
        { id: 'opinie', label: 'Opinie' },
        { id: 'polowy', label: 'Połowy' },
        { id: 'stanowiska', label: 'Mapa stanowisk' },
        { id: 'batymetria', label: 'Batymetria' },
        { id: 'udogodnienia', label: 'Udogodnienia' },
        { id: 'rekordy', label: 'Rekordy' },
        ...(priceRows.length ? [{ id: 'cennik', label: 'Cennik' }] : []),
        { id: 'kontakt', label: 'Kontakt' },
      ];

  const setRef = (sid: string) => (el: HTMLElement | null) => { refs.current[sid] = el; };

  return (
    <div style={{ background: 'var(--ff-bg)' }}>
      <div style={{ maxWidth: 'var(--ff-container)', margin: '0 auto', padding: '20px clamp(16px, 3vw, 28px) 64px' }}>
        {/* górny pasek akcji */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <button onClick={() => nav(-1)} style={linkBtn}><Icon name="chevronLeft" size={18} /> Wróć do listy</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { const u = window.location.href; if (navigator.share) navigator.share({ title: f.name, url: u }).catch(() => {}); else navigator.clipboard?.writeText(u); }} style={softBtn}><Icon name="navigate" size={16} /> Udostępnij</button>
            <button onClick={onHeart} style={{ ...softBtn, ...(fav ? { color: colors.error, borderColor: 'var(--ff-accent)' } : {}) }}>
              <Icon name="heart" size={16} color={fav ? colors.error : colors.text} fill={fav} /> {fav ? 'Zapisane' : 'Zapisz'}
            </button>
          </div>
        </div>

        {/* tytuł */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <h1 style={{ font: 'var(--ff-weight-extra) clamp(26px, 3.6vw, 40px) var(--font-brand)', letterSpacing: '-0.02em', margin: 0 }}>{f.name}</h1>
          {f.premium
            ? <span style={badge('var(--ff-green-50)', 'var(--ff-primary)')}><Icon name="fish" size={13} /> Partner</span>
            : <span style={badge('var(--ff-surface-sunken)', 'var(--ff-text-secondary)')}>Katalog</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', color: 'var(--ff-text-secondary)', fontSize: 15, marginBottom: 20 }}>
          {reviews.length > 0
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: 'var(--ff-text)' }}><Icon name="star" size={15} color="#F59E0B" fill /> {f.rating} <span style={{ color: 'var(--ff-text-secondary)', fontWeight: 500 }}>· {reviews.length} opinii</span></span>
            : <span>Brak opinii</span>}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="pin" size={15} /> {f.location}{f.province ? `, ${f.province}` : ''}</span>
          {f.distance != null && f.distance > 0 && <span style={{ color: 'var(--ff-text-tertiary)' }}>· {f.distance.toFixed(1)} km od Ciebie</span>}
        </div>

        {/* galeria */}
        <Gallery gallery={gallery} name={f.name} onOpen={setLightbox} />

        {/* dwie kolumny */}
        <div style={{ display: 'grid', gridTemplateColumns: isCatalog ? '1fr' : 'minmax(0,1fr) 360px', gap: 40, marginTop: 28, alignItems: 'start' }} className="ffd-grid">
          <div style={{ minWidth: 0 }}>
            {!isCatalog && (
              <>
                <WhyBook benefits={benefits} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, padding: '24px 4px', marginTop: 4, borderBottom: '1px solid var(--ff-border)' }} className="ffd-stats">
                  <StatItem icon="star" value={reviews.length ? String(f.rating) : '—'} label="Ocena" />
                  <StatItem icon="cash" value={od ? `${od} zł` : 'Na miejscu'} label={`Cena od / ${odUnit}`} />
                  <StatItem icon="pin" value={`${free} / ${f.totalSpots}`} label="Wolne stanowiska" />
                  <StatItem icon="trophy" value={`${f.recordWeight} kg`} label="Rekord łowiska" helper={recordTop ? recordTop.species : undefined} />
                </div>
              </>
            )}

            {/* sticky taby */}
            <div style={{ position: 'sticky', top: HEAD, background: 'var(--ff-bg)', zIndex: 20, paddingTop: 14, marginTop: 4 }}>
              <SectionTabs tabs={tabs} active={active} onGo={goTo} />
            </div>

            {/* sekcje (single scroll, kotwice) */}
            <Section id="opis" title={isCatalog ? 'O łowisku' : 'Opis'} refCb={setRef('opis')}>
              <p style={{ fontSize: 16, color: 'var(--ff-text)', lineHeight: 1.65, maxWidth: 640, margin: 0 }}>
                {f.description || 'To łowisko pochodzi z importu katalogowego — szczegółowy opis nie został jeszcze dodany. Skontaktuj się bezpośrednio z gospodarzem.'}
              </p>
              {(f.types.length > 0 || f.fish.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                  {f.nokill && <Tag tone="type">No Kill</Tag>}
                  {f.types.map((t) => <Tag key={t} tone="type">{t}</Tag>)}
                  {f.fish.map((s) => <Tag key={s} tone="species">{s}</Tag>)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 18, color: 'var(--ff-text-secondary)', fontSize: 14, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="time" size={15} /> {f.openHours || 'Całą dobę'}</span>
                <span style={{ color: 'var(--ff-border)' }}>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="time" size={15} /> Doba od {String(f.checkInHour).padStart(2, '0')}:00</span>
              </div>
            </Section>

            {!isCatalog && (
              <>
                <Section id="opinie" title="Opinie wędkarzy" refCb={setRef('opinie')}
                  action={<button style={linkAccent} onClick={() => { if (!user) { nav('/login', { state: { from: `/lowisko/${f.id}` } }); return; } setReviewOpen(true); }}>+ Dodaj opinię</button>}>
                  {reviews.length === 0 ? (
                    <EmptyBox icon="star" title="Brak opinii" desc="Bądź pierwszy — oceń to łowisko po wizycie." />
                  ) : (
                    <>
                      <ReviewSummary rating={f.rating} count={reviews.length} dist={reviewDist} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 28 }}>
                        {reviews.map((r, i) => (
                          <div key={i} style={{ display: 'flex', gap: 14 }}>
                            <Avatar name={r.author_name || 'Wędkarz'} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 14 }}>{r.author_name || 'Wędkarz'}</span>
                                {r.visited_on && <span style={{ fontSize: 12, color: 'var(--ff-text-tertiary)' }}>· {fmtDate(r.visited_on)}</span>}
                              </div>
                              <div style={{ margin: '4px 0 6px', display: 'flex', gap: 1 }}>{[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" size={13} color="#F59E0B" fill={s <= r.rating} />)}</div>
                              {r.comment && <p style={{ fontSize: 14, color: 'var(--ff-text)', lineHeight: 1.6, margin: 0 }}>{r.comment}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Section>

                <Section id="polowy" title="Połowy i ranking stanowisk" refCb={setRef('polowy')}
                  action={<button style={linkAccent} onClick={() => { if (!user) { nav('/login', { state: { from: `/lowisko/${f.id}` } }); return; } setCatchOpen(true); }}>+ Dodaj połów</button>}>
                  {catches.length === 0 ? (
                    <EmptyBox icon="trophy" title="Jeszcze brak zgłoszonych połowów" desc="Złowiłeś tu rybę? Bądź pierwszy — dodaj swój połów." />
                  ) : (
                    <>
                      <CatchShowcase catches={catches} onZoom={setMapZoom} onOpenAll={() => setAllCatchesOpen(true)} />
                      <SpotRanking catches={catches} />
                    </>
                  )}
                </Section>

                <MapSection id="stanowiska" title="Mapa stanowisk" url={f.spotMap} refCb={setRef('stanowiska')} onZoom={setMapZoom}
                  emptyDesc="Właściciel jeszcze nie udostępnił planu rozmieszczenia stanowisk." />

                <MapSection id="batymetria" title="Batymetria (mapa głębokości)" url={f.bathyMap} refCb={setRef('batymetria')} onZoom={setMapZoom}
                  emptyDesc="Właściciel jeszcze nie dodał mapy głębokości łowiska." />
              </>
            )}

            {(!isCatalog || f.amenities.length > 0) && (
              <Section id="udogodnienia" title="Udogodnienia" refCb={setRef('udogodnienia')}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 40px', maxWidth: 560 }} className="ffd-amen">
                    {AMENITIES.map((a) => {
                      const has = f.amenities.some((x) => x.toLowerCase().includes(a.match));
                      return (
                        <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: has ? 'var(--ff-text)' : 'var(--ff-text-tertiary)' }}>
                          <Icon name={has ? 'check' : 'x'} size={18} color={has ? colors.success : '#9CA3AF'} />
                          <span style={{ textDecoration: has ? 'none' : 'line-through' }}>{a.label}</span>
                        </div>
                      );
                    })}
                  </div>
              </Section>
            )}

            {(!isCatalog || f.records.length > 0) && (
              <Section id="rekordy" title="Rekordy łowiska" refCb={setRef('rekordy')}>
                {f.records.length === 0 ? <EmptyBox icon="trophy" title="Tu pojawią się rekordy" desc="Najgrubsze okazy złowione na tym łowisku." />
                  : <RecordsList records={f.records} />}
              </Section>
            )}

            {priceRows.length > 0 && (
                  <Section id="cennik" title="Cennik" refCb={setRef('cennik')}>
                    <div style={{ maxWidth: 520, border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-lg)', overflow: 'hidden' }}>
                      {priceRows.map(([k, v], i) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--ff-surface)', borderTop: i ? '1px solid var(--ff-border)' : 'none' }}>
                          <span style={{ fontSize: 15 }}>{k}</span>
                          <span style={{ fontWeight: 700, fontSize: 16 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    {f.extraCosts.length > 0 && (
                      <div style={{ maxWidth: 520, marginTop: 18 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ff-text-secondary)', marginBottom: 8 }}>Koszty dodatkowe (opcjonalne)</div>
                        <div style={{ border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-lg)', overflow: 'hidden' }}>
                          {f.extraCosts.map((c, i) => (
                            <div key={`${c.label}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px', background: 'var(--ff-surface)', borderTop: i ? '1px solid var(--ff-border)' : 'none' }}>
                              <span style={{ fontSize: 14.5 }}>{c.label}</span>
                              <span style={{ fontWeight: 700, fontSize: 15 }}>+{c.price} zł</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Section>
            )}

            <Section id="kontakt" title="Kontakt i lokalizacja" refCb={setRef('kontakt')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 18, border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-lg)', background: 'var(--ff-surface)', maxWidth: 560, marginBottom: 16 }}>
                <Avatar name={f.name} lg />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--ff-text-tertiary)' }}>Zarządzane przez</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{f.name}</div>
                </div>
                {f.phone && <a href={`tel:${f.phone.replace(/\s/g, '')}`} style={softBtn}><Icon name="phone" size={16} /> {f.phone}</a>}
              </div>
              <div ref={mapEl} style={{ height: 280, borderRadius: 'var(--ff-radius-lg)', overflow: 'hidden', border: '1px solid var(--ff-border)' }} />
              <a className="ffd-nav" href={navUrl} target="_blank" rel="noreferrer" style={{ ...softBtn, marginTop: 12, display: 'inline-flex' }}><Icon name="navigate" size={16} color={colors.primary} /> Nawiguj</a>
            </Section>
          </div>

          {/* sticky karta rezerwacji */}
          {!isCatalog ? (
            <aside style={{ position: 'sticky', top: HEAD + 20 }} className="ffd-aside">
              <div style={{ background: 'var(--ff-surface)', border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-xl)', boxShadow: 'var(--ff-shadow-lg)', padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  <span style={{ font: 'var(--ff-weight-extra) 30px var(--font-brand)', letterSpacing: '-0.02em' }}>{od ? `od ${od} zł` : 'Cena na miejscu'}</span>
                  {od ? <span style={{ fontSize: 14, color: 'var(--ff-text-secondary)' }}>/ {odUnit} · stanowisko</span> : null}
                </div>
                <div style={{ marginBottom: 16 }}><AvailPill status={availStatus} free={free} total={f.totalSpots} /></div>
                <button style={{ ...primaryBtn, opacity: availStatus === 'full' ? 0.55 : 1 }} disabled={availStatus === 'full'} onClick={() => setBooking(true)}>
                  <Icon name="calendar" size={19} color={colors.accent} /> {availStatus === 'full' ? 'Brak wolnych miejsc' : 'Rezerwuj stanowisko'}
                </button>
                <button style={{ ...softBtn, width: '100%', justifyContent: 'center', marginTop: 10, padding: '13px' }} onClick={() => { if (!user) { nav('/login', { state: { from: `/lowisko/${f.id}` } }); return; } setCatchOpen(true); }}>
                  <Icon name="trophy" size={17} color={colors.primary} /> Dodaj połów
                </button>
                <p style={{ fontSize: 12, color: 'var(--ff-text-tertiary)', marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
                  Rezerwacja wymaga potwierdzenia właściciela. Nie pobieramy opłaty przed potwierdzeniem.
                </p>
              </div>
            </aside>
          ) : (
            <aside style={{ display: 'none' }} />
          )}
        </div>

        {isCatalog && (
          <div style={{ marginTop: 22, padding: 18, border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-lg)', background: 'var(--ff-surface)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Icon name="time" size={22} color={colors.textSecondary} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700 }}>Rezerwacja online wkrótce</div>
              <div style={{ fontSize: 13.5, color: 'var(--ff-text-secondary)' }}>To łowisko jest w katalogu — skontaktuj się bezpośrednio.</div>
            </div>
            {od > 0 && (
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ font: 'var(--ff-weight-extra) 22px var(--font-brand)', letterSpacing: '-0.02em' }}>od {od} zł</div>
                <div style={{ fontSize: 12.5, color: 'var(--ff-text-secondary)' }}>/ {odUnit}</div>
              </div>
            )}
            {f.phone ? <a href={`tel:${f.phone.replace(/\s/g, '')}`} style={primaryBtnInline}><Icon name="phone" size={16} color={colors.accent} /> Zadzwoń</a>
              : f.website ? <a href={f.website} target="_blank" rel="noreferrer" style={primaryBtnInline}><Icon name="globe" size={16} color={colors.accent} /> Strona łowiska</a> : null}
          </div>
        )}
      </div>

      {reviewOpen && <ReviewModal fisheryId={f.id} fisheryName={f.name} onClose={() => setReviewOpen(false)} onDone={() => fetchReviews(f.id).then(setReviews).catch(() => {})} />}
      {catchOpen && f.premium && <CatchModal fishery={f} onClose={() => setCatchOpen(false)} onAdded={() => { setCatchDone(true); reloadCatches(); }} />}
      {allCatchesOpen && <AllCatchesModal catches={catches} fisheryName={f.name} onClose={() => setAllCatchesOpen(false)} onZoom={setMapZoom} />}
      {catchDone && <SuccessModal icon="trophy" title="Połów zapisany!" desc="Trafił do Twojego dziennika połowów. Mocnej ryby!" primary="Moje połowy" onPrimary={() => nav('/polowy')} onClose={() => setCatchDone(false)} />}
      {booking && f.premium && <BookingModal fishery={f} initialFrom={presetFrom} initialTo={presetTo} onClose={() => setBooking(false)} onBooked={() => { setBooking(false); setDone(true); }} />}
      {done && <SuccessModal icon="check" title="Zarezerwowano!" desc="Twoja rezerwacja jest zapisana. Właściciel ją potwierdzi." primary="Moje rezerwacje" onPrimary={() => nav('/rezerwacje')} onClose={() => setDone(false)} />}

      {lightbox !== null && gallery[lightbox] && createPortal(
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(10,18,14,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <button onClick={() => setLightbox(null)} aria-label="Zamknij" style={{ position: 'absolute', top: 22, right: 22, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="x" size={20} color="#fff" /></button>
          {gallery.length > 1 && <button onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i! - 1 + gallery.length) % gallery.length); }} aria-label="Poprzednie" style={lbNav('left')}><Icon name="chevronLeft" size={24} color="#fff" /></button>}
          <img src={gallery[lightbox]} alt={f.name} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '88%', borderRadius: 'var(--ff-radius-lg)', objectFit: 'contain' }} />
          {gallery.length > 1 && <button onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i! + 1) % gallery.length); }} aria-label="Następne" style={lbNav('right')}><Icon name="chevronRight" size={24} color="#fff" /></button>}
        </div>,
        document.body,
      )}

      {mapZoom && createPortal(
        <div onClick={() => setMapZoom(null)} style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(10,18,14,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <button onClick={() => setMapZoom(null)} aria-label="Zamknij" style={{ position: 'absolute', top: 22, right: 22, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="x" size={20} color="#fff" /></button>
          <img src={mapZoom} alt="Mapa łowiska" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '92%', maxHeight: '90%', borderRadius: 'var(--ff-radius-lg)', objectFit: 'contain' }} />
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ---------- helpery wizualne (styl z prototypu) ---------- */
const linkBtn: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15, color: 'var(--ff-text-secondary)' };
const softBtn: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 'var(--ff-radius-md)', border: '1px solid var(--ff-border)', background: 'var(--ff-surface)', color: 'var(--ff-text)', fontWeight: 700, fontSize: 14, cursor: 'pointer' };
const primaryBtn: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '15px', borderRadius: 'var(--ff-radius-md)', border: 'none', background: 'var(--ff-primary)', color: '#fff', fontWeight: 800, fontSize: 15.5, cursor: 'pointer', boxShadow: 'var(--ff-shadow-accent)' };
const primaryBtnInline: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 'var(--ff-radius-md)', border: 'none', background: 'var(--ff-primary)', color: '#fff', fontWeight: 800, fontSize: 14.5, cursor: 'pointer' };
const linkAccent: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ff-primary)', fontWeight: 700, fontSize: 14 };
const badge = (bg: string, color: string): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 999, background: bg, color, fontSize: 12.5, fontWeight: 800 });
const lbNav = (side: 'left' | 'right'): CSSProperties => ({ position: 'absolute', [side]: 18, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' });

function Gallery({ gallery, name, onOpen }: { gallery: string[]; name: string; onOpen: (i: number) => void }) {
  if (gallery.length === 0) return <div className="ffd-gallery-empty"><Icon name="fish" size={48} /><span>Brak zdjęć łowiska</span></div>;
  const ViewAll = gallery.length > 1 && (
    <button className="ffd-gallery-all" onClick={(e) => { e.stopPropagation(); onOpen(0); }}>
      <Icon name="list" size={15} /> Wszystkie zdjęcia · {gallery.length}
    </button>
  );
  if (gallery.length === 1) {
    return (
      <div className="ffd-gallery solo">
        <button className="gcell" onClick={() => onOpen(0)}><img src={gallery[0]} alt={name} /><span className="gcell-zoom"><Icon name="search" size={15} color="#fff" /></span></button>
      </div>
    );
  }
  const side = gallery.slice(1, 5);
  const more = gallery.length - 5;
  return (
    <div className="ffd-gallery">
      <button className="gcell main" onClick={() => onOpen(0)}>
        <img src={gallery[0]} alt={name} />
        <span className="gcell-zoom"><Icon name="search" size={15} color="#fff" /></span>
      </button>
      <div className="ffd-gallery-side">
        {side.map((g, i) => (
          <button key={i} className="gcell" onClick={() => onOpen(i + 1)}>
            <img src={g} alt="" />
            {i === side.length - 1 && more > 0
              ? <div className="gcell-more">+{more}</div>
              : <span className="gcell-zoom"><Icon name="search" size={14} color="#fff" /></span>}
          </button>
        ))}
      </div>
      {ViewAll}
    </div>
  );
}

function WhyBook({ benefits }: { benefits: string[] }) {
  const ic = (b: string): IconName => /online/i.test(b) ? 'calendar' : /potwierdz/i.test(b) ? 'check' : /prąd/i.test(b) ? 'bolt' : /no.?kill/i.test(b) ? 'fish' : /doba|godz/i.test(b) ? 'time' : 'fish';
  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-lg)', background: 'var(--ff-surface)' }} className="ffd-why">
      {benefits.map((b, i) => (
        <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '15px 18px', flex: '1 0 auto', justifyContent: 'center', borderLeft: i ? '1px solid var(--ff-border)' : 'none', whiteSpace: 'nowrap' }}>
          <Icon name={ic(b)} size={19} color={colors.primary} />
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{b}</span>
        </div>
      ))}
    </div>
  );
}

function StatItem({ icon, value, label, helper }: { icon: IconName; value: ReactNode; label: string; helper?: string }) {
  return (
    <div>
      <Icon name={icon} size={18} color={colors.accent} />
      <div style={{ font: 'var(--ff-weight-extra) 26px var(--font-brand)', letterSpacing: '-0.02em', marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 13.5, color: 'var(--ff-text-secondary)', fontWeight: 600 }}>{label}</div>
      {helper && <div style={{ fontSize: 12, color: 'var(--ff-text-tertiary)' }}>{helper}</div>}
    </div>
  );
}

function SectionTabs({ tabs, active, onGo }: { tabs: { id: string; label: string; count?: number }[]; active: string; onGo: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--ff-border)', overflowX: 'auto' }} className="ffd-tabs">
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onGo(t.id)} style={{ position: 'relative', padding: '13px 4px', margin: '0 12px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 14.5, fontWeight: 700, color: on ? 'var(--ff-primary)' : 'var(--ff-text-secondary)', transition: 'color .18s' }}>
            {t.label}
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 3, borderRadius: '3px 3px 0 0', background: 'var(--ff-primary)', transform: on ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform .22s var(--ff-ease-out)' }} />
          </button>
        );
      })}
    </div>
  );
}

function Section({ id, title, action, refCb, children }: { id: string; title: string; action?: ReactNode; refCb: (el: HTMLElement | null) => void; children: ReactNode }) {
  return (
    <section id={id} ref={refCb as React.Ref<HTMLElement>} style={{ paddingTop: 40, scrollMarginTop: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ font: 'var(--ff-weight-extra) 23px var(--font-brand)', letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// Sekcja z mapą-obrazkiem (plan stanowisk / batymetria) dodawaną przez właściciela w panelu.
function MapSection({ id, title, url, refCb, onZoom, emptyDesc }: {
  id: string; title: string; url?: string; refCb: (el: HTMLElement | null) => void; onZoom: (u: string) => void; emptyDesc: string;
}) {
  return (
    <Section id={id} title={title} refCb={refCb}>
      {url ? (
        <button type="button" onClick={() => onZoom(url)}
          style={{ display: 'block', width: '100%', maxWidth: 680, padding: 0, border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-lg)', overflow: 'hidden', background: 'var(--ff-surface)', cursor: 'zoom-in', position: 'relative' }}>
          <img src={url} alt={title} style={{ width: '100%', display: 'block' }} />
          <span style={{ position: 'absolute', right: 12, bottom: 12, background: 'rgba(15,23,30,0.62)', color: '#fff', fontSize: 12.5, fontWeight: 700, padding: '6px 11px', borderRadius: 'var(--ff-radius-pill)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="search" size={14} color="#fff" /> Powiększ</span>
        </button>
      ) : (
        <EmptyBox icon="map" title="Jeszcze nie dodano" desc={emptyDesc} />
      )}
    </Section>
  );
}

function ReviewSummary({ rating, count, dist }: { rating: number; count: number; dist: Record<number, number> }) {
  const total = count || 1;
  return (
    <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ font: 'var(--ff-weight-extra) 54px var(--font-brand)', letterSpacing: '-0.02em', lineHeight: 1 }}>{rating || '—'}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 2, justifyContent: 'center' }}>{[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" size={17} color="#F59E0B" fill={s <= Math.round(rating)} />)}</div>
        <div style={{ fontSize: 13.5, color: 'var(--ff-text-secondary)', marginTop: 6 }}>{count} opinii</div>
      </div>
      <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[5, 4, 3, 2, 1].map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13.5, color: 'var(--ff-text-secondary)', width: 12 }}>{s}</span>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--ff-surface-sunken)', overflow: 'hidden' }}>
              <div style={{ width: `${((dist[s] || 0) / total) * 100}%`, height: '100%', background: 'var(--ff-accent)', borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--ff-text-tertiary)', width: 24, textAlign: 'right' }}>{dist[s] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordsList({ records }: { records: { species: string; weight: number }[] }) {
  const ranked = [...records].sort((a, b) => b.weight - a.weight).slice(0, 6);
  const max = ranked[0]?.weight || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {ranked.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 26, fontWeight: 800, fontSize: 15, color: i === 0 ? 'var(--ff-primary)' : 'var(--ff-text-tertiary)' }}>{i + 1}</span>
          <span style={{ width: 110, fontSize: 14, fontWeight: 600 }}>{r.species}</span>
          <div style={{ flex: 1, height: 24, borderRadius: 'var(--ff-radius-sm)', background: 'var(--ff-surface-sunken)', overflow: 'hidden' }}>
            <div style={{ width: `${(r.weight / max) * 100}%`, height: '100%', background: i === 0 ? 'var(--ff-gradient-brand)' : 'var(--ff-accent-light)' }} />
          </div>
          <span style={{ width: 64, textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{r.weight.toFixed(1)} kg</span>
        </div>
      ))}
    </div>
  );
}

const CrownSvg = () => <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{ display: 'block' }}><path d="M2.5 7.5l4.2 3.6L12 4l5.3 7.1 4.2-3.6L19.5 19h-15L2.5 7.5z" /></svg>;

// big fish (najcięższa) zawsze pierwsza; reszta najnowsze→najstarsze (fisheryCatches sortuje po caught_on desc)
function orderCatches(catches: CatchReport[]): { big: CatchReport | null; ordered: CatchReport[] } {
  const withW = catches.filter((c) => c.weight != null);
  const big = withW.length ? withW.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a)) : null;
  const rest = catches.filter((c) => c.id !== big?.id);
  return { big, ordered: big ? [big, ...rest] : rest };
}

function CatchTile({ c, big, onZoom }: { c: CatchReport; big?: boolean; onZoom?: (u: string) => void }) {
  return (
    <div className={`catch-tile ${big ? 'big' : ''}`} onClick={() => c.photoUrl && onZoom?.(c.photoUrl)} style={{ cursor: c.photoUrl ? 'zoom-in' : 'default' }}>
      {c.photoUrl ? <img src={c.photoUrl} alt={c.species} /> : <div className="catch-tile-ph"><Icon name="fish" size={26} color={colors.primary} /></div>}
      <div className="catch-tile-scrim" />
      {big && <span className="bigfish-badge"><CrownSvg /> Big Fish</span>}
      <div className="catch-tile-info">
        {c.weight != null && <div className="w">{c.weight} kg</div>}
        <div className="s">{c.species}{c.spotNumber != null ? ` · stan. ${c.spotNumber}` : ''}</div>
      </div>
    </div>
  );
}

function CatchShowcase({ catches, onZoom, onOpenAll }: { catches: CatchReport[]; onZoom: (u: string) => void; onOpenAll: () => void }) {
  const { big, ordered } = orderCatches(catches);
  const display = ordered.slice(0, 4);
  const more = catches.length - display.length;
  return (
    <>
      <div className="ffd-catchgrid catch-show" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {display.map((c) => <CatchTile key={c.id} c={c} big={!!big && c.id === big.id} onZoom={onZoom} />)}
      </div>
      {more > 0 && <button className="catch-seeall" onClick={onOpenAll}>Zobacz wszystkie połowy ({catches.length}) <Icon name="arrowRight" size={15} color={colors.primary} /></button>}
    </>
  );
}

function AllCatchesModal({ catches, fisheryName, onClose, onZoom }: { catches: CatchReport[]; fisheryName: string; onClose: () => void; onZoom: (u: string) => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  const { big, ordered } = orderCatches(catches);
  return createPortal(
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="bk-badge"><Icon name="trophy" size={18} color={colors.primary} /></div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 17 }}>Połowy łowiska</div><div style={{ fontSize: 12.5, color: colors.textSecondary }}>{fisheryName} · {catches.length} {catches.length === 1 ? 'ryba' : 'ryb'}</div></div>
          <button className="x" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="sheet-body">
          <div className="ffd-catchgrid catch-show" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {ordered.map((c) => <CatchTile key={c.id} c={c} big={!!big && c.id === big.id} onZoom={onZoom} />)}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SpotRanking({ catches }: { catches: CatchReport[] }) {
  const bySpot = new Map<number, number>();
  for (const c of catches) if (c.spotNumber != null) bySpot.set(c.spotNumber, (bySpot.get(c.spotNumber) ?? 0) + 1);
  const ranked = [...bySpot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (ranked.length === 0) return null;
  const max = ranked[0][1];
  return (
    <div style={{ marginTop: 24, border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-lg)', padding: '16px 18px', background: 'var(--ff-surface)' }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="trophy" size={15} color={colors.primary} /> Najbardziej łowne stanowiska</div>
      {ranked.map(([s, n]) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
          <span style={{ width: 96, fontWeight: 700, fontSize: 13.5 }}>Stanowisko {s}</span>
          <div style={{ flex: 1, height: 9, borderRadius: 999, background: 'var(--ff-surface-sunken)', overflow: 'hidden' }}><div style={{ width: `${Math.max(8, (n / max) * 100)}%`, height: '100%', background: 'var(--ff-accent)' }} /></div>
          <span style={{ width: 66, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{n} ryb{n === 1 ? 'a' : n < 5 ? 'y' : ''}</span>
        </div>
      ))}
    </div>
  );
}

function Avatar({ name, lg }: { name: string; lg?: boolean }) {
  const init = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const sz = lg ? 52 : 40;
  return <div style={{ width: sz, height: sz, borderRadius: '50%', background: 'var(--ff-green-50)', color: 'var(--ff-primary)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: lg ? 18 : 14, flexShrink: 0 }}>{init}</div>;
}

function Tag({ tone, children }: { tone: 'type' | 'species'; children: ReactNode }) {
  const s = tone === 'type'
    ? { background: 'rgba(27,67,50,0.07)', color: 'var(--ff-primary)', border: '1px solid rgba(27,67,50,0.15)' }
    : { background: 'var(--ff-green-50)', color: 'var(--ff-green-700)', border: '1px solid var(--ff-green-100)' };
  return <span style={{ ...s, fontSize: 12.5, fontWeight: 700, padding: '4px 11px', borderRadius: 999 }}>{children}</span>;
}

function AvailPill({ status, free, total }: { status: 'free' | 'low' | 'full'; free: number; total: number }) {
  const map = {
    free: { bg: 'var(--ff-success-bg)', col: 'var(--ff-success)' },
    low: { bg: 'var(--ff-warning-bg)', col: 'var(--ff-warning)' },
    full: { bg: 'var(--ff-error-bg)', col: 'var(--ff-error)' },
  }[status];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: map.bg, color: map.col, fontWeight: 700, fontSize: 14 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: map.col }} />
      {status === 'full' ? 'Brak wolnych miejsc' : `${free} z ${total} stanowisk wolnych`}
    </div>
  );
}

function EmptyBox({ icon, title, desc }: { icon: IconName; title: string; desc: string }) {
  return (
    <div style={{ textAlign: 'center', border: '1px dashed var(--ff-border-strong)', borderRadius: 'var(--ff-radius-lg)', padding: '34px 24px', background: 'var(--ff-surface)' }}>
      <Icon name={icon} size={26} color="#9CA3AF" />
      <div style={{ marginTop: 8, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: 'var(--ff-text-secondary)', marginTop: 2 }}>{desc}</div>
    </div>
  );
}

function SuccessModal({ icon, title, desc, primary, onPrimary, onClose }: { icon: IconName; title: string; desc: string; primary: string; onPrimary: () => void; onClose: () => void }) {
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'var(--ff-overlay)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--ff-surface)', borderRadius: 'var(--ff-radius-2xl)', padding: 28, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: 'var(--ff-shadow-xl)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--ff-success-bg)', color: 'var(--ff-success)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}><Icon name={icon} size={30} /></div>
        <h2 style={{ fontSize: 22, margin: 0 }}>{title}</h2>
        <p style={{ color: 'var(--ff-text-secondary)', margin: '8px 0 18px' }}>{desc}</p>
        <button style={{ ...primaryBtn }} onClick={onPrimary}>{primary}</button>
        <button style={{ ...softBtn, width: '100%', justifyContent: 'center', marginTop: 10, padding: '12px' }} onClick={onClose}>Zamknij</button>
      </div>
    </div>,
    document.body,
  );
}
