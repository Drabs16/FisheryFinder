import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function Login() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await signIn(email.trim(), password); nav(loc.state?.from ?? '/'); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Nie udało się zalogować'); setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><img src="/logo-fish.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} /></div>
        <h1>Zaloguj się</h1>
        <div className="muted">To samo konto co w aplikacji Fishery Finder.</div>
        {err && <div className="notice err">{err}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>E-mail</label>
            <div className="input-ic">
              <span className="iic"><Icon name="mail" size={17} /></span>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@email.pl" autoComplete="email" />
            </div>
          </div>
          <div className="field"><label>Hasło</label>
            <div className="input-ic">
              <span className="iic"><Icon name="lock" size={17} /></span>
              <input className="input has-toggle" type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Twoje hasło" autoComplete="current-password" />
              <button type="button" className="input-eye" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Ukryj hasło' : 'Pokaż hasło'}>
                <Icon name={showPw ? 'eyeOff' : 'eye'} size={17} />
              </button>
            </div>
          </div>
          <button className="btn block" disabled={busy}>{busy ? 'Logowanie…' : 'Zaloguj się'}</button>
        </form>
        <div className="switch">Nie masz konta? <Link to="/rejestracja">Załóż konto</Link></div>
      </div>
    </div>
  );
}
