import { useMemo, useState } from 'react';
import {
  type FieldDef, type GridState, type SavedView, type Op, type AdvancedQuery,
  EMPTY_STATE, applyGrid, loadViews, persistViews, newId, stateIsEmpty,
} from './grid';

// Stan gridu + zapisywane widoki (Dynamics-like). gridId = klucz localStorage.
export function useGrid<T>(gridId: string, fields: FieldDef<T>[], rows: T[]) {
  const [state, setState] = useState<GridState>(EMPTY_STATE);
  const [views, setViews] = useState<SavedView[]>(() => loadViews(gridId));
  const [activeView, setActiveView] = useState<string | null>(null);

  const data = useMemo(() => applyGrid(rows, fields, state), [rows, fields, state]);

  // sort: klik na nagłówek cyklem asc → desc → brak
  const cycleSort = (key: string) => setState((s) => {
    if (!s.sort || s.sort.key !== key) return { ...s, sort: { key, dir: 'asc' } };
    if (s.sort.dir === 'asc') return { ...s, sort: { key, dir: 'desc' } };
    return { ...s, sort: null };
  });
  const setSort = (key: string, dir: 'asc' | 'desc') => setState((s) => ({ ...s, sort: { key, dir } }));

  const setColumnFilter = (key: string, op: Op, value: string) =>
    setState((s) => ({ ...s, columnFilters: { ...s.columnFilters, [key]: { op, value } } }));
  const clearColumnFilter = (key: string) => setState((s) => {
    const next = { ...s.columnFilters }; delete next[key]; return { ...s, columnFilters: next };
  });

  const setAdvanced = (advanced: AdvancedQuery | null) => setState((s) => ({ ...s, advanced }));

  const reset = () => { setState(EMPTY_STATE); setActiveView(null); };

  // ——— widoki ———
  const save = (next: SavedView[]) => { setViews(next); persistViews(gridId, next); };
  const saveView = (name: string) => {
    const v: SavedView = { id: newId(), name: name.trim() || 'Nowy widok', state };
    save([...views, v]); setActiveView(v.id);
  };
  const updateActiveView = () => {
    if (!activeView) return;
    save(views.map((v) => (v.id === activeView ? { ...v, state } : v)));
  };
  const deleteView = (id: string) => {
    save(views.filter((v) => v.id !== id));
    if (activeView === id) setActiveView(null);
  };
  const applyView = (id: string) => {
    const v = views.find((x) => x.id === id);
    if (v) { setState(v.state); setActiveView(id); }
  };

  // czy aktywny widok ma niezapisane zmiany
  const activeViewObj = views.find((v) => v.id === activeView) ?? null;
  const dirty = !!activeViewObj && JSON.stringify(activeViewObj.state) !== JSON.stringify(state);

  return {
    state, setState, data, fields,
    cycleSort, setSort, setColumnFilter, clearColumnFilter, setAdvanced, reset,
    isEmpty: stateIsEmpty(state),
    views, activeView, activeViewObj, dirty,
    saveView, updateActiveView, deleteView, applyView,
  };
}

export type GridApi<T> = ReturnType<typeof useGrid<T>>;
