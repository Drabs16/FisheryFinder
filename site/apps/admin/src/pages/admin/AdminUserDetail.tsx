import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminUserDetail, adminAddUserNote, adminDeleteUserNote, adminSetUserStatus, adminSetPlan, type UserDetail } from '../../lib/api';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/Confirm';
import Loader from '../../components/Loader';
import Icon from '../../components/Icon';
import { colors } from '../../theme';

type Sub = UserDetail['subscriptions'][number];

const STATUSES: { key: string; label: string; bg: string; fg: string }[] = [
  { key: 'lead', label: 'Potencjalny', bg: '#DBEAFE', fg: '#1E40AF' },
  { key: 'active', label: 'Aktywny', bg: '#D1FAE5', fg: '#065F46' },
  { key: 'overdue', label: 'Zaległość', bg: '#FEF3C7', fg: '#92400E' },
  { key: 'blocked', label: 'Zablokowany', bg: '#FEE2E2', fg: '#991B1B' },
];

const zl = (n: number) => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
const zl0 = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('pl-PL')} zł`;
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' }) : '—');
const fmtShort = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' }) : '—');
const PLAN_LABEL: Record<string, string> = { basic: 'Basic', premium: 'Premium', pro: 'Pro' };
const METHOD_LABEL: Record<string, string> = { blik: 'BLIK', applepay: 'Apple Pay', googlepay: 'Google Pay', p24: 'Przelewy24' };
const planPrice = (plan: string, billing: string | null) =>
  plan === 'pro' ? (billing === 'yearly' ? 1490 : 149) : plan === 'premium' ? (billing === 'yearly' ? 990 : 99) : 0;
const amountOf = (s: Sub) => (s.amount != null ? s.amount : planPrice(s.plan, s.billing));

export default function AdminUserDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Sub | null>(null);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    adminUserDetail(id).then(setD).catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error')).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { setLoading(true); load(); }, [load]);

  const setStatus = async (status: string) => {
    if (!id) return;
    const next = d?.profile?.admin_status === status ? '' : status;
    try { await adminSetUserStatus(id, next); load(); } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
  };
  const setPlan = async (fisheryId: string, fisheryName: string, plan: 'basic' | 'premium' | 'pro') => {
    if (!(await confirmDialog({
      title: 'Ręczna zmiana planu?',
      message: `Ustawić plan „${PLAN_LABEL[plan]}" dla łowiska „${fisheryName}"? Normalnie plan wynika z subskrypcji wykupionej przez właściciela — użyj tego tylko jako wyjątek (rozliczenie poza systemem, korekta).`,
      confirmLabel: `Ustaw ${PLAN_LABEL[plan]}`,
    }))) return;
    try { await adminSetPlan(fisheryId, plan); load(); toast(`Plan „${PLAN_LABEL[plan]}" ustawiony`, 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
  };
  const addNote = async () => {
    if (!id || !note.trim()) return;
    setSavingNote(true);
    try { await adminAddUserNote(id, note.trim()); setNote(''); load(); toast('Notatka dodana', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setSavingNote(false); }
  };
  const delNote = async (noteId: string) => {
    if (!(await confirmDialog({ title: 'Usunąć notatkę?', message: 'Tej operacji nie można cofnąć.', confirmLabel: 'Usuń', danger: true }))) return;
    try { await adminDeleteUserNote(noteId); load(); } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
  };

  if (loading) return (<><Top onBack={() => nav('/uzytkownicy')} /><div className="content"><Loader label="Wczytywanie profilu…" /></div></>);
  if (!d || !d.profile) return (<><Top onBack={() => nav('/uzytkownicy')} /><div className="content"><div className="card empty">Nie znaleziono użytkownika.</div></div></>);

  const p = d.profile;
  const isOwner = d.is_owner;
  const mrr = d.fisheries.reduce((s, f) => s + planPrice(f.plan, 'monthly'), 0);
  const realRes = d.reservations.filter((r) => r.status !== 'cancelled' && r.payment !== 'block');
  const spent = realRes.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const lastVisit = realRes.length ? [...realRes.map((r) => r.date_from)].sort().slice(-1)[0] ?? null : null;
  const favFishery = (() => {
    const c: Record<string, number> = {};
    for (const r of realRes) { const k = r.fishery_name || '—'; c[k] = (c[k] ?? 0) + 1; }
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  })();

  return (
    <>
      <Top onBack={() => nav('/uzytkownicy')} />
      <div className="content">
        {/* Nagłówek profilu */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="ava-lg">{(p.name || p.email || '?').trim().split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>{p.business_name || p.name || (isOwner ? 'Właściciel' : 'Wędkarz')}</h2>
              <span className="badge" style={{ background: isOwner ? colors.primary : colors.accent, color: '#fff' }}>{isOwner ? 'Właściciel łowiska' : 'Wędkarz'}</span>
              {p.admin_status && (() => { const s = STATUSES.find((x) => x.key === p.admin_status); return s ? <span className="badge" style={{ background: s.bg, color: s.fg }}>{s.label}</span> : null; })()}
            </div>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{p.email} · w bazie od {fmtDate(p.created_at)}</div>
            <div className="row" style={{ gap: 6, marginTop: 10 }}>
              <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>Status:</span>
              {STATUSES.map((s) => (
                <span key={s.key} className={`chip ${p.admin_status === s.key ? 'on' : ''}`} onClick={() => setStatus(s.key)}>{s.label}</span>
              ))}
            </div>
          </div>
          {isOwner && (
            <div style={{ textAlign: 'right' }}>
              <div className="muted" style={{ fontSize: 12 }}>Płaci nam</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: colors.primary }}>{mrr > 0 ? `${zl0(mrr)}/mc` : '—'}</div>
            </div>
          )}
        </div>

        {/* Dane */}
        <div className="grid cols-2" style={{ marginTop: 16 }}>
          <Card title="Kontakt" icon="phone">
            <Info label="Imię i nazwisko" value={p.name} />
            <Info label="E-mail" value={p.email} />
            <Info label="Telefon" value={p.phone} />
            <Info label="Miasto" value={p.city} />
            <Info label="Województwo" value={p.province} />
          </Card>
          <Card title={isOwner ? 'Dane firmy' : 'Konto'} icon="tag">
            {isOwner ? (<>
              <Info label="Nazwa firmy" value={p.business_name} />
              <Info label="NIP" value={p.nip} />
              <Info label="Dołączył" value={fmtDate(p.created_at)} />
            </>) : (<>
              <Info label="Wydał łącznie" value={zl0(spent)} />
              <Info label="Rezerwacje" value={String(realRes.length)} />
              <Info label="Ostatnia wizyta" value={lastVisit ? fmtDate(`${lastVisit}T12:00:00`) : null} />
              <Info label="Ulubione łowisko" value={favFishery} />
              <Info label="Dołączył" value={fmtDate(p.created_at)} />
            </>)}
          </Card>
        </div>

        {isOwner && (
          <>
            {/* Łowiska + ręczne ustawienie planu */}
            <Card title={`Łowiska (${d.fisheries.length})`} icon="waves" style={{ marginTop: 16 }}>
              {d.fisheries.length === 0 ? <div className="muted">Brak przypisanych łowisk.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {d.fisheries.map((f) => (
                    <div key={f.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '11px 13px', border: `1px solid ${colors.border}`, borderRadius: 10, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 160 }}>
                        <div style={{ fontWeight: 700 }}>{f.name}</div>
                        <div className="muted" style={{ fontSize: 12.5 }}>{f.city || '—'} · {f.total_spots} stanowisk{f.price_from ? ` · od ${f.price_from} zł` : ''}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="muted" style={{ fontSize: 11.5 }}>Plan:</span>
                        <div className="seg">
                          {(['basic', 'premium', 'pro'] as const).map((pl) => (
                            <button key={pl} className={`seg-btn ${f.plan === pl ? 'on' : ''}`} onClick={() => f.plan !== pl && setPlan(f.id, f.name, pl)} title={`Ustaw plan ${PLAN_LABEL[pl]}`}>{PLAN_LABEL[pl]}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="muted" style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Icon name="lock" size={12} /> Zmiana planu tutaj to ręczne nadpisanie (wyjątek). Normalnie plan wykupuje właściciel w zakładce Subskrypcja.
                  </div>
                </div>
              )}
            </Card>

            {/* Płatności */}
            <Card title="Płatności / subskrypcje" icon="card" style={{ marginTop: 16 }}>
              {d.subscriptions.length === 0 ? <div className="muted">Brak płatności. Łowiska na planie Basic nie generują opłat.</div> : (
                <table className="tbl">
                  <thead><tr><th>Łowisko</th><th>Plan</th><th>Cykl</th><th>Kwota</th><th>Metoda</th><th>Status</th><th>Następna</th><th style={{ textAlign: 'right' }}>Faktura</th></tr></thead>
                  <tbody>
                    {d.subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.fishery_name || '—'}</td>
                        <td><PlanPill plan={s.plan} /></td>
                        <td>{s.billing === 'yearly' ? 'Rocznie' : 'Miesięcznie'}</td>
                        <td style={{ fontWeight: 700 }}>{zl0(amountOf(s))}</td>
                        <td>{s.method ? (METHOD_LABEL[s.method] ?? s.method) : '—'}</td>
                        <td><span className="badge" style={{ background: s.status === 'active' ? colors.accentSoft : '#F3F4F6', color: s.status === 'active' ? colors.primary : colors.textSecondary }}>{s.status === 'active' ? 'Aktywna' : 'Anulowana'}</span></td>
                        <td style={{ fontSize: 12.5, color: colors.textSecondary }}>{s.status === 'active' ? fmtShort(s.current_period_end) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn ghost sm" onClick={() => setInvoice(s)}><Icon name="image" size={14} /> Wystaw</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </>
        )}

        {/* Rezerwacje (oba: u wędkarza to jego wizyty) */}
        <Card title={`Rezerwacje (${realRes.length})`} icon="list" style={{ marginTop: 16 }}>
          {d.reservations.length === 0 ? <div className="muted">Brak rezerwacji.</div> : (
            <table className="tbl">
              <thead><tr><th>Łowisko</th><th>Termin</th><th>Stan.</th><th>Kwota</th><th>Status</th></tr></thead>
              <tbody>
                {d.reservations.map((r) => (
                  <tr key={r.id}>
                    <td>{r.fishery_name}</td>
                    <td>{fmtShort(r.date_from)} – {fmtShort(r.date_to)}</td>
                    <td>{r.spots?.join(', ') || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{r.payment === 'block' ? '—' : zl0(r.total)}</td>
                    <td><span className="badge" style={{ background: r.status === 'cancelled' ? '#FEE2E2' : colors.accentSoft, color: r.status === 'cancelled' ? colors.error : colors.primary }}>{r.status === 'cancelled' ? 'Anulowana' : r.payment === 'block' ? 'Blokada' : 'Aktywna'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Notatki wewnętrzne (tylko admin) */}
        <Card title="Notatki wewnętrzne" icon="list" style={{ marginTop: 16 }}>
          <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <textarea className="input" rows={2} placeholder="Dodaj notatkę (widoczna tylko dla administratorów)…"
              value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1, resize: 'vertical', minHeight: 44 }} />
            <button className="btn accent" disabled={savingNote || !note.trim()} onClick={addNote} style={{ flexShrink: 0 }}>
              <Icon name="plus" size={15} /> Dodaj
            </button>
          </div>
          {d.notes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              {d.notes.map((n) => (
                <div key={n.id} style={{ padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 10, background: 'var(--background)' }}>
                  <div style={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{n.body}</div>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span className="muted" style={{ fontSize: 11.5 }}>{n.author_email || 'admin'} · {fmtDate(n.created_at)}</span>
                    <button className="btn ghost sm" onClick={() => delNote(n.id)}><Icon name="trash" size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {invoice && <InvoiceModal sub={invoice} owner={p} onClose={() => setInvoice(null)} />}
    </>
  );
}

function Top({ onBack }: { onBack: () => void }) {
  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn ghost icon" onClick={onBack}><Icon name="chevronLeft" size={18} /></button>
        <div><h1>Profil użytkownika</h1><div className="sub">Pełne dane, płatności i faktury</div></div>
      </div>
    </div>
  );
}

function Card({ title, icon, children, style }: { title: string; icon: 'phone' | 'tag' | 'waves' | 'card' | 'list'; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={style}>
      <div className="card-head"><div className="card-title"><span className="ico"><Icon name={icon} size={18} /></span> {title}</div></div>
      {children}
    </div>
  );
}
function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F1F3F2' }}>
      <span className="muted" style={{ fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{value || '—'}</span>
    </div>
  );
}
function PlanPill({ plan }: { plan: string }) {
  const bg = plan === 'pro' ? colors.primary : plan === 'premium' ? colors.accent : '#E5E7EB';
  const fg = plan === 'basic' ? colors.textSecondary : '#fff';
  return <span className="badge" style={{ background: bg, color: fg }}>{PLAN_LABEL[plan] ?? plan}</span>;
}

// --- Faktura (poglądowa, do druku/PDF) ---
function InvoiceModal({ sub, owner, onClose }: { sub: Sub; owner: NonNullable<UserDetail['profile']>; onClose: () => void }) {
  const gross = amountOf(sub);
  const net = gross / 1.23;
  const vat = gross - net;
  const issue = new Date();
  const num = `FF/${issue.getFullYear()}/${String(issue.getMonth() + 1).padStart(2, '0')}/${sub.id.slice(0, 6).toUpperCase()}`;
  const period = sub.billing === 'yearly' ? 'rok' : 'miesiąc';

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal invoice-print" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="inv-toolbar">
          <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>Faktura poglądowa (tryb testowy)</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={() => window.print()}><Icon name="image" size={15} /> Drukuj / PDF</button>
            <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
        </div>

        <div className="invoice">
          <div className="inv-head">
            <div>
              <div className="inv-logo"><img src="/logo-fish.png" alt="" /> FISHERY FINDER</div>
              <div className="inv-meta">Faktura nr <b>{num}</b></div>
            </div>
            <div style={{ textAlign: 'right' }} className="inv-meta">
              Data wystawienia: <b>{fmtDate(issue.toISOString())}</b><br />
              Data sprzedaży: <b>{fmtDate(sub.created_at)}</b><br />
              Termin płatności: <b>{fmtDate(issue.toISOString())}</b>
            </div>
          </div>

          <div className="inv-parties">
            <div>
              <div className="inv-label">Sprzedawca</div>
              <div className="inv-party"><b>Fishery Finder Sp. z o.o.</b><br />ul. Przykładowa 1, 00-000 Warszawa<br />NIP: 000-000-00-00<br /><span className="muted">(dane firmowe do uzupełnienia)</span></div>
            </div>
            <div>
              <div className="inv-label">Nabywca</div>
              <div className="inv-party"><b>{owner.business_name || owner.name || '—'}</b><br />{owner.nip ? `NIP: ${owner.nip}` : <span className="muted">NIP: brak w profilu</span>}<br />{owner.email}</div>
            </div>
          </div>

          <table className="inv-table">
            <thead><tr><th>Nazwa usługi</th><th>Okres</th><th className="r">Netto</th><th className="r">VAT 23%</th><th className="r">Brutto</th></tr></thead>
            <tbody>
              <tr>
                <td>Subskrypcja {PLAN_LABEL[sub.plan] ?? sub.plan} — {sub.fishery_name || 'łowisko'}</td>
                <td>1 {period}</td>
                <td className="r">{zl(net)}</td>
                <td className="r">{zl(vat)}</td>
                <td className="r">{zl(gross)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td colSpan={4} className="r">Razem netto</td><td className="r">{zl(net)}</td></tr>
              <tr><td colSpan={4} className="r">VAT 23%</td><td className="r">{zl(vat)}</td></tr>
              <tr className="inv-total"><td colSpan={4} className="r">Razem do zapłaty</td><td className="r">{zl(gross)}</td></tr>
            </tfoot>
          </table>

          <div className="inv-foot">
            Sposób płatności: {sub.method ? (METHOD_LABEL[sub.method] ?? sub.method) : 'online'} ·
            Dokument wygenerowany w trybie testowym — po podłączeniu realnych płatności i danych spółki będzie pełnoprawną fakturą VAT.
          </div>
        </div>
      </div>
    </div>
  );
}
