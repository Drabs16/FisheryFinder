import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchMyFisheries, fetchAccountSubscription } from '../lib/api';
import { PLAN_RANK, type PlanId } from '../lib/plans';

interface PlanState {
  effectivePlan: PlanId;   // plan KONTA właściciela (z subskrypcji konta; admin = 'pro')
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
      // Plan liczy się per KONTO — bierzemy z subskrypcji konta (nie max po łowiskach).
      const [sub, fs] = await Promise.all([
        fetchAccountSubscription().catch(() => null),
        fetchMyFisheries(user.id).catch(() => []),
      ]);
      setFisheriesCount(fs.length);
      const accountPlan = (sub?.plan ?? 'basic') as PlanId;
      // fallback: gdyby brak subskrypcji konta, użyj najwyższego planu łowisk (zgodność wstecz)
      const best = fs.reduce<PlanId>((acc, f) => (PLAN_RANK[(f.plan ?? 'basic') as PlanId] > PLAN_RANK[acc] ? (f.plan as PlanId) : acc), 'basic');
      const resolved = PLAN_RANK[accountPlan] >= PLAN_RANK[best] ? accountPlan : best;
      setEffectivePlan(isAdmin ? 'pro' : resolved);
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
