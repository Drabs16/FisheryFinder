import { useState } from 'react';
import { paymentKind, reservationStatus, ownerBlockUser } from '../lib/api';
import { colors, PAY, STATUS } from '../theme';
import Icon, { type IconName } from './Icon';
import { toast } from './Toast';
import { confirmDialog } from './Confirm';
import type { Reservation } from '../lib/types';

const zl = (n: number) => `${Math.round(Number(n)).toLocaleString('pl-PL')} zł`;
const fmt = (d: string) => new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });
const initials = (s: string) => s.trim().split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase() || 'W';

interface Props {
  r: Reservation;
  checkInHour?: number | null;
  onClose: () => void;
  onConfirm?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  onRemoveBlock?: () => Promise<void>;
}

const fmtDH = (iso: string, addDays: number, hour: number) => {
  const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + addDays);
  return `${d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })} ${String(hour).padStart(2, '0')}:00`;
};

export default function ReservationModal({ r, checkInHour, onClose, onConfirm, onCancel, onRemoveBlock }: Props) {
  const isBlock = r.payment === 'block';
  const key = reservationStatus(r);
  const st = STATUS[key];
  const pay = PAY[paymentKind(r)];
  const [busy, setBusy] = useState(false);
  const run = (fn?: () => Promise<void>) => async () => {
    if (!fn) return;
    setBusy(true);
    try { await fn(); } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); setBusy(false); }
  };
  const block = async () => {
    const who = r.name || r.phone || 'tego wędkarza';
    if (!(await confirmDialog({ title: 'Zablokować wędkarza?', message: `${who} nie będzie mógł rezerwować „${r.fishery_name}" online. Możesz to cofnąć w Klienci → Zablokowani.`, confirmLabel: 'Zablokuj', danger: true }))) return;
    setBusy(true);
    try {
      await ownerBlockUser(r.fishery_id, { userId: r.user_id, phone: r.phone, name: r.name });
      toast('Wędkarz zablokowany na tym łowisku', 'success');
      onClose();
    } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); setBusy(false); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="ava-sm" style={{ width: 44, height: 44, fontSize: 15 }}>
              {isBlock ? <Icon name="lock" size={18} /> : initials(r.name || 'W')}
            </div>
            <div>
              <h3 style={{ fontSize: 18 }}>{isBlock ? 'Blokada stanowisk' : (r.name || 'Wędkarz')}</h3>
              <div className="badge" style={{ background: '#F3F4F6', color: st.color, marginTop: 4 }}>
                <span className="dot" style={{ background: st.color }} /> {st.label}
              </div>
            </div>
          </div>
          <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 11, fontSize: 14 }}>
          <Info icon="fish" text={r.fishery_name} />
          <Info icon="calendar" text={`${fmt(r.date_from)}${r.date_from !== r.date_to ? ' – ' + fmt(r.date_to) : ''} · ${r.days} ${r.days === 1 ? 'doba' : 'doby'}`} />
          {!isBlock && (
            <Info icon="clock" text={`Doba od ${String(checkInHour ?? 12).padStart(2, '0')}:00 · zameldowanie ${fmtDH(r.date_from, 0, checkInHour ?? 12)} → wymeldowanie ${fmtDH(r.date_to, 1, checkInHour ?? 12)}`} />
          )}
          <Info icon="layers" text={`Stanowiska: ${r.spots?.join(', ') || '—'}`} />
          {r.phone && <Info icon="phone" text={r.phone} />}
          {!isBlock && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="tag" size={16} color={colors.textSecondary} />
              <b style={{ fontSize: 16 }}>{zl(r.total)}</b>
              <span className="badge" style={{ background: '#F3F4F6', color: pay.color }}>
                <span className="dot" style={{ background: pay.color }} /> {pay.label}
              </span>
            </div>
          )}
          {!isBlock && r.addons && r.addons.length > 0 && (
            <Info icon="tag" text={`Dodatki: ${r.addons.map((a) => `${a.label} (+${a.price} zł)`).join(', ')}`} />
          )}
          {!isBlock && r.confirmed_at && (
            <Info icon="check" text={`Potwierdzona ${new Date(r.confirmed_at).toLocaleDateString('pl-PL')}`} />
          )}
          {r.shared_with && r.shared_with.length > 0 && <Info icon="users" text={`Udostępniono: ${r.shared_with.join(', ')}`} />}
        </div>

        <div className="row" style={{ marginTop: 22, justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {!isBlock && (r.user_id || r.phone) && (
              <button className="btn ghost sm" disabled={busy} onClick={block} style={{ color: colors.error }} title="Zablokuj na tym łowisku">
                <Icon name="lock" size={14} color={colors.error} /> Zablokuj wędkarza
              </button>
            )}
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            {isBlock ? (
              <button className="btn danger" disabled={busy} onClick={run(onRemoveBlock)}>
                <Icon name="trash" size={15} /> Usuń blokadę
              </button>
            ) : (
              <>
                {key === 'new' && onConfirm && (
                  <button className="btn accent" disabled={busy} onClick={run(onConfirm)}>
                    <Icon name="check" size={15} /> Potwierdź rezerwację
                  </button>
                )}
                {r.status !== 'cancelled' && onCancel && (
                  <button className="btn danger" disabled={busy} onClick={run(onCancel)}>
                    <Icon name="x" size={15} /> Anuluj
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon, text }: { icon: IconName; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: colors.text }}>
      <Icon name={icon} size={16} color={colors.textSecondary} /> {text}
    </div>
  );
}
