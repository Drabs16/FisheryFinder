// Lista największych polskich miast (do podpowiedzi „wpisujesz miasto → mapa leci tam").
// Prefiks-match jest natychmiastowy i pewny (Nominatim słabo radzi sobie z autouzupełnianiem miast).
export interface City { name: string; lat: number; lon: number }

export const CITIES: City[] = [
  { name: 'Warszawa', lat: 52.2297, lon: 21.0122 },
  { name: 'Kraków', lat: 50.0647, lon: 19.9450 },
  { name: 'Łódź', lat: 51.7592, lon: 19.4560 },
  { name: 'Wrocław', lat: 51.1079, lon: 17.0385 },
  { name: 'Poznań', lat: 52.4064, lon: 16.9252 },
  { name: 'Gdańsk', lat: 54.3520, lon: 18.6466 },
  { name: 'Szczecin', lat: 53.4285, lon: 14.5528 },
  { name: 'Bydgoszcz', lat: 53.1235, lon: 18.0084 },
  { name: 'Lublin', lat: 51.2465, lon: 22.5684 },
  { name: 'Białystok', lat: 53.1325, lon: 23.1688 },
  { name: 'Katowice', lat: 50.2649, lon: 19.0238 },
  { name: 'Gdynia', lat: 54.5189, lon: 18.5305 },
  { name: 'Częstochowa', lat: 50.7971, lon: 19.1200 },
  { name: 'Radom', lat: 51.4027, lon: 21.1471 },
  { name: 'Sosnowiec', lat: 50.2862, lon: 19.1041 },
  { name: 'Toruń', lat: 53.0138, lon: 18.5984 },
  { name: 'Kielce', lat: 50.8661, lon: 20.6286 },
  { name: 'Rzeszów', lat: 50.0413, lon: 21.9990 },
  { name: 'Gliwice', lat: 50.2945, lon: 18.6714 },
  { name: 'Zabrze', lat: 50.3249, lon: 18.7857 },
  { name: 'Olsztyn', lat: 53.7784, lon: 20.4801 },
  { name: 'Bielsko-Biała', lat: 49.8224, lon: 19.0584 },
  { name: 'Bytom', lat: 50.3483, lon: 18.9157 },
  { name: 'Zielona Góra', lat: 51.9356, lon: 15.5062 },
  { name: 'Rybnik', lat: 50.0971, lon: 18.5416 },
  { name: 'Ruda Śląska', lat: 50.2558, lon: 18.8556 },
  { name: 'Opole', lat: 50.6751, lon: 17.9213 },
  { name: 'Tychy', lat: 50.1372, lon: 18.9663 },
  { name: 'Gorzów Wielkopolski', lat: 52.7368, lon: 15.2288 },
  { name: 'Dąbrowa Górnicza', lat: 50.3217, lon: 19.1875 },
  { name: 'Płock', lat: 52.5468, lon: 19.7064 },
  { name: 'Elbląg', lat: 54.1561, lon: 19.4045 },
  { name: 'Wałbrzych', lat: 50.7714, lon: 16.2845 },
  { name: 'Włocławek', lat: 52.6483, lon: 19.0677 },
  { name: 'Tarnów', lat: 50.0121, lon: 20.9858 },
  { name: 'Chorzów', lat: 50.2974, lon: 18.9544 },
  { name: 'Koszalin', lat: 54.1944, lon: 16.1722 },
  { name: 'Kalisz', lat: 51.7619, lon: 18.0911 },
  { name: 'Legnica', lat: 51.2070, lon: 16.1619 },
  { name: 'Grudziądz', lat: 53.4837, lon: 18.7536 },
  { name: 'Słupsk', lat: 54.4641, lon: 17.0285 },
  { name: 'Jaworzno', lat: 50.2050, lon: 19.2742 },
  { name: 'Nowy Sącz', lat: 49.6217, lon: 20.6969 },
  { name: 'Jelenia Góra', lat: 50.9044, lon: 15.7197 },
  { name: 'Siedlce', lat: 52.1676, lon: 22.2902 },
  { name: 'Konin', lat: 52.2230, lon: 18.2511 },
  { name: 'Piła', lat: 53.1515, lon: 16.7383 },
  { name: 'Lubin', lat: 51.4009, lon: 16.2010 },
  { name: 'Suwałki', lat: 54.1115, lon: 22.9309 },
  { name: 'Stargard', lat: 53.3367, lon: 15.0500 },
  { name: 'Gniezno', lat: 52.5348, lon: 17.5826 },
  { name: 'Ostrowiec Świętokrzyski', lat: 50.9293, lon: 21.3855 },
  { name: 'Chełm', lat: 51.1431, lon: 23.4716 },
  { name: 'Zamość', lat: 50.7231, lon: 23.2519 },
  { name: 'Przemyśl', lat: 49.7838, lon: 22.7677 },
  { name: 'Pabianice', lat: 51.6647, lon: 19.3545 },
  { name: 'Zakopane', lat: 49.2992, lon: 19.9496 },
  { name: 'Sopot', lat: 54.4418, lon: 18.5601 },
  { name: 'Mielec', lat: 50.2874, lon: 21.4239 },
  { name: 'Ełk', lat: 53.8278, lon: 22.3647 },
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function matchCities(query: string, limit = 5): City[] {
  const q = norm(query.trim());
  if (q.length < 2) return [];
  const starts = CITIES.filter((c) => norm(c.name).startsWith(q));
  if (starts.length >= limit) return starts.slice(0, limit);
  const contains = CITIES.filter((c) => !norm(c.name).startsWith(q) && norm(c.name).includes(q));
  return [...starts, ...contains].slice(0, limit);
}
