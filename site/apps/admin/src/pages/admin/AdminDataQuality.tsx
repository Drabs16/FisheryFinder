import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminDataQuality, type DqNeed, type DqDup } from '../../lib/api';
import { toast } from '../../components/Toast';
import Loader from '../../components/Loader';
import Icon from '../../components/Icon';
import { colors } from '../../theme';

type Lack = 'all' | 'desc' | 'price' | 'fish' | 'photos';

const flag = (ok: boolean) =>
  ok ? <Icon name="check" size={15} color={colors.success} /> : <Icon name="x" size={15} color={colors.error} />;

export default function AdminDataQuality() {
  const [needs, setNeeds] = useState<DqNeed[]>([]);
  const [duplicates, setDuplicates] = useState<DqDup[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [lack, setLack] = useState<Lack>('all');

  const load = () => {
    setLoading(true);
    adminDataQuality()
      .then(({ needs, duplicates }) => { setNeeds(needs); setDuplicates(duplicates); })
      .catch((e) => toast(e instanceof Error ? e.message : 'Błąd', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const stats = useMemo(() => ({
    desc: needs.filter((n) => !n.has_desc).length,
    price: needs.filter((n) => !n.has_price).length,
    fish: needs.filter((n) => !n.has_fish).length,
    photos: needs.filter((n) => !n.has_photos).length,
  }), [needs]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return needs
      .filter((n) =>
        lack === 'all' ? true :
        lack === 'desc' ? !n.has_desc :
        lack === 'price' ? !n.has_price :
        lack === 'fish' ? !n.has_fish :
        !n.has_photos)
      .filter((n) => !s || `${n.name} ${n.city}`.toLowerCase().includes(s));
  }, [needs, q, lack]);

  const lackChips: { key: Lack; label: string }[] = [
    { key: 'all', label: `Wszystkie · ${needs.length}` },
    { key: 'desc', label: `Bez opisu · ${stats.desc}` },
    { key: 'price', label: `Bez ceny · ${stats.price}` },
    { key: 'fish', label: `Bez gatunków · ${stats.fish}` },
    { key: 'photos', label: `Bez zdjęć · ${stats.photos}` },
  ];

  return (
    <>
      <div className="topbar">
        <div><h1>Jakość danych <span className="admin-badge">ADMIN</span></h1><div className="sub">Łowiska do uzupełnienia i możliwe duplikaty</div></div>
        <div className="topbar-right">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>Do uzupełnienia</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: needs.length ? colors.error : colors.primary }}>{needs.length}</div>
          </div>
        </div>
      </div>

      <div className="content">
        {loading ? <Loader label="Wczytywanie jakości danych…" /> : (
          <>
            <div className="row" style={{ gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {([
                { label: 'Bez opisu', v: stats.desc },
                { label: 'Bez ceny', v: stats.price },
                { label: 'Bez gatunków', v: stats.fish },
                { label: 'Bez zdjęć', v: stats.photos },
              ]).map((s) => (
                <div key={s.label} className="card" style={{ padding: '12px 16px', flex: 1, minWidth: 130 }}>
                  <div style={{ fontSize: 12, color: colors.textSecondary }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.v ? colors.error : colors.primary }}>{s.v}</div>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0 12px' }}>Do uzupełnienia</h2>

            <div className="row" style={{ marginBottom: 16, alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {lackChips.map((c) => (
                  <span key={c.key} className={`chip ${lack === c.key ? 'on' : ''}`} onClick={() => setLack(c.key)}>{c.label}</span>
                ))}
              </div>
              <div className="searchbar" style={{ maxWidth: 280 }}>
                <Icon name="search" size={16} color={colors.textSecondary} />
                <input placeholder="Szukaj łowiska…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="card empty"><div className="big"><Icon name="check" size={26} /></div>{needs.length === 0 ? 'Wszystkie łowiska mają komplet danych.' : 'Brak łowisk dla tego filtra.'}</div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead><tr><th>Łowisko</th><th style={{ textAlign: 'center' }}>Opis</th><th style={{ textAlign: 'center' }}>Cena</th><th style={{ textAlign: 'center' }}>Gatunki</th><th style={{ textAlign: 'center' }}>Zdjęcia</th><th style={{ textAlign: 'right' }}>Akcja</th></tr></thead>
                  <tbody>
                    {filtered.map((n) => (
                      <tr key={n.id}>
                        <td>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {n.name}
                            {n.premium && <span className="badge" style={{ background: colors.accentSoft, color: colors.primary }}>Premium</span>}
                          </div>
                          <div style={{ fontSize: 12, color: colors.textSecondary }}>{[n.city, n.province].filter(Boolean).join(', ') || '—'}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{flag(n.has_desc)}</td>
                        <td style={{ textAlign: 'center' }}>{flag(n.has_price)}</td>
                        <td style={{ textAlign: 'center' }}>{flag(n.has_fish)}</td>
                        <td style={{ textAlign: 'center' }}>{flag(n.has_photos)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <Link to={'/lowiska/' + n.id} className="btn ghost sm"><Icon name="edit" size={13} /> Uzupełnij</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {duplicates.length > 0 && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '28px 0 12px' }}>Możliwe duplikaty</h2>
                <div className="card" style={{ padding: 0 }}>
                  <table className="tbl">
                    <thead><tr><th>Nazwa</th><th>Miasto</th><th style={{ textAlign: 'center' }}>Ile</th><th style={{ textAlign: 'right' }}>Akcja</th></tr></thead>
                    <tbody>
                      {duplicates.map((d, i) => (
                        <tr key={`${d.name}-${d.city}-${i}`}>
                          <td style={{ fontWeight: 600 }}>{d.name || '—'}</td>
                          <td>{d.city || '—'}</td>
                          <td style={{ textAlign: 'center' }}><span className="badge" style={{ background: '#FEE2E2', color: colors.error }}>{d.count}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <Link to={'/lowiska/' + d.ids[0]} className="btn ghost sm"><Icon name="edit" size={13} /> Rozstrzygnij</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
