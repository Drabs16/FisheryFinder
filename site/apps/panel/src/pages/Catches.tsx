import { useEffect, useMemo, useState } from 'react';
import { useOwnerData } from '../lib/useOwnerData';
import { ownerListCatches, ownerSetCatchHidden, type OwnerCatch } from '../lib/api';
import { colors } from '../theme';
import Icon from '../components/Icon';
import Select from '../components/Select';
import Loader from '../components/Loader';
import { toast } from '../components/Toast';

const MS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const fmt = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return `${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear()}`; };

export default function Catches() {
  const { fisheries } = useOwnerData();
  const [fishery, setFishery] = useState('all');
  const [items, setItems] = useState<OwnerCatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    ownerListCatches(fishery === 'all' ? undefined : fishery)
      .then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  };
  useEffect(load, [fishery]);

  const toggle = async (c: OwnerCatch) => {
    setBusy(c.id);
    try {
      await ownerSetCatchHidden(c.id, !c.hidden);
      setItems((p) => p.map((x) => (x.id === c.id ? { ...x, hidden: !x.hidden } : x)));
      toast(c.hidden ? 'Połów znów widoczny w galerii' : 'Połów ukryty w galerii', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Nie udało się zmienić', 'error'); }
    setBusy(null);
  };

  const stats = useMemo(() => {
    const visible = items.filter((c) => !c.hidden);
    const best = items.reduce((m, c) => (c.weight && c.weight > m ? c.weight : m), 0);
    const anglers = new Set(items.map((c) => `${c.anglerName}|${c.anglerPhone}`)).size;
    return { total: items.length, visible: visible.length, best, anglers };
  }, [items]);

  return (
    <>
      <div className="topbar">
        <div><h1>Połowy</h1><div className="sub">Ryby zgłoszone przez wędkarzy na Twoich łowiskach — galeria i moderacja</div></div>
        {fisheries.length > 1 && (
          <Select value={fishery} onChange={setFishery} icon="fish" width={240}
            options={[{ value: 'all', label: 'Wszystkie łowiska' }, ...fisheries.map((f) => ({ value: f.id, label: f.name }))]} />
        )}
      </div>

      <div className="content">
        {loading ? <Loader label="Wczytywanie połowów…" /> : items.length === 0 ? (
          <div className="card empty"><div className="big"><Icon name="trophy" size={26} /></div>
            Jeszcze nikt nie zgłosił połowu. Gdy wędkarze zaczną dodawać ryby (przycisk „Dodaj połów" na stronie łowiska), pojawią się tutaj — z galerią i kontaktem.
          </div>
        ) : (
          <>
            <div className="grid cols-4" style={{ marginBottom: 18 }}>
              <Stat icon="trophy" label="Połowów" value={String(stats.total)} />
              <Stat icon="fish" label="Widocznych w galerii" value={String(stats.visible)} />
              <Stat icon="tag" label="Rekord" value={stats.best ? `${stats.best} kg` : '—'} />
              <Stat icon="users" label="Wędkarzy" value={String(stats.anglers)} />
            </div>

            <div className="catchgrid">
              {items.map((c) => (
                <div className={`catchcard ${c.hidden ? 'hidden' : ''}`} key={c.id}>
                  <div className="cc-photo">
                    {c.photoUrl ? <img src={c.photoUrl} alt={c.species} /> : <div className="cc-ph"><Icon name="fish" size={28} color={colors.primary} /></div>}
                    {c.weight != null && <span className="cc-weight">{c.weight} kg</span>}
                    {c.hidden && <span className="cc-hidden-badge">Ukryty</span>}
                  </div>
                  <div className="cc-body">
                    <div className="cc-top">
                      <div className="cc-species">{c.species}</div>
                      {fisheries.length > 1 && <div className="cc-fishery">{c.fisheryName}</div>}
                    </div>
                    <div className="cc-meta">
                      <span><Icon name="calendar" size={13} color={colors.textSecondary} /> {fmt(c.caughtOn)}</span>
                      {c.spotNumber != null && <span><Icon name="layers" size={13} color={colors.textSecondary} /> Stan. {c.spotNumber}</span>}
                    </div>
                    <div className="cc-angler">
                      <Icon name="users" size={14} color={colors.accent} /> <b>{c.anglerName}</b>
                      {c.anglerPhone && <a className="cc-phone" href={`tel:${c.anglerPhone.replace(/\s/g, '')}`}><Icon name="phone" size={12} /> {c.anglerPhone}</a>}
                    </div>
                    {c.note && <div className="cc-note">{c.note}</div>}
                    <button className={`btn ${c.hidden ? '' : 'ghost'} sm cc-toggle`} disabled={busy === c.id} onClick={() => toggle(c)}>
                      {busy === c.id ? '…' : c.hidden ? 'Pokaż w galerii' : 'Ukryj w galerii'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hint" style={{ marginTop: 16 }}>
              <Icon name="layers" size={13} /> „Ukryj" chowa połów z publicznej galerii łowiska. Wędkarz nadal widzi go w swoim dzienniku. Kontakt do wędkarza widzisz tylko Ty.
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Stat({ icon, label, value }: { icon: 'trophy' | 'fish' | 'tag' | 'users'; label: string; value: string }) {
  return (
    <div className="stat">
      <div className="label"><Icon name={icon} size={15} color={colors.accent} /> {label}</div>
      <div className="value" style={{ fontSize: 24 }}>{value}</div>
    </div>
  );
}
