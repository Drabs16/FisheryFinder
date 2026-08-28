import { useMemo, useState } from 'react';
import Icon from './Icon';
import { colors } from '../theme';
import type { Reservation } from '../lib/types';

const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
const pad = (n: number) => String(n).padStart(2, '0');
const parseIso = (iso: string) => new Date(`${iso}T12:00:00`);

// Kalendarz rezerwacji: zielony pas zakresu (przyjazd→wyjazd) jak w apce + klik = wybór rezerwacji.
export default function ReservationsCalendar({ reservations, selectedId, onSelect }: {
  reservations: Reservation[]; selectedId?: string | null; onSelect?: (r: Reservation | null) => void;
}) {
  const events = useMemo(() => reservations.filter((r) => r.status !== 'cancelled'), [reservations]);
  const initRes = events.find((r) => r.id === selectedId) || events.find((r) => r.status === 'upcoming') || events[0];
  const initDate = initRes ? parseIso(initRes.dateFrom) : new Date();
  const [month, setMonth] = useState(initDate.getMonth());
  const [year, setYear] = useState(initDate.getFullYear());

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const dim = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const isoFor = (d: number) => `${year}-${pad(month + 1)}-${pad(d)}`;
  const resOnDay = (iso: string) => events.find((r) => iso >= r.dateFrom && iso <= r.dateTo) || null;
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const prev = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  return (
    <div>
      <div className="month-nav">
        <button onClick={prev}><Icon name="chevronLeft" size={18} color={colors.primary} /></button>
        <span className="lbl">{MONTHS[month]} {year}</span>
        <button onClick={next}><Icon name="chevronRight" size={18} color={colors.primary} /></button>
      </div>
      <div className="cal-week-head">{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="rcal-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="rcal-cell" />;
          const iso = isoFor(day);
          const r = resOnDay(iso);
          const isStart = r && iso === r.dateFrom;
          const isEnd = r && iso === r.dateTo;
          const isSel = r && r.id === selectedId;
          const isToday = iso === todayIso;
          const cls = ['rcal-cell',
            r ? 'inres' : '', isSel ? 'sel' : '', isStart ? 'start' : '', isEnd ? 'end' : '',
          ].filter(Boolean).join(' ');
          return (
            <div key={`d${day}`} className={cls} onClick={() => r && onSelect?.(r)} role={r ? 'button' : undefined}>
              <span className={`d ${isToday ? 'today' : ''}`}>{day}</span>
              <span className="rcal-cap">{isStart && isEnd ? '1 dzień' : isStart ? 'Przyj.' : isEnd ? 'Wyj.' : ''}</span>
            </div>
          );
        })}
      </div>
      {events.length === 0 && (
        <div className="rcal-hint"><Icon name="calendar" size={15} color={colors.textSecondary} /> Brak rezerwacji w kalendarzu</div>
      )}
    </div>
  );
}
