import { useState } from 'react';
import { colors } from '../../theme';
import Icon from '../Icon';
import Select from '../Select';
import {
  type FieldDef, type Condition, type AdvancedQuery, type Op,
  OPS_BY_TYPE, OP_LABEL, NEEDS_VALUE, newId,
} from '../../lib/grid';

// Kreator złożonych zapytań (Dynamics „Advanced Find"): wiele warunków łączonych AND/OR.
export default function AdvancedFind<T>({ fields, value, onApply, onClose }: {
  fields: FieldDef<T>[];
  value: AdvancedQuery | null;
  onApply: (q: AdvancedQuery | null) => void;
  onClose: () => void;
}) {
  const blank = (): Condition => ({ id: newId(), field: fields[0].key, op: OPS_BY_TYPE[fields[0].type][0], value: '' });
  const [join, setJoin] = useState<'AND' | 'OR'>(value?.join ?? 'AND');
  const [conds, setConds] = useState<Condition[]>(value?.conditions.length ? value.conditions : [blank()]);

  const update = (id: string, patch: Partial<Condition>) =>
    setConds((cs) => cs.map((c) => {
      if (c.id !== id) return c;
      const next = { ...c, ...patch };
      if (patch.field) { // zmiana pola → zresetuj operator do dozwolonego
        const def = fields.find((f) => f.key === patch.field)!;
        if (!OPS_BY_TYPE[def.type].includes(next.op)) next.op = OPS_BY_TYPE[def.type][0];
        next.value = '';
      }
      return next;
    }));
  const remove = (id: string) => setConds((cs) => (cs.length > 1 ? cs.filter((c) => c.id !== id) : cs));

  const apply = () => {
    const valid = conds.filter((c) => !NEEDS_VALUE(c.op) || c.value.trim() !== '');
    onApply(valid.length ? { join, conditions: valid } : null);
    onClose();
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div className="warnIcon" style={{ background: colors.accentSoft, color: colors.primary, width: 38, height: 38 }}><Icon name="filter" size={20} /></div>
          <div>
            <h3 style={{ margin: 0 }}>Zaawansowane wyszukiwanie</h3>
            <div className="muted" style={{ fontSize: 13 }}>Zbuduj warunki i połącz je operatorem.</div>
          </div>
        </div>

        <div className="row" style={{ alignItems: 'center', gap: 8, margin: '14px 0 10px' }}>
          <span style={{ fontSize: 13, color: colors.textSecondary }}>Dopasuj rekordy spełniające</span>
          <div className="seg">
            <button className={`seg-btn ${join === 'AND' ? 'on' : ''}`} onClick={() => setJoin('AND')}>wszystkie (ORAZ)</button>
            <button className={`seg-btn ${join === 'OR' ? 'on' : ''}`} onClick={() => setJoin('OR')}>dowolny (LUB)</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
          {conds.map((c, i) => {
            const def = fields.find((f) => f.key === c.field)!;
            const ops = OPS_BY_TYPE[def.type];
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 44, fontSize: 11.5, fontWeight: 800, color: colors.textSecondary }}>{i === 0 ? 'GDZIE' : join}</span>
                <div style={{ flex: 1.2 }}>
                  <Select value={c.field} onChange={(v) => update(c.id, { field: v })} width="100%"
                    options={fields.map((f) => ({ value: f.key, label: f.label }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <Select value={c.op} onChange={(v) => update(c.id, { op: v as Op })} width="100%"
                    options={ops.map((o) => ({ value: o, label: OP_LABEL[o] }))} />
                </div>
                {NEEDS_VALUE(c.op) ? (
                  def.type === 'enum' && def.options ? (
                    <div style={{ flex: 1 }}>
                      <Select value={c.value} onChange={(v) => update(c.id, { value: v })} width="100%" placeholder="—"
                        options={def.options.map((o) => ({ value: o.value, label: o.label }))} />
                    </div>
                  ) : (
                    <input value={c.value} onChange={(e) => update(c.id, { value: e.target.value })}
                      type={def.type === 'number' ? 'number' : 'text'} placeholder="wartość" className="grid-native-select" style={{ flex: 1 }} />
                  )
                ) : <div style={{ flex: 1 }} />}
                <button className="btn ghost icon sm" onClick={() => remove(c.id)} disabled={conds.length === 1} title="Usuń warunek"><Icon name="x" size={14} /></button>
              </div>
            );
          })}
        </div>

        <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setConds((cs) => [...cs, blank()])}>
          <Icon name="plus" size={14} /> Dodaj warunek
        </button>

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 18 }}>
          <button className="btn ghost" onClick={() => { onApply(null); onClose(); }}>Wyczyść wszystko</button>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost" onClick={onClose}>Anuluj</button>
            <button className="btn" onClick={apply}><Icon name="search" size={15} /> Pokaż wyniki</button>
          </div>
        </div>
      </div>
    </div>
  );
}
