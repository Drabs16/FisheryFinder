import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useOwnerData } from '../lib/useOwnerData';
import { newReservations, confirmReservation } from '../lib/api';
import { colors } from '../theme';
import { toast } from './Toast';
import Icon from './Icon';

const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });

// Relatywny termin wizyty — żeby właściciel od razu wiedział, co jest pilne.
const whenLabel = (d: string) => {
  const day = new Date(`${d}T12:00:00`);
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (diff < -1) return `${-diff} dni temu`;
  if (diff === -1) return 'wczoraj';
  if (diff === 0) return 'dziś';
  if (diff === 1) return 'jutro';
  if (diff < 7) return `za ${diff} dni`;
  return fmt(d);
};

// Dzwonek powiadomień: nowe rezerwacje do potwierdzenia.
export default function Notifications() {
  const { reservations, reload } = useOwnerData();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [busy, setBusy] = useState<string | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const nav = useNavigate();
  const news = newReservations(reservations);

  // Dymek renderujemy przez portal do body, więc pozycję liczymy z położenia dzwonka.
  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next && bellRef.current) {
        const r = bellRef.current.getBoundingClientRect();
        const left = Math.max(8, Math.min(r.left, window.innerWidth - 346));
        setPos({ top: r.bottom + 8, left });
      }
      return next;
    });
  };

  const confirm = async (id: string) => {
    setBusy(id);
    try {
      await confirmReservation(id);
      reload();
      toast('Rezerwacja potwierdzona. Wędkarz otrzyma powiadomienie.', 'success');
    } catch {
      toast('Nie udało się potwierdzić. Spróbuj ponownie.', 'error');
    } finally { setBusy(null); }
  };

  return (
    <div className="notif">
      <button ref={bellRef} className="notif-bell" onClick={toggle} title="Powiadomienia">
        <Icon name="bell" size={18} color="#fff" />
        {news.length > 0 && <span className="notif-badge">{news.length}</span>}
      </button>
      {open && createPortal(
        <>
          <div className="notif-overlay" onClick={() => setOpen(false)} />
          <div className="notif-pop" style={{ position: 'fixed', top: pos.top, left: pos.left }}>
            <div className="notif-head"><b>Powiadomienia</b>{news.length > 0 && <span className="muted">{news.length} do potwierdzenia</span>}</div>
            {news.length === 0 ? (
              <div className="notif-empty"><Icon name="check" size={18} color={colors.accent} /> Brak rezerwacji oczekujących na potwierdzenie.</div>
            ) : (
              <>
                {news.slice(0, 8).map((r) => (
                  <div className="notif-item" key={r.id}>
                    <span className="ni-dot" />
                    <div className="ni-body" onClick={() => { setOpen(false); nav('/rezerwacje'); }}>
                      <div className="ni-t">Nowa rezerwacja — {r.name || 'Wędkarz'}</div>
                      <div className="ni-s">{r.fishery_name} · wizyta {whenLabel(r.date_from)} · stan. {r.spots?.join(', ') || '—'}</div>
                    </div>
                    <button className="btn accent sm" disabled={busy === r.id} onClick={() => confirm(r.id)} title="Potwierdź rezerwację"><Icon name="check" size={13} /></button>
                  </div>
                ))}
                <button className="btn ghost sm" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={() => { setOpen(false); nav('/rezerwacje'); }}>
                  Przejdź do wszystkich rezerwacji
                </button>
              </>
            )}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
