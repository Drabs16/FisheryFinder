import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile { name: string; phone: string; city?: string | null; province?: string | null }

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string, city?: string) => Promise<{ needsConfirm: boolean }>;
  resendConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Dokąd wracamy po kliknięciu w link potwierdzający — zawsze bieżący origin
// (localhost w devie, fisheryfinder.pl na produkcji). Musi być na liście Redirect URLs w Supabase.
const emailRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('name, phone, city, province').eq('id', uid).maybeSingle();
    setProfile(data ? (data as Profile) : null);
  };

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) { setProfile(null); return; }
    loadProfile(uid);
  }, [session?.user?.id]);

  const refreshProfile = async () => { const uid = session?.user?.id; if (uid) await loadProfile(uid); };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };
  const signUp = async (email: string, password: string, name: string, phone: string, city = '') => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, phone, city: city || null, role: 'angler' }, emailRedirectTo } });
    if (error) throw error;
    return { needsConfirm: !data.session };
  };
  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } });
    if (error) throw error;
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signUp, resendConfirmation, signOut, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
