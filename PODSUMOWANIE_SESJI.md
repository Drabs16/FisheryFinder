# Fishery Finder — podsumowanie projektu i plan dalszych prac

_Aktualizacja: po sesji z 3 czerwca 2026 (panel właściciela + strona web)_

Projekt **Fishery Finder** ma teraz trzy części: **aplikacja mobilna** (wędkarze, RN+Expo), **panel właściciela / CRM** (`business/`, web), **publiczna strona** (`web/`, web). Wszystko spięte z tym samym **Supabase** (projekt „FF's Project"), wspólne konta i dane. Ten dokument to punkt startowy do kolejnego czatu.

---

## 🆕 Sesja 3 czerwca 2026 — co dodano

### Panel właściciela / CRM — `business/` (Vite + React + TS)
- Logowanie/rejestracja (Supabase), brand jak apka, realne logo.
- Pulpit: rezerwacje/przychód/obłożenie dziś, wykres obłożenia, nadchodzące, przychód w sezonie.
- Moje łowiska: lista (nazwa+lokalizacja) + pełny formularz (mapa z wyszukiwarką, cennik/warianty cen, ryby, udogodnienia, rekordy, kontakt, zdjęcia URL).
- Kalendarz Gantta: paski rezerwacji, statusy kolorami (nowa=jasny / potwierdzona=ciemny), blokowanie stanowisk, tworzenie rezerwacji przez właściciela.
- Rezerwacje (CRM): kto/co/ile/płatność/status, potwierdź/anuluj, filtr po łowisku i stanowisku, liczniki, gotówka vs online.
- Analityka: przychód w czasie, donut statusów, podział gotówka/online, najlepsze stanowiska, sezonowość.
- Subskrypcja: plan 99 zł/mies (sezonowy/roczny), co w cenie, warunki.
- „Mam kod łowiska" — przypięcie istniejącego łowiska (`claim_code`).

### Strona publiczna — `web/` (Vite + React + TS)
- Przeglądanie **bez logowania**; rezerwacja/profil/rezerwacje wymagają konta (wspólne z apką).
- Lista 1:1 z apką: karty, wyszukiwarka, filtry (typy/ryby/województwa/**udogodnienia**/No Kill), sortowanie, lokalizacja, dostępność wg terminu.
- Mapa pełnoekranowa (CARTO Voyager) z pinezkami **cena + ikonka** (styl Booking), odległość w dymkach, przycisk lokalizacji — bez listy z boku.
- Szczegóły: galeria, statystyki, zakładki (opis/opinie/udogodnienia/regulamin/rekordy), cennik, kontakt, mini-mapa + „Nawiguj".
- Rezerwacja: customowy kalendarz dostępności + wybór stanowisk + płatność (gotówka/BLIK/Przelewy24 +5%) → zapis do bazy.
- Moje rezerwacje: zakładki Aktywne/Zakończone/Anulowane + kalendarz rezerwacji. Profil z edycją (imię/telefon).
- Wszystkie kontrolki customowe (własny kalendarz/dropdowny/filtry), brak systemowych date pickerów.

### Baza — migracje z tej sesji (Supabase)
- `fisheries.owner_id` + RLS (właściciel zarządza swoimi łowiskami i widzi ich rezerwacje).
- `owner_save_fishery(...)`, `owner_block_spots(...)`, `owner_create_reservation(...)` (z kontrolą overbookingu), `owner_claim_fishery(...)`.
- `fisheries.price_tiers` (cennik), `reservations.confirmed_at` (potwierdzenie właściciela), `fisheries.claim_code`.

---

## ☑️ TO-DO — do dokończenia całości

**Najpierw (szybkie, ze mną):**
- [ ] Odpalić `web/` i `business/`: `npm install && npm run dev`; wyłapać ew. błędy startu (nie udało się zbudować po stronie asystenta — rejestr npm był zablokowany).
- [ ] Wgrywanie zdjęć łowiska plikiem do Storage `fishery-photos` (teraz: adresy URL w panelu).
- [ ] Powiadomienia e-mail przy nowej rezerwacji (np. Supabase Edge Function / Resend).
- [ ] Mini panel admina do nadawania `claim_code` łowiskom (albo robić to ręcznie w SQL).
- [ ] Przypisać 3 demo-łowiska do konta właściciela (mają `owner_id = NULL`).

**Integracje zewnętrzne (kod szybki, ale wymagają konta/klucza):**
- [ ] Realne płatności: Przelewy24 lub Stripe (rejestracja firmy + weryfikacja u operatora).
- [ ] SMS przy rezerwacji (np. SMSAPI) — dostawca + budżet.
- [ ] (Opcjonalnie) Mapy Google/Mapbox zamiast CARTO — wymaga płatnego klucza API.

**Dane i treść:**
- [ ] Zebrać i zaimportować realne łowiska (~2000) przez arkusz `import/` → `add_fishery`.
- [ ] Uzupełnić zdjęcia, cenniki, regulaminy realnych łowisk.

**Środowiska (docelowo — PROD + UAT, bliźniacze bazy):**
- [ ] Dwa projekty Supabase: `fishery-finder-prod` i `fishery-finder-uat` (osobne URL/klucze).
- [ ] Schemat jako pliki migracji SQL w repo (`supabase/`) — aplikować w tej samej kolejności na obu bazach (najpierw UAT, po testach PROD), żeby były identyczne.
- [ ] Wynieść URL + anon key do zmiennych środowiskowych (zamiast na sztywno w `supabase.ts` w app/business/web) — `.env` / `import.meta.env` (Vite) i config Expo; ten sam kod łączy się z UAT lub PROD zależnie od buildu.
- [ ] UAT zasilony danymi demo, PROD danymi realnymi; deploy: gałąź/preview → UAT, gałąź główna → PROD.

**Wdrożenie / publikacja:**
- [ ] Hosting strony `fisheryfinder.pl` (web) i `panel.fisheryfinder.pl` (business) — np. Vercel/Netlify + domena.
- [ ] Apka mobilna: build EAS → TestFlight / Google Play (recenzja Apple/Google ~kilka dni–2 tyg.).
- [ ] Przenieść projekt poza iCloud (duplikaty plików psują natywny build).

**Szacowany czas:** demo online ~2–4 dni wspólnej pracy; wersja „gotowa do sprzedaży" ~3–6 tygodni (głównie czekanie na operatora płatności i recenzje sklepów, nie samo kodowanie).

---

## ⚠️ Jak uruchomić podgląd (Expo Go)

Projekt **NIE** ma już lokalnych folderów `ios/`/`android/` (są generowane automatycznie przez EAS / `prebuild`). Dzięki temu `npx expo start` działa w trybie zarządzanym i daje czysty QR do Expo Go.

```bash
cd ~/Documents/FisheryFinder
npx expo start
# wciśnij "s" jeśli pokaże "development build" → przełącza na Expo Go
# skanuj QR z poziomu apki Expo Go (telefon i Mac na tej samej WiFi)
```

Uwaga: projekt leży w `~/Documents` (iCloud), który potrafi robić duplikaty plików („ 2"/„ 3") psujące natywny build. Docelowo warto przenieść projekt poza iCloud.

---

## ✅ Co zostało zrobione (ta sesja)

### Baza danych — zbudowana w Supabase (projekt „FF's Project")
Jedna baza, wiele tabel w schemacie `public` (użytkownicy w zarządzanym `auth`):
- `fisheries` (łowiska) — pełne dane + zdenormalizowane pola do szybkiego filtrowania: `types[]`, `fish[]`, cache `rating`/`review_count`/`record_weight`.
- `fishery_photos`, `fishery_spots`, `fishery_fish`, `fishery_amenities`, `fish_species`, `amenities`.
- `fishery_records` (gatunek + waga) — rekordy podawane przez nas.
- `reviews` (opinie userów, 1 na usera/łowisko) — **ocena łowiska liczona z realnych opinii**, nie wpisywana ręcznie.
- `reservations` (rezerwacje) + `favorites` (ulubione) — per użytkownik, z RLS.
- `profiles` — RLS naprawione (był otwarty dla wszystkich!), profil tworzy się automatycznie przy rejestracji (trigger) z imieniem + e-mailem + **telefonem**.

Funkcje/triggery w bazie:
- `search_fisheries(...)` — filtr + sort (w tym „najbliższe" po geo) + stronicowanie; sedno skalowania do tysięcy.
- `fishery_occupancy(...)` i `fishery_taken_counts(...)` — realna zajętość stanowisk bez danych osobowych.
- triggery utrzymujące `fish[]`, `rating`/`review_count`, `record_weight` zawsze aktualne.
- `add_fishery(...)` — dodaje całe łowisko jednym wywołaniem (typ, kontakt, rekordy, ryby, udogodnienia, zdjęcia, stanowiska).
- indeksy GIN (typy, ryby, nazwa, miasto) pod szybkie filtrowanie.

### Aplikacja — przepięta na realne dane z bazy
- Łowiska, mapa, ulubione, kalendarz i rezerwacje lecą z Supabase (nie z mocków).
- **Rezerwacje realne**: rezerwacja zapisuje się do bazy, od razu zajmuje stanowisko w kalendarzu, inni widzą je jako zajęte. Każde łowisko ma własny kalendarz.
- **Ulubione** trwałe (per konto).
- **Lista nieskończona (infinite scroll)** — doczytuje po 20, a filtry/szukanie/sortowanie liczą się po stronie bazy. Skaluje się do tysięcy.
- Karta na liście: typ łowiska, odległość liczona z GPS usera, realne wolne miejsca.
- Ekran łowiska: opis + typy, opinie (z bazy), udogodnienia, regulamin, **rekordy (gatunek+waga)**, stanowiska, batymetria, **sekcja kontakt (tel/mail/www)**.
- „Pokaż na mapie": lekki, brandowany widok — mapa pełnoekranowa, pływająca karta z nazwą/adresem, logo-pineska, przycisk **Nawiguj**.
- **Telefon wymagany przy rejestracji**.

### Pipeline importu (pod docelowe ~2000 łowisk)
W folderze `import/`:
- `szablon-lowiska.xlsx` — arkusz dla osoby nietechnicznej (kolumny: nazwa, adres, miasto, województwo, lat, lng, cena, stanowiska, **typ**, ryby, udogodnienia, opis, regulamin, godziny, No Kill, **rekordy**, **tel/mail/www**, powierzchnia, zdjęcia) + zakładki Instrukcja i Słowniki.
- `import-lowiska.mjs` — skrypt: czyta CSV i woła `add_fishery` (nadaje ID, parsuje listy/rekordy).
- `README.md` — instrukcja.
Folder `supabase/` zawiera pliki SQL (schema, seed, reservations, add_fishery) jako dokumentację / do ponownego użycia.

---

## 🎣 Stan danych
W bazie są obecnie **3 demo-łowiska** (Karpik Zator, Łowisko Borowa, Owczarnia) — to dane tymczasowe do testów. Realne dane (~2000) wjadą importem z arkusza.

---

## 🔜 Następne kroki / do rozważenia
1. **Zdjęcia łowisk** — wgrać pliki do bucketu Storage `fishery-photos` (albo podawać URL-e w arkuszu). Bez tego foto są puste.
2. **Ulubione / Moje opinie** — wciąż używają „załaduj wszystkie łowiska" (OK przy kilku; przed 2000 przepiąć na pobieranie po ID).
3. **Pierwszy import partii** łowisk z arkusza.
4. **Płatności i SMS** — nadal symulowane (UI gotowe); realna bramka (Stripe/Przelewy24) + SMS to osobny temat.
5. **EAS Update** — gdy 2.0 będzie sprawdzone, można wrzucić build na TestFlight i potem aktualizować JS bez budowania. (TestFlight ma teraz starą, stabilną wersję — celowo nieruszaną.)
6. **Ocena na karcie** pokazuje 0 dla nieocenionych łowisk — można ukryć gwiazdkę do pierwszej opinii.

---

## 🔐 Bezpieczeństwo i weryfikacja e-maila

**Zrobione w bazie (3 czerwca):**
- Ustawiono `search_path = public` na `search_fisheries` i funkcjach triggerowych.
- Odebrano `EXECUTE` z `anon`/`authenticated` na funkcjach triggerowych (`handle_new_user`, `sync_fishery_*`) — nie są już wywoływalne z API.
- Doradca: brak błędów krytycznych, brak tabel bez RLS. Funkcje `owner_*` i `fishery_occupancy/taken_counts` są celowo dostępne i same sprawdzają uprawnienia.

**Do zrobienia w panelu Supabase (toggle, nie kod) — z własną domeną:**
- [ ] Authentication → Email: włączyć **Confirm email** (link aktywacyjny przy rejestracji).
- [ ] Authentication → SMTP: ustawić **własny SMTP na domenie** (np. Resend/SendGrid), nadawca `noreply@fisheryfinder.pl`; dodać rekordy **SPF + DKIM + DMARC** w DNS domeny (dostarczalność, mniej spamu).
- [ ] Ustawić **Site URL + Redirect URLs** (adresy `web`/`business`), żeby link weryfikacyjny wracał we właściwe miejsce.
- [ ] Włączyć **Leaked password protection** (HaveIBeenPwned) + min. długość hasła.
- [ ] (Opcjonalnie) **captcha** (Turnstile/hCaptcha) przy rejestracji — anty-bot.

**Do zrobienia później (kod/infra):**
- [ ] Klucze Supabase do zmiennych środowiskowych (app/business/web).
- [ ] Polityki bucketu Storage przy wgrywaniu zdjęć.
- [ ] Nigdy nie używać `service_role` po stronie klienta (obecnie OK).

---

## 📌 Szybki kontekst techniczny
- Supabase: URL + anon key w `src/lib/supabase.ts`; konektor Supabase podłączony w narzędziu.
- Warstwa danych: `src/lib/fisheries.ts` (`fetchFisheries`, `fetchFisheriesPage`), konteksty `Fisheries/Reservations/Favorites/Auth`.
- Kolory: `primary #1B4332`, `accent #52B788`, `water #1E88E5`.
- Cały projekt przechodzi `npx tsc --noEmit` bez błędów.
