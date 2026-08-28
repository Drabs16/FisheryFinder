import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { fetchMyFisheries, fetchAccountSubscription, subscribeAccount, cancelAccountSubscription } from '../lib/api';
import { PLANS, PLAN_RANK, type PlanDef } from '../lib/plans';
import type { AccountSub } from '../lib/types';
import Icon, { type IconName } from '../components/Icon';
import { toast } from '../components/Toast';
import { confirmDialog } from '../components/Confirm';
import { colors } from '../theme';
import Loader from '../components/Loader';

type Billing = 'monthly' | 'yearly';
const METHODS: { key: string; label: string; icon: IconName }[] = [
  { key: 'blik', label: 'BLIK', icon: 'phone' },
  { key: 'applepay', label: 'Apple Pay', icon: 'card' },
  { key: 'googlepay', label: 'Google Pay', icon: 'card' },
  { key: 'p24', label: 'Przelewy24', icon: 'globe' },
];
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' }) : '—');

// Korzyść z przejścia na wyższy plan (zależnie od obecnego)
const UPSELL_BENEFIT: Record<string, string> = {
  basic: 'Włącz rezerwacje online i kalendarz w czasie rzeczywistym — koniec z telefonem i overbookingiem.',
  premium: 'Dodaj pełny CRM, analitykę i raporty — zobacz kto wraca i co zarabia najlepiej.',
  pro: '',
};

export default function Subscription() {
  const { user } = useAuth();
  const { reload: reloadPlan } = usePlan();
  const [sub, setSub] = useState<AccountSub | null>(null);
  const [fisheriesCount, setFisheriesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<Billing>('monthly');
  const [checkout, setCheckout] = useState<PlanDef | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [s, fs] = await Promise.all([fetchAccountSubscription().catch(() => null), fetchMyFisheries(user.id).catch(() => [])]);
      setSub(s); setFisheriesCount(fs.length);
      if (s?.billing) setBilling(s.billing);
    } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const currentPlan = (sub?.plan ?? 'basic');
  const curRank = PLAN_RANK[currentPlan];
  const nextPlan = PLANS[curRank + 1]; // undefined gdy Pro (najwyższy)
  const accountCost = useMemo(() => {
    const p = PLANS.find((x) => x.id === currentPlan);
    if (!p || currentPlan === 'basic') return null;
    return sub?.billing === 'yearly' ? `${p.yearly} zł / rok` : `${p.monthly} zł / mc`;
  }, [currentPlan, sub]);

  const choose = async (plan: PlanDef) => {
    if (plan.id === currentPlan) return;
    if (plan.id === 'basic') {
      if (!(await confirmDialog({ title: 'Przejść na Basic?', message: 'Rezerwacje online i CRM zostaną wyłączone dla wszystkich Twoich łowisk. Łowiska zostaną w katalogu (bez rezerwacji online).', confirmLabel: 'Przejdź na Basic', danger: true }))) return;
      try { await cancelAccountSubscription(); await load(); await reloadPlan(); toast('Plan zmieniony na Basic', 'success'); }
      catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
      return;
    }
    setCheckout(plan);
  };

  if (loading) return (<><Top /><div className="content"><Loader label="Wczytywanie planu konta…" /></div></>);

  return (
    <>
      <Top right={accountCost ?? undefined} />
      <div className="content">
        {/* cykl rozliczeniowy */}
        <div className="cal-toolbar" style={{ marginBottom: 18 }}>
          <div className="seg" style={{ marginLeft: 'auto' }}>
            <button className={`seg-btn ${billing === 'monthly' ? 'on' : ''}`} onClick={() => setBilling('monthly')}>Miesięcznie</button>
            <button className={`seg-btn ${billing === 'yearly' ? 'on' : ''}`} onClick={() => setBilling('yearly')}>Rocznie · 2 mc gratis</button>
          </div>
        </div>

        {sub && currentPlan !== 'basic' && (
          <div className="sub-status">
            <span className="sub-status-dot" />
            <div className="sub-status-main">
              <div className="sub-status-title">Twoje konto — plan {PLANS.find((p) => p.id === currentPlan)?.name} aktywny</div>
              <div className="sub-status-meta">
                Obejmuje wszystkie Twoje łowiska ({fisheriesCount}) · rozliczenie {sub.billing === 'yearly' ? 'roczne' : 'miesięczne'} · odnawia się {fmtDate(sub.current_period_end)}
              </div>
            </div>
            <span className="sub-status-badge"><Icon name="check" size={13} /> Aktywna</span>
          </div>
        )}

        {/* Pasek: namawia na wyższy plan, albo „masz wszystko" gdy Pro */}
        {nextPlan ? (
          <div className="upsell-banner">
            <div className="ub-icon"><Icon name="sparkles" size={22} /></div>
            <div className="ub-main">
              <div className="ub-title">Przejdź na {nextPlan.name} i odblokuj więcej</div>
              <div className="ub-sub">{UPSELL_BENEFIT[currentPlan]}</div>
            </div>
            <button className="btn accent" onClick={() => choose(nextPlan)}>
              <Icon name="arrowUp" size={15} /> Ulepsz do {nextPlan.name}
            </button>
          </div>
        ) : (
          <div className="allset-banner">
            <span className="as-check"><Icon name="check" size={22} color="#fff" /></span>
            <div>
              <div className="as-title">Masz plan Pro — wszystko odblokowane</div>
              <div className="as-sub">Rezerwacje, kalendarz, mapa stanowisk, CRM, analityka i raporty na całym koncie. Nic nie musisz robić — git.</div>
            </div>
          </div>
        )}

        <div className="hint" style={{ marginBottom: 16 }}>
          <Icon name="card" size={13} /> Plan jest <b>dla całego konta</b> — obejmuje wszystkie Twoje łowiska{fisheriesCount === 0 ? ' (także te, które dopiero przejmiesz)' : ''}.
        </div>

        {/* 3 plany — nieaktywne na zielono (akcent), aktywny ciemnozielony */}
        <div className="grid cols-3" style={{ alignItems: 'stretch' }}>
          {PLANS.map((p) => {
            const current = currentPlan === p.id;
            const price = billing === 'yearly' ? p.yearly : p.monthly;
            const rankP = PLAN_RANK[p.id];
            const isUpgrade = rankP > curRank;
            const isRecommended = !current && rankP === curRank + 1;
            return (
              <div key={p.id} className={`plan-card ${current ? 'active' : ''} ${isRecommended ? 'reco' : ''}`}>
                {current && <span className="plan-flag active"><Icon name="check" size={12} /> Twój aktywny plan</span>}
                {isRecommended && <span className="plan-flag reco"><Icon name="arrowUp" size={12} /> Polecany krok wyżej</span>}
                <div className="plan-name">{p.name}</div>
                <div className="plan-tag">{p.tagline}</div>
                <div className="plan-price">
                  <span className="amt">{price} zł</span>
                  <span className="per">{p.id === 'basic' ? 'na zawsze' : billing === 'yearly' ? '/ rok' : '/ mies.'}</span>
                </div>
                <div className="plan-yearhint">{p.id !== 'basic' && billing === 'yearly' ? `≈ ${Math.round(p.yearly / 12)} zł/mc` : ' '}</div>
                <div className="plan-feats">
                  {p.features.map((f) => (
                    <div key={f.label} className="plan-feat" style={{ color: f.in ? colors.text : colors.textSecondary }}>
                      <Icon name={f.in ? 'check' : 'x'} size={15} color={f.in ? colors.accent : colors.border} />
                      <span style={{ textDecoration: f.in ? 'none' : 'line-through', opacity: f.in ? 1 : 0.65 }}>{f.label}</span>
                    </div>
                  ))}
                </div>
                {current
                  ? <button className="btn plan-active-btn" disabled style={{ width: '100%' }}><Icon name="check" size={15} /> Plan aktywny</button>
                  : p.id === 'basic'
                    ? <button className="btn ghost" style={{ width: '100%' }} onClick={() => choose(p)}>Przejdź na Basic</button>
                    : isUpgrade
                      ? <button className="btn accent" style={{ width: '100%' }} onClick={() => choose(p)}><Icon name="arrowUp" size={15} /> Ulepsz do {p.name}</button>
                      : <button className="btn ghost" style={{ width: '100%' }} onClick={() => choose(p)}>Zmień na {p.name}</button>}
              </div>
            );
          })}
        </div>

        <div className="hint" style={{ marginTop: 16 }}>
          <Icon name="lock" size={13} /> Umowa roczna z rozliczeniem miesięcznym lub rocznym. Płatności w trybie testowym — realny BLIK / Apple Pay / Google Pay / Przelewy24 podłączymy później.
        </div>
      </div>

      {checkout && (
        <CheckoutModal plan={checkout} billing={billing} fisheriesCount={fisheriesCount}
          onClose={() => setCheckout(null)}
          onPaid={async () => { setCheckout(null); await load(); await reloadPlan(); }} />
      )}
    </>
  );
}

function Top({ right }: { right?: string }) {
  return (
    <div className="topbar">
      <div><h1>Subskrypcja</h1><div className="sub">Plan obejmuje całe Twoje konto i wszystkie łowiska</div></div>
      {right && <div className="topbar-right"><div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: colors.textSecondary }}>Koszt konta</div><div style={{ fontSize: 20, fontWeight: 800, color: colors.primary }}>{right}</div></div></div>}
    </div>
  );
}

function CheckoutModal({ plan, billing, fisheriesCount, onClose, onPaid }: {
  plan: PlanDef; billing: Billing; fisheriesCount: number; onClose: () => void; onPaid: () => void;
}) {
  const [method, setMethod] = useState('blik');
  const [phase, setPhase] = useState<'form' | 'paying' | 'done'>('form');
  const amount = billing === 'yearly' ? plan.yearly : plan.monthly;
  const methodLabel = METHODS.find((m) => m.key === method)?.label ?? '';
  const busy = phase !== 'form';
  const pay = async () => {
    setPhase('paying');
    try {
      // Mock PSP: krótka „autoryzacja", potem realny zapis subskrypcji konta w bazie.
      await new Promise((r) => setTimeout(r, 1100));
      await subscribeAccount(plan.id as 'premium' | 'pro', billing);
      setPhase('done');
      await new Promise((r) => setTimeout(r, 1000));
      toast(`Plan ${plan.name} aktywny`, 'success');
      onPaid();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Płatność nieudana', 'error');
      setPhase('form');
    }
  };
  return (
    <div className="modal-back" onClick={busy ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        {phase === 'done' ? (
          <div className="checkout-done">
            <span className="checkout-check"><Icon name="check" size={30} color="#fff" /></span>
            <h3 style={{ marginTop: 14 }}>Plan {plan.name} aktywowany</h3>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 4, textAlign: 'center' }}>Plan obejmuje całe Twoje konto i wszystkie łowiska.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3>Plan {plan.name}</h3>
                  <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>Tryb testowy</span>
                </div>
                <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Całe konto{fisheriesCount > 0 ? ` · ${fisheriesCount} ${fisheriesCount === 1 ? 'łowisko' : 'łowisk'}` : ''} · rozliczenie {billing === 'yearly' ? 'roczne' : 'miesięczne'}</div>
              </div>
              <button className="btn ghost icon" onClick={onClose} disabled={busy}><Icon name="x" size={16} /></button>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label>Wybierz metodę płatności</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {METHODS.map((m) => (
                  <button key={m.key} type="button" disabled={busy} className={`chip ${method === m.key ? 'on' : ''}`} style={{ padding: '12px 14px', justifyContent: 'flex-start' }} onClick={() => setMethod(m.key)}>
                    <Icon name={m.icon} size={16} /> {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F6FAF8', borderRadius: 10, marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>Do zapłaty dziś</span><b style={{ fontSize: 18, color: colors.primary }}>{amount} zł</b>
            </div>
            <div className="hint" style={{ marginBottom: 12 }}><Icon name="lock" size={12} /> Tryb testowy — żadne realne środki nie zostaną pobrane.</div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={onClose} disabled={busy}>Anuluj</button>
              <button className="btn" disabled={busy} onClick={pay}>
                {phase === 'paying'
                  ? <><span className="btn-spin" /> Autoryzacja {methodLabel}…</>
                  : <><Icon name="card" size={15} /> Zapłać {amount} zł</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
