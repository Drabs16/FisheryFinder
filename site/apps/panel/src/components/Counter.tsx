import { useEffect, useRef, useState } from 'react';

// Animowany licznik — liczba „dobija" do wartości docelowej (ease-out).
export default function Counter({ value, format, duration = 850 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [n, setN] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const a = from.current;
    const b = value;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = a + (b - a) * eased;
      setN(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
      else { setN(b); from.current = b; }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format ? format(n) : Math.round(n).toLocaleString('pl-PL')}</>;
}
