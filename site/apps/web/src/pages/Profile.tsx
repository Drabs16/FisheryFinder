import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Icon, { type IconName } from '../components/Icon';
import { pageWrap, h1Style, subStyle, primaryBtnInline, Gate } from './MyCatches';

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);

  if (!user) return <Gate icon="user" title="Zaloguj się, aby zobaczyć profil" desc="Konto jest wspólne z aplikacją Fishery Finder." from="/profil" />;

  const name = profile?.name || (user.user_metadata?.name as string) || 'Wędkarz';
  const phone = profile?.phone || '';
  const city = profile?.city || '';
  const province = profile?.province || '';
  const initials = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  const shortcut = (icon: IconName, label: string, to: string) => (
    <button onClick={() => nav(to)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'var(--ff-surface)', border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-lg)', boxShadow: 'var(--ff-shadow-sm)' }}>
      <Icon name={icon} size={20} color="var(--ff-accent)" />
      <span style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>{label}</span>
      <Icon name="chevronRight" size={18} color="var(--ff-text-tertiary)" />
    </button>
  );

  return (
    <div style={pageWrap}>
      <div style={{ maxWidth: 'var(--ff-container)', margin: '0 auto', padding: '40px 24px 64px' }}>
        <div style={{ marginBottom: 24 }}><h1 style={h1Style}>Profil</h1><p style={subStyle}>Twoje dane i skróty.</p></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28, alignItems: 'start' }} className="ffd-grid">
          <div style={{ background: 'var(--ff-surface)', border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-xl)', boxShadow: 'var(--ff-shadow-sm)', padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--ff-green-50)', color: 'var(--ff-primary)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22 }}>{initials}</div>
              <div><div style={{ fontWeight: 700, fontSize: 20 }}>{name}</div><div style={{ fontSize: 14, color: 'var(--ff-text-secondary)' }}>{user.email}</div></div>
            </div>
            <div className="prof-rows">
              <ProfRow icon="mail" label="E-mail" value={user.email || '—'} />
              <ProfRow icon="phone" label="Telefon" value={phone || 'Nie podano'} dim={!phone} />
              <ProfRow icon="pin" label="Miasto" value={city || 'Nie podano'} dim={!city} />
              <ProfRow icon="map" label="Województwo" value={province || 'Nie podano'} dim={!province} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
              <button style={primaryBtnInline} onClick={() => setEditing(true)}><Icon name="user" size={16} color="var(--ff-accent)" /> Edytuj dane</button>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 'var(--ff-radius-md)', border: '1px solid var(--ff-border)', background: 'var(--ff-surface)', color: 'var(--ff-text-secondary)', fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }} onClick={async () => { await signOut(); nav('/'); }}><Icon name="logout" size={16} /> Wyloguj</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shortcut('calendar', 'Moje rezerwacje', '/rezerwacje')}
            {shortcut('trophy', 'Moje połowy', '/polowy')}
            {shortcut('heart', 'Ulubione', '/ulubione')}
          </div>
        </div>
      </div>

      {editing && (
        <EditModal
          initialName={name === 'Wędkarz' ? '' : name} initialPhone={phone} initialCity={city} initialProvince={province}
          userId={user.id} onClose={() => setEditing(false)}
          onSaved={async () => { await refreshProfile(); setEditing(false); }}
        />
      )}
    </div>
  );
}

function ProfRow({ icon, label, value, dim }: { icon: IconName; label: string; value: string; dim?: boolean }) {
  return (
    <div className="prof-row">
      <Icon name={icon} size={18} color="var(--ff-text-secondary)" />
      <span className="prof-row-l">{label}</span>
      <span className="prof-row-v" style={dim ? { color: 'var(--ff-text-tertiary)', fontWeight: 500 } : undefined}>{value}</span>
    </div>
  );
}

const PROVINCES = [
  'dolnośląskie', 'kujawsko-pomorskie', 'lubelskie', 'lubuskie', 'łódzkie', 'małopolskie', 'mazowieckie', 'opolskie',
  'podkarpackie', 'podlaskie', 'pomorskie', 'śląskie', 'świętokrzyskie', 'warmińsko-mazurskie', 'wielkopolskie', 'zachodniopomorskie',
];

function formatPlPhone(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('48')) d = d.slice(2);
  d = d.slice(0, 9);
  const g = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean);
  return g.length ? `+48 ${g.join(' ')}` : '';
}
const phoneDigits = (v: string) => v.replace(/\D/g, '').replace(/^48/, '');

function EditModal({ initialName, initialPhone, initialCity, initialProvince, userId, onClose, onSaved }: {
  initialName: string; initialPhone: string; initialCity: string; initialProvince: string; userId: string; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [city, setCity] = useState(initialCity);
  const [province, setProvince] = useState(initialProvince);
  const [provOpen, setProvOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!name.trim().includes(' ')) { setErr('Podaj imię i nazwisko.'); return; }
    if (phone && phoneDigits(phone).length !== 9) { setErr('Podaj poprawny numer telefonu (9 cyfr).'); return; }
    if (!city.trim()) { setErr('Podaj miasto.'); return; }
    setBusy(true); setErr('');
    try {
      const patch = { name: name.trim(), phone: phone.trim(), city: city.trim() || null, province: province.trim() || null };
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
      if (error) throw error;
      await supabase.auth.updateUser({ data: patch });
      onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Nie udało się zapisać'); setBusy(false); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <button className="x" onClick={onClose}><Icon name="x" size={18} /></button>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Edytuj dane konta</div>
        </div>
        <div className="sheet-body">
          {err && <div className="notice err">{err}</div>}
          <div className="field"><label>Imię i nazwisko</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Kowalski" autoComplete="name" /></div>
          <div className="field"><label>Telefon</label><input className="input" value={phone} inputMode="numeric" onChange={(e) => setPhone(formatPlPhone(e.target.value))} placeholder="+48 600 100 200" autoComplete="tel" /></div>
          <div className="field"><label>Miasto</label><input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="np. Kraków" autoComplete="address-level2" /></div>
          <div className="field">
            <label>Województwo <span style={{ color: 'var(--ff-text-tertiary)', fontWeight: 500 }}>· opcjonalnie</span></label>
            <div className="prov-select">
              <button type="button" className={`prov-trigger ${province ? '' : 'empty'}`} onClick={() => setProvOpen((o) => !o)}>
                {province || 'Wybierz województwo'} <Icon name="chevronDown" size={16} color="var(--ff-text-secondary)" />
              </button>
              {provOpen && (
                <div className="prov-menu">
                  {province && <button type="button" className="prov-opt clear" onClick={() => { setProvince(''); setProvOpen(false); }}>Wyczyść</button>}
                  {PROVINCES.map((p) => (
                    <button type="button" key={p} className={`prov-opt ${p === province ? 'on' : ''}`} onClick={() => { setProvince(p); setProvOpen(false); }}>{p}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ff-text-tertiary)', margin: '2px 2px 0', lineHeight: 1.5 }}>E-mail jest loginem do konta i nie można go tu zmienić.</p>
        </div>
        <div className="sheet-foot">
          <button className="btn ghost" onClick={onClose}>Anuluj</button>
          <button className="btn" disabled={busy} onClick={save}><Icon name="check" size={16} /> {busy ? 'Zapisywanie…' : 'Zapisz zmiany'}</button>
        </div>
      </div>
    </div>
  );
}
