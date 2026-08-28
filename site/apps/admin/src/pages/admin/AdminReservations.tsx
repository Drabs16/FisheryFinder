import { useEffect, useMemo, useState } from 'react';
import { adminListReservations, adminCancelReservation, type AdminReservationRow } from '../../lib/api';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/Confirm';
import Loader from '../../components/Loader';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { type FieldDef } from '../../lib/grid';
import { useGrid } from '../../lib/useGrid';
import GridToolbar from '../../components/grid/GridToolbar';
import ColumnHeader from '../../components/grid/ColumnHeader';
import Select from '../../components/Select';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// Wyliczony status rezerwacji (do filtra po statusie w gridzie).
const computeStatus = (r: AdminReservationRow): 'pending' | 'confirmed' | 'cancelled' => {
  if (r.status === 'cancelled') return 'cancelled';
  if (r.confirmed_at != null) return 'confirmed';
  return 'pending';
};

// Wiersz wzbogacony o wyliczony status, by filtr/sort gridu działał.
type Row = AdminReservationRow & { _status: 'pending' | 'confirmed' | 'cancelled' };

const statusBadge = (r: AdminReservationRow): { label: string; bg: string; color: string } => {
  if (r.status === 'cancelled') return { label: 'Anulowana', bg: '#FEE2E2', color: colors.error };
  if (r.payment === 'block') return { label: 'Blokada', bg: colors.border, color: colors.textSecondary };
  if (r.confirmed_at != null) return { label: 'Potwierdzona', bg: colors.accentSoft, color: colors.primary };
  return { label: 'Oczekuje', bg: '#FEF3C7', color: '#B45309' };
};

// Definicje kolumn dla silnika grid (filtry per-kolumna, sort, Advanced Find, widoki).
const FIELDS: FieldDef<Row>[] = [
  { key: 'fishery_name', label: 'Łowisko', type: 'text', get: (r) => r.fishery_name },
  { key: 'name', label: 'Wędkarz', type: 'text', get: (r) => r.name ?? '' },
  { key: 'email', label: 'E-mail', type: 'text', get: (r) => r.email ?? '' },
  { key: 'status', label: 'Status', type: 'enum', get: (r) => r._status, options: [{ value: 'pending', label: 'Oczekuje' }, { value: 'confirmed', label: 'Potwierdzona' }, { value: 'cancelled', label: 'Anulowana' }] },
  { key: 'date_from', label: 'Termin', type: 'text', get: (r) => r.date_from },
  { key: 'total', label: 'Kwota', type: 'number', get: (r) => r.total },
  { key: 'payment', label: 'Płatność', type: 'text', get: (r) => r.payment ?? '' },
];

export default function AdminReservations() {
  const [rows, setRows] = useState<AdminReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [fisheryId, setFisheryId] = useState<string>('all');

  const load = () => {
    setLoading(true);
    adminListReservations()
      .then(setRows)
      .catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const enriched = useMemo<Row[]>(() => rows.map((r) => ({ ...r, _status: computeStatus(r) })), [rows]);

  const fisheryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) if (r.fishery_id && !seen.has(r.fishery_id)) seen.set(r.fishery_id, r.fishery_name || '—');
    const opts = [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'pl'));
    return [{ value: 'all', label: 'Wszystkie łowiska' }, ...opts];
  }, [rows]);

  const scoped = useMemo(() => (fisheryId === 'all' ? enriched : enriched.filter((r) => r.fishery_id === fisheryId)), [enriched, fisheryId]);
  const grid = useGrid('admin-reservations', FIELDS, scoped);
  const filtered = grid.data;

  const gmv = useMemo(() => Math.round(rows.filter((r) => r.status !== 'cancelled').reduce((a, r) => a + (r.total || 0), 0)), [rows]);

  const cancel = async (r: AdminReservationRow) => {
    if (!(await confirmDialog({ title: 'Anulować rezerwację?', message: `Rezerwacja ${r.name || ''} w „${r.fishery_name}" zostanie anulowana.`, confirmLabel: 'Anuluj rezerwację', danger: true }))) return;
    setBusy(r.id);
    try {
      await adminCancelReservation(r.id);
      toast('Rezerwacja anulowana', 'success');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Błąd', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Rezerwacje (platforma) <span className="admin-badge">ADMIN</span></h1><div className="sub">Wszystkie rezerwacje wszystkich łowisk</div></div>
        <div className="topbar-right">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>Rezerwacje</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colors.primary }}>{rows.length}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>GMV</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colors.primary }}>{gmv} zł</div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="row" style={{ marginBottom: 12 }}>
          <Select value={fisheryId} onChange={setFisheryId} options={fisheryOptions} width={240} icon="waves" placeholder="Łowisko" />
        </div>
        <GridToolbar grid={grid} />
        <div style={{ color: colors.textSecondary, fontSize: 13, margin: '-4px 0 12px' }}>
          {filtered.length === rows.length ? `${rows.length} rezerwacji` : `Pokazano ${filtered.length} z ${rows.length}`}
        </div>

        {loading ? <Loader label="Wczytywanie rezerwacji…" />
          : filtered.length === 0 ? (
            <div className="card empty"><div className="big"><Icon name="calendar" size={26} /></div>{rows.length === 0 ? 'Brak rezerwacji.' : 'Brak rezerwacji dla tych filtrów.'}</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th className="sortable-col"><ColumnHeader field={FIELDS[0]} grid={grid} /></th>
                    <th className="sortable-col"><ColumnHeader field={FIELDS[1]} grid={grid} /></th>
                    <th className="sortable-col"><ColumnHeader field={FIELDS[4]} grid={grid} /></th>
                    <th>Stanowiska</th>
                    <th className="sortable-col"><ColumnHeader field={FIELDS[5]} grid={grid} /></th>
                    <th className="sortable-col"><ColumnHeader field={FIELDS[6]} grid={grid} /></th>
                    <th className="sortable-col"><ColumnHeader field={FIELDS[3]} grid={grid} /></th>
                    <th style={{ textAlign: 'right' }}>Akcja</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map((r) => {
                      const b = statusBadge(r);
                      return (
                        <tr key={r.id} style={{ opacity: r.status === 'cancelled' ? 0.6 : 1 }}>
                          <td style={{ fontWeight: 600 }}>{r.fishery_name || '—'}</td>
                          <td>
                            <div>{r.name || 'Wędkarz'}</div>
                            {(r.email || r.phone) && <div style={{ fontSize: 12, color: colors.textSecondary }}>{r.email || r.phone}</div>}
                          </td>
                          <td style={{ fontSize: 12.5, color: colors.textSecondary, whiteSpace: 'nowrap' }}>{fmtDate(r.date_from)}–{fmtDate(r.date_to)} · {r.days} dób</td>
                          <td>{r.spots?.join(', ') || '—'}</td>
                          <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{Math.round(r.total)} zł</td>
                          <td style={{ fontSize: 12.5, color: colors.textSecondary }}>{r.payment || '—'}</td>
                          <td><span className="badge" style={{ background: b.bg, color: b.color }}>{b.label}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            {r.status !== 'cancelled' && (
                              <button className="btn ghost sm" disabled={busy === r.id} onClick={() => cancel(r)}>
                                <Icon name="x" size={13} /> Anuluj
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </div>
    </>
  );
}
