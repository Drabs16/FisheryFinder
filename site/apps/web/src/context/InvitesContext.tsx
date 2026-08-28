import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchPendingInvites, type BoardInvite } from '../lib/catches';

interface InvitesState {
  invites: BoardInvite[];
  count: number;
  reload: () => void;
}

const Ctx = createContext<InvitesState>({ invites: [], count: 0, reload: () => {} });

// Lekki kontekst zaproszeń do tablic rywalizacji — zasila badge w nagłówku i baner w „Połowach".
export function InvitesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [invites, setInvites] = useState<BoardInvite[]>([]);

  const reload = useCallback(() => {
    if (!user) { setInvites([]); return; }
    fetchPendingInvites().then(setInvites).catch(() => {});
  }, [user]);

  useEffect(() => { reload(); }, [reload]);
  // odśwież po powrocie na kartę (np. ktoś właśnie zaprosił)
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  return <Ctx.Provider value={{ invites, count: invites.length, reload }}>{children}</Ctx.Provider>;
}

export function useInvites() { return useContext(Ctx); }
