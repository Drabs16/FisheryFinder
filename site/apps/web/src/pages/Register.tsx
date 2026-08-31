import { useEffect, useState, type FormEvent } from 'react';
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
  const { signUp, resendConfirmation } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+48 ');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  // Po rejestracji wymagającej potwierdzenia — pokazujemy ekran „Sprawdź skrzynkę"
  const [sent, setSent] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('');
    if (phoneDigits(phone).length !== 9) { setErr('Podaj poprawny numer telefonu (9 cyfr).'); return; }
    if (!name.trim().includes(' ')) { setErr('Podaj imię i nazwisko.'); return; }
    if (!agree) { setErr('Zaakceptuj Regulamin i Politykę prywatności, aby założyć konto.'); return; }
    setBusy(true);
    try {
      const { needsConfirm } = await signUp(email.trim(), password, name.trim(), phone.trim(), city.trim());
      if (needsConfirm) { setSent(email.trim()); setCooldown(45); }
      else nav('/');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Nie udało się utworzyć konta'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const resend = async () => {
    if (!sent || cooldown > 0 || resendBusy) return;
    setResendBusy(true); setResendMsg('');
    try { await resendConfirmation(sent); setResendMsg('Wysłaliśmy link jeszcze raz. Sprawdź skrzynkę (i folder spam).'); setCooldown(45); }
    catch (e) { setResendMsg(e instanceof Error ? e.message : 'Nie udało się wysłać ponownie.'); }
    finally { setResendBusy(false); }
  };

  // Ekran po rejestracji — „Sprawdź skrzynkę"
  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--ff-green-50)', display: 'grid', placeItems: 'center' }}>
              <Icon name="mail" size={28} color="var(--ff-primary)" />
            </span>
          </div>
          <h1>Sprawdź swoją skrzynkę</h1>
          <div className="muted">Wysłaliśmy link potwierdzający na adres<br /><b style={{ color: 'var(--ff-text)' }}>{sent}</b>. Kliknij go, aby aktywować konto i się zalogować.</div>
          <div className="notice" style={{ marginTop: 16, textAlign: 'left' }}>
            <Icon name="fish" size={15} color="var(--ff-primary)" /> Nie widzisz maila? Zajrzyj do folderu <b>spam</b> — czasem tam trafia.
          </div>
          {resendMsg && <div className="notice ok" style={{ marginTop: 12 }}>{resendMsg}</div>}
          <button className="btn block" style={{ marginTop: 16 }} onClick={resend} disabled={cooldown > 0 || resendBusy}>
            {resendBusy ? 'Wysyłanie…' : cooldown > 0 ? `Wyślij ponownie (${cooldown}s)` : 'Wyślij link ponownie'}
          </button>
          <div className="switch" style={{ marginTop: 12 }}>Adres wpisany błędnie? <button type="button" onClick={() => { setSent(null); setResendMsg(''); }} style={{ background: 'none', border: 'none', color: 'var(--ff-primary)', fontWeight: 700, cursor: 'pointer', padding: 0, font: 'inherit' }}>Popraw dane</button></div>
          <div className="switch" style={{ marginTop: 6 }}>Potwierdziłeś już konto? <Link to="/login">Zaloguj się</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><img src="/logo-fish.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} /></div>
        <h1>Załóż konto wędkarza</h1>
        <div className="muted">Jedno konto — strona i aplikacja mobilna. Rezerwuj łowiska i zapisuj ulubione.</div>
        {err && <div className="notice err">{err}</div>}
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
          <label className="rodo-check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>Akceptuję <Link to="/regulamin" target="_blank">Regulamin</Link> i <Link to="/polityka-prywatnosci" target="_blank">Politykę prywatności</Link> (RODO).</span>
          </label>
          <button className="btn block" disabled={busy || !agree}>{busy ? 'Tworzenie…' : 'Załóż konto'}</button>
        </form>
        <div className="switch">Masz już konto? <Link to="/login">Zaloguj się</Link></div>
        <div className="switch" style={{ marginTop: 6 }}>Masz łowisko? <a href={`${PANEL_URL}/register`}>Konto dla właścicieli</a></div>
      </div>
    </div>
  );
}
