// Edge Function: wysyła wędkarzowi e-mail po potwierdzeniu rezerwacji przez właściciela.
//
// Wywoływana z panelu właściciela: supabase.functions.invoke('reservation-confirmed',
//   { body: { reservationId } }) — z JWT zalogowanego właściciela.
//
// Bezpieczeństwo: sprawdzamy, że wołający jest właścicielem łowiska z tej rezerwacji
// (żeby nie dało się wysyłać maili do obcych). E-mail wędkarza bierzemy z auth.users
// (service_role), bo tabela reservations go nie trzyma.
//
// Sekrety wymagane: RESEND_API_KEY (opcjonalnie FROM_EMAIL).
// Deploy: supabase functions deploy reservation-confirmed

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const MS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const fmt = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return `${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear()}`; };
const range = (from: string, to: string) => (from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { reservationId } = await req.json().catch(() => ({}));
    if (!reservationId) return json({ error: 'Brak reservationId' }, 400);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    // Klient w kontekście wołającego — do ustalenia kim jest.
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: caller } = await userClient.auth.getUser();
    if (!caller?.user) return json({ error: 'Brak autoryzacji' }, 401);

    // Klient admina — czyta rezerwację, właściciela i e-mail wędkarza.
    const admin = createClient(url, service);

    const { data: resv, error: rErr } = await admin
      .from('reservations')
      .select('id, user_id, fishery_id, fishery_name, spots, date_from, date_to, days, total, confirmed_at')
      .eq('id', reservationId)
      .maybeSingle();
    if (rErr) return json({ error: rErr.message }, 500);
    if (!resv) return json({ error: 'Nie znaleziono rezerwacji' }, 404);

    // Autoryzacja: wołający musi być właścicielem łowiska.
    const { data: fishery } = await admin
      .from('fisheries').select('owner_id').eq('id', resv.fishery_id).maybeSingle();
    if (!fishery || fishery.owner_id !== caller.user.id) return json({ error: 'Brak uprawnień' }, 403);

    if (!resv.user_id) return json({ error: 'Rezerwacja bez użytkownika (gość)' }, 200);

    const { data: angler, error: aErr } = await admin.auth.admin.getUserById(resv.user_id);
    if (aErr || !angler?.user?.email) return json({ error: 'Brak e-maila wędkarza' }, 200);
    const to = angler.user.email;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return json({ error: 'Brak RESEND_API_KEY' }, 500);
    const from = Deno.env.get('FROM_EMAIL') ?? 'Fishery Finder <rezerwacje@fisheryfinder.pl>';

    const spots = Array.isArray(resv.spots) ? resv.spots.join(', ') : '';
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#1A1A2E">
        <div style="background:#1B4332;color:#fff;padding:22px;border-radius:14px 14px 0 0">
          <h2 style="margin:0;font-size:20px">Rezerwacja potwierdzona ✅</h2>
        </div>
        <div style="border:1px solid #E5E7EB;border-top:none;padding:22px;border-radius:0 0 14px 14px">
          <p style="margin:0 0 14px">Cześć! Właściciel potwierdził Twoją rezerwację.</p>
          <table style="width:100%;font-size:15px;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#6B7280">Łowisko</td><td style="padding:6px 0;font-weight:700;text-align:right">${resv.fishery_name}</td></tr>
            <tr><td style="padding:6px 0;color:#6B7280">Termin</td><td style="padding:6px 0;font-weight:700;text-align:right">${range(resv.date_from, resv.date_to)}</td></tr>
            <tr><td style="padding:6px 0;color:#6B7280">${spots.includes(',') ? 'Stanowiska' : 'Stanowisko'}</td><td style="padding:6px 0;font-weight:700;text-align:right">${spots || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#6B7280">Kwota</td><td style="padding:6px 0;font-weight:700;text-align:right">${resv.total} zł</td></tr>
          </table>
          <p style="margin:18px 0 0;color:#6B7280;font-size:13px">Do zobaczenia nad wodą! — Fishery Finder</p>
        </div>
      </div>`;

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: 'Twoja rezerwacja została potwierdzona ✅', html }),
    });
    if (!sendRes.ok) {
      const detail = await sendRes.text();
      return json({ error: 'Resend error', detail }, 502);
    }

    return json({ ok: true, to });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Nieznany błąd' }, 500);
  }
});
