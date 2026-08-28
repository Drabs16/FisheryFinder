import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchOccupancy, fetchSpots, type SpotInfo } from '../lib/fisheries';
import { addReservation } from '../lib/reservations';
import { fmtShort, nightsBetween, pluralDoby, stayProductsOf, type StayKey } from '../lib/constants';
import { PAYMENT_LABELS, SERVICE_FEE, type Fishery, type PaymentMethod } from '../lib/types';
import { colors } from '../theme';
import Icon from './Icon';
import Calendar from './Calendar';
import AppDialog from './AppDialog';

const pad = (n: number) => String(n).padStart(2, '0');
const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseIso = (iso: string) => new Date(`${iso}T12:00:00`);
const enumerate = (a: string, b: string) => { const r: string[] = []; const d = parseIso(a); const e = parseIso(b); while (d <= e) { r.push(isoLocal(d)); d.setDate(d.getDate() + 1); } return r; };
const PAYMENTS: PaymentMethod[] = ['cash', 'blik', 'p24'];
const STEPS = ['Termin', 'Stanowiska', 'Płatność'];

export default function BookingModal({ fishery, initialFrom, initialTo, onClose, onBooked }: {
  fishery: Fishery; initialFrom?: string | null; initialTo?: string | null; onClose: () => void; onBooked: () => void;
}) {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [from, setFrom] = useState<string | null>(initialFrom ?? null);
  const [to, setTo] = useState<string | null>(initialTo && initialTo !== initialFrom ? initialTo : null);
  const [spots, setSpots] = useState<number[]>([]);
  const [addons, setAddons] = useState<string[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [taken, setTaken] = useState<Record<string, number[]>>({});
  const [spotRows, setSpotRows] = useState<SpotInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Typ pobytu to PRODUKT, który decyduje o kształcie kalendarza:
  // Doba = zakres (przyjazd→wyjazd, liczone w dobach). Dzień/Nocka = pojedynczy dzień/noc.
  const products = useMemo(() => stayProductsOf(fishery), [fishery]);
  const [stay, setStay] = useState<StayKey>(products[0].key);
  const stayDef = products.find((s) => s.key === stay) ?? products[0];
  const isRange = stayDef.range;
  // Zmiana produktu czyści wybór (zakres vs pojedynczy dzień znaczą co innego).
  const pickProduct = (k: StayKey) => { if (k === stay) return; setStay(k); setFrom(null); setTo(null); setSpots([]); };

  const allSpots = useMemo(() => Array.from({ length: fishery.totalSpots }, (_, i) => i + 1), [fishery.totalSpots]);

  useEffect(() => {
    const start = new Date(); const end = new Date(); end.setDate(end.getDate() + 400);
    fetchOccupancy(fishery.id, isoLocal(start), isoLocal(end)).then(setTaken).catch(() => {});
    fetchSpots(fishery.id).then(setSpotRows).catch(() => {});
  }, [fishery.id]);

  // blokada scrolla tła + Esc (okno przez portal — nie łapie go transform .route-view)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const hasImage = Boolean(fishery.spotMap);
  const priceByNum = useMemo(() => new Map(spotRows.map((s) => [s.spot_number, s.price])), [spotRows]);
  const stayBase = stayDef.price || 0;
  // Doba: cena per-stanowisko (VIP) z fallbackiem; Dzień/Nocka: płaska cena produktu.
  const unitOf = (s: number) => (isRange ? ((priceByNum.get(s) ?? stayBase) || 0) : stayBase);
  const isVip = (s: number) => spotRows.find((x) => x.spot_number === s)?.is_vip ?? false;

  const toggleSpot = (s: number, disabled: boolean) => { if (!from || disabled) return; setSpots((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]); };

  const isTaken = (spot: number, iso: string) => taken[iso]?.includes(spot) ?? false;
  const rangeDays = useMemo(() => (!from ? [] : !to ? [from] : enumerate(from, to)), [from, to]);
  const spotAvailable = (s: number) => rangeDays.length > 0 && rangeDays.every((iso) => !isTaken(s, iso));

  useEffect(() => { setSpots((prev) => prev.filter((s) => rangeDays.length > 0 && rangeDays.every((iso) => !isTaken(s, iso)))); /* eslint-disable-next-line */ }, [from, to, taken]);

  const freeCount = (iso: string) => allSpots.filter((s) => !isTaken(s, iso)).length;
  const dotColor = (iso: string) => { const n = freeCount(iso); return n === 0 ? colors.error : n <= Math.max(2, Math.round(fishery.totalSpots * 0.2)) ? '#F59E0B' : colors.success; };

  const nights = nightsBetween(from, to);
  const unitCount = isRange ? Math.max(1, nights) : 1;   // doba: liczba dób; dzień/nocka: zawsze 1
  const base = spots.reduce((sum, s) => sum + unitOf(s), 0) * unitCount;
  // Koszty dodatkowe (dodatki) — doliczane raz za rezerwację. Cenę i tak waliduje serwer z cennika.
  const extraCosts = fishery.extraCosts ?? [];
  const addonsTotal = extraCosts.filter((e) => addons.includes(e.label)).reduce((s, e) => s + (e.price || 0), 0);
  const fee = payment === 'cash' ? 0 : Math.round(base * SERVICE_FEE);
  const total = base + fee + addonsTotal;
  const rangeLabel = !from ? 'Wybierz termin'
    : isRange
      ? (to && to !== from ? `${fmtShort(from)} – ${fmtShort(to)} · ${nights} ${pluralDoby(nights)}` : `${fmtShort(from)} · 1 doba`)
      : `${fmtShort(from)} · 1 ${stayDef.label.toLowerCase()}`;
  const canBook = !!from && spots.length > 0;
  const canNext = step === 0 ? !!from : step === 1 ? spots.length > 0 : true;

  const requestBook = () => {
    if (!user) { onClose(); nav('/login', { state: { from: `/lowisko/${fishery.id}` } }); return; }
    if (!canBook) return;
    setConfirmOpen(true);
  };
  const doBook = async () => {
    if (!user || !canBook) return;
    setConfirmOpen(false); setBusy(true);
    try {
      await addReservation({
        userId: user.id, fisheryId: fishery.id, fishery: fishery.name, spots: [...spots].sort((a, b) => a - b),
        // Dzień/Nocka to pojedynczy dzień — wysyłamy from=to, by serwer policzył 1 jednostkę.
        dateFrom: from!, dateTo: isRange ? (to ?? from!) : from!, days: unitCount, dateLabel: `${rangeLabel} · ${stayDef.label}`,
        stay, addons, pricePerDay: Math.round(base / unitCount / Math.max(1, spots.length)) || fishery.priceFrom,
        total, payment, name: profile?.name ?? '', phone: profile?.phone ?? '',
      });
      onBooked();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Nie udało się zarezerwować'); setBusy(false); }
  };

  return createPortal(
    <>
    <div className="modal-back" onClick={onClose}>
      <div className="sheet sheet-step" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="bk-badge"><Icon name="calendar" size={18} color={colors.primary} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fishery.name}</div>
            <div style={{ fontSize: 12.5, color: colors.textSecondary }}>Rezerwacja stanowiska · {fishery.totalSpots} stanowisk</div>
          </div>
          <button className="x" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        {/* Pasek postępu */}
        <div className="bkw-steps">
          {STEPS.map((s, i) => (
            <button key={s} type="button" className={`bkw-step ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`}
              disabled={i > step && !(i === 1 && from) && !(i === 2 && canBook)} onClick={() => setStep(i)}>
              <span className="bkw-step-dot">{i < step ? <Icon name="check" size={13} color="#fff" /> : i + 1}</span>
              <span className="bkw-step-lbl">{s}</span>
            </button>
          ))}
        </div>

        <div className="bkw-body">
          {/* KROK 1 — produkt decyduje o kalendarzu, potem termin */}
          {step === 0 && (
            <>
              {products.length > 1 && (
                <>
                  <div className="bkw-sub">Co rezerwujesz?</div>
                  <div className="stay-grid">
                    {products.map((s) => (
                      <button key={s.key} type="button" className={`stay-opt ${stay === s.key ? 'on' : ''}`} onClick={() => pickProduct(s.key)}>
                        <span className="stay-label">{s.label}</span>
                        <span className="stay-sub">{s.range ? 'wiele dób' : s.sub}</span>
                        <span className="stay-price">{s.price} zł{s.range ? ' / doba' : ''}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="bkw-sub">{isRange ? 'Termin pobytu' : `Wybierz dzień${stay === 'nocka' ? ' (noc)' : ''}`}</div>
              <Calendar from={from} to={to} single={!isRange} onChange={(f, t) => { setFrom(f); setTo(t); }} dot={dotColor} />
              <div className="legend">
                <span><i style={{ background: colors.success }} /> Dużo miejsc</span>
                <span><i style={{ background: '#F59E0B' }} /> Mało</span>
                <span><i style={{ background: colors.error }} /> Brak</span>
              </div>
              {from && (
                <div className="rangebar">
                  <span className="t"><Icon name="calendar" size={16} color={colors.accent} /> {rangeLabel}</span>
                  <button style={{ border: 'none', background: 'none', color: colors.error, fontWeight: 600, cursor: 'pointer' }} onClick={() => { setFrom(null); setTo(null); }}>Wyczyść</button>
                </div>
              )}
              {isRange && (
                <p className="bk-note" style={{ marginTop: 4 }}>Liczymy w dobach: przyjazd → wyjazd (np. sob.→niedz. = 1 doba).</p>
              )}
            </>
          )}

          {/* KROK 2 — stanowiska */}
          {step === 1 && (
            <>
              {hasImage && (
                <div className="bookmap ref" style={{ backgroundImage: `url(${fishery.spotMap})` }}>
                  <span className="bookmap-hint">Plan stanowisk łowiska</span>
                </div>
              )}
              <div className="bkw-sub">Wybierz stanowiska <small>— możesz kilka</small></div>
              <div className="spots-grid" style={{ marginTop: hasImage ? 4 : 0 }}>
                {allSpots.map((s) => {
                  const sel = spots.includes(s);
                  const disabled = !spotAvailable(s);
                  const vip = isVip(s);
                  const pr = unitOf(s);
                  return (
                    <button key={s} type="button" className={`spot ${disabled ? 'taken' : ''} ${sel ? 'sel' : ''} ${vip ? 'vip' : ''}`} onClick={() => toggleSpot(s, disabled)}
                      title={`Stanowisko ${s}${vip ? ' · VIP' : ''}${disabled ? ' · zajęte w tym terminie' : ` · ${pr} zł`}`}>
                      {vip && <span className="spot-vip"><Icon name="star" size={10} color="currentColor" fill /></span>}
                      {sel && <span className="spot-check"><Icon name="check" size={12} color="var(--ff-accent)" /></span>}
                      <span className="spot-n">{s}</span>
                      <span className="spot-price">{disabled ? 'zajęte' : pr ? `${pr} zł` : 'wolne'}</span>
                    </button>
                  );
                })}
              </div>
              <div className="spots-legend">
                <span><i className="sl wolne" /> Wolne</span>
                <span><i className="sl sel" /> Wybrane</span>
                <span><i className="sl taken" /> Zajęte</span>
                <span><i className="sl vip" /> VIP</span>
              </div>
            </>
          )}

          {/* KROK 3 — dodatki + płatność + podsumowanie */}
          {step === 2 && (
            <>
              {extraCosts.length > 0 && (
                <>
                  <div className="bkw-sub">Koszty dodatkowe <small>— opcjonalne</small></div>
                  <div className="pay-grid">
                    {extraCosts.map((e) => {
                      const on = addons.includes(e.label);
                      return (
                        <div key={e.label} className={`pay-opt ${on ? 'on' : ''}`}
                          onClick={() => setAddons((p) => on ? p.filter((x) => x !== e.label) : [...p, e.label])}>
                          <Icon name="bag" size={17} color={colors.primary} />
                          {e.label}
                          <span style={{ marginLeft: 'auto', fontWeight: 700 }}>+{e.price} zł</span>
                          {on && <Icon name="check" size={16} color={colors.accent} style={{ marginLeft: 8 }} />}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <div className="bkw-sub">Sposób płatności</div>
              <div className="pay-grid">
                {PAYMENTS.map((p) => (
                  <div key={p} className={`pay-opt ${payment === p ? 'on' : ''}`} onClick={() => setPayment(p)}>
                    <Icon name={p === 'cash' ? 'cash' : 'globe'} size={18} color={colors.primary} />
                    {PAYMENT_LABELS[p]}
                    {p !== 'cash' && <span style={{ marginLeft: 'auto', fontSize: 12, color: colors.textSecondary }}>+5% obsługi</span>}
                    {payment === p && <Icon name="check" size={16} color={colors.accent} style={{ marginLeft: p === 'cash' ? 'auto' : 8 }} />}
                  </div>
                ))}
              </div>

              <div className="bkw-recap">
                <div className="bk-sum-title">Twoja rezerwacja</div>
                <SumRow label="Termin" value={rangeLabel} />
                <SumRow label="Typ pobytu" value={`${stayDef.label}${stayDef.sub ? ` · ${stayDef.sub}` : ''}`} />
                <SumRow label="Stanowiska" value={[...spots].sort((a, b) => a - b).join(', ') || '—'} />
                <div className="bk-sum-sep" />
                <SumRow label={isRange ? `${spots.length} × ${stayDef.label} × ${unitCount} ${pluralDoby(unitCount)}` : `${spots.length} × ${stayDef.label}`} value={`${base} zł`} small />
                {extraCosts.filter((e) => addons.includes(e.label)).map((e) => (
                  <SumRow key={e.label} label={e.label} value={`+${e.price} zł`} small />
                ))}
                {fee > 0 && <SumRow label="Opłata online (+5%)" value={`+${fee} zł`} small dim />}
                <div className="bk-sum-total"><span>Razem</span><b>{total} zł</b></div>
              </div>
              <p className="bk-note">Rezerwacja wymaga potwierdzenia właściciela. Nie pobieramy opłaty przed potwierdzeniem.</p>
            </>
          )}
        </div>

        {/* Stopka — cena + nawigacja */}
        <div className="bkw-foot">
          <div className="bkw-price">
            {canBook
              ? <><span className="bkw-total">{total} zł</span><span className="bkw-cap">razem · {spots.length} stan.{isRange ? ` × ${unitCount} ${pluralDoby(unitCount)}` : ` · ${stayDef.label.toLowerCase()}`}</span></>
              : <><span className="bkw-total">od {stayBase || fishery.priceFrom || '—'} zł</span><span className="bkw-cap">{stayDef.label.toLowerCase()} / stanowisko</span></>}
          </div>
          <div className="bkw-actions">
            {step > 0 && <button className="btn ghost" onClick={() => setStep((s) => s - 1)}>Wstecz</button>}
            {step < 2
              ? <button className="btn" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Dalej <Icon name="arrowRight" size={16} color={colors.accent} /></button>
              : <button className="btn" disabled={busy || !canBook} onClick={requestBook}>{busy ? 'Rezerwuję…' : (user ? 'Zarezerwuj' : 'Zaloguj i rezerwuj')} <Icon name="arrowRight" size={16} color={colors.accent} /></button>}
          </div>
        </div>
      </div>
    </div>

    {confirmOpen && (
      <AppDialog
        variant="primary" icon="calendar" title="Potwierdzić rezerwację?"
        text={
          <span className="bk-confirm">
            <span><b>{fishery.name}</b></span>
            <span className="bk-confirm-row"><Icon name="calendar" size={14} color={colors.primary} /> {rangeLabel} · {stayDef.label}</span>
            <span className="bk-confirm-row"><Icon name="pin" size={14} color={colors.primary} /> Stanowiska: {[...spots].sort((a, b) => a - b).join(', ')}</span>
            <span className="bk-confirm-row"><Icon name="cash" size={14} color={colors.primary} /> {PAYMENT_LABELS[payment]} · <b>{total} zł</b></span>
          </span>
        }
        note="Wyślemy rezerwację do właściciela. Potwierdzi ją lub odrzuci — nie pobieramy opłaty przed potwierdzeniem."
        confirmLabel="Tak, rezerwuję" onConfirm={doBook} cancelLabel="Wróć" onCancel={() => setConfirmOpen(false)}
      />
    )}
    {err && (
      <AppDialog variant="danger" icon="x" title="Nie udało się zarezerwować" text={err} confirmLabel="Rozumiem" onConfirm={() => setErr(null)} />
    )}
    </>,
    document.body,
  );
}

function SumRow({ label, value, dim, small }: { label: string; value: string; dim?: boolean; small?: boolean }) {
  return (
    <div className={`bk-sum-row ${small ? 'small' : ''}`}>
      <span>{label}</span>
      <b style={dim ? { color: 'var(--ff-text-tertiary)', fontWeight: 600 } : undefined}>{value}</b>
    </div>
  );
}
