# Masowe wprowadzanie łowisk (arkusz → baza)

Workflow dla osoby nietechnicznej: wypełnia arkusz, ktoś (Ty albo ja) uruchamia import.

## 1. Wypełnianie arkusza
Otwórz `szablon-lowiska.xlsx` (Excel albo wgraj do Arkuszy Google).
- Każdy wiersz = jedno łowisko. Zielone nagłówki = pola obowiązkowe.
- Żółty wiersz to przykład — można go zostawić (import go pomija) lub usunąć.
- Województwo i „No Kill" wybiera się z listy.
- **Typ łowiska**, ryby, udogodnienia i adresy zdjęć oddzielaj **średnikami** (`Karpiowe; Spinningowe`).
- **Rekordy**: format `Gatunek:waga`, kilka po średniku, np. `Karp:24; Szczupak:11`.
- **Kontakt**: telefon, e-mail, strona WWW (opcjonalne).
- Współrzędne (lat/lng) z Google Maps (prawy klik na punkcie → liczby u góry).
- **ID nadaje się samo** przy imporcie — nie wpisuj.
- Listy dozwolonych wartości (typy, gatunki, udogodnienia, województwa) są w zakładce „Słowniki". Można dopisać nowy gatunek/udogodnienie/typ — import doda je do bazy automatycznie.

## 2. Eksport do CSV
W Excelu: Zapisz jako → CSV UTF-8.
W Arkuszach Google: Plik → Pobierz → Wartości oddzielone przecinkami (.csv).

## 3. Import do bazy
Z katalogu projektu (potrzebny service_role key — Supabase → Project Settings → API):
```bash
SUPABASE_SERVICE_KEY="<service_role_key>" node import/import-lowiska.mjs <ścieżka-do-pliku.csv>
```
Skrypt:
- nadaje kolejne ID,
- rozkłada każdy wiersz do tabel (łowisko, ryby, udogodnienia, stanowiska, zdjęcia),
- dopisuje nowe gatunki/udogodnienia do słowników,
- na końcu pokazuje, ile dodano i ewentualne błędy (np. brak współrzędnych).

> Alternatywa bez uruchamiania niczego: wyślij wypełniony plik mnie — zaimportuję go bezpośrednio do bazy.

## 4. Zdjęcia
Zalecany sposób: **pliki w folderach**, nie URL-e. Wrzuć zdjęcia do
`import/photos/<id-lub-slug-nazwy>/` i uruchom osobny skrypt:

```bash
SUPABASE_SERVICE_KEY="<service_role_key>" node import/import-photos.mjs
```

Szczegóły i układ folderów: patrz `import/photos/README.md`. Skrypt sam wgrywa
pliki do bucketu `fishery-photos`, wpina je w `fishery_photos` i ustawia `image_url`.
Trzymanie zdjęć u siebie (zamiast obcych linków) jest trwałe — obce URL-e padają,
bywają blokowane (hotlink) i nie panujesz nad prawami do nich.

(Kolumna „Zdjęcia" w arkuszu z URL-ami nadal działa przy `add_fishery`, ale to opcja
awaryjna — docelowo używaj plików.)

## Uwaga o ponownym imporcie
Każde uruchomienie nadaje nowe ID, więc ten sam plik puszczony dwa razy utworzy duplikaty.
Importuj tylko nowe wiersze, albo daj znać — zrobimy import z aktualizacją po nazwie.
