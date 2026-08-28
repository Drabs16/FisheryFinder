import { useEffect, useState } from 'react';
import Icon from './Icon';

// ——— helpers daty ———
const pad = (n: number) => String(n).padStart(2, '0');
const isoD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const parseIso = (s: string) => new Date(`${s}T12:00:00`);
const hhmm = (s?: string) => (s ? s.slice(11, 16) : '—');
const DOW = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
const MON = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

// ——— WMO → typ warunku + opis ———
type Cond = 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm';
function condOf(code: number): { cond: Cond; label: string } {
  if (code === 0) return { cond: 'sun', label: 'Słonecznie' };
  if (code <= 2) return { cond: 'partly', label: 'Częściowe zachmurzenie' };
  if (code === 3) return { cond: 'cloud', label: 'Pochmurno' };
  if (code <= 48) return { cond: 'fog', label: 'Mgła' };
  if (code <= 57) return { cond: 'rain', label: 'Mżawka' };
  if (code <= 67) return { cond: 'rain', label: 'Deszcz' };
  if (code <= 77) return { cond: 'snow', label: 'Śnieg' };
  if (code <= 82) return { cond: 'rain', label: 'Przelotny deszcz' };
  if (code <= 86) return { cond: 'snow', label: 'Przelotny śnieg' };
  return { cond: 'storm', label: 'Burza' };
}

// ——— ikony pogodowe (monochromatyczne, dziedziczą kolor przez currentColor) ———
const CLOUD = 'M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 1 1 17 18H7Z';
function WeatherGlyph({ cond }: { cond: Cond }) {
  const S = (children: React.ReactNode) => <svg viewBox="0 0 24 24" width="30" height="30" fill="none">{children}</svg>;
  const rays = (
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 1.5V3.8" /><path d="M12 20.2V22.5" /><path d="M1.5 12H3.8" /><path d="M20.2 12H22.5" />
      <path d="M4.4 4.4l1.6 1.6" /><path d="M18 18l1.6 1.6" /><path d="M4.4 19.6l1.6-1.6" /><path d="M18 6l1.6-1.6" />
    </g>
  );
  switch (cond) {
    case 'sun': return S(<>{rays}<circle cx="12" cy="12" r="5" fill="currentColor" /></>);
    case 'partly': return S(<>
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M8 2.5V4.4" /><path d="M2.6 8H4.5" /><path d="M4.2 4.2l1.3 1.3" /></g>
      <circle cx="8" cy="8" r="3.2" fill="currentColor" />
      <path d={CLOUD} fill="currentColor" transform="translate(2,3) scale(0.82)" />
    </>);
    case 'cloud': return S(<path d={CLOUD} fill="currentColor" />);
    case 'fog': return S(<>
      <path d={CLOUD} fill="currentColor" transform="translate(0,-1.5)" opacity="0.9" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 19h11" /><path d="M7 22h9" /></g>
    </>);
    case 'rain': return S(<>
      <path d={CLOUD} fill="currentColor" transform="translate(0,-2)" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8.5 17.5l-1 3" /><path d="M12.5 17.5l-1 3" /><path d="M16.5 17.5l-1 3" /></g>
    </>);
    case 'snow': return S(<>
      <path d={CLOUD} fill="currentColor" transform="translate(0,-2)" />
      <g fill="currentColor"><circle cx="8.5" cy="19" r="1.1" /><circle cx="12" cy="20.5" r="1.1" /><circle cx="15.5" cy="19" r="1.1" /></g>
    </>);
    case 'storm': return S(<>
      <path d={CLOUD} fill="currentColor" transform="translate(0,-2.5)" />
      <path d="M13 15l-4 4h3l-2 4 6-6h-3l2-2z" fill="currentColor" />
    </>);
  }
}
// małe ikony meta (14px)
const MI = (children: React.ReactNode) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" className="wx-mi">{children}</svg>;
const Wind = () => MI(<g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8h10a2.4 2.4 0 1 0-2.4-2.4" /><path d="M3 12h15a2.4 2.4 0 1 1-2.4 2.4" /><path d="M3 16h8a2 2 0 1 1-2 2" /></g>);
const Sunrise = () => MI(<g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18" /><path d="M7 20a5 5 0 0 1 10 0" /><path d="M12 3v5" /><path d="M9.5 5.5 12 3l2.5 2.5" /></g>);
const Sunset = () => MI(<g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18" /><path d="M7 20a5 5 0 0 1 10 0" /><path d="M12 8V3" /><path d="M9.5 5.5 12 8l2.5-2.5" /></g>);
const MoonGlyph = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" style={{ verticalAlign: '-3px' }}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" fill="currentColor" /></svg>;

// ——— faza księżyca ———
const MOON_NAME = ['Nów', 'Przybywający sierp', 'Pierwsza kwadra', 'Przybywający garb', 'Pełnia', 'Ubywający garb', 'Ostatnia kwadra', 'Ubywający sierp'];
function moonPhase(d: Date): number {
  const synodic = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14, 0);
  let p = (((d.getTime() - ref) / 86400000) % synodic) / synodic;
  if (p < 0) p += 1;
  return p;
}
const distPhase = (p: number, t: number) => { const d = Math.abs(p - t); return Math.min(d, 1 - d); };

interface DayWx {
  date: string; code: number; tmax: number; tmin: number; precip: number; wind: number;
  sunrise: string; sunset: string;
  pressure: number | null; pressureTrend: number | null; cloud: number | null;
}

// ——— szansa na brania (0–100) z pogody + księżyca ———
function biteScore(d: DayWx): number {
  let s = 50;
  if (d.pressureTrend != null) {
    const tr = d.pressureTrend;
    if (tr <= -1 && tr >= -5) s += 14;
    else if (tr > -1 && tr < 1) s += 6;
    else if (tr <= -5) s -= 6;
    else if (tr >= 5) s -= 12;
    else s -= 4;
  }
  if (d.pressure != null && d.pressure < 1000) s -= 8;
  if (d.cloud != null) { if (d.cloud >= 50 && d.cloud <= 90) s += 10; else if (d.cloud < 15) s -= 6; }
  if (d.wind >= 8 && d.wind <= 22) s += 8; else if (d.wind > 32) s -= 10; else if (d.wind < 4) s -= 2;
  if (d.code >= 95) s -= 16; else if (d.precip >= 30 && d.precip <= 70) s += 4; else if (d.precip > 85) s -= 6;
  const tavg = (d.tmax + d.tmin) / 2;
  if (tavg >= 12 && tavg <= 24) s += 8; else if (tavg < 4 || tavg > 30) s -= 8;
  const m = moonPhase(parseIso(d.date));
  if (Math.min(distPhase(m, 0), distPhase(m, 0.5)) < 0.06) s += 8;
  return Math.max(5, Math.min(98, Math.round(s)));
}
const fishCount = (score: number) => Math.max(1, Math.min(5, Math.round(score / 20)));
const SCORE_LABEL = ['', 'Kiepskie', 'Słabe', 'Przeciętne', 'Bardzo dobre', 'Doskonałe'];

interface Props { lat: number; lng: number; fishery: string; place?: string; dateFrom: string; dateTo: string; spots: number[]; }

export default function WeatherWidget({ lat, lng, fishery, place, dateFrom, dateTo, spots }: Props) {
  const [days, setDays] = useState<DayWx[] | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'past' | 'future' | 'error'>('loading');

  useEffect(() => {
    if (!lat || !lng) { setState('error'); return; }
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const maxFwd = addDays(t, 15);
    const start = parseIso(dateFrom); start.setHours(0, 0, 0, 0);
    const end = parseIso(dateTo); end.setHours(0, 0, 0, 0);
    const reqStart = start < t ? t : start;
    const reqEnd = end > maxFwd ? maxFwd : end;
    if (end < t) { setState('past'); return; }
    if (reqStart > reqEnd) { setState('future'); return; }

    setState('loading');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset`
      + `&hourly=pressure_msl,cloud_cover&timezone=auto&start_date=${isoD(reqStart)}&end_date=${isoD(reqEnd)}`;
    let alive = true;
    fetch(url).then((r) => r.json()).then((j) => {
      if (!alive) return;
      const D = j.daily; if (!D?.time?.length) { setState('error'); return; }
      const presByDay: Record<string, number[]> = {}; const cloudByDay: Record<string, number[]> = {};
      (j.hourly?.time ?? []).forEach((ts: string, k: number) => {
        const d = ts.slice(0, 10);
        (presByDay[d] ??= []).push(j.hourly.pressure_msl[k]);
        (cloudByDay[d] ??= []).push(j.hourly.cloud_cover[k]);
      });
      const mean = (a?: number[]) => a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
      const out: DayWx[] = D.time.map((date: string, k: number) => ({
        date, code: D.weather_code[k], tmax: D.temperature_2m_max[k], tmin: D.temperature_2m_min[k],
        precip: D.precipitation_probability_max?.[k] ?? 0, wind: D.wind_speed_10m_max[k],
        sunrise: D.sunrise?.[k] ?? '', sunset: D.sunset?.[k] ?? '',
        pressure: mean(presByDay[date]), cloud: mean(cloudByDay[date]), pressureTrend: null,
      }));
      out.forEach((d, k) => { if (k > 0 && d.pressure != null && out[k - 1].pressure != null) d.pressureTrend = d.pressure - out[k - 1].pressure!; });
      setDays(out); setState('ok');
    }).catch(() => { if (alive) setState('error'); });
    return () => { alive = false; };
  }, [lat, lng, dateFrom, dateTo]);

  const fmtDay = (s: string) => { const d = parseIso(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
  const moonIdx = Math.round(moonPhase(parseIso(dateFrom)) * 8) % 8;

  return (
    <div className="wx">
      <div className="wx-head">
        <div className="wx-title">{fishery}</div>
        {place && <div className="wx-place"><Icon name="pin" size={13} color="var(--ff-text-secondary)" /> {place}</div>}
        <div className="wx-stay">
          <span className="wx-leg"><span className="wx-dot in" /> Przyjazd <b>{fmtDay(dateFrom)}</b></span>
          <span className="wx-leg"><span className="wx-dot out" /> Wyjazd <b>{fmtDay(dateTo)}</b></span>
        </div>
        {spots.length > 0 && <div className="wx-spot"><Icon name="pin" size={13} color="var(--ff-primary)" /> {spots.length > 1 ? 'Stanowiska' : 'Stanowisko'} {spots.join(', ')}</div>}
      </div>

      <div className="wx-sub">
        <Icon name="droplet" size={14} color="var(--ff-text-secondary)" />
        Terminarz brań &amp; pogoda
        <span className="wx-moon" title={MOON_NAME[moonIdx]}><MoonGlyph /> {MOON_NAME[moonIdx]}</span>
      </div>

      {state === 'loading' && <div className="wx-note">Ładuję prognozę…</div>}
      {state === 'past' && <div className="wx-note">Rezerwacja już minęła — prognoza niedostępna.</div>}
      {state === 'future' && <div className="wx-note">Prognoza pojawi się ok. 16 dni przed przyjazdem.</div>}
      {state === 'error' && <div className="wx-note">Nie udało się pobrać prognozy.</div>}

      {state === 'ok' && days && (
        <div className="wx-days">
          {days.map((d) => {
            const { cond, label } = condOf(d.code); const sc = biteScore(d); const n = fishCount(sc);
            return (
              <div className="wx-day" key={d.date}>
                <div className="wx-day-l">
                  <span className="wx-ico"><WeatherGlyph cond={cond} /></span>
                  <div className="wx-info">
                    <div className="wx-date">{fmtDay(d.date)}</div>
                    <div className="wx-meta">{label} · {Math.round(d.tmax)}° / {Math.round(d.tmin)}°</div>
                    <div className="wx-meta wx-sub2">
                      <span className="wx-chip"><Wind /> {Math.round(d.wind)} km/h</span>
                      {d.precip > 0 && <span className="wx-chip"><Icon name="droplet" size={13} color="var(--ff-text-secondary)" /> {d.precip}%</span>}
                      <span className="wx-chip"><Sunrise /> {hhmm(d.sunrise)}</span>
                      <span className="wx-chip"><Sunset /> {hhmm(d.sunset)}</span>
                    </div>
                  </div>
                </div>
                <div className="wx-day-r">
                  <div className="wx-fish" title={`${sc}%`}>
                    {[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="fish" size={16} color={i < n ? 'var(--ff-primary)' : 'var(--ff-border-strong)'} />)}
                  </div>
                  <div className="wx-score-lbl">{SCORE_LABEL[n]}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="wx-foot">Prognoza dla {place ? <b>{place}</b> : 'łowiska'} na dni Twojego pobytu. Szanse orientacyjne — z pogody i fazy księżyca. Dane: Open-Meteo.</div>
    </div>
  );
}
