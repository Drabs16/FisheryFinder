import { Link } from 'react-router-dom';
import Icon from './Icon';
import { colors } from '../theme';
import { planById, type PlanId } from '../lib/plans';

// Zasłona dla funkcji wymagających wyższego planu.
export default function PlanUpsell({ plan, title, sub, feature, benefit }: {
  plan: Exclude<PlanId, 'basic'>; title: string; sub: string; feature: string; benefit: string;
}) {
  const p = planById(plan);
  return (
    <>
      <div className="topbar"><div><h1>{title}</h1><div className="sub">{sub}</div></div></div>
      <div className="content">
        <div className="card empty" style={{ maxWidth: 580, margin: '24px auto' }}>
          <div className="big" style={{ background: colors.primary, color: '#fff' }}><Icon name="sparkles" size={26} /></div>
          <h3>{feature} czeka w planie {p.name}</h3>
          <p style={{ margin: '8px 0 18px', maxWidth: 440 }}>{benefit} Odblokuj to w planie <b>{p.name} — {p.monthly} zł/mc</b>.</p>
          <Link className="btn accent" to="/subskrypcja"><Icon name="sparkles" size={16} /> Wybierz plan {p.name}</Link>
        </div>
      </div>
    </>
  );
}
