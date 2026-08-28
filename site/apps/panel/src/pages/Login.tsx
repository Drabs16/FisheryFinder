import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthFooter, AuthLogo } from './Register';

export default function Login() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await signIn(email.trim(), password);
      nav('/');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Nie udało się zalogować');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <AuthLogo />
        <div>
          <h2>Panel właściciela łowiska.</h2>
          <p>Zarządzaj łowiskiem w jednym miejscu: rezerwacje online, kalendarz stanowisk w czasie rzeczywistym, baza klientów i analityka.</p>
          <ul>
            <li><span className="tick">✓</span> Koniec z overbookingiem i telefonem</li>
            <li><span className="tick">✓</span> Rezerwacje wpadają same — także w nocy</li>
            <li><span className="tick">✓</span> Wiesz, co i kiedy zarabia najlepiej</li>
          </ul>
        </div>
        <div className="auth-side-foot">biznes.fisheryfinder.pl</div>
      </div>
      <div className="auth-form-side">
        <form className="auth-card" onSubmit={submit}>
          <h1>Zaloguj się</h1>
          <div className="muted">Witaj ponownie w panelu właściciela.</div>
          {err && <div className="notice err">{err}</div>}
          <div className="field">
            <label>E-mail</label>
            <input className="input" type="email" value={email} required
              onChange={(e) => setEmail(e.target.value)} placeholder="twoj@email.pl" />
          </div>
          <div className="field">
            <label>Hasło</label>
            <input className="input" type="password" value={password} required
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Logowanie…' : 'Zaloguj się'}
          </button>
          <div className="switch">Nie masz konta? <Link to="/register">Załóż konto biznes</Link></div>
          <AuthFooter />
        </form>
      </div>
    </div>
  );
}
