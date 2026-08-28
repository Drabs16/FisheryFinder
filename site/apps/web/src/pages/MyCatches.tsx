import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInvites } from '../context/InvitesContext';
import { myCatches, deleteCatch, type CatchReport } from '../lib/catches';
import Icon, { type IconName } from '../components/Icon';
import CompetitionBoard from '../components/CompetitionBoard';
import AppDialog from '../components/AppDialog';

const MS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const fmt = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return `${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear()}`; };

export default function MyCatches() {
  const { user } = useAuth();
  const { count: inviteCount } = useInvites();
  const nav = useNavigate();
  const [items, setItems] = useState<CatchReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'diary' | 'board'>('diary');
  const [delTarget, setDelTarget] = useState<CatchReport | null>(null);

  // Jeśli ktoś Cię zaprosił do rywalizacji — pokaż od razu zakładkę z zaproszeniami.
  const autoBoarded = useRef(false);
  useEffect(() => {
    if (inviteCount > 0 && !autoBoarded.current) { setView('board'); autoBoarded.current = true; }
  }, [inviteCount]);

  const load = useCallback(() => { myCatches().then(setItems).catch(() => setItems([])).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!user) { setLoading(false); return; } setLoading(true); load(); }, [user, load]);

  const remove = async (c: CatchReport) => {
    setDelTarget(null);
    setItems((p) => p.filter((x) => x.id !== c.id));
    try { await deleteCatch(c.id); } catch { load(); }
  };

  if (!user) return <Gate icon="trophy" title="Zaloguj się, aby zobaczyć dziennik połowów" desc="Twoje połowy są wspólne ze stroną i aplikacją mobilną." from="/polowy" />;

  const total = items.length;
  const best = items.reduce((m, c) => (c.weight && c.weight > m ? c.weight : m), 0);
  const waters = new Set(items.map((c) => c.fisheryId)).size;

  return (
    <div style={pageWrap}>
      <div style={{ maxWidth: 'var(--ff-container)', margin: '0 auto', padding: '40px 24px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={h1Style}>Moje połowy</h1>
            <p style={subStyle}>Twój dziennik wędkarski — zdjęcia zasilają galerie i rankingi łowisk.</p>
          </div>
          <button style={primaryBtn} onClick={() => nav('/')}><Icon name="fish" size={18} color="var(--ff-accent)" /> Przeglądaj łowiska</button>
        </div>

        {inviteCount > 0 && view !== 'board' && (
          <button className="invite-banner" onClick={() => setView('board')}>
            <span className="invite-banner-ic"><Icon name="mail" size={17} color="var(--ff-primary)" /></span>
            <span className="invite-banner-txt">
              <b>{inviteCount === 1 ? 'Masz zaproszenie do rywalizacji' : `Masz ${inviteCount} zaproszenia do rywalizacji`}</b>
              <span>Kolega zaprosił Cię do tablicy — dołącz, aby liczyć się w rankingu.</span>
            </span>
            <span className="invite-banner-cta">Zobacz <Icon name="arrowRight" size={15} color="var(--ff-accent)" /></span>
          </button>
        )}

        <div className="seg" style={{ marginBottom: 28 }}>
          <button className={view === 'diary' ? 'on' : ''} onClick={() => setView('diary')}><Icon name="trophy" size={15} /> Dziennik</button>
          <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>
            <Icon name="people" size={15} /> Rywalizacja
            {inviteCount > 0 && <span className="seg-badge">{inviteCount}</span>}
          </button>
        </div>

        {view === 'board' ? <CompetitionBoard /> : loading ? null : total === 0 ? (
          <EmptyCard icon="trophy" title="Dziennik jest pusty" desc='Wejdź na łowisko partnerskie i kliknij „Dodaj połów" — Twoje ryby pojawią się tutaj.' action={<Link to="/" style={primaryBtnInline}>Przeglądaj łowiska</Link>} />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
              <StatTile icon="trophy" value={String(total)} label="Zgłoszonych połowów" />
              <StatTile icon="cash" value={best ? `${best} kg` : '—'} label="Twój rekord" />
              <StatTile icon="pin" value={String(waters)} label="Odwiedzonych łowisk" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {items.map((c) => (
                <div key={c.id} style={{ background: 'var(--ff-surface)', border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-lg)', overflow: 'hidden', boxShadow: 'var(--ff-shadow-sm)' }}>
                  <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--ff-surface-sunken)' }}>
                    {c.photoUrl ? <img src={c.photoUrl} alt={c.species} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--ff-accent)' }}><Icon name="fish" size={34} /></div>}
                    {c.weight != null && <div style={{ position: 'absolute', top: 10, left: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, background: 'rgba(16,28,23,0.78)', color: '#fff', fontWeight: 700, fontSize: 14 }}><Icon name="trophy" size={13} color="#fff" /> {c.weight} kg</div>}
                    <button onClick={() => setDelTarget(c)} title="Usuń połów" style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(16,28,23,0.55)', border: 'none', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="x" size={14} color="#fff" /></button>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{c.species}</div>
                    <Link to={`/lowisko/${c.fisheryId}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13.5, color: 'var(--ff-text-secondary)', margin: '5px 0 2px' }}><Icon name="pin" size={14} /> {c.fisheryName}</Link>
                    <div style={{ fontSize: 12, color: 'var(--ff-text-tertiary)' }}>{fmt(c.caughtOn)}{c.spotNumber != null ? ` · stanowisko ${c.spotNumber}` : ''}</div>
                    {c.note && <div style={{ fontSize: 13, color: 'var(--ff-text)', marginTop: 9, lineHeight: 1.5, paddingTop: 9, borderTop: '1px solid var(--ff-border)' }}>{c.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {delTarget && (
        <AppDialog variant="danger" icon="x" title="Usunąć ten połów?"
          text={`${delTarget.species}${delTarget.weight != null ? ` · ${delTarget.weight} kg` : ''} — ${delTarget.fisheryName}`}
          note="Połów zniknie z dziennika oraz z galerii i rankingów łowiska."
          confirmLabel="Usuń połów" confirmVariant="danger" onConfirm={() => remove(delTarget)}
          cancelLabel="Anuluj" onCancel={() => setDelTarget(null)} />
      )}
    </div>
  );
}

/* ---------- współdzielone (styl prototypu) ---------- */
export const pageWrap: CSSProperties = { background: 'var(--ff-bg)', minHeight: 'calc(100vh - var(--ff-header-height))' };
export const h1Style: CSSProperties = { font: 'var(--ff-weight-extra) 36px var(--font-brand)', letterSpacing: '-0.02em', margin: 0 };
export const subStyle: CSSProperties = { fontSize: 16, color: 'var(--ff-text-secondary)', margin: '8px 0 0' };
export const primaryBtn: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 20px', borderRadius: 'var(--ff-radius-md)', border: 'none', background: 'var(--ff-primary)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: 'var(--ff-shadow-accent)' };
export const primaryBtnInline: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 'var(--ff-radius-md)', border: 'none', background: 'var(--ff-primary)', color: '#fff', fontWeight: 800, fontSize: 14.5, cursor: 'pointer' };

export function StatTile({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 150, background: 'var(--ff-surface)', border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-lg)', padding: '20px 22px', boxShadow: 'var(--ff-shadow-sm)' }}>
      <Icon name={icon} size={22} color="var(--ff-accent)" />
      <div style={{ font: 'var(--ff-weight-extra) 30px var(--font-brand)', letterSpacing: '-0.02em', marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 13.5, color: 'var(--ff-text-secondary)', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export function EmptyCard({ icon, title, desc, action }: { icon: IconName; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', background: 'var(--ff-surface)', border: '1px solid var(--ff-border)', borderRadius: 'var(--ff-radius-xl)', padding: '54px 28px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--ff-green-50)', color: 'var(--ff-primary)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}><Icon name={icon} size={26} /></div>
      <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--ff-text-secondary)', marginTop: 6, marginBottom: action ? 18 : 0 }}>{desc}</div>
      {action}
    </div>
  );
}

export function Gate({ icon, title, desc, from }: { icon: IconName; title: string; desc: string; from: string }) {
  return (
    <div style={{ ...pageWrap, display: 'grid', placeItems: 'center', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--ff-green-50)', color: 'var(--ff-primary)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}><Icon name={icon} size={28} /></div>
        <h2 style={{ fontSize: 22, margin: 0 }}>{title}</h2>
        <p style={{ color: 'var(--ff-text-secondary)', margin: '8px 0 18px' }}>{desc}</p>
        <Link to="/login" state={{ from }} style={primaryBtnInline}>Zaloguj się</Link>
      </div>
    </div>
  );
}
