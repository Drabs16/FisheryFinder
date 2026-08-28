import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Fishery } from '../data/mockData';
import { fetchFisheries } from '../lib/fisheries';

interface Ctx {
  fisheries: Fishery[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const FisheriesContext = createContext<Ctx | null>(null);

export function FisheriesProvider({ children }: { children: React.ReactNode }) {
  const [fisheries, setFisheries] = useState<Fishery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFisheries(await fetchFisheries());
    } catch (e: any) {
      setError(e?.message ?? 'Nie udało się pobrać łowisk');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <FisheriesContext.Provider value={{ fisheries, loading, error, reload }}>
      {children}
    </FisheriesContext.Provider>
  );
}

export function useFisheries() {
  const ctx = useContext(FisheriesContext);
  if (!ctx) throw new Error('useFisheries must be used within FisheriesProvider');
  return ctx;
}
