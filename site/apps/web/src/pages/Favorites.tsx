import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { fetchFisheriesByIds, fetchTakenCounts } from '../lib/fisheries';
import { todayIso } from '../lib/constants';
import type { Fishery } from '../lib/types';
import FisheryCard from '../components/FisheryCard';
import { pageWrap, h1Style, subStyle, primaryBtnInline, EmptyCard } from './MyCatches';

export default function Favorites() {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const [items, setItems] = useState<Fishery[]>([]);
  const [taken, setTaken] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Działa też dla gościa — ulubione gościa trzymane są lokalnie (FavoritesContext).
    if (favorites.length === 0) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const t = todayIso();
    Promise.all([fetchFisheriesByIds(favorites), fetchTakenCounts(t, t)])
      .then(([fs, tk]) => { setItems(fs); setTaken(tk); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [favorites]);

  const freeOf = (f: Fishery) => Math.max(0, f.totalSpots - (taken[f.id] ?? 0));
  const ordered = useMemo(() => favorites.map((id) => items.find((f) => f.id === id)).filter((f): f is Fishery => !!f), [favorites, items]);

  return (
    <div style={pageWrap}>
      <div style={{ maxWidth: 'var(--ff-container)', margin: '0 auto', padding: '40px 24px 64px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={h1Style}>Ulubione łowiska</h1>
          <p style={subStyle}>Łowiska zapisane sercem — wracaj do nich jednym kliknięciem.</p>
          {!user && ordered.length > 0 && (
            <p style={{ ...subStyle, marginTop: 6, fontSize: 13.5 }}>
              <Link to="/login" state={{ from: '/ulubione' }} style={{ color: 'var(--ff-primary)', fontWeight: 700 }}>Zaloguj się</Link>, aby zsynchronizować ulubione między urządzeniami.
            </p>
          )}
        </div>

        {loading ? null : ordered.length === 0 ? (
          <EmptyCard icon="heart" title="Brak ulubionych łowisk" desc="Zapisuj łowiska sercem na liście lub w szczegółach — pojawią się tutaj." action={<Link to="/" style={primaryBtnInline}>Przeglądaj łowiska</Link>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {ordered.map((f) => <FisheryCard key={f.id} fishery={f} availableSpots={freeOf(f)} distanceKm={f.distance} hasDate={false} />)}
          </div>
        )}
      </div>
    </div>
  );
}
