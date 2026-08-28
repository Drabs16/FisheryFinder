import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchMyFisheries, fetchReservations } from './api';
import type { Fishery, Reservation } from './types';

interface OwnerData {
  fisheries: Fishery[];
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Wspólne dane właściciela: jego łowiska + wszystkie rezerwacje tych łowisk.
export function useOwnerData(): OwnerData {
  const { user } = useAuth();
  const [fisheries, setFisheries] = useState<Fishery[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const fs = await fetchMyFisheries(user.id);
      setFisheries(fs);
      const rs = await fetchReservations(fs.map((f) => f.id));
      setReservations(rs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { fisheries, reservations, loading, error, reload: load };
}
