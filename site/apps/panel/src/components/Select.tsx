import { useState } from 'react';
import { colors } from '../theme';
import Icon, { type IconName } from './Icon';

interface Option { value: string; label: string }

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  icon?: IconName;
  width?: number | string;
  placeholder?: string;
  disabled?: boolean;
}

// Ładny, brandowany dropdown (zamiast natywnego <select>)
export default function Select({ value, onChange, options, icon, width = 260, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <div style={{ position: 'relative', width, opacity: disabled ? 0.5 : 1 }}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px',
          border: `1px solid ${open ? colors.accent : colors.border}`, borderRadius: 12, background: '#fff',
          fontWeight: 700, fontSize: 14.5, color: colors.text, cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(82,183,136,0.18)' : 'none',
        }}>
        {icon && <Icon name={icon} size={17} color={colors.accent} />}
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.label ?? placeholder ?? 'Wybierz…'}
        </span>
        <Icon name={open ? 'chevronLeft' : 'chevronRight'} size={15} color={colors.textSecondary}
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(90deg)' }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 41, background: '#fff',
            border: `1px solid ${colors.border}`, borderRadius: 12, boxShadow: '0 12px 34px rgba(16,24,40,0.14)',
            overflow: 'hidden', maxHeight: 280, overflowY: 'auto',
          }}>
            {options.map((o) => (
              <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  padding: '11px 14px', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  background: o.value === value ? colors.accentSoft : '#fff', fontWeight: o.value === value ? 700 : 500,
                  color: o.value === value ? colors.primary : colors.text,
                }}
                onMouseEnter={(e) => { if (o.value !== value) e.currentTarget.style.background = '#F6FAF8'; }}
                onMouseLeave={(e) => { if (o.value !== value) e.currentTarget.style.background = '#fff'; }}>
                {o.value === value && <Icon name="check" size={15} color={colors.accent} />}
                <span style={{ marginLeft: o.value === value ? 0 : 23 }}>{o.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
