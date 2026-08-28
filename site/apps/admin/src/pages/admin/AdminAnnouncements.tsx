import { useEffect, useState } from 'react';
import { adminListAnnouncements, adminSaveAnnouncement, adminDeleteAnnouncement, type AnnouncementRow } from '../../lib/api';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/Confirm';
import Loader from '../../components/Loader';
import Icon from '../../components/Icon';
import Select from '../../components/Select';
import Toggle from '../../components/Toggle';
import { colors } from '../../theme';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

type Audience = AnnouncementRow['audience'];

const AUDIENCE_LABEL: Record<Audience, string> = { all: 'Wszyscy', anglers: 'Wędkarze', owners: 'Właściciele' };
const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Wszyscy' },
  { value: 'anglers', label: 'Wędkarze' },
  { value: 'owners', label: 'Właściciele' },
];

const emptyDraft = (): AnnouncementRow => ({ id: '', title: '', body: '', audience: 'all', active: true, created_at: '' });

export default function AdminAnnouncements() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<AnnouncementRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminListAnnouncements().then(setRows).catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleActive = async (r: AnnouncementRow) => {
    setBusy(true);
    try {
      await adminSaveAnnouncement({ id: r.id, title: r.title, body: r.body, audience: r.audience, active: !r.active });
      toast(r.active ? 'Ogłoszenie wyłączone' : 'Ogłoszenie aktywne', 'success');
      load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (r: AnnouncementRow) => {
    if (!(await confirmDialog({ title: 'Usunąć ogłoszenie?', message: 'Ogłoszenie zniknie z bazy i strony web. Tej operacji nie można cofnąć.', confirmLabel: 'Usuń', danger: true }))) return;
    setBusy(true);
    try { await adminDeleteAnnouncement(r.id); toast('Ogłoszenie usunięte', 'success'); load(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!edit) return;
    if (!edit.title.trim()) { toast('Podaj tytuł ogłoszenia', 'error'); return; }
    setBusy(true);
    try {
      await adminSaveAnnouncement({ id: edit.id || undefined, title: edit.title.trim(), body: edit.body.trim(), audience: edit.audience, active: edit.active });
      toast(edit.id ? 'Ogłoszenie zapisane' : 'Ogłoszenie utworzone', 'success');
      setEdit(null);
      load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Ogłoszenia <span className="admin-badge">ADMIN</span></h1><div className="sub">Komunikaty pokazywane na stronie web wędkarzom i właścicielom</div></div>
        <div className="topbar-right">
          <button className="btn" onClick={() => setEdit(emptyDraft())}><Icon name="plus" size={15} /> Nowe ogłoszenie</button>
        </div>
      </div>

      <div className="content">
        {loading ? <Loader label="Wczytywanie ogłoszeń…" />
          : rows.length === 0 ? (
            <div className="card empty"><div className="big"><Icon name="bell" size={26} /></div>Brak ogłoszeń. Utwórz pierwszy komunikat dla użytkowników.</div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <table className="tbl">
                <thead><tr><th>Tytuł</th><th>Odbiorca</th><th>Status</th><th>Data</th><th style={{ textAlign: 'right' }}>Akcje</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ opacity: r.active ? 1 : 0.6 }}>
                      <td style={{ fontWeight: 600, maxWidth: 360 }}>{r.title || '—'}</td>
                      <td><span className="badge" style={{ background: colors.accentSoft, color: colors.primary }}>{AUDIENCE_LABEL[r.audience]}</span></td>
                      <td><span className="badge" style={{ background: r.active ? '#DCFCE7' : '#F1F5F9', color: r.active ? '#15803D' : colors.textSecondary }}>{r.active ? 'Aktywne' : 'Wyłączone'}</span></td>
                      <td style={{ fontSize: 12.5, color: colors.textSecondary }}>{fmtDate(r.created_at)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn ghost sm" disabled={busy} onClick={() => setEdit(r)}><Icon name="edit" size={13} /> Edytuj</button>
                        <button className="btn ghost sm" disabled={busy} onClick={() => toggleActive(r)} style={{ marginLeft: 6 }}>
                          {r.active ? <><Icon name="x" size={13} /> Wyłącz</> : <><Icon name="check" size={13} /> Włącz</>}
                        </button>
                        <button className="btn ghost sm" disabled={busy} onClick={() => remove(r)} style={{ marginLeft: 6, color: colors.error }}><Icon name="trash" size={13} /> Usuń</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {edit && (
        <div className="modal-back" onClick={() => setEdit(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><h3>{edit.id ? 'Edytuj ogłoszenie' : 'Nowe ogłoszenie'}</h3><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Komunikat wyświetlany jako baner na stronie web.</div></div>
              <button className="btn ghost icon" onClick={() => setEdit(null)}><Icon name="x" size={16} /></button>
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label>Tytuł</label>
              <input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="np. Przerwa techniczna 12 lipca" />
            </div>

            <div className="field">
              <label>Treść</label>
              <textarea className="input" rows={4} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} placeholder="Treść komunikatu widoczna dla użytkowników…" />
            </div>

            <div className="field">
              <label>Odbiorca</label>
              <Select value={edit.audience} onChange={(v) => setEdit({ ...edit, audience: v as Audience })} icon="users" width="100%" options={AUDIENCE_OPTIONS} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Aktywne" />
            </div>

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setEdit(null)}>Anuluj</button>
              <button className="btn" disabled={busy} onClick={save}><Icon name="check" size={15} /> {busy ? 'Zapisywanie…' : 'Zapisz'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
