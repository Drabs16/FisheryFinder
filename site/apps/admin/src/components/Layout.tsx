import { Fragment, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon, { type IconName } from './Icon';

const navGroups: { title?: string; items: { to: string; label: string; icon: IconName; end?: boolean }[] }[] = [
  { items: [{ to: '/', label: 'Pulpit', icon: 'chart', end: true }] },
  { title: 'Katalog', items: [
    { to: '/lowiska', label: 'Łowiska', icon: 'waves' },
    { to: '/poi', label: 'POI — sklepy i PZW', icon: 'pin' },
    { to: '/jakosc', label: 'Jakość danych', icon: 'layers' },
  ] },
  { title: 'Operacje', items: [
    { to: '/rezerwacje', label: 'Rezerwacje', icon: 'list' },
    { to: '/wnioski', label: 'Wnioski o dostęp', icon: 'key' },
    { to: '/uzytkownicy', label: 'Użytkownicy', icon: 'users' },
  ] },
  { title: 'Społeczność', items: [
    { to: '/opinie', label: 'Opinie', icon: 'star' },
    { to: '/polowy', label: 'Połowy', icon: 'fish' },
    { to: '/ogloszenia', label: 'Ogłoszenia', icon: 'bell' },
  ] },
  { title: 'System', items: [
    { to: '/ustawienia', label: 'Ustawienia', icon: 'settings' },
  ] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const email = user?.email ?? '';
  const name = email.split('@')[0] || 'Admin';
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark"><img src="/logo-fish.png" alt="Fishery Finder" width={26} height={26} /></div>
          <div className="word">FISHERY <span>FINDER</span><small>ADMIN</small></div>
        </div>

        <nav className="nav">
          {navGroups.map((g, gi) => (
            <Fragment key={gi}>
              {g.title && <div className="nav-section">{g.title}</div>}
              {g.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                  <Icon name={n.icon} size={18} />
                  <span className="lbl">{n.label}</span>
                </NavLink>
              ))}
            </Fragment>
          ))}
        </nav>

        <div className="plan-card" style={{ display: 'block' }}>
          <div className="tier">Konto administratora</div>
          <div className="meta">Zarządzasz katalogiem łowisk, użytkownikami, wnioskami i opiniami</div>
        </div>

        <div className="userbox">
          <div className="userbox-link">
            <div className="ava">{initials}</div>
            <div className="who"><div className="nm">{name}</div><div className="rl">Administrator</div></div>
          </div>
          <button className="lo" title="Wyloguj" onClick={() => signOut()}><Icon name="logout" size={17} /></button>
        </div>
      </aside>

      <div className="main">
        <div className="route-view" key={location.pathname}>{children}</div>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} Fishery Finder · Panel administratora</span>
        </footer>
      </div>
    </div>
  );
}
