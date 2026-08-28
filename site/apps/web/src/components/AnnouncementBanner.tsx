import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Ann { id: string; title: string; body: string }
const KEY = 'ff:annDismissed';
const getDismissed = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

// Baner ogłoszeń platformy (sterowany z panelu admina → tabela announcements).
export default function AnnouncementBanner({ audience = 'anglers' }: { audience?: string }) {
  const [ann, setAnn] = useState<Ann | null>(null);

  useEffect(() => {
    let dead = false;
    supabase.rpc('active_announcements', { p_audience: audience }).then(({ data }) => {
      if (dead || !Array.isArray(data) || data.length === 0) return;
      const dismissed = getDismissed();
      const next = (data as Ann[]).find((a) => !dismissed.includes(a.id));
      if (next) setAnn(next);
    }, () => {});
    return () => { dead = true; };
  }, [audience]);

  if (!ann) return null;
  const dismiss = () => {
    localStorage.setItem(KEY, JSON.stringify([...getDismissed(), ann.id]));
    setAnn(null);
  };

  return (
    <div className="ann-banner">
      <div className="ann-inner">
        <span className="ann-dot" />
        <span><b>{ann.title}</b>{ann.body ? <span className="ann-body"> — {ann.body}</span> : null}</span>
      </div>
      <button className="ann-x" onClick={dismiss} aria-label="Zamknij ogłoszenie">✕</button>
    </div>
  );
}
