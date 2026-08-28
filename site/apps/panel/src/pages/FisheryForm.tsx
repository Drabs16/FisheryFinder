import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchDictionaries, fetchFishery, fetchFisheryRelations, saveFishery, adminSaveFishery, uploadFisheryPhoto, saveBathyImage, setFisheryRules, saveExtraCosts, type FisheryRules } from '../lib/api';
import { PROVINCES, type FisheryFormValues, type FisheryRecord, type PriceTier } from '../lib/types';
import { AMENITY_OPTIONS, FISH_OPTIONS, TYPE_OPTIONS } from '../lib/constants';
import { colors } from '../theme';
import Icon, { type IconName } from '../components/Icon';
import MapPicker from '../components/MapPicker';
import SpotsEditor from '../components/SpotsEditor';
import Select from '../components/Select';
import Loader from '../components/Loader';

const empty: FisheryFormValues = {
  name: '', location: '', city: '', province: 'Mazowieckie',
  latitude: 0, longitude: 0, price_from: 100, price_day: null, price_night: null, price_24h: null,
  price_tiers: [], extra_costs: [], total_spots: 10,
  fish: [], amenities: [], types: [], photos: [], records: [],
  description: '', rules: '', open_hours: 'Całą dobę', nokill: false,
  phone: '', email: '', website: '', area_ha: null, premium: false,
};

export default function FisheryForm({ admin = false }: { admin?: boolean }) {
  const { id } = useParams();
  const backTo = admin ? '/admin/lowiska' : '/lowiska';
  const nav = useNavigate();
  const editing = Boolean(id);

  const [v, setV] = useState<FisheryFormValues>(empty);
  const [dict, setDict] = useState<{ fish: string[]; amenities: string[] }>({ fish: [], amenities: [] });
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [layoutUrl, setLayoutUrl] = useState<string | null>(null);
  const [bathyUrl, setBathyUrl] = useState<string | null>(null);
  const [rules, setRules] = useState<FisheryRules>({ season_start: '', season_end: '', check_in_hour: 12, min_nights: 1, max_nights: null, lead_days: 0 });
  const setRule = <K extends keyof FisheryRules>(k: K, val: FisheryRules[K]) => setRules((p) => ({ ...p, [k]: val }));

  const set = <K extends keyof FisheryFormValues>(k: K, val: FisheryFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  // Upload zdjęć potrzebuje stabilnego id łowiska (ścieżka w Storage). Dla nowego łowiska
  // generujemy id po stronie klienta — RPC owner_save_fishery przyjmuje p_id i robi upsert.
  const ensureFisheryId = (): string => {
    if (v.id) return v.id;
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set('id', newId);
    return newId;
  };

  useEffect(() => {
    (async () => {
      try {
        setDict(await fetchDictionaries());
        if (id) {
          const f = await fetchFishery(id);
          if (!f) { setErr('Nie znaleziono łowiska'); setLoading(false); return; }
          const rel = await fetchFisheryRelations(id);
          setLayoutUrl(f.spot_map_url ?? null);
          setBathyUrl(f.bathy_map_url ?? null);
          setRules({
            season_start: f.season_start ?? '', season_end: f.season_end ?? '',
            check_in_hour: f.check_in_hour ?? 12, min_nights: f.min_nights ?? 1,
            max_nights: f.max_nights ?? null, lead_days: f.lead_days ?? 0,
          });
          setV({
            id: f.id, name: f.name, location: f.location, city: f.city, province: f.province,
            latitude: f.latitude, longitude: f.longitude, price_from: f.price_from,
            price_day: f.price_day, price_night: f.price_night, price_24h: f.price_24h,
            price_tiers: f.price_tiers ?? [], extra_costs: f.extra_costs ?? [], total_spots: f.total_spots,
            fish: f.fish ?? [], amenities: rel.amenities, types: f.types ?? [], photos: rel.photos, records: rel.records,
            description: f.description ?? '', rules: f.rules ?? '', open_hours: f.open_hours ?? '',
            nokill: f.nokill, phone: f.phone ?? '', email: f.email ?? '', website: f.website ?? '', area_ha: f.area_ha,
            premium: f.premium,
          });
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Błąd ładowania');
      } finally { setLoading(false); }
    })();
  }, [id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const savedId = await (admin ? adminSaveFishery(v) : saveFishery(v));
      try { await setFisheryRules(savedId || v.id || '', rules); } catch { /* reguły best-effort — nie blokują zapisu łowiska */ }
      try { await saveExtraCosts(savedId || v.id || '', v.extra_costs); } catch { /* koszty dodatkowe best-effort */ }
      nav(backTo);
    }
    catch (e) { setErr(e instanceof Error ? e.message : 'Nie udało się zapisać'); setBusy(false); }
  };

  if (loading) return <><Top editing={editing} onBack={() => nav(backTo)} /><div className="content"><Loader label="Wczytywanie łowiska…" /></div></>;

  const allFish = Array.from(new Set([...FISH_OPTIONS, ...dict.fish, ...v.fish]));
  const allTypes = Array.from(new Set([...TYPE_OPTIONS, ...v.types]));
  const customAmen = Array.from(new Set([...dict.amenities, ...v.amenities]))
    .filter((a) => !AMENITY_OPTIONS.some((o) => o.label === a));

  return (
    <>
      <Top editing={editing} onBack={() => nav(backTo)} admin={admin} />
      <div className="content">
        {err && <div className="notice err">{err}</div>}
        <form onSubmit={submit} style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {admin && (
            <Card title="Plan łowiska" icon="card">
              <div className="hint" style={{ marginBottom: 12 }}>Premium = rezerwacje online, kalendarz i pełne zarządzanie. Basic = wpis katalogowy (bez rezerwacji online). Do czasu przejęcia kodem łowiskiem zarządzasz Ty (admin).</div>
              <div className="row" style={{ gap: 10 }}>
                {(['basic', 'premium'] as const).map((p) => {
                  const on = (p === 'premium') === !!v.premium;
                  return (
                    <button type="button" key={p} className={`chip ${on ? 'on' : ''}`} style={{ padding: '10px 18px', fontSize: 14 }}
                      onClick={() => set('premium', p === 'premium')}>
                      <Icon name={p === 'premium' ? 'sparkles' : 'tag'} size={15} /> {p === 'premium' ? 'Premium' : 'Basic'}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          <Card title="Podstawowe dane" icon="fish">
            <Field label="Nazwa łowiska">
              <input className="input" value={v.name} required onChange={(e) => set('name', e.target.value)} placeholder="np. Łowisko Borowa" />
            </Field>
            <Field label="Adres">
              <input className="input" value={v.location} required onChange={(e) => set('location', e.target.value)} placeholder="ul. Wędkarska 1, Borowa" />
            </Field>
            <div className="row">
              <Field label="Miasto" style={{ flex: 1 }}>
                <input className="input" value={v.city} required onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="Województwo" style={{ flex: 1 }}>
                <Select value={v.province} onChange={(val) => set('province', val)} icon="pin" width="100%"
                  options={PROVINCES.map((p) => ({ value: p, label: p }))} />
              </Field>
            </div>
            <div className="row">
              <Field label="Cena podstawowa (zł / dzień)" style={{ flex: 1 }}>
                <input className="input" type="number" min={0} value={v.price_from} onChange={(e) => set('price_from', Number(e.target.value))} />
              </Field>
              <Field label="Liczba stanowisk" style={{ flex: 1 }}>
                <input className="input" type="number" min={0} value={v.total_spots} onChange={(e) => set('total_spots', Number(e.target.value))} />
              </Field>
            </div>
            <div className="row">
              <Field label="Powierzchnia (ha)" style={{ flex: 1 }}>
                <input className="input" type="number" step="0.1" value={v.area_ha ?? ''} onChange={(e) => set('area_ha', e.target.value ? Number(e.target.value) : null)} />
              </Field>
              <Field label="Godziny otwarcia" style={{ flex: 1 }}>
                <input className="input" value={v.open_hours} onChange={(e) => set('open_hours', e.target.value)} />
              </Field>
            </div>
            <Toggle on={v.nokill} onChange={(b) => set('nokill', b)} label="Łowisko No Kill" desc="Obowiązuje zasada wypuszczania ryb" />
          </Card>

          <Card title="Cennik" icon="tag">
            <div className="hint" style={{ marginBottom: 12 }}>
              Trzy niezależne produkty — wpisz tylko te, które oferujesz (puste pomijamy). <b>Doba (24h)</b> to pobyt
              na zakres dat (np. pt.→niedz. = 2 doby) — limity poniżej (min/maks. dób) dotyczą właśnie doby.
              <b> Dzień</b> i <b>Nocka</b> to pojedyncza dniówka / noc (1 sztuka na rezerwację). „Cena od" w aplikacji
              policzy się z najniższej.
            </div>
            <div className="row">
              <Field label="Doba (24h) — zł" style={{ flex: 1 }}>
                <input className="input" type="number" min={0} value={v.price_24h ?? ''} placeholder="—"
                  onChange={(e) => set('price_24h', e.target.value ? Number(e.target.value) : null)} />
              </Field>
              <Field label="Dzień — zł" style={{ flex: 1 }}>
                <input className="input" type="number" min={0} value={v.price_day ?? ''} placeholder="—"
                  onChange={(e) => set('price_day', e.target.value ? Number(e.target.value) : null)} />
              </Field>
              <Field label="Nocka — zł" style={{ flex: 1 }}>
                <input className="input" type="number" min={0} value={v.price_night ?? ''} placeholder="—"
                  onChange={(e) => set('price_night', e.target.value ? Number(e.target.value) : null)} />
              </Field>
            </div>
            <div className="hint" style={{ margin: '14px 0 12px' }}>
              Dodatkowe warianty (np. Weekend, Stanowisko VIP) — opcjonalnie:
            </div>
            <PriceTiers value={v.price_tiers} onChange={(x) => set('price_tiers', x)} />
          </Card>

          <Card title="Lokalizacja na mapie" icon="pin">
            <div className="hint" style={{ marginBottom: 10 }}>Kliknij na mapie, aby postawić pinezkę — albo przeciągnij ją w odpowiednie miejsce. Współrzędne uzupełnią się same.</div>
            <MapPicker lat={v.latitude} lng={v.longitude} onChange={(la, ln) => setV((p) => ({ ...p, latitude: la, longitude: ln }))} />
            <div className="row" style={{ marginTop: 14 }}>
              <Field label="Szerokość (lat)" style={{ flex: 1 }}>
                <input className="input" type="number" step="0.000001" value={v.latitude || ''} onChange={(e) => set('latitude', Number(e.target.value))} placeholder="52.23" />
              </Field>
              <Field label="Długość (lng)" style={{ flex: 1 }}>
                <input className="input" type="number" step="0.000001" value={v.longitude || ''} onChange={(e) => set('longitude', Number(e.target.value))} placeholder="21.01" />
              </Field>
            </div>
          </Card>

          <Card title="Sezon i zasady rezerwacji" icon="calendar">
            <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
              <Field label="Sezon od (MM-DD)" style={{ flex: 1, minWidth: 150 }}><input className="input" value={rules.season_start} onChange={(e) => setRule('season_start', e.target.value)} placeholder="np. 04-01" /></Field>
              <Field label="Sezon do (MM-DD)" style={{ flex: 1, minWidth: 150 }}><input className="input" value={rules.season_end} onChange={(e) => setRule('season_end', e.target.value)} placeholder="np. 10-31" /></Field>
            </div>
            <div className="hint" style={{ marginTop: 8 }}><Icon name="calendar" size={13} /> Puste pola = łowisko czynne cały rok. Poza sezonem wędkarz nie zarezerwuje online.</div>
            <div className="row" style={{ gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
              <Field label="Doba od godziny" style={{ flex: 1, minWidth: 120 }}><input className="input" type="number" min={0} max={23} value={rules.check_in_hour} onChange={(e) => setRule('check_in_hour', Number(e.target.value))} /></Field>
              <Field label="Min. dób (doba)" style={{ flex: 1, minWidth: 120 }}><input className="input" type="number" min={1} value={rules.min_nights} onChange={(e) => setRule('min_nights', Number(e.target.value))} /></Field>
              <Field label="Maks. dób (puste = bez limitu)" style={{ flex: 1, minWidth: 140 }}><input className="input" type="number" min={1} value={rules.max_nights ?? ''} onChange={(e) => setRule('max_nights', e.target.value ? Number(e.target.value) : null)} /></Field>
              <Field label="Min. wyprzedzenie (dni)" style={{ flex: 1, minWidth: 140 }}><input className="input" type="number" min={0} value={rules.lead_days} onChange={(e) => setRule('lead_days', Number(e.target.value))} /></Field>
            </div>
          </Card>

          <Card title="Typ łowiska" icon="tag">
            <div className="row" style={{ marginBottom: 12 }}>
              {allTypes.map((t) => (
                <Chip key={t} label={t} on={v.types.includes(t)} onClick={() => set('types', toggle(v.types, t))} />
              ))}
            </div>
            <AddInline placeholder="Dodaj inny typ łowiska…" onAdd={(t) => { if (!v.types.includes(t)) set('types', [...v.types, t]); }} />
          </Card>

          <Card title="Kontakt" icon="phone">
            <Field label="Telefon"><IconInput icon="phone" value={v.phone} onChange={(x) => set('phone', x)} placeholder="+48 600 100 200" /></Field>
            <Field label="E-mail"><IconInput icon="mail" type="email" value={v.email} onChange={(x) => set('email', x)} placeholder="biuro@lowisko.pl" /></Field>
            <Field label="Strona WWW"><IconInput icon="globe" value={v.website} onChange={(x) => set('website', x)} placeholder="https://lowisko.pl" /></Field>
          </Card>

          <Card title="Gatunki ryb" icon="fish">
            <div className="row" style={{ marginBottom: 12 }}>
              {allFish.map((f) => <Chip key={f} label={f} on={v.fish.includes(f)} onClick={() => set('fish', toggle(v.fish, f))} />)}
            </div>
            <AddInline placeholder="Dodaj inny gatunek…" onAdd={(t) => { if (!v.fish.includes(t)) set('fish', [...v.fish, t]); }} />
          </Card>

          <Card title="Udogodnienia" icon="layers">
            <div className="tiles">
              {AMENITY_OPTIONS.map((a) => (
                <Tile key={a.label} icon={a.icon} label={a.label} on={v.amenities.includes(a.label)} onClick={() => set('amenities', toggle(v.amenities, a.label))} />
              ))}
              {customAmen.map((a) => (
                <Tile key={a} icon="check" label={a} on={v.amenities.includes(a)} onClick={() => set('amenities', toggle(v.amenities, a))} />
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <AddInline placeholder="Dodaj inne udogodnienie…" onAdd={(t) => { if (!v.amenities.includes(t)) set('amenities', [...v.amenities, t]); }} />
            </div>
          </Card>

          <Card title="Rekordy łowiska" icon="trophy">
            <Records value={v.records} onChange={(x) => set('records', x)} />
          </Card>

          <Card title="Zdjęcia" icon="image">
            <div className="hint" style={{ marginBottom: 10 }}>Wgraj zdjęcia z dysku — trzymamy je w naszym Storage. Pierwsze na liście jest zdjęciem głównym. Możesz też wkleić bezpośredni adres URL pliku obrazu, ale obce linki bywają blokowane przez hosting — pewniejszy jest upload.</div>
            <PhotoManager value={v.photos} onChange={(x) => set('photos', x)} ensureId={ensureFisheryId} />
          </Card>

          <Card title="Stanowiska — ceny i pojemność" icon="layers">
            <div className="hint" style={{ marginBottom: 12 }}>
              Ustaw cenę i liczbę osób dla każdego stanowiska osobno — np. stanowisko VIP może być droższe. Puste pole ceny = stosujemy cennik ogólny powyżej.
            </div>
            {editing && v.id
              ? <SpotsEditor fisheryId={v.id} layoutImageUrl={layoutUrl} totalSpots={v.total_spots} />
              : <div className="hint">Zapisz najpierw łowisko (z liczbą stanowisk), a potem wróć tutaj, aby ustawić ceny stanowisk.</div>}
          </Card>

          <Card title="Koszty dodatkowe" icon="card">
            <div className="hint" style={{ marginBottom: 12 }}>
              Opcjonalne dopłaty, które wędkarz może domówić — np. wynajem pontonu, prąd, druga wędka. Pokazujemy je przy rezerwacji.
            </div>
            <PriceTiers value={v.extra_costs} onChange={(x) => set('extra_costs', x)} namePlaceholder="Nazwa (np. Wynajem pontonu)" addLabel="Dodaj koszt dodatkowy" />
          </Card>

          <Card title="Mapa batymetryczna" icon="droplet">
            <div className="hint" style={{ marginBottom: 10 }}>Mapa głębokości łowiska — wędkarz zobaczy ją w aplikacji i na stronie (zakładka „Batymetria").</div>
            {editing && v.id
              ? <BathyUpload fisheryId={v.id} url={bathyUrl} onChange={setBathyUrl} />
              : <div className="hint">Zapisz najpierw łowisko, a potem dodasz tu mapę głębokości.</div>}
          </Card>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}><span className="ico"><Icon name="edit" size={18} /></span> Opis i regulamin</div>
            <Field label="Opis łowiska"><textarea className="input" value={v.description} onChange={(e) => set('description', e.target.value)} placeholder="Opowiedz wędkarzom o swoim łowisku…" /></Field>
            <Field label="Regulamin"><textarea className="input" value={v.rules} onChange={(e) => set('rules', e.target.value)} placeholder="Zasady obowiązujące na łowisku…" /></Field>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn ghost" onClick={() => nav(backTo)}>Anuluj</button>
            <button className="btn" disabled={busy}>
              <Icon name="check" size={16} /> {busy ? 'Zapisywanie…' : (editing ? 'Zapisz zmiany' : 'Dodaj łowisko')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

const toggle = (arr: string[], x: string) => (arr.includes(x) ? arr.filter((i) => i !== x) : [...arr, x]);

function Top({ editing, onBack, admin }: { editing: boolean; onBack: () => void; admin?: boolean }) {
  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn ghost icon" onClick={onBack}><Icon name="chevronLeft" size={18} /></button>
        <div>
          <h1>{editing ? 'Edytuj łowisko' : 'Nowe łowisko'}{admin && <span className="admin-badge" style={{ marginLeft: 10 }}>ADMIN</span>}</h1>
          <div className="sub">{admin ? 'Tryb administratora — łowisko w katalogu (bez właściciela do czasu przejęcia kodem)' : 'Dane widoczne dla wędkarzy w aplikacji Fishery Finder'}</div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 16 }}><span className="ico"><Icon name={icon} size={18} /></span> {title}</div>
      {children}
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: ReactNode; style?: CSSProperties }) {
  return <div className="field" style={style}><label>{label}</label>{children}</div>;
}

function IconInput({ icon, value, onChange, placeholder, type }: { icon: IconName; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="input-icon">
      <span className="ic"><Icon name={icon} size={16} /></span>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return <span className={`chip ${on ? 'on' : ''}`} onClick={onClick}>{on && <Icon name="check" size={14} />}{label}</span>;
}

function Tile({ icon, label, on, onClick }: { icon: IconName; label: string; on: boolean; onClick: () => void }) {
  return (
    <div className={`tile ${on ? 'on' : ''}`} onClick={onClick}>
      <span className="ti"><Icon name={icon} size={18} /></span>
      <span className="tl">{label}</span>
      {on && <Icon name="check" size={16} color={colors.accent} />}
    </div>
  );
}

function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (b: boolean) => void; label: string; desc?: string }) {
  return (
    <div className={`tile ${on ? 'on' : ''}`} style={{ cursor: 'pointer' }} onClick={() => onChange(!on)}>
      <span className="ti"><Icon name="droplet" size={18} /></span>
      <div className="grow" style={{ flex: 1 }}>
        <div className="tl">{label}</div>
        {desc && <div style={{ fontSize: 12, color: colors.textSecondary }}>{desc}</div>}
      </div>
      <div style={{ width: 42, height: 24, borderRadius: 999, background: on ? colors.accent : colors.border, position: 'relative', transition: 'background .15s' }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
      </div>
    </div>
  );
}

function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (t: string) => void }) {
  const [text, setText] = useState('');
  const add = () => { const t = text.trim(); if (t) { onAdd(t); setText(''); } };
  return (
    <div className="row">
      <input className="input" style={{ flex: 1 }} value={text} placeholder={placeholder}
        onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
      <button type="button" className="btn ghost sm" onClick={add}><Icon name="plus" size={15} /> Dodaj</button>
    </div>
  );
}

function PriceTiers({ value, onChange, namePlaceholder = 'Nazwa (np. Doba, Weekend, VIP)', addLabel = 'Dodaj wariant ceny' }: { value: PriceTier[]; onChange: (v: PriceTier[]) => void; namePlaceholder?: string; addLabel?: string }) {
  const upd = (i: number, patch: Partial<PriceTier>) => onChange(value.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  return (
    <div>
      {value.map((t, i) => (
        <div key={i} className="row" style={{ marginBottom: 8 }}>
          <input className="input" style={{ flex: 2 }} placeholder={namePlaceholder} value={t.label} onChange={(e) => upd(i, { label: e.target.value })} />
          <div className="input-icon" style={{ flex: 1 }}>
            <input className="input" type="number" min={0} step="1" placeholder="zł" value={t.price || ''} onChange={(e) => upd(i, { price: Number(e.target.value) })} style={{ paddingRight: 34 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary, fontSize: 13 }}>zł</span>
          </div>
          <button type="button" className="btn ghost icon" onClick={() => onChange(value.filter((_, idx) => idx !== i))}><Icon name="trash" size={15} /></button>
        </div>
      ))}
      <button type="button" className="btn ghost sm" onClick={() => onChange([...value, { label: '', price: 0 }])}><Icon name="plus" size={15} /> {addLabel}</button>
    </div>
  );
}

function Records({ value, onChange }: { value: FisheryRecord[]; onChange: (v: FisheryRecord[]) => void }) {
  const upd = (i: number, patch: Partial<FisheryRecord>) => onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div>
      {value.map((r, i) => (
        <div key={i} className="row" style={{ marginBottom: 8 }}>
          <input className="input" style={{ flex: 2 }} placeholder="Gatunek" value={r.species} onChange={(e) => upd(i, { species: e.target.value })} />
          <input className="input" style={{ flex: 1 }} type="number" step="0.1" placeholder="kg" value={r.weight || ''} onChange={(e) => upd(i, { weight: Number(e.target.value) })} />
          <button type="button" className="btn ghost icon" onClick={() => onChange(value.filter((_, idx) => idx !== i))}><Icon name="trash" size={15} /></button>
        </div>
      ))}
      <button type="button" className="btn ghost sm" onClick={() => onChange([...value, { species: '', weight: 0 }])}><Icon name="plus" size={15} /> Dodaj rekord</button>
    </div>
  );
}

function BathyUpload({ fisheryId, url, onChange }: { fisheryId: string; url: string | null; onChange: (u: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setErr(''); setBusy(true);
    try { onChange(await saveBathyImage(fisheryId, file)); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Nie udało się wgrać mapy'); }
    finally { setBusy(false); }
  };
  return (
    <div>
      {url && <img src={url} alt="Mapa batymetryczna" style={{ width: '100%', maxWidth: 480, borderRadius: 12, border: `1px solid ${colors.border}`, marginBottom: 10, display: 'block' }} />}
      <label className="btn ghost sm" style={{ cursor: busy ? 'default' : 'pointer', display: 'inline-flex', opacity: busy ? 0.6 : 1, pointerEvents: busy ? 'none' : 'auto' }}>
        <Icon name="droplet" size={15} /> {busy ? 'Wgrywanie…' : (url ? 'Zmień mapę głębokości' : 'Wgraj mapę głębokości')}
        <input type="file" accept="image/*" disabled={busy} style={{ display: 'none' }} onChange={(e) => { upload(e.target.files?.[0]); e.currentTarget.value = ''; }} />
      </label>
      {err && <div className="hint" style={{ marginTop: 8, color: colors.error }}>{err}</div>}
    </div>
  );
}

function PhotoManager({ value, onChange, ensureId }: {
  value: string[];
  onChange: (v: string[]) => void;
  ensureId: () => string;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Wpuszczamy tylko bezpośrednie linki do plików obrazów (np. ze Storage), nie linki ze stron/Google.
  const looksLikeImage = (u: string) =>
    /^https?:\/\//i.test(u) && (/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(u) || /\/storage\/v1\/object\/public\//i.test(u));
  const addUrl = () => {
    const t = text.trim();
    if (!t) return;
    if (!looksLikeImage(t)) {
      setErr('To nie wygląda na bezpośredni link do pliku obrazu (.jpg/.png…). Najlepiej użyj „Wgraj zdjęcie".');
      return;
    }
    setErr('');
    onChange([...value, t]);
    setText('');
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const makeMain = (i: number) => { if (i === 0) return; const next = [...value]; const [u] = next.splice(i, 1); next.unshift(u); onChange(next); };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErr(''); setBusy(true);
    try {
      const id = ensureId();
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadFisheryPhoto(id, file));
      }
      onChange([...value, ...urls]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Nie udało się wgrać zdjęcia');
    } finally { setBusy(false); }
  };

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {value.map((u, i) => (
            <div key={`${u}-${i}`} style={{ position: 'relative', width: 120, height: 90, borderRadius: 10, overflow: 'hidden', background: colors.accentLight, border: `1px solid ${colors.border}` }}>
              <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {i === 0 && <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: colors.accent, color: '#fff' }}>Główne</span>}
              <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', gap: 4 }}>
                {i !== 0 && <button type="button" title="Ustaw jako główne" className="btn ghost icon" style={{ background: 'rgba(255,255,255,.9)' }} onClick={() => makeMain(i)}><Icon name="arrowUp" size={14} /></button>}
                <button type="button" title="Usuń" className="btn ghost icon" style={{ background: 'rgba(255,255,255,.9)' }} onClick={() => remove(i)}><Icon name="trash" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="btn ghost sm" style={{ cursor: busy ? 'default' : 'pointer', display: 'inline-flex', opacity: busy ? 0.6 : 1, pointerEvents: busy ? 'none' : 'auto' }}>
        <Icon name="image" size={15} /> {busy ? 'Wgrywanie…' : 'Wgraj zdjęcie'}
        <input type="file" accept="image/*" multiple disabled={busy} style={{ display: 'none' }}
          onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ''; }} />
      </label>

      {err && <div className="hint" style={{ marginTop: 8, color: colors.error }}>{err}</div>}

      <div className="row" style={{ marginTop: 12 }}>
        <input className="input" style={{ flex: 1 }} value={text} placeholder="…lub wklej bezpośredni URL pliku obrazu (https://…/zdjecie.jpg)"
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }} />
        <button type="button" className="btn ghost sm" onClick={addUrl}><Icon name="plus" size={15} /> Dodaj URL</button>
      </div>
    </div>
  );
}
