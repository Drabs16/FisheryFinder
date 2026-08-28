# 🎣 Fishery Finder

Platforma do znajdowania łowisk i rezerwacji stanowisk — z panelem dla właścicieli.
Jeden backend (Supabase), trzy powierzchnie produktu:

| Powierzchnia | Dla kogo | Tech | Gdzie | Adres docelowy |
|---|---|---|---|---|
| **Apka mobilna** | wędkarz | Expo / React Native | `src/`, `App.tsx` (root) | App Store / Google Play |
| **Strona web** | wędkarz | Vite + React + MapLibre | `site/apps/web` | `fisheryfinder.pl` |
| **Panel** | właściciel łowiska | Vite + React + recharts | `site/apps/panel` | `panel.fisheryfinder.pl` |

Wspólny backend: **Supabase** (projekt `xiwiaiuiwpgxattrxknn`) — konta, łowiska, rezerwacje,
Storage zdjęć, Edge Function maili. Apka i web współdzielą konta wędkarzy; panel to konta właścicieli.

```
FisheryFinder/
├── App.tsx, src/        # apka mobilna (Expo) — żyje osobno w roocie
├── site/                # cała część WWW (monorepo npm workspaces)
│   ├── apps/web/        # strona wędkarza   → fisheryfinder.pl
│   ├── apps/panel/      # panel właściciela → panel.fisheryfinder.pl
│   └── packages/shared/ # @ff/shared: klient Supabase + linki mostkujące
└── supabase/            # SQL (SETUP.sql) + Edge Functions
```

## 🔄 Jak to się spina (przepływ rezerwacji)
1. Wędkarz rezerwuje stanowisko (apka lub web).
2. Właściciel widzi rezerwację w panelu (dzwonek + „Dziś na łowisku") i **potwierdza**.
3. Wędkarz dostaje **powiadomienie w apce** (dzwonek, plakietka, baner, status „Potwierdzona ✅")
   **oraz e-mail** (Edge Function `reservation-confirmed` przez Resend).

Mostki UX: web ⇄ panel (linki „Dla właścicieli" / „Podgląd"); apka ⇄ web = wspólne konto i dane.

---

## 🚀 Uruchomienie (dev)

**Część WWW (web + panel) — z jednego miejsca:**
```bash
cd site
npm install          # raz / po zmianie zależności
npm run dev          # web → http://localhost:5173 · panel → http://localhost:5174
```
Pojedynczo: `npm run dev:web` / `npm run dev:panel`. Build: `npm run build`. Typy: `npm run typecheck`.

**Apka mobilna (Expo):**
```bash
npm install          # w roocie repo
npm start            # Expo (skanuj QR w Expo Go / uruchom emulator)
```

**Konta testowe:**
- Właściciel (panel): `test@gmail.com` / `FisheryTest123!` — właściciel łowiska „Oczko Lachowskie".
- Wędkarz: załóż własne w apce/na web (rejestracja).

---

## ✅ Go-live (uruchomienie produkcji)

Kod jest gotowy. Do włączenia produkcji zostają kroki wymagające Twoich kont (Supabase/Resend/Vercel/DNS):

### Krok 1 — Baza (jednorazowo)
Supabase Dashboard → **SQL Editor** → wklej i uruchom `supabase/SETUP.sql`.
Włącza upload zdjęć (RLS Storage) i realtime powiadomień. Idempotentny.

### Krok 2 — E-mail (Resend)
1. Załóż konto na [resend.com], dodaj i **zweryfikuj domenę `fisheryfinder.pl`** (rekordy DNS z Resend).
2. Utwórz API key.
3. Ustaw sekret i wdróż funkcję (Supabase CLI):
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase functions deploy reservation-confirmed
   ```
   Test przed weryfikacją domeny: Resend pozwala słać z `onboarding@resend.dev` tylko na Twój adres
   (ustaw tymczasowo `supabase secrets set FROM_EMAIL="Fishery Finder <onboarding@resend.dev>"`).

### Krok 3 — Web + panel (Vercel)
Dwa projekty Vercel z tego repo, różne **Root Directory**:

| Projekt | Root Directory | Domena |
|---|---|---|
| web | `site/apps/web` | `fisheryfinder.pl` (+ `www`) |
| panel | `site/apps/panel` | `panel.fisheryfinder.pl` |

Build Command `npm run build`, Output `dist` (każda appka ma `vercel.json` z SPA-rewrite).
Następnie wskaż domeny i ustaw rekordy DNS wg instrukcji Vercel.

### Krok 4 — Apka mobilna (gdy zechcesz publikować)
Build przez EAS (`eas build`) i publikacja w sklepach. (Powiadomienia w apce działają już teraz
jako feed/baner; prawdziwe push systemowe to osobna iteracja — wymaga buildu EAS + APNs/FCM.)

---

## 📓 Notatki
- Zdjęcia łowisk trzymamy we własnym Storage (bucket `fishery-photos`), nie hotlinkujemy obcych URL-i.
- Szczegóły web/panel: `site/README.md`. Stan danych demo: tylko łowisko „Oczko Lachowskie".
