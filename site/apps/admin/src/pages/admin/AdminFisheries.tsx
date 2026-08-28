import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetchAllFisheries, adminGenerateCode, adminQuickUpdateFishery, adminSetPlan, adminUnassignOwner } from '../../lib/api';
import { colors } from '../../theme';
import Icon, { type IconName } from '../../components/Icon';
import Select from '../../components/Select';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/Confirm';
import { type AdminFisheryRow, PROVINCES } from '../../lib/types';
import Loader from '../../components/Loader';
import { type FieldDef } from '../../lib/grid';
import { useGrid } from '../../lib/useGrid';
import GridToolbar from '../../components/grid/GridToolbar';
import ColumnHeader from '../../components/grid/ColumnHeader';

const PLAN_OPTS = [{ value: 'basic', label: 'Basic' }, { value: 'premium', label: 'Premium' }, { value: 'pro', label: 'Pro' }];

const claimedOf = (f: AdminFisheryRow) => !!f.owner_id && !f.owner_is_admin; // przejęte przez realnego właściciela

// Definicje kolumn dla silnika grid (filtry per-kolumna, sort, Advanced Find, widoki).
const FIELDS: FieldDef<AdminFisheryRow>[] = [
  { key: 'name', label: 'Łowisko', type: 'text', get: (f) => f.name },
  { key: 'city', label: 'Miasto', type: 'text', get: (f) => f.city },
  { key: 'province', label: 'Województwo', type: 'enum', get: (f) => f.province, options: PROVINCES.map((p) => ({ value: p, label: p })) },
  { key: 'plan', label: 'Plan (licencja)', type: 'enum', get: (f) => f.plan, options: PLAN_OPTS },
  { key: 'status', label: 'Status', type: 'enum', get: (f) => (claimedOf(f) ? 'claimed' : 'catalog'), options: [{ value: 'claimed', label: 'Przejęte' }, { value: 'catalog', label: 'W katalogu' }] },
  { key: 'owner', label: 'Właściciel (e-mail)', type: 'text', get: (f) => (claimedOf(f) ? f.owner_email : '') },
  { key: 'code', label: 'Kod przejęcia', type: 'text', get: (f) => f.claim_code ?? '' },
  { key: 'spots', label: 'Stanowiska', type: 'number', get: (f) => f.total_spots },
  { key: 'price', label: 'Cena od (zł)', type: 'number', get: (f) => f.price_from },
];

export default function AdminFisheries({ preview }: { preview?: AdminFisheryRow[] } = {}) {
  const [items, setItems] = useState<AdminFisheryRow[]>(preview ?? []);
  const [loading, setLoading] = useState(!preview);
  const [q, setQ] = useState('');
  const [codeFor, setCodeFor] = useState<{ name: string; code: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [edit, setEdit] = useState<AdminFisheryRow | null>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await adminFetchAllFisheries()); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd ładowania', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!preview) load(); }, [preview]);

  // globalna wyszukiwarka (topbar) → potem grid (filtry per-kolumna / Advanced Find / widoki)
  const searched = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((f) => `${f.name} ${f.city} ${f.owner_email ?? ''}`.toLowerCase().includes(s)) : items;
  }, [items, q]);
  const grid = useGrid('admin-fisheries', FIELDS, searched);
  const list = grid.data;

  const stats = useMemo(() => {
    const total = items.length;
    const premium = items.filter((f) => f.premium).length;
    const claimed = items.filter((f) => f.owner_id && !f.owner_is_admin).length;
    const owners = new Set(items.filter((f) => f.owner_id && !f.owner_is_admin).map((f) => f.owner_email)).size;
    return { total, premium, basic: total - premium, claimed, owners };
  }, [items]);

  const isClaimed = claimedOf;

  const setPlan = async (f: AdminFisheryRow, plan: string) => {
    if (plan === f.plan) return;
    if (!(await confirmDialog({ title: 'Zmiana planu', message: `Ustawić plan „${plan}" dla „${f.name}"? Ręcznie, bez płatności (np. komplementarnie).`, confirmLabel: 'Ustaw plan', icon: 'sparkles' }))) return;
    setBusyId(f.id);
    try { await adminSetPlan(f.id, plan as 'basic' | 'premium' | 'pro'); await load(); toast(`Plan: ${plan}`, 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusyId(null); }
  };
  const genCode = async (f: AdminFisheryRow) => {
    setBusyId(f.id);
    try { const code = await adminGenerateCode(f.id); setCodeFor({ name: f.name, code }); load(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Nie udało się wygenerować kodu', 'error'); }
    finally { setBusyId(null); }
  };
  const unassign = async (f: AdminFisheryRow) => {
    if (!(await confirmDialog({ title: 'Odpiąć właściciela?', message: `${f.owner_email} straci dostęp do „${f.name}". Łowisko wróci do katalogu (Basic).`, confirmLabel: 'Odepnij', danger: true }))) return;
    setBusyId(f.id);
    try { await adminUnassignOwner(f.id); await load(); toast('Właściciel odpięty', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusyId(null); }
  };

  const toggleSel = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOnPage = list.length > 0 && list.every((f) => sel.has(f.id));
  const toggleAll = () => setSel((p) => { if (list.every((f) => p.has(f.id))) { const n = new Set(p); list.forEach((f) => n.delete(f.id)); return n; } return new Set([...p, ...list.map((f) => f.id)]); });
  const selItems = items.filter((f) => sel.has(f.id));

  const bulkSetPlan = async (plan: string) => {
    if (!(await confirmDialog({ title: 'Zmiana planu masowo', message: `Ustawić plan „${plan}" dla ${selItems.length} łowisk? Ręcznie, bez płatności.`, confirmLabel: `Ustaw dla ${selItems.length}`, icon: 'sparkles' }))) return;
    setBulkBusy(true);
    try { await Promise.all(selItems.map((f) => adminSetPlan(f.id, plan as 'basic' | 'premium' | 'pro'))); await load(); setSel(new Set()); toast(`Plan „${plan}" ustawiony dla ${selItems.length} łowisk`, 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBulkBusy(false); }
  };
  const bulkGenCodes = async () => {
    const targets = selItems.filter((f) => !isClaimed(f));
    if (targets.length === 0) { toast('Zaznaczone łowiska są już przejęte — brak do czego generować kod.', 'error'); return; }
    if (!(await confirmDialog({ title: 'Generowanie kodów', message: `Wygenerować nowe kody przejęcia dla ${targets.length} łowisk?`, confirmLabel: `Generuj (${targets.length})`, icon: 'key' }))) return;
    setBulkBusy(true);
    try { await Promise.all(targets.map((f) => adminGenerateCode(f.id))); await load(); setSel(new Set()); toast(`Wygenerowano ${targets.length} kodów`, 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBulkBusy(false); }
  };

  const exportCsv = () => {
    const rows = [
      ['Nazwa', 'Miasto', 'Województwo', 'Plan', 'Właściciel', 'Kod', 'Stanowiska', 'Cena od (zł)'],
      ...items.map((f) => [f.name, f.city, f.province, f.premium ? 'Premium' : 'Basic',
        isClaimed(f) ? (f.owner_email ?? '') : (f.owner_is_admin ? 'admin' : '—'),
        f.claim_code ?? '', f.total_spots, f.price_from]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'lowiska.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Łowiska <span className="admin-badge">ADMIN</span></h1><div className="sub">Wszystkie łowiska w bazie — plany, właściciele, kody do przejęcia</div></div>
        <div className="topbar-right">
          <div className="searchbox">
            <Icon name="search" size={16} color={colors.textSecondary} />
            <input placeholder="Szukaj łowiska, miasta lub właściciela…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn ghost" onClick={exportCsv}><Icon name="arrowUp" size={15} /> Eksport (Excel)</button>
          <Link className="btn accent" to="/lowiska/nowe"><Icon name="plus" size={16} /> Dodaj łowisko</Link>
        </div>
      </div>
      <div className="content">
        <div className="grid cols-4" style={{ marginBottom: 16 }}>
          <Stat icon="waves" label="Łowisk w bazie" value={String(stats.total)} />
          <Stat icon="sparkles" label="Premium" value={String(stats.premium)} hint={`${stats.basic} basic`} accent />
          <Stat icon="key" label="Przejęte kodem" value={String(stats.claimed)} hint="zarządzane przez właścicieli" />
          <Stat icon="users" label="Właściciele" value={String(stats.owners)} />
        </div>

        <GridToolbar grid={grid} />
        <div style={{ color: colors.textSecondary, fontSize: 13, margin: '-4px 0 12px' }}>
          {list.length === items.length ? `${items.length} łowisk` : `Pokazano ${list.length} z ${items.length}`}
        </div>

        {sel.size > 0 && (
          <div className="bulk-bar">
            <span className="bulk-count"><b>{sel.size}</b> zaznaczonych</span>
            <span style={{ color: colors.textSecondary, fontSize: 13 }}>Ustaw plan:</span>
            {PLAN_OPTS.map((p) => (
              <button key={p.value} className="chip" disabled={bulkBusy} onClick={() => bulkSetPlan(p.value)}>{p.label}</button>
            ))}
            <button className="btn ghost sm" disabled={bulkBusy} onClick={bulkGenCodes}><Icon name="key" size={14} /> Generuj kody</button>
            <button className="btn ghost sm" disabled={bulkBusy} onClick={() => setSel(new Set())} style={{ marginLeft: 'auto' }}>Wyczyść</button>
          </div>
        )}

        {loading ? <Loader label="Wczytywanie katalogu…" />
          : list.length === 0 ? (
            <div className="card empty"><div className="big"><Icon name="waves" size={26} /></div>
              {q || !grid.isEmpty ? 'Brak łowisk dla tych filtrów.' : 'Brak łowisk — dodaj pierwsze do katalogu.'}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 34 }}><Check on={allOnPage} onClick={toggleAll} label="Zaznacz wszystkie" /></th>
                      <th className="sortable-col"><ColumnHeader field={FIELDS[0]} grid={grid} /></th>
                      <th className="sortable-col"><ColumnHeader field={FIELDS[1]} grid={grid} /></th>
                      <th className="sortable-col"><ColumnHeader field={FIELDS[3]} grid={grid} /></th>
                      <th className="sortable-col"><ColumnHeader field={FIELDS[5]} grid={grid} /></th>
                      <th className="sortable-col"><ColumnHeader field={FIELDS[6]} grid={grid} /></th>
                      <th style={{ textAlign: 'right' }}>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((f) => (
                      <tr key={f.id} style={sel.has(f.id) ? { background: 'var(--accent-soft)' } : undefined}>
                        <td><Check on={sel.has(f.id)} onClick={() => toggleSel(f.id)} label={`Zaznacz ${f.name}`} /></td>
                        <td><b>{f.name}</b></td>
                        <td className="muted">{f.city}</td>
                        <td>
                          <Select value={f.plan} onChange={(v) => setPlan(f, v)} width={120}
                            options={PLAN_OPTS} />
                        </td>
                        <td>
                          {isClaimed(f) ? <span style={{ fontWeight: 600 }}>{f.owner_email}</span>
                            : <span className="muted">Katalog{f.owner_is_admin ? ' (admin)' : ''}</span>}
                        </td>
                        <td>{f.claim_code ? <code style={{ fontWeight: 800, letterSpacing: 1 }}>{f.claim_code}</code> : <span className="muted">—</span>}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                            {!isClaimed(f)
                              ? <button className="btn ghost icon" disabled={busyId === f.id} onClick={() => genCode(f)} title={f.claim_code ? 'Wygeneruj nowy kod przejęcia' : 'Wygeneruj kod przejęcia'}><Icon name="key" size={15} /></button>
                              : <button className="btn ghost icon" disabled={busyId === f.id} onClick={() => unassign(f)} title="Odepnij właściciela"><Icon name="x" size={15} /></button>}
                            <button className="btn ghost icon" onClick={() => setEdit(f)} title="Szybka edycja (nazwa, miasto, ceny)"><Icon name="edit" size={15} /></button>
                            <Link className="btn ghost icon" to={`/lowiska/${f.id}`} title="Pełna edycja (cały formularz)"><Icon name="settings" size={15} /></Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </div>

      {codeFor && (
        <div className="modal-back" onClick={() => setCodeFor(null)}>
          <div className="modal" style={{ maxWidth: 420, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="warnIcon" style={{ background: '#EAF6EF', color: colors.primary, margin: '0 auto 8px' }}><Icon name="key" size={26} /></div>
            <h3>Kod dla „{codeFor.name}"</h3>
            <div className="muted" style={{ fontSize: 13.5, margin: '4px 0 14px' }}>Przekaż ten kod właścicielowi — wpisze go w panelu („Mam kod łowiska"), aby przejąć zarządzanie (Premium).</div>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 4, color: colors.primary, padding: '10px 0' }}>{codeFor.code}</div>
            <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
              <button className="btn ghost" onClick={() => { navigator.clipboard?.writeText(codeFor.code); toast('Skopiowano kod', 'success'); }}><Icon name="layers" size={15} /> Kopiuj</button>
              <button className="btn" onClick={() => setCodeFor(null)}>Gotowe</button>
            </div>
          </div>
        </div>
      )}

      {edit && (
        <QuickEditModal row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
      )}
    </>
  );
}

function Check({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <span
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onClick(); } }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 18, height: 18, borderRadius: 5, cursor: 'pointer', flexShrink: 0,
        border: `1.5px solid ${on ? colors.accent : colors.border}`,
        background: on ? colors.accent : '#fff', transition: 'background .12s, border-color .12s',
      }}
    >
      {on && <Icon name="check" size={12} color="#fff" />}
    </span>
  );
}

function QuickEditModal({ row, onClose, onSaved }: { row: AdminFisheryRow; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(row.name);
  const [city, setCity] = useState(row.city);
  const [province, setProvince] = useState(row.province);
  const [priceFrom, setPriceFrom] = useState(row.price_from != null ? String(row.price_from) : '');
  const [price24h, setPrice24h] = useState('');
  const [priceDay, setPriceDay] = useState('');
  const [priceNight, setPriceNight] = useState('');
  const [busy, setBusy] = useState(false);

  const num = (v: string) => Number(v) || null;

  const save = async () => {
    if (!name.trim()) { toast('Nazwa jest wymagana', 'error'); return; }
    setBusy(true);
    try {
      await adminQuickUpdateFishery({
        id: row.id,
        name: name.trim(),
        city: city.trim(),
        province,
        price_from: num(priceFrom),
        price_24h: num(price24h),
        price_day: num(priceDay),
        price_night: num(priceNight),
      });
      toast('Zapisano', 'success');
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Błąd zapisu', 'error');
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h3>Szybka edycja</h3>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Podstawowe dane i ceny — bez pełnego formularza.</div></div>
          <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>Nazwa</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>Miasto</label>
          <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="field">
          <label>Województwo</label>
          <Select options={PROVINCES.map((p) => ({ value: p, label: p }))} value={province} onChange={setProvince} width="100%" />
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Cena od (zł)</label><input className="input" type="number" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>Doba 24h (zł)</label><input className="input" type="number" value={price24h} onChange={(e) => setPrice24h(e.target.value)} /></div>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}><label>Dzień (zł)</label><input className="input" type="number" value={priceDay} onChange={(e) => setPriceDay(e.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>Nocka (zł)</label><input className="input" type="number" value={priceNight} onChange={(e) => setPriceNight(e.target.value)} /></div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn ghost" onClick={onClose}>Anuluj</button>
          <button className="btn" disabled={busy} onClick={save}><Icon name="check" size={15} /> {busy ? 'Zapisywanie…' : 'Zapisz'}</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, hint, accent }: { icon: IconName; label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.textSecondary, fontSize: 12.5, fontWeight: 600 }}>
        <Icon name={icon} size={15} color={accent ? colors.accent : colors.textSecondary} /> {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, color: accent ? colors.primary : colors.text }}>{value}</div>
      {hint && <div style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
