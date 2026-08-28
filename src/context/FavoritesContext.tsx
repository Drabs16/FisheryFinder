import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Ctx {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const FavoritesContext = createContext<Ctx | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) { setFavorites([]); return; }
    supabase.from('favorites').select('fishery_id').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setFavorites(data.map((r: { fishery_id: string }) => r.fishery_id));
      });
  }, [user?.id]);

  const toggleFavorite = useCallback((id: string) => {
    if (!user?.id) return;
    setFavorites((prev) => {
      const has = prev.includes(id);
      if (has) {
        supabase.from('favorites').delete().eq('user_id', user.id).eq('fishery_id', id);
        return prev.filter((f) => f !== id);
      }
      supabase.from('favorites').insert({ user_id: user.id, fishery_id: id });
      return [...prev, id];
    });
  }, [user?.id]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
