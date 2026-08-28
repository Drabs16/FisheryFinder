import { createClient } from '@supabase/supabase-js';

// Ten sam projekt Supabase co aplikacja mobilna — wspólne konta i dane.
// Współdzielony przez web (wędkarz), panel (właściciel) i admin.
// Kanoniczny schemat bazy: ./database.types.ts (Tables<'...'> w @ff/shared).
const SUPABASE_URL = 'https://xiwiaiuiwpgxattrxknn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EF1hUi3692bSDvc0Sh6N5Q_ZECpr8eH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});
