import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import type { Fishery } from '../lib/types';
import { nightsBetween, pluralDoby, cheapestStay, dobaPriceOf } from '../lib/constants';
import { useFavorites } from '../context/FavoritesContext';

export default function FisheryCard({ fishery, availableSpots, distanceKm, hasDate, dateFrom, dateTo }: {
  fishery: Fishery; availableSpots: number; distanceKm: number; hasDate: boolean; dateFrom?: string | null; dateTo?: string | null;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const nav = useNavigate();
  const [hover, setHover] = useState(false);
  const fav = isFavorite(fishery.id);
  const free = Math.max(0, availableSpots);
  // Najtańszy oferowany produkt (doba/dzień/nocka) — jednostka spójna z ceną „od".
  const stay = cheapestStay(fishery);
  const od = stay?.price ?? 0;
  // Jak Booking: po wybraniu terminu sumujemy za okres, ale TYLKO po cenie doby (mnożenie nocki
  // przez doby nie ma sensu). Łowiska tylko-dzień/nocka pokazują cenę za jednostkę bez sumy.
  const nights = nightsBetween(dateFrom, dateTo);
  const dobaPrice = dobaPriceOf(fishery);
  const showPeriod = !!dateFrom && dobaPrice > 0 && fishery.premium;
  const periodTotal = dobaPrice * nights;
  // Przenosimy wybrany termin do szczegółów łowiska (prefill rezerwacji)
  const href = dateFrom ? `/lowisko/${fishery.id}?from=${dateFrom}${dateTo ? `&to=${dateTo}` : ''}` : `/lowisko/${fishery.id}`;
  const status: 'free' | 'low' | 'full' | 'unknown' = !fishery.premium ? 'unknown' : free <= 0 ? 'full' : free <= 3 ? 'low' : 'free';

  const onHeart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    toggleFavorite(fishery.id); // gość też może zapisać (localStorage), scala się po zalogowaniu
  };

  const shownTypes = (fishery.nokill ? ['No Kill', ...fishery.types] : fishery.types).slice(0, 2);
  const shownSpecies = fishery.fish.slice(0, 3);

  return (
    <div
      onClick={() => nav(href)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--ff-surface)', borderRadius: 'var(--ff-radius-lg)', border: '1px solid var(--ff-border)',
        overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column',
        boxShadow: hover ? 'var(--ff-shadow-hover)' : 'var(--ff-shadow-sm)',
        transform: hover ? 'translateY(-4px)' : 'none',
        transition: 'transform var(--ff-dur-base) var(--ff-ease-out), box-shadow var(--ff-dur-base) var(--ff-ease-out)',
      }}>
      <div style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden', background: 'var(--ff-surface-sunken)' }}>
        {fishery.image
          ? <img src={fishery.image} alt={fishery.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hover ? 'scale(1.06)' : 'scale(1)', transition: 'transform var(--ff-dur-slow) var(--ff-ease-out)' }} />
          : <div className="img-empty"><img src="/logo-fish.png" alt="" className="img-empty-logo" /><span>Zdjęcia wkrótce</span></div>}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {fishery.premium
            ? <span style={solidBadge('var(--ff-primary)', '#fff')}><Icon name="fish" size={12} color="#fff" /> Partner</span>
            : <span style={solidBadge('rgba(16,28,23,0.7)', '#fff')}>Katalog</span>}
          {status === 'unknown'
            ? <span style={solidBadge('rgba(16,28,23,0.7)', '#fff')}><Icon name="phone" size={11} color="#fff" /> Zapytaj o dostępność</span>
            : <span style={solidBadge(status === 'full' ? 'var(--ff-error)' : status === 'low' ? 'var(--ff-warning)' : 'var(--ff-success)', '#fff')}>
                {hasDate && <Icon name="calendar" size={11} color="#fff" />}{status === 'full' ? 'Brak miejsc' : `${free} wolnych`}
              </span>}
        </div>
        <button onClick={onHeart} aria-label={fav ? 'Usuń z ulubionych' : 'Zapisz łowisko'}
          style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: '50%', background: 'var(--ff-surface)', border: '1px solid var(--ff-border)', boxShadow: 'var(--ff-shadow-sm)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Icon name="heart" size={17} color={fav ? '#EF4444' : 'var(--ff-text-secondary)'} fill={fav} />
        </button>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25, margin: 0, flex: 1 }}>{fishery.name}</h3>
          {fishery.rating > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 700, flexShrink: 0 }}><Icon name="star" size={14} color="#F59E0B" fill /> {fishery.rating}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ff-text-secondary)', fontSize: 14 }}>
          <Icon name="pin" size={15} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fishery.city}</span>
          {distanceKm > 0 && <span style={{ color: 'var(--ff-text-tertiary)', flexShrink: 0 }}>· {distanceKm.toFixed(1)} km</span>}
        </div>
        {(shownTypes.length > 0 || shownSpecies.length > 0) ? (
          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, overflow: 'hidden' }}>
            {shownTypes.map((t) => <Tag key={t} tone="type">{t}</Tag>)}
            {shownSpecies.map((s) => <Tag key={s} tone="species">{s}</Tag>)}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ff-text-tertiary)', fontSize: 13 }}>
            <Icon name="fish" size={14} />
            <span>{fishery.province ? `Łowisko · woj. ${fishery.province}` : 'Łowisko w katalogu'}</span>
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {showPeriod
            ? <div style={{ display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--ff-text-secondary)' }}>od</span>
                  <span style={{ font: 'var(--ff-weight-extra) 19px var(--font-brand)', letterSpacing: '-0.02em' }}>{periodTotal} zł</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ff-text-tertiary)' }}>za {nights} {pluralDoby(nights)}</span>
              </div>
            : od && stay
            ? <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 13.5, color: 'var(--ff-text-secondary)' }}>od</span>
                <span style={{ font: 'var(--ff-weight-extra) 19px var(--font-brand)', letterSpacing: '-0.02em' }}>{od} zł</span>
                <span style={{ fontSize: 13.5, color: 'var(--ff-text-secondary)' }}>/ {stay.label.toLowerCase()}</span>
              </div>
            : <span style={{ fontSize: 13.5, color: 'var(--ff-text-secondary)', fontWeight: 600 }}>Cena na miejscu</span>}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ff-primary)', fontWeight: 700, fontSize: 14, transform: hover ? 'translateX(2px)' : 'none', transition: 'transform var(--ff-dur-fast) var(--ff-ease-out)' }}>
            Szczegóły <Icon name="chevronRight" size={16} />
          </span>
        </div>
      </div>
    </div>
  );
}

const solidBadge = (bg: string, color: string): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999, background: bg, color, fontSize: 11.5, fontWeight: 800, backdropFilter: 'blur(2px)' });

function Tag({ tone, children }: { tone: 'type' | 'species'; children: React.ReactNode }) {
  const s = tone === 'type'
    ? { background: 'rgba(27,67,50,0.07)', color: 'var(--ff-primary)' }
    : { background: 'var(--ff-green-50)', color: 'var(--ff-green-700)' };
  return <span style={{ ...s, fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>{children}</span>;
}
