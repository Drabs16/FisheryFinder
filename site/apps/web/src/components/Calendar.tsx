import { useState } from 'react';
import Icon from './Icon';
import { colors } from '../theme';

const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseIso = (iso: string) => new Date(`${iso}T12:00:00`);

interface Props {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
  dot?: (iso: string) => string | null;   // kolor kropki dostępności (opcjonalnie)
  single?: boolean;                        // tryb pojedynczego dnia (dzień/nocka) — bez zakresu
}

// Własny kalendarz miesięczny z zaznaczaniem zakresu dat (Pn-pierwszy).
export default function Calendar({ from, to, onChange, dot, single = false }: Props) {
  const today = new Date();
  const tIso = isoOf(today.getFullYear(), today.getMonth(), today.getDate());
  const init = from ? parseIso(from) : today;
  const [month, setMonth] = useState(init.getMonth());
  const [year, setYear] = useState(init.getFullYear());

  const [hover, setHover] = useState<string | null>(null);

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const dim = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const canPrev = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());
  const prev = () => { if (!canPrev) return; if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  const handle = (d: number) => {
    const k = isoOf(year, month, d);
    if (k < tIso) return;
    if (single) { onChange(k === from ? null : k, null); return; }   // jeden dzień: klik = wybór/odznaczenie
    if (!from || (from && to)) onChange(k, null);
    else if (k < from) onChange(k, from);
    else if (k === from) onChange(k, null);
    else onChange(from, k);
  };

  return (
    <div>
      <div className="month-nav">
        <button onClick={prev} disabled={!canPrev} style={{ opacity: canPrev ? 1 : 0.4 }}><Icon name="chevronLeft" size={18} color={colors.primary} /></button>
        <span className="lbl">{MONTHS[month]} {year}</span>
        <button onClick={next}><Icon name="chevronRight" size={18} color={colors.primary} /></button>
      </div>
      <div className="cal-week-head">{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>
      <div onMouseLeave={() => setHover(null)}>
      {weeks.map((w, wi) => (
        <div className="cal-week" key={wi}>
          {w.map((d, di) => {
            if (!d) return <div key={di} className="cal-day" />;
            const k = isoOf(year, month, d);
            const past = k < tIso;
            const isFrom = k === from, isTo = k === to;
            // podgląd zakresu: gdy wybrano start, a nie ma końca — podświetlaj do dnia pod kursorem
            const previewing = !single && !!from && !to && !!hover && hover > from;
            const inRange = (!!from && !!to && k > from && k < to) || (previewing && k > from && k < hover!);
            const isHoverEnd = previewing && k === hover;
            const edge = isFrom || isTo || isHoverEnd;
            // zaokrąglone końce wstęgi zakresu (gdy istnieje zakres / podgląd)
            const hasSpan = !!from && (!!to || (previewing && !!hover && hover > from));
            const rStart = isFrom && hasSpan;
            const rEnd = isTo || isHoverEnd;
            const dotColor = !past && !edge && dot ? dot(k) : null;
            return (
              <div
                key={di}
                className={`cal-day ${past ? 'past' : ''} ${inRange ? 'range' : ''} ${edge ? 'edge' : ''} ${rStart ? 'r-start' : ''} ${rEnd ? 'r-end' : ''}`}
                onClick={() => !past && handle(d)}
                onMouseEnter={() => !past && setHover(k)}
              >
                <span className="num">{d}</span>
                {dotColor && <span className="dot" style={{ background: dotColor }} />}
              </div>
            );
          })}
        </div>
      ))}
      </div>
    </div>
  );
}
