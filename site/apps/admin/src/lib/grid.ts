// Lekki silnik filtrowania/sortowania w stylu Dynamics 365 CE.
// Obsługuje: filtr per-kolumna, sortowanie, Advanced Find (AND/OR) i zapisywane widoki.

export type FieldType = 'text' | 'enum' | 'number' | 'bool';

export interface FieldDef<T = any> {
  key: string;
  label: string;
  type: FieldType;
  get: (row: T) => string | number | boolean | null | undefined;
  options?: { value: string; label: string }[]; // dla enum
}

export type Op =
  | 'contains' | 'notContains' | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'empty' | 'notEmpty' | 'isTrue' | 'isFalse';

export const OP_LABEL: Record<Op, string> = {
  contains: 'zawiera', notContains: 'nie zawiera', eq: 'równa się', neq: 'różne od',
  gt: 'większe niż', gte: '≥', lt: 'mniejsze niż', lte: '≤',
  empty: 'jest puste', notEmpty: 'nie jest puste', isTrue: 'jest tak', isFalse: 'jest nie',
};

export const OPS_BY_TYPE: Record<FieldType, Op[]> = {
  text: ['contains', 'notContains', 'eq', 'neq', 'empty', 'notEmpty'],
  enum: ['eq', 'neq', 'empty', 'notEmpty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'empty', 'notEmpty'],
  bool: ['isTrue', 'isFalse'],
};

// czy operator wymaga wpisania/wybrania wartości
export const NEEDS_VALUE = (op: Op) => !['empty', 'notEmpty', 'isTrue', 'isFalse'].includes(op);

export interface ColFilter { op: Op; value: string }
export interface Condition { id: string; field: string; op: Op; value: string }
export interface AdvancedQuery { join: 'AND' | 'OR'; conditions: Condition[] }

export interface GridState {
  sort: { key: string; dir: 'asc' | 'desc' } | null;
  columnFilters: Record<string, ColFilter>; // klucz = field.key (łączone AND)
  advanced: AdvancedQuery | null;
}

export const EMPTY_STATE: GridState = { sort: null, columnFilters: {}, advanced: null };

export interface SavedView { id: string; name: string; state: GridState }

function matchOne(raw: string | number | boolean | null | undefined, type: FieldType, op: Op, value: string): boolean {
  const isEmpty = raw === null || raw === undefined || raw === '';
  if (op === 'empty') return isEmpty;
  if (op === 'notEmpty') return !isEmpty;
  if (op === 'isTrue') return raw === true;
  if (op === 'isFalse') return raw === false || raw === null || raw === undefined;

  if (type === 'number') {
    const n = typeof raw === 'number' ? raw : Number(raw);
    const v = Number(value);
    if (Number.isNaN(n) || Number.isNaN(v)) return false;
    switch (op) {
      case 'eq': return n === v;
      case 'neq': return n !== v;
      case 'gt': return n > v;
      case 'gte': return n >= v;
      case 'lt': return n < v;
      case 'lte': return n <= v;
      default: return false;
    }
  }

  const s = String(raw ?? '').toLowerCase();
  const v = value.toLowerCase();
  switch (op) {
    case 'contains': return s.includes(v);
    case 'notContains': return !s.includes(v);
    case 'eq': return s === v;
    case 'neq': return s !== v;
    default: return false;
  }
}

export function matchCondition<T>(row: T, fields: FieldDef<T>[], field: string, op: Op, value: string): boolean {
  const def = fields.find((f) => f.key === field);
  if (!def) return true;
  return matchOne(def.get(row), def.type, op, value);
}

export function applyGrid<T>(rows: T[], fields: FieldDef<T>[], state: GridState): T[] {
  let out = rows.filter((row) => {
    // filtry per-kolumna — wszystkie muszą pasować (AND)
    for (const [key, f] of Object.entries(state.columnFilters)) {
      if (NEEDS_VALUE(f.op) && f.value.trim() === '') continue; // niedokończony filtr = pomijamy
      if (!matchCondition(row, fields, key, f.op, f.value)) return false;
    }
    // Advanced Find
    const adv = state.advanced;
    if (adv && adv.conditions.length) {
      const valid = adv.conditions.filter((c) => !NEEDS_VALUE(c.op) || c.value.trim() !== '');
      if (valid.length) {
        const results = valid.map((c) => matchCondition(row, fields, c.field, c.op, c.value));
        const ok = adv.join === 'AND' ? results.every(Boolean) : results.some(Boolean);
        if (!ok) return false;
      }
    }
    return true;
  });

  if (state.sort) {
    const def = fields.find((f) => f.key === state.sort!.key);
    if (def) {
      const dir = state.sort.dir === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        const av = def.get(a); const bv = def.get(b);
        if (av == null && bv == null) return 0;
        if (av == null) return 1; // puste zawsze na końcu
        if (bv == null) return -1;
        if (def.type === 'number') return (Number(av) - Number(bv)) * dir;
        return String(av).localeCompare(String(bv), 'pl', { sensitivity: 'base' }) * dir;
      });
    }
  }
  return out;
}

export function stateIsEmpty(s: GridState): boolean {
  return !s.sort
    && Object.keys(s.columnFilters).length === 0
    && (!s.advanced || s.advanced.conditions.length === 0);
}

export function countActive(s: GridState): number {
  return Object.keys(s.columnFilters).length + (s.advanced ? s.advanced.conditions.length : 0);
}

// ——— Zapisywane widoki (localStorage, per-grid) ———
const VIEW_KEY = (gridId: string) => `ff:admin:views:${gridId}`;

export function loadViews(gridId: string): SavedView[] {
  try { return JSON.parse(localStorage.getItem(VIEW_KEY(gridId)) || '[]'); }
  catch { return []; }
}
export function persistViews(gridId: string, views: SavedView[]) {
  try { localStorage.setItem(VIEW_KEY(gridId), JSON.stringify(views)); } catch { /* ignore */ }
}
export const newId = () => Math.random().toString(36).slice(2, 9);
