import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProfile, saveProfile, fetchAccountSubscription } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PLANS } from '../lib/plans';
import type { AccountSub } from '../lib/types';
import Icon from '../components/Icon';
import { toast } from '../components/Toast';
import { colors } from '../theme';
import Loader from '../components/Loader';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' }) : '—');

export default function Account() {
  const { user, isAdmin } = useAuth();
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [nip, setNip] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sub, setSub] = useState<AccountSub | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([fetchProfile(), fetchAccountSubscription().catch(() => null)]);
        setName(p?.name ?? ''); setBusiness(p?.business_name ?? ''); setNip(p?.nip ?? '');
        setPhone(p?.phone ?? ''); setEmail(p?.email ?? user?.email ?? '');
        setSub(s);
      } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line
  }, []);

  const save = async () => {
    setBusy(true);
    try { await saveProfile({ name, business_name: business, nip, phone }); toast('Zapisano dane konta', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Nie udało się zapisać', 'error'); }
    finally { setBusy(false); }
  };

  const planDef = PLANS.find((p) => p.id === (sub?.plan ?? 'basic')) ?? PLANS[0];
  const isPaid = !!sub && sub.plan !== 'basic';
  const cost = isPaid ? (sub!.billing === 'yearly' ? `${planDef.yearly} zł / rok` : `${planDef.monthly} zł / mc`) : 'za darmo';

  return (
    <>
      <div className="topbar"><div><h1>Twoje konto</h1><div className="sub">Dane firmy, plan i rozliczenia Twojego konta</div></div></div>
      <div className="content">
        {loading ? <Loader label="Wczytywanie danych…" /> : (
          <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Plan i rozliczenia */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}><span className="ico"><Icon name="card" size={18} /></span> Plan i rozliczenia</div>
              {isAdmin ? (
                <div className="acct-bill"><div className="acct-plan"><span className="acct-plan-name">Administrator</span></div><div className="muted" style={{ fontSize: 13 }}>Konto administratora — pełny dostęp, bez subskrypcji.</div></div>
              ) : (
                <>
                  <div className="acct-bill">
                    <div className="acct-plan">
                      <span className="acct-plan-name">Plan {planDef.name}</span>
                      <span className={`acct-plan-badge ${isPaid ? 'on' : ''}`}>{isPaid ? <><Icon name="check" size={12} /> Aktywny</> : 'Bezpłatny'}</span>
                    </div>
                    <div className="acct-cost">{cost}</div>
                  </div>
                  <div className="acct-rows">
                    {isPaid ? (
                      <>
                        <Row label="Rozliczenie" value={sub!.billing === 'yearly' ? 'Roczne' : 'Miesięczne'} />
                        <Row label="Aktywny od" value={fmtDate(sub!.created_at)} />
                        <Row label="Opłacony do / odnowienie" value={fmtDate(sub!.current_period_end)} />
                        <Row label="Zakres" value="Całe konto — wszystkie Twoje łowiska" />
                      </>
                    ) : (
                      <div className="muted" style={{ fontSize: 13.5, padding: '4px 0' }}>Plan Basic — łowiska widoczne w katalogu, bez rezerwacji online. Wykup Premium lub Pro, aby włączyć rezerwacje i CRM na całym koncie.</div>
                    )}
                  </div>
                  <div className="row" style={{ marginTop: 14 }}>
                    <Link className={`btn ${isPaid ? 'ghost' : 'accent'}`} to="/subskrypcja"><Icon name="card" size={15} /> {isPaid ? 'Zarządzaj subskrypcją' : 'Wybierz plan'}</Link>
                  </div>
                </>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 14 }}><span className="ico"><Icon name="users" size={18} /></span> Osoba kontaktowa</div>
                <div className="row">
                  <div className="field" style={{ flex: 1 }}><label>Imię i nazwisko</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Kowalski" /></div>
                  <div className="field" style={{ flex: 1 }}><label>Telefon</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48…" /></div>
                </div>
                <div className="field"><label>E-mail (logowanie)</label><input className="input" value={email} disabled style={{ opacity: 0.7 }} /></div>
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 14 }}><span className="ico"><Icon name="card" size={18} /></span> Dane firmy</div>
                <div className="hint" style={{ marginBottom: 12 }}>Potrzebne do faktur i weryfikacji własności łowiska. Możesz uzupełnić później.</div>
                <div className="field"><label>Nazwa firmy</label><input className="input" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="np. Łowisko Borowa Sp. z o.o." /></div>
                <div className="field"><label>NIP</label><input className="input" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="np. 1234567890" /></div>
              </div>

              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="muted" style={{ fontSize: 13 }}><Icon name="lock" size={13} color={colors.textSecondary} /> {isAdmin ? 'Konto administratora' : 'Konto właściciela'}</span>
                <button className="btn" disabled={busy}><Icon name="check" size={16} /> {busy ? 'Zapisywanie…' : 'Zapisz zmiany'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="acct-row">
      <span className="acct-row-l">{label}</span>
      <span className="acct-row-v">{value}</span>
    </div>
  );
}
