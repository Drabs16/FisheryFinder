import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cancelReservation, fetchMyReservations } from '../lib/reservations';
import { fetchFisheriesByIds } from '../lib/fisheries';
import { PAYMENT_LABELS, type PaymentMethod, type Reservation } from '../lib/types';
import Icon from '../components/Icon';
import ReviewModal from '../components/ReviewModal';
import ShareModal from '../components/ShareModal';
import ReservationsCalendar from '../components/ReservationsCalendar';
import WeatherWidget from '../components/WeatherWidget';
import AppDialog from '../components/AppDialog';
import { pageWrap, h1Style, subStyle, primaryBtnInline, EmptyCard, Gate } from './MyCatches';

type Tab = 'upcoming' | 'completed' | 'cancelled';
const TABS: { key: Tab; label: string }[] = [
  { key: 'upcoming', label: 'Aktywne' }, { key: 'completed', label: 'Zakończone' }, { key: 'cancelled', label: 'Anulowane' },
];
const META: Record<Reservation['status'], { label: string; bg: string; col: string }> = {
  upcoming: { label: 'Nadchodząca', bg: 'var(--ff-water-bg)', col: 'var(--ff-water)' },
  completed: { label: 'Zakończona', bg: 'var(--ff-surface-sunken)', col: 'var(--ff-text-secondary)' },
  cancelled: { label: 'Anulowana', bg: 'var(--ff-error-bg)', col: 'var(--ff-error)' },
};

export default function MyReservations() {
  const { user } = useAuth();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Reservation | null>(null);
  const [shareTarget, setShareTarget] = useState<Reservation | null>(null);
  const [calSelId, setCalSelId] = useState<string | null>(null);
  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number; place: string }>>({});

  const load = () => { setLoading(true); fetchMyReservations().then(setItems).catch(() => setItems([])).finally(() => setLoading(false)); };
  useEffect(() => { if (user) load(); else setLoading(false); }, [user]);

  // współrzędne łowisk (do prognozy pogody) + domyślny wybór najbliższej rezerwacji
  useEffect(() => {
    if (items.length === 0) return;
    const ids = [...new Set(items.map((r) => r.fisheryId))];
    fetchFisheriesByIds(ids).then((fs) => {
      const m: Record<string, { lat: number; lng: number; place: string }> = {};
      fs.forEach((f) => { m[f.id] = { lat: f.latitude, lng: f.longitude, place: f.city || f.location || '' }; });
      setCoords(m);
    }).catch(() => {});
    if (!calSelId) {
      const up = items.filter((r) => r.status === 'upcoming').sort((a, b) => a.dateFrom.localeCompare(b.dateFrom));
      setCalSelId((up[0] ?? items[0])?.id ?? null);
    }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <Gate icon="calendar" title="Zaloguj się, aby zobaczyć rezerwacje" desc="Rezerwacje są wspólne z aplikacją mobilną." from="/rezerwacje" />;

  const rows = items.filter((r) => r.status === tab);
  const doCancel = async () => { if (!cancelTarget) return; await cancelReservation(cancelTarget.id); setCancelTarget(null); load(); };
  const counts: Record<Tab, number> = {
    upcoming: items.filter((r) => r.status === 'upcoming').length,
    completed: items.filter((r) => r.status === 'completed').length,
    cancelled: items.filter((r) => r.status === 'cancelled').length,
  };

  return (
    <div style={pageWrap}>
      <div style={{ maxWidth: 'var(--ff-container)', margin: '0 auto', padding: '40px 24px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <h1 style={h1Style}>Moje rezerwacje</h1>
            <p style={subStyle}>Wszystkie rezerwacje stanowisk i ich statusy.</p>
          </div>
          <div className="seg">
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><Icon name="list" size={15} /> Lista</button>
            <button className={view === 'calendar' ? 'on' : ''} onClick={() => setView('calendar')}><Icon name="calendar" size={15} /> Kalendarz</button>
          </div>
        </div>

        {view === 'calendar' ? (
          items.length === 0 && !loading ? (
            <div style={{ maxWidth: 560, margin: '0 auto', background: 'var(--ff-surface)', border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-xl)', boxShadow: 'var(--ff-shadow-sm)', padding: '20px 22px' }}>
              <EmptyCard icon="calendar" title="Brak rezerwacji" desc="Znajdź łowisko i zarezerwuj stanowisko." action={<Link to="/" style={primaryBtnInline}>Przeglądaj łowiska</Link>} />
            </div>
          ) : (
            <div className="rescal-layout">
              <div className="rescal-card">
                <ReservationsCalendar reservations={items} selectedId={calSelId} onSelect={(r) => setCalSelId(r?.id ?? null)} />
              </div>
              <div className="rescal-card">
                {(() => {
                  const sel = items.find((r) => r.id === calSelId) ?? null;
                  const c = sel ? coords[sel.fisheryId] : null;
                  if (!sel) return <div className="wx-empty"><Icon name="calendar" size={26} color="var(--ff-text-secondary)" /> Wybierz rezerwację w kalendarzu</div>;
                  if (!c) return <div className="wx-empty"><Icon name="droplet" size={26} color="var(--ff-text-secondary)" /> Ładuję dane łowiska…</div>;
                  return (
                    <>
                      {sel.status === 'upcoming' && (
                        <div style={{ marginBottom: 14 }}><ConfirmPill confirmed={!!sel.confirmedAt} /></div>
                      )}
                      <WeatherWidget lat={c.lat} lng={c.lng} fishery={sel.fishery} place={c.place} dateFrom={sel.dateFrom} dateTo={sel.dateTo} spots={sel.spots} />
                    </>
                  );
                })()}
              </div>
            </div>
          )
        ) : (
        <>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--ff-border)', marginBottom: 22 }}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ position: 'relative', padding: '12px 4px', margin: '0 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14.5, fontWeight: 700, color: on ? 'var(--ff-primary)' : 'var(--ff-text-secondary)' }}>
                {t.label} · {counts[t.key]}
                <span style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 3, borderRadius: '3px 3px 0 0', background: 'var(--ff-primary)', transform: on ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform .22s var(--ff-ease-out)' }} />
              </button>
            );
          })}
        </div>

        {loading ? null : rows.length === 0 ? (
          <EmptyCard icon="calendar" title="Brak rezerwacji" desc={tab === 'upcoming' ? 'Znajdź łowisko i zarezerwuj stanowisko.' : 'Nic tu jeszcze nie ma.'} action={tab === 'upcoming' ? <Link to="/" style={primaryBtnInline}>Przeglądaj łowiska</Link> : undefined} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rows.map((r) => (
              <ReservationRow key={r.id} r={r} owner={r.userId === user.id}
                onShare={() => setShareTarget(r)} onCancel={() => setCancelTarget(r)} onReview={() => setReviewTarget(r)} />
            ))}
          </div>
        )}
        </>
        )}
      </div>
      {reviewTarget && <ReviewModal fisheryId={reviewTarget.fisheryId} fisheryName={reviewTarget.fishery} onClose={() => setReviewTarget(null)} />}
      {shareTarget && <ShareModal reservation={shareTarget} onClose={() => setShareTarget(null)} onChanged={load} />}
      {cancelTarget && (
        <AppDialog variant="danger" icon="x" title="Anulować rezerwację?"
          text={`${cancelTarget.fishery} · ${cancelTarget.dateLabel || `${cancelTarget.dateFrom} – ${cancelTarget.dateTo}`}`}
          note="Zwrot środków do 3 dni roboczych." confirmLabel="Tak, anuluj rezerwację" confirmVariant="danger"
          cancelLabel="Wróć" onConfirm={doCancel} onCancel={() => setCancelTarget(null)} />
      )}
    </div>
  );
}

function ConfirmPill({ confirmed }: { confirmed: boolean }) {
  return confirmed
    ? <span style={pill('var(--ff-green-50)', 'var(--ff-primary)')}><Icon name="check" size={12} color="var(--ff-primary)" /> Potwierdzona przez właściciela</span>
    : <span style={pill('#FEF3E2', '#B45309')}><Icon name="time" size={12} color="#B45309" /> Oczekuje na potwierdzenie</span>;
}

const pill = (bg: string, col: string): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: bg, color: col, fontSize: 12.5, fontWeight: 700 });
const softBtn: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 'var(--ff-radius-md)', border: '1px solid var(--ff-border)', background: 'var(--ff-surface)', color: 'var(--ff-text)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' };

export function ReservationRow({ r, owner, onShare, onCancel, onReview }: {
  r: Reservation; owner: boolean; onShare: () => void; onCancel: () => void; onReview: () => void;
}) {
  const m = META[r.status];
  return (
    <div className="res-row">
      <div className="res-row-ic"><Icon name="calendar" size={22} /></div>
      <div className="res-row-main">
        <div className="res-row-title">
          <span className="res-row-name">{r.fishery}</span>
          {!owner && <span style={pill('var(--ff-water-bg)', 'var(--ff-water)')}><Icon name="people" size={12} color="var(--ff-water)" /> Udostępniona Ci</span>}
        </div>
        <div className="res-row-meta">
          <span><Icon name="calendar" size={14} /> {r.dateLabel || `${r.dateFrom} – ${r.dateTo}`}</span>
          {r.spots.length > 0 && <span><Icon name="pin" size={14} /> stanowisko {r.spots.join(', ')}</span>}
          <span><Icon name="cash" size={14} /> {PAYMENT_LABELS[r.payment as PaymentMethod] ?? r.payment}</span>
          {r.addons.length > 0 && <span><Icon name="bag" size={14} /> {r.addons.map((a) => a.label).join(', ')}</span>}
        </div>
      </div>
      <div className="res-row-side">
        <div className="res-row-badges">
          <span style={pill(m.bg, m.col)}>{m.label}</span>
          {r.status === 'upcoming' && <ConfirmPill confirmed={!!r.confirmedAt} />}
        </div>
        <div className="res-row-price">{Math.round(r.total)} zł</div>
      </div>
      {owner && r.status !== 'cancelled' && (
        <div className="res-row-actions">
          <button style={softBtn} onClick={onShare}><Icon name="people" size={15} color="var(--ff-primary)" /> Udostępnij{r.sharedWith.length > 0 ? ` · ${r.sharedWith.length}` : ''}</button>
          {r.status === 'upcoming' && <button style={{ ...softBtn, color: 'var(--ff-error)', borderColor: 'var(--ff-error-bg)' }} onClick={onCancel}><Icon name="x" size={15} color="var(--ff-error)" /> Anuluj</button>}
          {r.status === 'completed' && <button style={softBtn} onClick={onReview}><Icon name="star" size={15} color="#F59E0B" fill /> Oceń</button>}
        </div>
      )}
    </div>
  );
}
