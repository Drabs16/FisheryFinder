import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
        <div className="logo-lg"><img src="/logo-fish.png" alt="" width={30} height={30} /> FISHERY <span>FINDER</span> · Admin</div>
        <div>
          <h2>Panel administratora</h2>
          <p>Wewnętrzne centrum zarządzania Fishery Finder — katalog łowisk, użytkownicy, wnioski o dostęp i moderacja opinii.</p>
          <ul>
            <li><span className="tick">✓</span> Katalog wszystkich łowisk i kody dostępu</li>
            <li><span className="tick">✓</span> Weryfikacja wniosków właścicieli</li>
            <li><span className="tick">✓</span> Użytkownicy, subskrypcje i moderacja</li>
          </ul>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>admin.fisheryfinder.pl · dostęp tylko dla administratorów</div>
      </div>
      <div className="auth-form-side">
        <form className="auth-card" onSubmit={submit}>
          <h1>Zaloguj się</h1>
          <div className="muted">Logowanie do panelu administratora.</div>
          {err && <div className="notice err">{err}</div>}
          <div className="field">
            <label>E-mail</label>
            <input className="input" type="email" value={email} required
              onChange={(e) => setEmail(e.target.value)} placeholder="admin@fisheryfinder.pl" />
          </div>
          <div className="field">
            <label>Hasło</label>
            <input className="input" type="password" value={password} required
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Logowanie…' : 'Zaloguj się'}
          </button>
        </form>
      </div>
    </div>
  );
}
