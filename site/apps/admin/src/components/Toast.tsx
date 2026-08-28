import { useEffect, useState } from 'react';
import Icon from './Icon';

type ToastType = 'error' | 'success' | 'info';
interface T { id: number; msg: string; type: ToastType }

let items: T[] = [];
let listeners: ((t: T[]) => void)[] = [];
let seq = 0;

function emit() { listeners.forEach((l) => l(items)); }

// Globalny toast — zamiennik systemowego alert(). Wywołuj z dowolnego miejsca.
export function toast(msg: string, type: ToastType = 'info') {
  const t: T = { id: ++seq, msg, type };
  items = [...items, t];
  emit();
  setTimeout(() => { items = items.filter((x) => x.id !== t.id); emit(); }, 3600);
}

export function ToastHost() {
  const [list, setList] = useState<T[]>(items);
  useEffect(() => {
    listeners.push(setList);
    return () => { listeners = listeners.filter((l) => l !== setList); };
  }, []);
  return (
    <div className="toast-host">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <Icon name={t.type === 'error' ? 'x' : t.type === 'success' ? 'check' : 'bell'} size={16} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
