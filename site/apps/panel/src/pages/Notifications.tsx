import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, type NotifType, type NotifItem } from '../lib/useNotifications';
import { confirmReservation, cancelReservation } from '../lib/api';
import { confirmDialog } from '../components/Confirm';
import { toast } from '../components/Toast';
import Icon from '../components/Icon';
import { colors } from '../theme';

const TYPE_LABEL: Record<NotifType, string> = {
  reservation: 'Rezerwacje', review: 'Opinie', subscription: 'Subskrypcja', season: 'Sezon',
};
const ago = (ts: number) => {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (ts > Date.now()) return new Date(ts).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
  if (d < 60) return 'przed chwilą';
  if (d < 3600) return `${Math.floor(d / 60)} min temu`;
  if (d < 86400) return `${Math.floor(d / 3600)} godz. temu`;
  if (d < 604800) return `${Math.floor(d / 86400)} dni temu`;
  return new Date(ts).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
};

export default function Notifications() {
  const { items, markSeen, dismiss, reload } = useNotifications();
  const nav = useNavigate();
  useEffect(() => { markSeen(); }, [markSeen]);

  const act = async (fn: () => Promise<void>) => {
    try { await fn(); reload(); } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
  };
  const accept = async (n: NotifItem) => {
    if (!n.resId) return;
    if (!(await confirmDialog({ title: 'Potwierdzić rezerwację?', message: `${n.title}. ${n.sub}. Wędkarz zobaczy potwierdzenie w aplikacji.`, confirmLabel: 'Potwierdź rezerwację', icon: 'check' }))) return;
    act(() => confirmReservation(n.resId!).then(() => { toast('Rezerwacja potwierdzona', 'success'); }));
  };
  const reject = async (n: NotifItem) => {
    if (!n.resId) return;
    if (!(await confirmDialog({ title: 'Odrzucić rezerwację?', message: `${n.title}. ${n.sub}. Wędkarz dostanie informację o odrzuceniu w aplikacji.`, confirmLabel: 'Odrzuć', danger: true }))) return;
    act(() => cancelReservation(n.resId!).then(() => { toast('Rezerwacja odrzucona', 'info'); }));
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Powiadomienia</h1><div className="sub">Wszystko, co dzieje się na Twoich łowiskach</div></div>
      </div>
      <div className="content">
        {items.length === 0 ? (
          <div className="card empty"><div className="big"><Icon name="bell" size={26} /></div>Brak nowych powiadomień. Tu pojawią się rezerwacje, opinie i przypomnienia.</div>
        ) : (
          <div className="card" style={{ padding: 8 }}>
            {items.map((n) => {
              const actionable = n.type === 'reservation' && !!n.resId;
              return (
                <div key={n.id} className={`notif-row notif-static${actionable ? ' has-actions' : ''}`}>
                  <button className="notif-open" onClick={() => nav(n.to)}>
                    <span className="notif-ic" style={{ background: `${n.color}1f`, color: n.color }}><Icon name={n.icon} size={17} /></span>
                    <span className="notif-main">
                      <span className="notif-t">{n.title}</span>
                      <span className="notif-s">{n.sub}</span>
                    </span>
                    <span className="notif-meta">
                      <span className="notif-tag" style={{ color: n.color }}>{TYPE_LABEL[n.type]}</span>
                      <span className="notif-when">{ago(n.ts)}</span>
                    </span>
                  </button>
                  {actionable ? (
                    <div className="notif-actions">
                      <button className="btn accent sm" onClick={() => accept(n)}><Icon name="check" size={14} /> Potwierdź</button>
                      <button className="btn ghost sm danger" onClick={() => reject(n)}><Icon name="x" size={14} /> Odrzuć</button>
                    </div>
                  ) : (
                    <div className="notif-actions">
                      <button className="notif-chev" onClick={() => nav(n.to)} aria-label="Otwórz"><Icon name="chevronRight" size={16} color={colors.textSecondary} /></button>
                      <button className="notif-chev" onClick={() => dismiss(n.id)} title="Usuń z powiadomień" aria-label="Usuń"><Icon name="x" size={15} color={colors.textSecondary} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
