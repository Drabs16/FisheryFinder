# FisheryFinder — część webowa (monorepo)

Jedno miejsce na całą stronę WWW. Apka mobilna (Expo) żyje osobno w katalogu nadrzędnym repo.

```
site/
  apps/
    web/     → strona wędkarza   → fisheryfinder.pl        (Vite, dev :5173)
    panel/   → CRM właściciela    → panel.fisheryfinder.pl  (Vite, dev :5174)
  packages/
    shared/  → @ff/shared: klient Supabase + linki (APP_URL / PANEL_URL)
```

## Dev (z jednego miejsca)

```bash
cd site
npm install        # tylko raz / po zmianie zależności
npm run dev        # web na http://localhost:5173, panel na http://localhost:5174
```

Pojedynczo: `npm run dev:web` lub `npm run dev:panel`.
Build/typy: `npm run build`, `npm run typecheck`.

Login testowy do panelu: `test@gmail.com` / `FisheryTest123!` (właściciel „Oczko Lachowskie").

## Deploy (Vercel — subdomeny)

Dwa projekty Vercel z tego samego repo, różne **Root Directory**:

| Projekt | Root Directory       | Domena                     |
|---------|----------------------|----------------------------|
| web     | `site/apps/web`      | `fisheryfinder.pl` + `www` |
| panel   | `site/apps/panel`    | `panel.fisheryfinder.pl`   |

- Build Command: `npm run build` · Output: `dist` (Vercel sam ogarnia npm workspaces).
- Każda appka ma `vercel.json` z SPA-rewrite (react-router → wszystko do `index.html`).
- DNS u rejestratora `fisheryfinder.pl`: rekordy wg instrukcji Vercel
  (apex + `www` → web; `CNAME panel` → web/panel projektu panel).

## Storage zdjęć

Upload zdjęć łowisk w panelu wymaga polityk RLS na `storage.objects` dla bucketu
`fishery-photos` — patrz `../supabase/storage_fishery_photos_rls.sql` (uruchom raz w bazie).
