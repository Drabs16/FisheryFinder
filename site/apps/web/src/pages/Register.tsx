import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PANEL_URL } from '../lib/constants';
import Icon from '../components/Icon';

// Telefon PL: zawsze +48, cyfry grupowane po 3 (xxx xxx xxx)
function formatPlPhone(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('48')) d = d.slice(2);
  d = d.slice(0, 9);
  const groups = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean);
  return groups.length ? `+48 ${groups.join(' ')}` : '+48 ';
}
const phoneDigits = (v: string) => v.replace(/\D/g, '').replace(/^48/, '');

export default function Register() {
  const { signUp } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+48 ');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setOk('');
    if (phoneDigits(phone).length !== 9) { setErr('Podaj poprawny numer telefonu (9 cyfr).'); return; }
    if (!name.trim().includes(' ')) { setErr('Podaj imię i nazwisko.'); return; }
    setBusy(true);
    try {
      const { needsConfirm } = await signUp(email.trim(), password, name.trim(), phone.trim(), city.trim());
      if (needsConfirm) setOk('Konto utworzone! Wysłaliśmy link na Twój e-mail — potwierdź adres, aby się zalogować.');
      else nav('/');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Nie udało się utworzyć konta'); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><img src="/logo-fish.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} /></div>
        <h1>Załóż konto wędkarza</h1>
        <div className="muted">Jedno konto — strona i aplikacja mobilna. Rezerwuj łowiska i zapisuj ulubione.</div>
        {err && <div className="notice err">{err}</div>}
        {ok && <div className="notice ok">{ok}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Imię i nazwisko *</label>
            <div className="input-ic"><span className="iic"><Icon name="user" size={17} /></span>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Kowalski" autoComplete="name" /></div></div>
          <div className="field"><label>E-mail *</label>
            <div className="input-ic"><span className="iic"><Icon name="mail" size={17} /></span>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@email.pl" autoComplete="email" /></div>
            <div className="hint-sm">Wyślemy link potwierdzający — bez tego nie zalogujesz się.</div></div>
          <div className="field"><label>Telefon *</label>
            <div className="input-ic"><span className="iic"><Icon name="phone" size={17} /></span>
              <input className="input" required value={phone} inputMode="numeric"
                onChange={(e) => setPhone(formatPlPhone(e.target.value))}
                onFocus={(e) => { if (!phone.trim() || phone === '+48 ') e.currentTarget.setSelectionRange(4, 4); }}
                placeholder="+48 600 100 200" autoComplete="tel" /></div></div>
          <div className="field"><label>Miasto *</label>
            <div className="input-ic"><span className="iic"><Icon name="pin" size={17} /></span>
              <input className="input" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="np. Kraków" autoComplete="address-level2" /></div></div>
          <div className="field"><label>Hasło *</label>
            <div className="input-ic"><span className="iic"><Icon name="lock" size={17} /></span>
              <input className="input has-toggle" type={showPw ? 'text' : 'password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min. 6 znaków" autoComplete="new-password" />
              <button type="button" className="input-eye" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Ukryj hasło' : 'Pokaż hasło'}><Icon name={showPw ? 'eyeOff' : 'eye'} size={17} /></button>
            </div></div>
          <button className="btn block" disabled={busy}>{busy ? 'Tworzenie…' : 'Załóż konto'}</button>
        </form>
        <div className="switch">Masz już konto? <Link to="/login">Zaloguj się</Link></div>
        <div className="switch" style={{ marginTop: 6 }}>Masz łowisko? <a href={`${PANEL_URL}/register`}>Konto dla właścicieli</a></div>
      </div>
    </div>
  );
}
