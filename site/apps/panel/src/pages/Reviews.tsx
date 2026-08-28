import { useEffect, useMemo, useState } from 'react';
import { ownerListReviews, ownerSetReviewHidden, ownerCensorReview, ownerRestoreReviewComment, type OwnerReviewRow } from '../lib/api';
import { toast } from '../components/Toast';
import { confirmDialog } from '../components/Confirm';
import Loader from '../components/Loader';
import Icon from '../components/Icon';
import Select from '../components/Select';
import { colors } from '../theme';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// Wyszukiwanie bez znaków diakrytycznych (ó=o, ż=z…)
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CENSOR_KEY = 'ff:censorWords';
const loadCensorWords = (): string[] => { try { return JSON.parse(localStorage.getItem(CENSOR_KEY) || '[]'); } catch { return []; } };
// Maskuje wystąpienia słów (bez diakrytyków, dowolna wielkość liter) kropkami.
function maskWords(text: string, words: string[]): string {
  let out = text;
  for (const w of words) {
    if (!w.trim()) continue;
    const re = new RegExp(escapeRe(w.trim()), 'gi');
    out = out.replace(re, (m) => '•'.repeat(m.length));
  }
  return out;
}
const hasBanned = (text: string | null, words: string[]) =>
  !!text && words.some((w) => w.trim() && new RegExp(escapeRe(w.trim()), 'i').test(text));

export default function Reviews() {
  const [rows, setRows] = useState<OwnerReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fishery, setFishery] = useState('all');
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [censorWords, setCensorWords] = useState<string[]>(loadCensorWords);
  const [censorOpen, setCensorOpen] = useState(false);
  const saveCensorWords = (w: string[]) => { setCensorWords(w); localStorage.setItem(CENSOR_KEY, JSON.stringify(w)); };

  const load = () => {
    setLoading(true);
    ownerListReviews().then(setRows).catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const fisheries = useMemo(() => [...new Map(rows.map((r) => [r.fishery_id, r.fishery_name])).entries()], [rows]);
  const filtered = useMemo(() => {
    const s = norm(q.trim());
    return rows
      .filter((r) => fishery === 'all' || r.fishery_id === fishery)
      .filter((r) => filter === 'all' || (filter === 'hidden' ? r.hidden : !r.hidden))
      .filter((r) => !s || norm(`${r.author_name ?? ''} ${r.fishery_name} ${r.comment ?? ''}`).includes(s));
  }, [rows, fishery, filter, q]);

  const scoped = fishery === 'all' ? rows : rows.filter((r) => r.fishery_id === fishery);
  const hiddenCount = scoped.filter((r) => r.hidden).length;
  const avg = scoped.filter((r) => !r.hidden);
  const avgRating = avg.length ? (avg.reduce((s, r) => s + r.rating, 0) / avg.length) : 0;

  const toggle = async (r: OwnerReviewRow) => {
    if (!r.hidden && !(await confirmDialog({ title: 'Ukryć opinię?', message: 'Opinia zniknie ze strony łowiska i z apki, ale zostanie w bazie. Możesz ją przywrócić.', confirmLabel: 'Ukryj', danger: true }))) return;
    setBusy(r.id);
    try {
      await ownerSetReviewHidden(r.id, !r.hidden);
      setRows((p) => p.map((x) => (x.id === r.id ? { ...x, hidden: !x.hidden } : x)));
      toast(r.hidden ? 'Opinia przywrócona' : 'Opinia ukryta', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusy(null); }
  };

  const censor = async (r: OwnerReviewRow) => {
    if (!r.comment) return;
    const masked = maskWords(r.comment, censorWords);
    if (masked === r.comment) { toast('Brak słów do ocenzurowania w tej opinii.', 'info'); return; }
    setBusy(r.id);
    try {
      await ownerCensorReview(r.id, masked);
      setRows((p) => p.map((x) => (x.id === r.id ? { ...x, comment_original: x.comment_original ?? x.comment, comment: masked } : x)));
      toast('Słowa ocenzurowane', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusy(null); }
  };
  const restore = async (r: OwnerReviewRow) => {
    setBusy(r.id);
    try {
      await ownerRestoreReviewComment(r.id);
      setRows((p) => p.map((x) => (x.id === r.id ? { ...x, comment: x.comment_original ?? x.comment, comment_original: null } : x)));
      toast('Przywrócono oryginalną treść', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Błąd', 'error'); }
    finally { setBusy(null); }
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Opinie</h1><div className="sub">Moderuj opinie wędkarzy o Twoich łowiskach</div></div>
        <div className="topbar-right">
          <button className="btn ghost" onClick={() => setCensorOpen(true)}><Icon name="lock" size={15} /> Cenzura słów{censorWords.length > 0 ? ` · ${censorWords.length}` : ''}</button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>Średnia ocena</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colors.primary, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="star" size={17} color="#F59E0B" fill /> {avgRating ? avgRating.toFixed(1) : '—'}
            </div>
          </div>
        </div>
      </div>
      {censorOpen && <CensorModal words={censorWords} onSave={saveCensorWords} onClose={() => setCensorOpen(false)} />}

      <div className="content">
        <div className="row" style={{ marginBottom: 16, alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {fisheries.length > 1 && (
              <Select value={fishery} onChange={setFishery} icon="fish" width={220}
                options={[{ value: 'all', label: 'Wszystkie łowiska' }, ...fisheries.map(([id, name]) => ({ value: id, label: name }))]} />
            )}
            <div className="row" style={{ gap: 6 }}>
              {(['all', 'visible', 'hidden'] as const).map((f) => (
                <span key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                  {f === 'all' ? `Wszystkie · ${scoped.length}` : f === 'visible' ? 'Widoczne' : `Ukryte · ${hiddenCount}`}
                </span>
              ))}
            </div>
          </div>
          <div className="searchbox" style={{ maxWidth: 280 }}>
            <Icon name="search" size={16} color={colors.textSecondary} />
            <input placeholder="Szukaj w opiniach…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {loading ? <Loader label="Wczytywanie opinii…" />
          : filtered.length === 0 ? (
            <div className="card empty"><div className="big"><Icon name="star" size={26} /></div>{rows.length === 0 ? 'Nie masz jeszcze żadnych opinii. Pojawią się, gdy wędkarze ocenią Twoje łowiska.' : 'Brak opinii dla tego filtra.'}</div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead><tr><th>Łowisko</th><th>Autor</th><th>Ocena</th><th>Komentarz</th><th>Data</th><th>Status</th><th style={{ textAlign: 'right' }}>Akcja</th></tr></thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} style={{ opacity: r.hidden ? 0.55 : 1 }}>
                      <td style={{ fontWeight: 600 }}>{r.fishery_name || '—'}</td>
                      <td>{r.author_name || 'Wędkarz'}</td>
                      <td><span style={{ display: 'inline-flex', gap: 1 }}>{[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" size={13} color={s <= r.rating ? '#F59E0B' : colors.border} fill={s <= r.rating} />)}</span></td>
                      <td style={{ maxWidth: 340, fontSize: 13 }}>
                        {r.comment || <span className="muted">—</span>}
                        {r.comment_original && <span className="badge" style={{ marginLeft: 6, background: '#FEF3C7', color: '#92400E', fontSize: 11 }}>ocenzurowana</span>}
                      </td>
                      <td style={{ fontSize: 12.5, color: colors.textSecondary }}>{fmtDate(r.visited_on || r.created_at)}</td>
                      <td><span className="badge" style={{ background: r.hidden ? '#FEE2E2' : colors.accentSoft, color: r.hidden ? colors.error : colors.primary }}>{r.hidden ? 'Ukryta' : 'Widoczna'}</span></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          {r.comment_original
                            ? <button className="btn ghost sm" disabled={busy === r.id} onClick={() => restore(r)} title="Przywróć oryginalną treść"><Icon name="arrowUp" size={13} /> Odcenzuruj</button>
                            : hasBanned(r.comment, censorWords) && <button className="btn ghost sm" disabled={busy === r.id} onClick={() => censor(r)} title="Zamaskuj słowa z listy cenzury"><Icon name="lock" size={13} /> Cenzuruj</button>}
                          <button className={`btn sm ${r.hidden ? 'accent' : 'ghost danger'}`} disabled={busy === r.id} onClick={() => toggle(r)}>
                            {r.hidden ? <><Icon name="check" size={13} /> Przywróć</> : <><Icon name="x" size={13} /> Ukryj</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
      </div>
    </>
  );
}

function CensorModal({ words, onSave, onClose }: { words: string[]; onSave: (w: string[]) => void; onClose: () => void }) {
  const [list, setList] = useState<string[]>(words);
  const [text, setText] = useState('');
  const add = () => {
    const w = text.trim().toLowerCase();
    if (w && !list.includes(w)) setList([...list, w]);
    setText('');
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h3 style={{ fontSize: 18 }}>Cenzura słów</h3><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Słowa z tej listy możesz zamaskować w opiniach. Ocenzurowana treść trafia na stronę i do aplikacji; oryginał zostaje zachowany.</div></div>
          <button className="btn ghost icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          <input className="input" style={{ flex: 1 }} placeholder="Dodaj słowo do cenzury…" value={text}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
          <button className="btn ghost" onClick={add}><Icon name="plus" size={15} /> Dodaj</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, minHeight: 28 }}>
          {list.length === 0 ? <span className="muted" style={{ fontSize: 13 }}>Brak słów. Dodaj słowa, które chcesz maskować w opiniach.</span>
            : list.map((w) => (
              <span key={w} className="chip on" style={{ cursor: 'default' }}>{w}
                <span style={{ cursor: 'pointer', marginLeft: 4, display: 'inline-flex' }} onClick={() => setList(list.filter((x) => x !== w))}><Icon name="x" size={13} /></span>
              </span>
            ))}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn ghost" onClick={onClose}>Anuluj</button>
          <button className="btn" onClick={() => { onSave(list); onClose(); }}><Icon name="check" size={15} /> Zapisz listę</button>
        </div>
      </div>
    </div>
  );
}
