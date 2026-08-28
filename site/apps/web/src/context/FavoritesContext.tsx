import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Ctx {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const FavoritesContext = createContext<Ctx | null>(null);

// Gość (niezalogowany) trzyma ulubione lokalnie — żeby nie znikały po odświeżeniu.
const LS_KEY = 'ff:favorites';
const loadLocal = (): string[] => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
const saveLocal = (ids: string[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch { /* ignore */ } };

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>(loadLocal);

  useEffect(() => {
    // Gość → localStorage
    if (!user?.id) { setFavorites(loadLocal()); return; }
    let alive = true;
    (async () => {
      // Po zalogowaniu: scal ulubione gościa do bazy, potem wczytaj z bazy
      const local = loadLocal();
      if (local.length) {
        await supabase.from('favorites').upsert(local.map((fid) => ({ user_id: user.id, fishery_id: fid })), { onConflict: 'user_id,fishery_id' });
        saveLocal([]);
      }
      const { data, error } = await supabase.from('favorites').select('fishery_id').eq('user_id', user.id);
      if (alive && !error && data) setFavorites(data.map((r: { fishery_id: string }) => r.fishery_id));
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const toggleFavorite = useCallback(async (id: string) => {
    const uid = user?.id;
    const wasFav = favorites.includes(id);
    const next = wasFav ? favorites.filter((f) => f !== id) : favorites.includes(id) ? favorites : [...favorites, id];
    setFavorites(next); // optymistyczna zmiana UI
    if (!uid) { saveLocal(next); return; } // gość — trwałość w localStorage
    // KLUCZOWE: zapis musi być awaitowany — builder Supabase wykonuje request dopiero przy await/then
    const { error } = wasFav
      ? await supabase.from('favorites').delete().eq('user_id', uid).eq('fishery_id', id)
      : await supabase.from('favorites').upsert({ user_id: uid, fishery_id: id }, { onConflict: 'user_id,fishery_id' });
    if (error) {
      setFavorites(favorites); // cofnij przy błędzie
      console.error('Nie udało się zapisać ulubionego łowiska:', error.message);
    }
  }, [user?.id, favorites]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
