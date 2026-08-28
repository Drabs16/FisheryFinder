import { type ReactNode } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { planById } from '../lib/plans';
import Icon, { type IconName } from './Icon';
import { useNotifications } from '../lib/useNotifications';

function PlanCard() {
  const { effectivePlan, loading } = usePlan();
  const p = planById(effectivePlan);
  return (
    <Link to="/subskrypcja" className="side-plan" style={{ textDecoration: 'none' }}>
      <div className="tier">Plan {p.name}</div>
      <div className="meta">
        {loading ? '…' : effectivePlan === 'basic'
          ? <>Bez rezerwacji online · <b>Ulepsz →</b></>
          : <><b>{p.monthly} zł/mies</b> · Aktywny<br />Zarządzaj planem →</>}
      </div>
    </Link>
  );
}

type NavItem = { to: string; label: string; icon: IconName; end?: boolean; need?: 'premium' | 'pro'; badge?: boolean };
const navGroups: { title?: string; items: NavItem[] }[] = [
  { items: [
    { to: '/', label: 'Pulpit', icon: 'dashboard', end: true },
    { to: '/powiadomienia', label: 'Powiadomienia', icon: 'bell', badge: true },
  ] },
  { title: 'Łowisko', items: [
    { to: '/lowiska', label: 'Moje łowiska', icon: 'waves' },
    { to: '/kalendarz', label: 'Kalendarz', icon: 'calendar', need: 'premium' },
    { to: '/rezerwacje', label: 'Rezerwacje', icon: 'list', need: 'premium' },
  ] },
  { title: 'Społeczność', items: [
    { to: '/polowy', label: 'Połowy', icon: 'trophy', need: 'premium' },
    { to: '/opinie', label: 'Opinie', icon: 'star' },
  ] },
  { title: 'Biznes', items: [
    { to: '/klienci', label: 'Klienci', icon: 'users', need: 'pro' },
    { to: '/analityka', label: 'Analityka', icon: 'chart', need: 'pro' },
    { to: '/raporty', label: 'Raporty', icon: 'image', need: 'pro' },
  ] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { effectivePlan } = usePlan();
  const { unread } = useNotifications();
  const location = useLocation();
  const rank = { basic: 0, premium: 1, pro: 2 };
  const email = user?.email ?? '';
  const name = (user?.user_metadata?.name as string) || email.split('@')[0] || 'Właściciel';
  const initials = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark"><img src="/logo-fish.png" alt="Fishery Finder" width={26} height={26} /></div>
          <div className="word">FISHERY <span>FINDER</span><small>BIZNES</small></div>
        </div>

        <nav className="nav">
          {navGroups.map((g, gi) => (
            <div className="nav-group" key={gi}>
              {g.title && <div className="nav-section">{g.title}</div>}
              {g.items.map((n) => {
                const locked = !!n.need && rank[effectivePlan] < rank[n.need];
                return (
                  <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `${isActive ? 'active' : ''}${locked ? ' locked' : ''}`}>
                    <Icon name={n.icon} size={18} />
                    <span className="lbl">{n.label}</span>
                    {n.badge && unread > 0 && <span className="nav-badge">{unread}</span>}
                    {locked && <Icon name="lock" size={13} />}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>


        <PlanCard />

        <div className="userbox">
          <Link to="/konto" className="userbox-link" title="Twoje konto">
            <div className="ava">{initials}</div>
            <div className="who">
              <div className="nm">{name}</div>
              <div className="rl">Twoje konto →</div>
            </div>
          </Link>
          <button className="lo" title="Wyloguj" onClick={() => signOut()}><Icon name="logout" size={17} /></button>
        </div>
      </aside>

      <div className="main">
        <div className="route-view" key={location.pathname}>{children}</div>
        <footer className="app-footer">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="foot-logo">
                <span className="foot-mark"><img src="/logo-fish.png" alt="Fishery Finder" width={24} height={24} /></span>
                <span className="foot-word">FISHERY <b>FINDER</b><small>BIZNES</small></span>
              </div>
              <p className="foot-desc">Panel właściciela łowiska — rezerwacje online, kalendarz, baza klientów i analityka. Wszystko w jednym miejscu.</p>
            </div>
            <div className="foot-col">
              <div className="foot-h">Panel</div>
              <Link to="/">Pulpit</Link>
              <Link to="/lowiska">Moje łowiska</Link>
              <Link to="/rezerwacje">Rezerwacje</Link>
              <Link to="/subskrypcja">Subskrypcja</Link>
            </div>
            <div className="foot-col">
              <div className="foot-h">Wsparcie</div>
              <a href="mailto:kontakt@fisheryfinder.pl">Kontakt</a>
              <a href="https://fisheryfinder.pl" target="_blank" rel="noreferrer">Strona dla wędkarzy</a>
              <Link to="/konto">Twoje konto</Link>
            </div>
            <div className="foot-col">
              <div className="foot-h">Prawne</div>
              <Link to="/regulamin">Regulamin</Link>
              <Link to="/polityka-prywatnosci">Polityka prywatności</Link>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} Fishery Finder · Wszelkie prawa zastrzeżone</span>
            <a href="https://biznes.fisheryfinder.pl" target="_blank" rel="noreferrer">biznes.fisheryfinder.pl</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
