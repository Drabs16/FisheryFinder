import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchMyFisheries } from '../lib/api';
import { PLAN_RANK, type PlanId } from '../lib/plans';

interface PlanState {
  effectivePlan: PlanId;   // najwyższy plan wśród łowisk właściciela (admin = 'pro')
  fisheriesCount: number;
  isPro: boolean;
  loading: boolean;
  reload: () => Promise<void>;
}

const Ctx = createContext<PlanState | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [effectivePlan, setEffectivePlan] = useState<PlanId>('basic');
  const [fisheriesCount, setFisheriesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) { setEffectivePlan('basic'); setFisheriesCount(0); setLoading(false); return; }
    setLoading(true);
    try {
      const fs = await fetchMyFisheries(user.id);
      setFisheriesCount(fs.length);
      const best = fs.reduce<PlanId>((acc, f) => (PLAN_RANK[(f.plan ?? 'basic') as PlanId] > PLAN_RANK[acc] ? (f.plan as PlanId) : acc), 'basic');
      setEffectivePlan(isAdmin ? 'pro' : best);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user, isAdmin]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <Ctx.Provider value={{ effectivePlan, fisheriesCount, isPro: isAdmin || effectivePlan === 'pro', loading, reload }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
