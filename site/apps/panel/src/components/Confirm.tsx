import { useEffect, useState } from 'react';
import Icon, { type IconName } from './Icon';
import { colors } from '../theme';

interface Opts { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean; icon?: IconName; }
interface State extends Opts { id: number; resolve: (v: boolean) => void; }

let current: State | null = null;
let listeners: ((s: State | null) => void)[] = [];
let seq = 0;
const emit = () => listeners.forEach((l) => l(current));

// Customowy odpowiednik window.confirm — zwraca Promise<boolean>.
export function confirmDialog(opts: Opts): Promise<boolean> {
  return new Promise((resolve) => { current = { id: ++seq, resolve, ...opts }; emit(); });
}
function close(v: boolean) { if (current) { current.resolve(v); current = null; emit(); } }

export function ConfirmHost() {
  const [s, setS] = useState<State | null>(current);
  useEffect(() => { listeners.push(setS); return () => { listeners = listeners.filter((l) => l !== setS); }; }, []);
  useEffect(() => {
    if (!s) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); if (e.key === 'Enter') close(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s]);
  if (!s) return null;
  return (
    <div className="modal-back" style={{ zIndex: 200 }} onClick={() => close(false)}>
      <div className="modal" style={{ maxWidth: 420, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div className="warnIcon" style={{ margin: '0 auto 10px', background: s.danger ? '#FBE9E7' : '#EAF6EF', color: s.danger ? colors.error : colors.primary }}>
          <Icon name={s.icon ?? (s.danger ? 'trash' : 'check')} size={24} />
        </div>
        <h3 style={{ fontSize: 18 }}>{s.title}</h3>
        {s.message && <p className="muted" style={{ fontSize: 14, margin: '8px 0 18px', lineHeight: 1.5 }}>{s.message}</p>}
        <div className="row" style={{ justifyContent: 'center', marginTop: s.message ? 0 : 18 }}>
          <button className="btn ghost" onClick={() => close(false)}>{s.cancelLabel ?? 'Anuluj'}</button>
          <button className={`btn ${s.danger ? 'danger' : ''}`} onClick={() => close(true)}>{s.confirmLabel ?? 'Potwierdź'}</button>
        </div>
      </div>
    </div>
  );
}
