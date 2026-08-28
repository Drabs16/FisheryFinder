import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PROVINCES } from '../lib/types';
import Select from '../components/Select';
import Icon from '../components/Icon';

export default function Register() {
  const { signUp } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [business, setBusiness] = useState('');
  const [nip, setNip] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!accepted) { setErr('Aby założyć konto, zaakceptuj Regulamin i Politykę prywatności.'); return; }
    setErr(''); setOk(''); setBusy(true);
    try {
      const { needsConfirm } = await signUp(email.trim(), password, name.trim(), phone.trim(), business.trim(), nip.trim(), city.trim(), province);
      if (needsConfirm) {
        setOk('Konto zostało utworzone. Potwierdź adres e-mail, aby się zalogować.');
      } else {
        nav('/');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Nie udało się utworzyć konta');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <AuthLogo />
        <div>
          <h2>Konto właściciela łowiska.</h2>
          <p>Zarządzaj łowiskiem z poziomu jednego panelu: rezerwacje online, kalendarz stanowisk, baza klientów i analityka.</p>
          <ul>
            <li><span className="tick">✓</span> Obecność wśród wędkarzy przez całą dobę</li>
            <li><span className="tick">✓</span> Konfiguracja łowiska w planie Basic bez opłat</li>
            <li><span className="tick">✓</span> Plany Premium i Pro w rozliczeniu miesięcznym lub rocznym</li>
          </ul>
        </div>
        <div className="auth-side-foot">biznes.fisheryfinder.pl</div>
      </div>
      <div className="auth-form-side">
        <form className="auth-card auth-card-wide" onSubmit={submit}>
          <h1>Załóż konto</h1>
          <div className="muted">Utwórz konto właściciela i skonfiguruj swoje łowisko.</div>
          {err && <div className="notice err">{err}</div>}
          {ok && <div className="notice ok">{ok}</div>}

          <div className="auth-section">Dane kontaktowe</div>
          <div className="field">
            <label>Imię i nazwisko lub osoba kontaktowa</label>
            <input className="input" value={name} required onChange={(e) => setName(e.target.value)} placeholder="Jan Kowalski" />
          </div>
          <div className="grid2">
            <div className="field">
              <label>Adres e-mail</label>
              <input className="input" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} placeholder="biuro@lowisko.pl" />
            </div>
            <div className="field">
              <label>Telefon</label>
              <input className="input" value={phone} required onChange={(e) => setPhone(e.target.value)} placeholder="+48 600 100 200" />
            </div>
          </div>

          <div className="auth-section">Dane firmy</div>
          <div className="field">
            <label>Nazwa firmy</label>
            <input className="input" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="np. Łowisko Borowa Sp. z o.o." />
          </div>
          <div className="grid2">
            <div className="field">
              <label>NIP</label>
              <input className="input" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="1234567890" />
            </div>
            <div className="field">
              <label>Miejscowość</label>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="np. Borowa" />
            </div>
          </div>
          <div className="field">
            <label>Województwo</label>
            <Select value={province} onChange={setProvince} icon="pin" width="100%" placeholder="Wybierz województwo"
              options={PROVINCES.map((p) => ({ value: p, label: p }))} />
          </div>

          <div className="auth-section">Bezpieczeństwo</div>
          <div className="field">
            <label>Hasło</label>
            <input className="input" type="password" value={password} required minLength={6}
              onChange={(e) => setPassword(e.target.value)} placeholder="Co najmniej 6 znaków" />
          </div>

          <div className="auth-check">
            <button type="button" className={`acheck-box ${accepted ? 'on' : ''}`} aria-pressed={accepted}
              onClick={() => setAccepted((v) => !v)}>
              {accepted && <Icon name="check" size={13} color="#fff" />}
            </button>
            <span>Akceptuję <Link to="/regulamin" target="_blank">Regulamin</Link> oraz <Link to="/polityka-prywatnosci" target="_blank">Politykę prywatności</Link>.</span>
          </div>

          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Tworzenie konta…' : 'Załóż konto'}
          </button>
          <div className="switch">Masz już konto? <Link to="/login">Zaloguj się</Link></div>
          <AuthFooter />
        </form>
      </div>
    </div>
  );
}

// Lockup marki na ekranach logowania/rejestracji — „BIZNES" pod napisem FISHERY FINDER.
export function AuthLogo() {
  return (
    <div className="auth-logo">
      <span className="auth-logo-mark"><img src="/logo-fish.png" alt="Fishery Finder" width={30} height={30} /></span>
      <span className="auth-logo-text">
        <span className="auth-logo-name">FISHERY <span>FINDER</span></span>
        <span className="auth-logo-sub">BIZNES</span>
      </span>
    </div>
  );
}

export function AuthFooter() {
  return (
    <div className="auth-foot">
      © {new Date().getFullYear()} Fishery Finder · <Link to="/regulamin">Regulamin</Link> · <Link to="/polityka-prywatnosci">Polityka prywatności</Link>
    </div>
  );
}
