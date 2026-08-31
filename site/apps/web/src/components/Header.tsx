import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInvites } from '../context/InvitesContext';
import Icon, { type IconName } from './Icon';
import NotificationsBell from './NotificationsBell';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Łowiska', icon: 'list', end: true },
  { to: '/mapa', label: 'Mapa', icon: 'map' },
  { to: '/ulubione', label: 'Ulubione', icon: 'heart' },
  { to: '/rezerwacje', label: 'Rezerwacje', icon: 'calendar' },
  { to: '/polowy', label: 'Połowy', icon: 'trophy' },
];

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const { count: inviteCount } = useInvites();
  const nav = useNavigate();
  const name = (profile?.name || (user?.user_metadata?.name as string) || user?.email?.split('@')[0] || '').trim();
  const initials = name ? name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase() : 'JA';

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--ff-primary)', height: 'var(--ff-header-height)', display: 'flex', alignItems: 'center' }}>
      <div className="ff-hdr-inner" style={{ width: '100%', maxWidth: 'var(--ff-container)', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 22 }}>
        <Link to="/" className="brand">
          <img src="/logo-fish.png" alt="" />
          <span><span className="g">FISHERY </span><span className="w">FINDER</span></span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }} className="ff-hdr-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              style={({ isActive }) => ({
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 'var(--ff-radius-pill)',
                fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.74)',
                background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
                transition: 'background var(--ff-dur-fast), color var(--ff-dur-fast)',
              })}>
              <Icon name={n.icon} size={17} /> <span className="ff-hdr-lbl">{n.label}</span>
              {n.to === '/polowy' && inviteCount > 0 && <span className="hdr-badge">{inviteCount}</span>}
            </NavLink>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {user ? (
            <>
              <NotificationsBell />
              <Link to="/profil" aria-label="Profil" style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--ff-accent)', color: 'var(--ff-primary)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14 }}>{initials}</Link>
              <button onClick={async () => { await signOut(); nav('/'); }}
                style={{ padding: '9px 16px', borderRadius: 'var(--ff-radius-pill)', border: '1px solid rgba(255,255,255,0.28)', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Wyloguj</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hdr-login" style={{ padding: '9px 16px', borderRadius: 'var(--ff-radius-pill)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', fontWeight: 700, fontSize: 14 }}>Zaloguj</Link>
              <Link to="/rejestracja" className="hdr-signup" style={{ padding: '10px 18px', borderRadius: 'var(--ff-radius-pill)', background: 'var(--ff-accent)', color: 'var(--ff-primary)', fontWeight: 800, fontSize: 14 }}>Załóż konto</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
