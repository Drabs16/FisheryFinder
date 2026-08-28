# Zdjęcia łowisk (pliki → Storage)

Każdy podfolder = jedno łowisko. Nazwa folderu to **id łowiska** albo **slug nazwy**
(np. „Oczko Lachowskie” → folder `oczko-lachowskie`). W środku wrzuć pliki
`.jpg/.jpeg/.png/.webp`. Kolejność zdjęć = alfabetyczna nazw plików
(np. `1.jpg, 2.jpg, 3.jpg` albo `a.jpg, b.jpg`).

```
import/photos/
  oczko-lachowskie/
    1.jpg
    2.jpg
    3.jpg
```

Wgranie do bazy (z katalogu projektu):

```bash
SUPABASE_SERVICE_KEY="<service_role_key>" node import/import-photos.mjs                  # wszystkie foldery
SUPABASE_SERVICE_KEY="<service_role_key>" node import/import-photos.mjs oczko-lachowskie  # jeden folder
```

Skrypt wgrywa pliki do bucketu `fishery-photos` pod `<id>/0.jpg, 1.jpg…`,
wpina je do `fishery_photos`, ustawia `image_url` łowiska na pierwsze zdjęcie.
Jest idempotentny — ponowne uruchomienie czyści stare zdjęcia łowiska i wgrywa od nowa.

> Pliki w tym folderze nie są wersjonowane w gicie (patrz `.gitignore`).
