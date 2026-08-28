import { useEffect, useState } from 'react';
import { adminListPois, adminSavePoi, adminDeletePoi, adminSetPoiVerified, type PoiRow } from '../../lib/api';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/Confirm';
import Loader from '../../components/Loader';
import Icon from '../../components/Icon';
import Select from '../../components/Select';
import Toggle from '../../components/Toggle';
import MapPicker from '../../components/MapPicker';
import { colors } from '../../theme';
import { type FieldDef } from '../../lib/grid';
import { useGrid } from '../../lib/useGrid';
import GridToolbar from '../../components/grid/GridToolbar';
import ColumnHeader from '../../components/grid/ColumnHeader';

// Definicje kolumn dla silnika grid (filtry per-kolumna, sort, Advanced Find, widoki).
const FIELDS: FieldDef<PoiRow>[] = [
  { key: 'name', label: 'Nazwa', type: 'text', get: (r) => r.name },
  { key: 'kind', label: 'Typ', type: 'enum', get: (r) => r.kind, options: [{ value: 'shop', label: 'Sklep' }, { value: 'pzw', label: 'Wody PZW' }] },
  { key: 'city', label: 'Miasto', type: 'text', get: (r) => r.city ?? '' },
  { key: 'verified', label: 'Zweryfikowany', type: 'bool', get: (r) => r.verified },
  { key: 'phone', label: 'Telefon', type: 'text', get: (r) => r.phone ?? '' },
];

type Editable = {
  id?: string;
  kind: 'shop' | 'pzw';
  name: string;
  lat: number;
  lon: number;
  address: string;
  city: string;
  phone: string;
  website: string;
  verified: boolean;
};

const emptyPoi = (): Editable => ({ kind: 'shop', name: '', lat: 52.23, lon: 21.01, address: '', city: '', phone: '', website: '', verified: false });

const toEditable = (r: PoiRow): Editable => ({
  id: r.id, kind: r.kind, name: r.name, lat: r.lat, lon: r.lon,
  address: r.address ?? '', city: r.city ?? '', phone: r.phone ?? '', website: r.website ?? '', verified: r.verified,
});

export default function AdminPois() {
  const [rows, setRows] = useState<PoiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editable | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminListPois()
      .then(setRows)
      .catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const grid = useGrid('admin-pois', FIELDS, rows);
  const filtered = grid.data;

  const verifiedCount = rows.filter((r) => r.verified).length;

  const toggleVerified = async (r: PoiRow) => {
    setBusyId(r.id);
    try {
      await adminSetPoiVerified(r.id, !r.verified);
      toast(r.verified ? 'Cofnięto weryfikację' : 'Zweryfikowano', 'success');
      load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusyId(null); }
  };

  const remove = async (r: PoiRow) => {
    if (!(await confirmDialog({ title: 'Usunąć POI?', message: `„${r.name}" zostanie trwale usunięty z mapy.`, confirmLabel: 'Usuń', danger: true }))) return;
    setBusyId(r.id);
    try {
      await adminDeletePoi(r.id);
      toast('POI usunięty', 'success');
      load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <div className="topbar">
        <div><h1>POI — sklepy i wody PZW <span className="admin-badge">ADMIN</span></h1><div className="sub">Zarządzaj punktami na mapie</div></div>
        <div className="topbar-right">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>Zweryfikowane</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colors.primary }}>{verifiedCount} / {rows.length}</div>
          </div>
          <button className="btn" onClick={() => setEditing(emptyPoi())}><Icon name="plus" size={15} /> Dodaj POI</button>
        </div>
      </div>

      <div className="content">
        <GridToolbar grid={grid} />
        <div style={{ color: colors.textSecondary, fontSize: 13, margin: '-4px 0 12px' }}>
          {filtered.length === rows.length ? `${rows.length} POI` : `Pokazano ${filtered.length} z ${rows.length}`}
        </div>

        {loading ? <Loader label="Wczytywanie POI…" />
          : filtered.length === 0 ? (
            <div className="card empty"><div className="big"><Icon name="pin" size={26} /></div>{rows.length === 0 ? 'Brak POI w bazie.' : 'Brak POI dla tych filtrów.'}</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th className="sortable-col"><ColumnHeader field={FIELDS[0]} grid={grid} /></th>
                  <th className="sortable-col"><ColumnHeader field={FIELDS[1]} grid={grid} /></th>
                  <th className="sortable-col"><ColumnHeader field={FIELDS[2]} grid={grid} /></th>
                  <th>Kontakt</th>
                  <th className="sortable-col"><ColumnHeader field={FIELDS[3]} grid={grid} /></th>
                  <th style={{ textAlign: 'right' }}>Akcje</th>
                </tr></thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} style={{ opacity: r.verified ? 1 : 0.85 }}>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td>
                        {r.kind === 'shop'
                          ? <span className="badge" style={{ background: '#FEF3C7', color: '#B45309' }}>Sklep</span>
                          : <span className="badge" style={{ background: '#DBEAFE', color: '#1E40AF' }}>Wody PZW</span>}
                      </td>
                      <td>{r.city || <span className="muted">—</span>}</td>
                      <td style={{ fontSize: 13 }}>
                        {r.phone || r.website ? (
                          <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
                            {r.phone && <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="phone" size={13} color={colors.textSecondary} />{r.phone}</span>}
                            {r.website && <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="globe" size={13} color={colors.textSecondary} /><span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.website}</span></span>}
                          </span>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td>
                        <span className="badge" style={{ background: r.verified ? colors.accentSoft : '#F1F5F9', color: r.verified ? colors.primary : colors.textSecondary }}>
                          {r.verified ? 'Zweryfikowany' : 'Niezweryfikowany'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn ghost sm" disabled={busyId === r.id} onClick={() => toggleVerified(r)}>
                          {r.verified ? <><Icon name="x" size={13} /> Cofnij</> : <><Icon name="check" size={13} /> Weryfikuj</>}
                        </button>
                        <button className="btn ghost sm" style={{ marginLeft: 6 }} onClick={() => setEditing(toEditable(r))}><Icon name="edit" size={13} /> Edytuj</button>
                        <button className="btn ghost sm" style={{ marginLeft: 6 }} disabled={busyId === r.id} onClick={() => remove(r)}><Icon name="trash" size={13} /> Usuń</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
      </div>

      {editing && <PoiModal poi={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function PoiModal({ poi, onClose, onSaved }: { poi: Editable; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Editable>(poi);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Editable>(k: K, v: Editable[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { toast('Podaj nazwę POI', 'error'); return; }
    setBusy(true);
    try {
      await adminSavePoi({
        id: form.id || undefined, kind: form.kind, name: form.name.trim(), lat: form.lat, lon: form.lon,
        address: form.address.trim() || null, city: form.city.trim() || null,
        phone: form.phone.trim() || null, website: form.website.trim() || null, verified: form.verified,
      });
      toast(form.id ? 'Zapisano zmiany' : 'POI dodany', 'success');
      onSaved();
    } catch (e) { toast(e instanceof Error ? e.message : 'Błąd zapisu', 'error'); setBusy(false); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3>{form.id ? 'Edytuj POI' : 'Dodaj POI'}</h3>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Punkt na mapie — sklep wędkarski lub woda PZW.</div>
          </div>
          <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>Typ</label>
          <Select value={form.kind} onChange={(v) => set('kind', v as 'shop' | 'pzw')} width="100%"
            options={[{ value: 'shop', label: 'Sklep wędkarski' }, { value: 'pzw', label: 'Wody PZW' }]} />
        </div>

        <div className="field"><label>Nazwa</label><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="np. Sklep Wędkarski Karp" /></div>

        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Miasto</label><input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="np. Warszawa" /></div>
          <div className="field" style={{ flex: 1 }}><label>Adres</label><input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="ul. …" /></div>
        </div>

        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Telefon</label><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+48…" /></div>
          <div className="field" style={{ flex: 1 }}><label>WWW</label><input className="input" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" /></div>
        </div>

        <div className="field">
          <label>Lokalizacja</label>
          <MapPicker lat={form.lat} lng={form.lon} onChange={(lat, lng) => setForm((f) => ({ ...f, lat, lon: lng }))} height={280} />
        </div>

        <div className="field">
          <Toggle checked={form.verified} onChange={(v) => set('verified', v)} label="Zweryfikowany" />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn ghost" onClick={onClose}>Anuluj</button>
          <button className="btn" disabled={busy} onClick={save}><Icon name="save" size={15} /> {busy ? 'Zapisywanie…' : 'Zapisz'}</button>
        </div>
      </div>
    </div>
  );
}
