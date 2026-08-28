import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// E-maile administratorów (spójne z tabelą app_admins / funkcją is_admin() w bazie).
const ADMIN_EMAILS = ['admin@fisheryfinder.pl'];

interface AuthState {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string, businessName?: string, nip?: string) => Promise<{ needsConfirm: boolean }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string, phone: string, businessName = '', nip = '') => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, phone, business_name: businessName || null, nip: nip || null, role: 'owner' } },
    });
    if (error) throw error;
    // Jeśli e-mail wymaga potwierdzenia, sesja nie zostanie zwrócona.
    return { needsConfirm: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;
  const isAdmin = ADMIN_EMAILS.includes((user?.email ?? '').toLowerCase());

  return (
    <Ctx.Provider value={{ session, user, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
