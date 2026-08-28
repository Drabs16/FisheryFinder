// Wspólna, deterministyczna logika dostępności stanowisk — używana przez
// kalendarz rezerwacji i widok łowiska, żeby liczby były spójne.

const pad = (n: number) => String(n).padStart(2, '0');
export const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
export const parseIso = (iso: string) => new Date(`${iso}T12:00:00`);
export const isoLocal = (date: Date) => isoOf(date.getFullYear(), date.getMonth(), date.getDate());

export const enumerateDays = (a: string, b: string): string[] => {
  const res: string[] = [];
  const d = parseIso(a);
  const end = parseIso(b);
  while (d <= end) { res.push(isoLocal(d)); d.setDate(d.getDate() + 1); }
  return res;
};

// Czy stanowisko jest zajęte danego dnia (stabilne między renderami).
// `fisheryKey` sprawia, że każde łowisko ma WŁASNY kalendarz zajętości.
export const seededTaken = (spot: number, iso: string, fisheryKey: string | number = ''): boolean => {
  const s = `${fisheryKey}#${iso}#${spot}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 100 < 26;
};

// Lista numerów stanowisk wolnych przez cały zakres dat (dla danego łowiska).
export const freeSpotIdsInRange = (totalSpots: number, fromIso: string, toIso: string, fisheryKey: string | number = ''): number[] => {
  const days = enumerateDays(fromIso, toIso);
  const ids: number[] = [];
  for (let s = 1; s <= totalSpots; s++) {
    if (days.every((d) => !seededTaken(s, d, fisheryKey))) ids.push(s);
  }
  return ids;
};

export const freeSpotsInRange = (totalSpots: number, fromIso: string, toIso: string, fisheryKey: string | number = ''): number =>
  freeSpotIdsInRange(totalSpots, fromIso, toIso, fisheryKey).length;
