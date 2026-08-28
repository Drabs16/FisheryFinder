import { useState } from 'react';
import { colors } from '../../theme';
import Icon from '../Icon';
import { OP_LABEL, NEEDS_VALUE, countActive } from '../../lib/grid';
import type { GridApi } from '../../lib/useGrid';
import AdvancedFind from './AdvancedFind';

// Pasek nad tabelą: zapisywane widoki + Advanced Find + aktywne filtry (chipy) + reset.
export default function GridToolbar<T>({ grid }: { grid: GridApi<T> }) {
  const [advOpen, setAdvOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const active = countActive(grid.state);
  const label = (key: string) => grid.fields.find((f) => f.key === key)?.label ?? key;
  const enumLabel = (key: string, val: string) => {
    const f = grid.fields.find((x) => x.key === key);
    return f?.options?.find((o) => o.value === val)?.label ?? val;
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div className="row" style={{ alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* przełącznik widoków */}
        <div style={{ position: 'relative' }}>
          <button className="btn ghost sm" onClick={() => setViewsOpen((o) => !o)} style={{ minWidth: 168, justifyContent: 'space-between' }}>
            <span className="row" style={{ gap: 7 }}><Icon name="eye" size={15} color={colors.accent} />{grid.activeViewObj?.name ?? 'Wszystkie rekordy'}{grid.dirty && ' •'}</span>
            <Icon name="chevronDown" size={14} />
          </button>
          {viewsOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setViewsOpen(false)} />
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 41, width: 256, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, boxShadow: '0 12px 34px rgba(16,24,40,0.14)', overflow: 'hidden', padding: 5 }}>
                <ViewItem name="Wszystkie rekordy" on={!grid.activeView} onClick={() => { grid.reset(); setViewsOpen(false); }} />
                {grid.views.map((v) => (
                  <ViewItem key={v.id} name={v.name} on={grid.activeView === v.id}
                    onClick={() => { grid.applyView(v.id); setViewsOpen(false); }}
                    onDelete={() => grid.deleteView(v.id)} />
                ))}
                {grid.views.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12.5, color: colors.textSecondary }}>Brak zapisanych widoków. Ustaw filtry i kliknij „Zapisz widok".</div>}
              </div>
            </>
          )}
        </div>

        <button className="btn ghost sm" onClick={() => setAdvOpen(true)}>
          <Icon name="filter" size={15} /> Zaawansowane{active > 0 && ` · ${active}`}
        </button>

        {/* zapis widoku */}
        {grid.activeView && grid.dirty && (
          <button className="btn ghost sm" onClick={grid.updateActiveView}><Icon name="save" size={15} /> Aktualizuj „{grid.activeViewObj?.name}"</button>
        )}
        {!grid.isEmpty && !saving && (
          <button className="btn ghost sm" onClick={() => setSaving(true)}><Icon name="save" size={15} /> Zapisz widok</button>
        )}
        {saving && (
          <span className="row" style={{ gap: 6 }}>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa widoku…" className="grid-native-select" style={{ width: 160 }}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { grid.saveView(name); setName(''); setSaving(false); } if (e.key === 'Escape') { setName(''); setSaving(false); } }} />
            <button className="btn sm" disabled={!name.trim()} onClick={() => { grid.saveView(name); setName(''); setSaving(false); }}>Zapisz</button>
            <button className="btn ghost sm" onClick={() => { setName(''); setSaving(false); }}>Anuluj</button>
          </span>
        )}

        {!grid.isEmpty && <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={grid.reset}><Icon name="x" size={14} /> Wyczyść</button>}
      </div>

      {/* aktywne filtry jako chipy */}
      {active > 0 && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {Object.entries(grid.state.columnFilters).map(([key, f]) => (
            <span key={key} className="chip on" style={{ cursor: 'default' }}>
              {label(key)} {OP_LABEL[f.op]}{NEEDS_VALUE(f.op) && <> „{enumLabel(key, f.value)}"</>}
              <span style={{ cursor: 'pointer', marginLeft: 2, display: 'inline-flex' }} onClick={() => grid.clearColumnFilter(key)}><Icon name="x" size={13} /></span>
            </span>
          ))}
          {grid.state.advanced && grid.state.advanced.conditions.length > 0 && (
            <span className="chip on" style={{ cursor: 'pointer' }} onClick={() => setAdvOpen(true)}>
              <Icon name="filter" size={13} /> Zaawansowane: {grid.state.advanced.conditions.length} warunk(i) ({grid.state.advanced.join === 'AND' ? 'ORAZ' : 'LUB'})
              <span style={{ marginLeft: 2, display: 'inline-flex' }} onClick={(e) => { e.stopPropagation(); grid.setAdvanced(null); }}><Icon name="x" size={13} /></span>
            </span>
          )}
        </div>
      )}

      {advOpen && <AdvancedFind fields={grid.fields} value={grid.state.advanced} onApply={grid.setAdvanced} onClose={() => setAdvOpen(false)} />}
    </div>
  );
}

function ViewItem({ name, on, onClick, onDelete }: { name: string; on: boolean; onClick: () => void; onDelete?: () => void }) {
  return (
    <div onClick={onClick} className="row" style={{ alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 8, cursor: 'pointer', background: on ? colors.accentSoft : '#fff', justifyContent: 'space-between' }}
      onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#F6FAF8'; }}
      onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = '#fff'; }}>
      <span className="row" style={{ gap: 8, fontSize: 13.5, fontWeight: on ? 700 : 500, color: on ? colors.primary : colors.text }}>
        {on ? <Icon name="check" size={15} color={colors.accent} /> : <span style={{ width: 15 }} />}{name}
      </span>
      {onDelete && <span style={{ cursor: 'pointer', display: 'inline-flex' }} onClick={(e) => { e.stopPropagation(); onDelete(); }}><Icon name="trash" size={14} color={colors.textSecondary} /></span>}
    </div>
  );
}
