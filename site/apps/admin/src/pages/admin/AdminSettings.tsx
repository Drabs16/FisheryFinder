import { useEffect, useState } from 'react';
import { adminGetSettings, adminSetSetting, adminListAdmins, adminAddAdmin, adminRemoveAdmin, type AdminAdmin } from '../../lib/api';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/Confirm';
import Loader from '../../components/Loader';
import Icon from '../../components/Icon';
import { colors } from '../../theme';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

type SettingsForm = {
  commission_pct: number;
  plan_premium_month: number;
  plan_premium_year: number;
  plan_pro_month: number;
  plan_pro_year: number;
};

const FIELDS: { key: keyof SettingsForm; label: string }[] = [
  { key: 'commission_pct', label: 'Prowizja (%)' },
  { key: 'plan_premium_month', label: 'Premium — miesięcznie (zł)' },
  { key: 'plan_premium_year', label: 'Premium — rocznie (zł)' },
  { key: 'plan_pro_month', label: 'Pro — miesięcznie (zł)' },
  { key: 'plan_pro_year', label: 'Pro — rocznie (zł)' },
];

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<SettingsForm>({ commission_pct: 0, plan_premium_month: 0, plan_premium_year: 0, plan_pro_month: 0, plan_pro_year: 0 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [admins, setAdmins] = useState<AdminAdmin[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([adminGetSettings(), adminListAdmins()])
      .then(([settings, list]) => {
        setForm({
          commission_pct: Number(settings.commission_pct ?? 0),
          plan_premium_month: Number(settings.plan_premium_month ?? 0),
          plan_premium_year: Number(settings.plan_premium_year ?? 0),
          plan_pro_month: Number(settings.plan_pro_month ?? 0),
          plan_pro_year: Number(settings.plan_pro_year ?? 0),
        });
        setAdmins(list);
      })
      .catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const reloadAdmins = () => {
    adminListAdmins().then(setAdmins).catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error'));
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      for (const { key } of FIELDS) await adminSetSetting(key, Number(form[key]));
      toast('Zapisano', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Błąd', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const addAdmin = async () => {
    const email = newEmail.trim();
    if (!email.includes('@')) { toast('Podaj poprawny adres e-mail', 'error'); return; }
    setAddingAdmin(true);
    try {
      await adminAddAdmin(email);
      setNewEmail('');
      toast('Dodano administratora', 'success');
      reloadAdmins();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Błąd', 'error');
    } finally {
      setAddingAdmin(false);
    }
  };

  const removeAdmin = async (a: AdminAdmin) => {
    if (!(await confirmDialog({ title: 'Odebrać dostęp?', message: `Administrator ${a.email} straci dostęp do panelu. Możesz go dodać ponownie w każdej chwili.`, confirmLabel: 'Odbierz dostęp', danger: true }))) return;
    setRemoving(a.email);
    try {
      await adminRemoveAdmin(a.email);
      toast('Odebrano dostęp', 'success');
      reloadAdmins();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Błąd', 'error');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Ustawienia <span className="admin-badge">ADMIN</span></h1><div className="sub">Konfiguracja platformy i dostęp administratorów</div></div>
      </div>

      <div className="content">
        {loading ? <Loader label="Wczytywanie ustawień…" /> : (
          <>
            <div className="card">
              <div className="card-head"><div className="card-title"><span className="ico"><Icon name="settings" size={18} /></span> Ustawienia platformy</div></div>

              <div className="row">
                {FIELDS.slice(0, 2).map(({ key, label }) => (
                  <div className="field" key={key} style={{ flex: 1 }}>
                    <label>{label}</label>
                    <input className="input" type="number" min={0} value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>
              <div className="row">
                {FIELDS.slice(2, 4).map(({ key, label }) => (
                  <div className="field" key={key} style={{ flex: 1 }}>
                    <label>{label}</label>
                    <input className="input" type="number" min={0} value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>
              <div className="row">
                {FIELDS.slice(4).map(({ key, label }) => (
                  <div className="field" key={key} style={{ flex: 1 }}>
                    <label>{label}</label>
                    <input className="input" type="number" min={0} value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: Number(e.target.value) }))} />
                  </div>
                ))}
                <div className="field" style={{ flex: 1 }} />
              </div>

              <button className="btn" style={{ marginTop: 4 }} disabled={savingSettings} onClick={saveSettings}>
                {savingSettings ? 'Zapisywanie…' : 'Zapisz ustawienia'}
              </button>
              <div className="hint" style={{ marginTop: 12 }}>Prowizja wpływa na wyliczenia w analityce. Ceny planów są poglądowe (płatności w trybie testowym).</div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title"><span className="ico"><Icon name="key" size={18} /></span> Administratorzy</div></div>

              {admins.length === 0 ? (
                <div className="muted" style={{ padding: '8px 0' }}>Brak administratorów.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {admins.map((a) => (
                    <div key={a.email} className="row" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {a.email}
                          {a.is_self && <span className="badge" style={{ background: colors.accentSoft, color: colors.primary }}>Ty</span>}
                        </div>
                        <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>ostatnie logowanie: {fmtDate(a.last_sign_in)}</div>
                      </div>
                      {!a.is_self && (
                        <button className="btn ghost sm" disabled={removing === a.email} onClick={() => removeAdmin(a)}>
                          <Icon name="trash" size={13} /> Odbierz dostęp
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="row" style={{ marginTop: 14, alignItems: 'flex-end' }}>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>E-mail administratora</label>
                  <input className="input" type="email" value={newEmail} placeholder="admin@fisheryfinder.pl"
                    onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addAdmin(); }} />
                </div>
                <button className="btn" disabled={addingAdmin} onClick={addAdmin}>
                  <Icon name="plus" size={14} /> {addingAdmin ? 'Dodawanie…' : 'Dodaj admina'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
