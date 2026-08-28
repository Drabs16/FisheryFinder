import { useState } from 'react';
import { colors } from '../theme';
import Icon from './Icon';

const WD = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (iso: string) => (iso ? new Date(`${iso}T12:00:00`) : new Date());

// Customowy wybór daty (popover z kalendarzem) — zamiast natywnego <input type="date">.
export default function DateField({ value, onChange, min }: { value: string; onChange: (v: string) => void; min?: string }) {
  const [open, setOpen] = useState(false);
  const init = parse(value);
  const [month, setMonth] = useState(init.getMonth());
  const [year, setYear] = useState(init.getFullYear());

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const dim = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  const label = value ? parse(value).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Wybierz datę';

  const prev = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };
  const pick = (d: number) => { const k = isoOf(year, month, d); if (min && k < min) return; onChange(k); setOpen(false); };

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className={`datefield ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)}>
        <Icon name="calendar" size={16} color={colors.accent} />
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        <Icon name="chevronRight" size={14} color={colors.textSecondary} style={{ transform: 'rotate(90deg)' }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div className="df-pop">
            <div className="df-nav">
              <button type="button" className="btn ghost icon" onClick={prev}><Icon name="chevronLeft" size={16} /></button>
              <span>{MONTHS[month]} {year}</span>
              <button type="button" className="btn ghost icon" onClick={next}><Icon name="chevronRight" size={16} /></button>
            </div>
            <div className="df-wd">{WD.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="df-grid">
              {cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} />;
                const k = isoOf(year, month, d);
                const disabled = !!min && k < min;
                const sel = k === value;
                return (
                  <button key={d} type="button" className={`df-day ${sel ? 'sel' : ''} ${disabled ? 'off' : ''}`}
                    onClick={() => pick(d)} disabled={disabled}>{d}</button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
