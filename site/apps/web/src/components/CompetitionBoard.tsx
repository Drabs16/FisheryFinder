import { useEffect, useState } from 'react';
import Icon from './Icon';
import AppDialog from './AppDialog';
import { useInvites } from '../context/InvitesContext';
import {
  fetchMyBoards, createBoard, deleteBoard, addBoardMember, removeBoardMember,
  fetchBoardMembers, fetchLeaderboard, respondInvite,
  type CatchBoard, type LeaderRow, type BoardAddResult, type BoardMember,
} from '../lib/catches';

const ADD_ERR: Partial<Record<BoardAddResult, string>> = {
  no_account: 'Nie znaleziono konta z tym adresem. Kolega musi mieć konto Fishery Finder.',
  self: 'Jesteś już w tablicy jako właściciel.',
  already: 'Ta osoba jest już zaproszona.',
  forbidden: 'Tylko właściciel tablicy może zapraszać.',
  not_found: 'Nie znaleziono tablicy.',
};
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'W';
const Crown = () => <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M2.5 7.5l4.2 3.6L12 4l5.3 7.1 4.2-3.6L19.5 19h-15L2.5 7.5z" /></svg>;

export default function CompetitionBoard() {
  const { invites, reload: reloadInvites } = useInvites();
  const [boards, setBoards] = useState<CatchBoard[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [mode, setMode] = useState<'kg' | 'count' | 'big'>('kg');

  const loadBoards = () => fetchMyBoards()
    .then((b) => { setBoards(b); setSel((cur) => (cur && b.some((x) => x.id === cur) ? cur : b[0]?.id ?? null)); })
    .catch(() => {});
  useEffect(() => { loadBoards().finally(() => setLoading(false)); /* eslint-disable-next-line */ }, []);

  const board = boards.find((b) => b.id === sel) ?? null;
  const reloadBoard = () => { if (!sel) return; fetchLeaderboard(sel).then(setRows).catch(() => setRows([])); fetchBoardMembers(sel).then(setMembers).catch(() => setMembers([])); };
  useEffect(() => { if (!sel) { setRows([]); setMembers([]); return; } reloadBoard(); /* eslint-disable-next-line */ }, [sel]);

  const doCreate = async () => {
    if (!newName.trim() || busy) return;
    setBusy(true);
    try { await createBoard(newName.trim()); setNewName(''); setCreating(false); await loadBoards(); } finally { setBusy(false); }
  };
  const doDelete = async () => {
    if (!board) return;
    setConfirmDel(false);
    await deleteBoard(board.id); setSel(null); loadBoards();
  };
  const doAdd = async () => {
    const e = email.trim().toLowerCase();
    if (!isEmail(e)) { setErr('Podaj poprawny adres e-mail.'); return; }
    if (!sel || busy) return;
    setBusy(true); setErr(''); setInfo('');
    try {
      const res = await addBoardMember(sel, e);
      if (res === 'ok') { setEmail(''); setInfo(`Zaproszenie wysłane do ${e}. Pojawi się w rankingu, gdy zaakceptuje.`); reloadBoard(); loadBoards(); }
      else setErr(ADD_ERR[res] ?? 'Nie udało się zaprosić.');
    } catch { setErr('Coś poszło nie tak.'); } finally { setBusy(false); }
  };
  const doRemove = async () => { if (!sel || !removeTarget) return; const m = removeTarget; setRemoveTarget(null); await removeBoardMember(sel, m); reloadBoard(); loadBoards(); };
  const respond = async (id: string, accept: boolean) => { await respondInvite(id, accept); reloadInvites(); await loadBoards(); if (accept) setSel(id); };

  if (loading) return null;

  const Invites = invites.length > 0 && (
    <div className="invites">
      <div className="invites-t"><Icon name="mail" size={15} color="var(--ff-primary)" /> Zaproszenia do rywalizacji ({invites.length})</div>
      {invites.map((inv) => (
        <div key={inv.id} className="invite-card">
          <div className="invite-ava">{initials(inv.ownerName)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{inv.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ff-text-secondary)' }}>od {inv.ownerName} · {inv.memberCount} {inv.memberCount === 1 ? 'osoba' : 'osób'}</div>
          </div>
          <button className="invite-yes" onClick={() => respond(inv.id, true)}>Dołącz</button>
          <button className="invite-no" onClick={() => respond(inv.id, false)} title="Odrzuć"><Icon name="x" size={16} /></button>
        </div>
      ))}
    </div>
  );

  if (boards.length === 0 && !creating) {
    return (
      <div>
        {Invites}
        <div className="board-empty">
          <div className="board-empty-ico"><Icon name="trophy" size={28} /></div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Stwórz tablicę rywalizacji</div>
          <div style={{ fontSize: 14, color: 'var(--ff-text-secondary)', margin: '6px 0 18px', maxWidth: 420 }}>
            Zaproś kolegów z kontem Fishery Finder i rywalizujcie — kto złowił więcej, ile kilo łącznie i czyj big fish jest największy.
          </div>
          <button className="board-btn" onClick={() => setCreating(true)}><Icon name="people" size={17} color="#fff" /> Nowa tablica</button>
        </div>
      </div>
    );
  }

  // Tryby rankingu (bez zmian w bazie — przeliczane z tych samych wierszy)
  const metricOf = (r: LeaderRow) => (mode === 'kg' ? r.totalKg : mode === 'count' ? r.catchCount : (r.bigWeight ?? 0));
  const sorted = [...rows].sort((a, b) => metricOf(b) - metricOf(a));
  const maxV = Math.max(1, ...sorted.map(metricOf));
  const metricLabel = (r: LeaderRow) => (mode === 'kg' ? `${r.totalKg} kg` : mode === 'count' ? `${r.catchCount} ${r.catchCount === 1 ? 'ryba' : 'ryb'}` : (r.bigWeight != null ? `${r.bigWeight} kg` : '—'));
  const MODES: { k: typeof mode; label: string }[] = [{ k: 'kg', label: 'Waga' }, { k: 'count', label: 'Sztuki' }, { k: 'big', label: 'Big fish' }];
  const MEDAL = ['🥇', '🥈', '🥉'];
  const podium = sorted.slice(0, 3);

  return (
    <div>
      {Invites}
      <div className="board-bar">
        {boards.map((b) => (
          <button key={b.id} className={`board-pill ${b.id === sel ? 'on' : ''}`} onClick={() => setSel(b.id)}>
            <Icon name="trophy" size={14} color={b.id === sel ? '#fff' : 'var(--ff-primary)'} /> {b.name}
            <span className="board-pill-n">{b.memberCount}</span>
          </button>
        ))}
        {creating ? (
          <span className="board-new">
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }} placeholder="Nazwa tablicy…" />
            <button onClick={doCreate} disabled={busy || !newName.trim()}><Icon name="check" size={15} color="#fff" /></button>
          </span>
        ) : (
          <button className="board-pill add" onClick={() => setCreating(true)}><Icon name="trophy" size={14} color="var(--ff-primary)" /> + Nowa tablica</button>
        )}
      </div>

      {board && (
        <div className="board-card">
          <div className="board-head">
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{board.name}</div>
              <div style={{ fontSize: 13, color: 'var(--ff-text-secondary)' }}>{board.memberCount} {board.memberCount === 1 ? 'uczestnik' : 'uczestników'}{board.isOwner ? '' : ' · dołączasz jako gość'}</div>
            </div>
            {board.isOwner && <button className="board-del" onClick={() => setConfirmDel(true)} title="Usuń tablicę"><Icon name="x" size={16} /></button>}
          </div>

          {rows.length > 0 && (
            <div className="lb-modes">
              {MODES.map((m) => (
                <button key={m.k} className={`lb-mode ${mode === m.k ? 'on' : ''}`} onClick={() => setMode(m.k)}>{m.label}</button>
              ))}
            </div>
          )}

          {/* Podium top 3 */}
          {podium.length >= 2 && (
            <div className="lb-podium">
              {[1, 0, 2].map((pi) => { // środek=1. miejsce (wyżej), lewo=2., prawo=3.
                const r = podium[pi]; if (!r) return <div key={pi} className="podi empty" />;
                return (
                  <div key={pi} className={`podi p${pi + 1} ${r.isYou ? 'you' : ''}`}>
                    <span className="podi-medal">{MEDAL[pi]}</span>
                    <span className="podi-av">{initials(r.angler)}</span>
                    <span className="podi-name">{r.angler}{r.isYou && ' · Ty'}</span>
                    <span className="podi-val">{metricLabel(r)}</span>
                    <span className="podi-stand">{pi + 1}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="lb">
            {rows.length === 0 ? (
              <div style={{ padding: '18px 4px', color: 'var(--ff-text-secondary)', fontSize: 14 }}>Brak danych — zaproś kolegów i łówcie ryby 🎣</div>
            ) : sorted.map((r, i) => (
              <div key={i} className={`lb-row ${r.isYou ? 'you' : ''}`}>
                <span className={`lb-rank r${i + 1}`}>{i < 3 ? MEDAL[i] : i + 1}</span>
                <span className="lb-av">{initials(r.angler)}</span>
                <div className="lb-who">
                  <div className="lb-name-row">
                    <span className="lb-name">{r.angler}{r.isYou && <em> · Ty</em>}</span>
                    <span className="lb-kg">{metricLabel(r)}</span>
                  </div>
                  <div className="lb-bar"><div className={`lb-bar-fill ${i === 0 ? 'lead' : ''}`} style={{ width: `${Math.max(3, (metricOf(r) / maxV) * 100)}%` }} /></div>
                  <div className="lb-meta">
                    {r.bigWeight != null ? <span className="lb-bf"><span className="lb-crown"><Crown /></span> {r.bigSpecies} {r.bigWeight} kg</span> : <span style={{ opacity: .7 }}>brak big fisha</span>}
                    <span>· {r.catchCount} {r.catchCount === 1 ? 'połów' : 'połowów'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {board.isOwner && (
            <div className="board-manage">
              <div className="board-manage-t">Zaproś kolegę (e-mail konta)</div>
              <div className="board-add-row">
                <input type="email" inputMode="email" placeholder="kolega@email.pl" value={email}
                  onChange={(e) => { setEmail(e.target.value); setErr(''); setInfo(''); }} onKeyDown={(e) => { if (e.key === 'Enter') doAdd(); }} />
                <button onClick={doAdd} disabled={busy || !email.trim()}>Zaproś</button>
              </div>
              {err && <div className="board-err"><Icon name="x" size={13} color="var(--ff-error)" /> {err}</div>}
              {info && <div className="board-info"><Icon name="check" size={13} color="var(--ff-primary)" /> {info}</div>}
              {members.length > 0 && (
                <div className="board-members">
                  {members.map((m) => (
                    <span key={m.email} className={`board-chip ${m.status === 'pending' ? 'pending' : ''}`}>
                      {m.email}{m.status === 'pending' && <span className="board-chip-tag">oczekuje</span>}
                      <button onClick={() => setRemoveTarget(m.email)} title="Usuń"><Icon name="x" size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {confirmDel && board && (
        <AppDialog variant="danger" icon="x" title={`Usunąć tablicę „${board.name}"?`}
          text="Tablica i jej ranking znikną dla wszystkich uczestników. Tej akcji nie można cofnąć."
          confirmLabel="Usuń tablicę" confirmVariant="danger" onConfirm={doDelete}
          cancelLabel="Anuluj" onCancel={() => setConfirmDel(false)} />
      )}
      {removeTarget && (
        <AppDialog variant="danger" icon="x" title="Usunąć uczestnika?"
          text={`${removeTarget} zniknie z tej tablicy rywalizacji.`}
          confirmLabel="Usuń" confirmVariant="danger" onConfirm={doRemove}
          cancelLabel="Anuluj" onCancel={() => setRemoveTarget(null)} />
      )}
    </div>
  );
}
