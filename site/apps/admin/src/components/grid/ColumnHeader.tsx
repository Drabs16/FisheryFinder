import { useState } from 'react';
import { colors } from '../../theme';
import Icon from '../Icon';
import Select from '../Select';
import { type FieldDef, type Op, OPS_BY_TYPE, OP_LABEL, NEEDS_VALUE } from '../../lib/grid';
import type { GridApi } from '../../lib/useGrid';

// Nagłówek kolumny: etykieta + wskaźnik sortowania + menu (sortuj / filtruj po kolumnie).
export default function ColumnHeader<T>({ field, grid, align = 'left' }: { field: FieldDef<T>; grid: GridApi<T>; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const sort = grid.state.sort;
  const sorted = sort?.key === field.key ? sort.dir : null;
  const filter = grid.state.columnFilters[field.key];
  const active = !!filter;

  const ops = OPS_BY_TYPE[field.type];
  const [op, setOp] = useState<Op>(filter?.op ?? ops[0]);
  const [value, setValue] = useState(filter?.value ?? '');

  const apply = () => {
    if (NEEDS_VALUE(op) && value.trim() === '') { grid.clearColumnFilter(field.key); }
    else grid.setColumnFilter(field.key, op, value);
    setOpen(false);
  };
  const clear = () => { grid.clearColumnFilter(field.key); setValue(''); setOp(ops[0]); setOpen(false); };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, position: 'relative', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', width: '100%' }}>
      <button type="button" onClick={() => grid.cycleSort(field.key)}
        style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textTransform: 'inherit', letterSpacing: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {field.label}
        {sorted && <Icon name={sorted === 'asc' ? 'sortAsc' : 'sortDesc'} size={13} color={colors.accent} />}
      </button>
      <button type="button" onClick={() => setOpen((o) => !o)} title="Filtruj / sortuj kolumnę"
        style={{ border: 'none', background: active ? colors.accent : 'transparent', borderRadius: 6, padding: 2, cursor: 'pointer', display: 'inline-flex', color: active ? '#fff' : colors.textSecondary }}>
        <Icon name="chevronDown" size={13} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setOpen(false)} />
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'absolute', top: 'calc(100% + 8px)', [align === 'right' ? 'right' : 'left']: 0, zIndex: 61,
            width: 244, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12,
            boxShadow: '0 14px 38px rgba(16,24,40,0.16)', padding: 12, textTransform: 'none', letterSpacing: 'normal',
          }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <SortBtn label="Rosnąco" icon="sortAsc" on={sorted === 'asc'} onClick={() => { grid.setSort(field.key, 'asc'); setOpen(false); }} />
              <SortBtn label="Malejąco" icon="sortDesc" on={sorted === 'desc'} onClick={() => { grid.setSort(field.key, 'desc'); setOpen(false); }} />
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Filtr</div>
            <Select value={op} onChange={(v) => setOp(v as Op)} width="100%"
              options={ops.map((o) => ({ value: o, label: OP_LABEL[o] }))} />
            {NEEDS_VALUE(op) && (
              field.type === 'enum' && field.options ? (
                <div style={{ marginTop: 6 }}>
                  <Select value={value} onChange={(v) => setValue(v)} width="100%" placeholder="— wybierz —"
                    options={field.options.map((o) => ({ value: o.value, label: o.label }))} />
                </div>
              ) : (
                <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()}
                  type={field.type === 'number' ? 'number' : 'text'} placeholder="wartość…" className="grid-native-select" style={{ marginTop: 6 }} />
              )
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn sm" style={{ flex: 1 }} onClick={apply}>Zastosuj</button>
              {active && <button className="btn ghost sm" onClick={clear}>Wyczyść</button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SortBtn({ label, icon, on, onClick }: { label: string; icon: 'sortAsc' | 'sortDesc'; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 8px',
      borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
      border: `1px solid ${on ? colors.accent : colors.border}`, background: on ? colors.accentSoft : '#fff', color: on ? colors.primary : colors.text,
    }}>
      <Icon name={icon} size={14} color={on ? colors.accent : colors.textSecondary} /> {label}
    </button>
  );
}
