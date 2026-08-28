-- =====================================================================
-- Fishery Finder — seed danych (6 łowisk + galerie, stanowiska, opinie)
-- Uruchom PO schema.sql. Idempotentny (truncate na początku).
-- Zdjęcia: bucket Storage 'fishery-photos' (patrz README).
-- =====================================================================

truncate table public.reviews, public.fishery_amenities, public.fishery_fish,
  public.fishery_spots, public.fishery_photos, public.fisheries,
  public.amenities, public.fish_species restart identity cascade;

-- Słownik gatunków ryb
insert into public.fish_species (name) values
  ('Karp'),
  ('Amur'),
  ('Sum'),
  ('Szczupak'),
  ('Sandacz'),
  ('Jesiotr'),
  ('Tołpyga'),
  ('Karaś'),
  ('Leszcz'),
  ('Lin'),
  ('Okoń'),
  ('Kleń'),
  ('Jaź'),
  ('Węgorz');

-- Słownik udogodnień
insert into public.amenities (name, icon) values
  ('Parking', 'car-outline'),
  ('Toaleta', 'water-outline'),
  ('Prysznic', 'water-outline'),
  ('Restauracja', 'restaurant-outline'),
  ('Domki', 'home-outline'),
  ('Sklep z przynętami', 'bag-outline'),
  ('Plac zabaw', 'happy-outline'),
  ('Pokoje', 'bed-outline'),
  ('Siłownia', 'barbell-outline'),
  ('WiFi', 'wifi-outline'),
  ('Domki VIP', 'home-outline'),
  ('Namiot', 'bonfire-outline'),
  ('Kampery', 'car-sport-outline'),
  ('Nocki', 'moon-outline');

-- Łowiska
insert into public.fisheries (id, name, location, city, province, latitude, longitude,
  distance, rating, review_count, price_from, description, rules, open_hours,
  total_spots, available_spots, nokill, record_weight, area_ha, image_url) values
  ('1', 'Kuter Port', 'Nieznanowice 80, Nieznanowice', 'Nieznanowice', 'Małopolskie', 49.9823, 20.2156, 12.5, 4.8, 312, 120, 'Jedno z najpiękniejszych łowisk w Małopolsce, zaledwie 30 minut od Krakowa. Dwa stawy o łącznej powierzchni 10 ha z bogatym rybstanem — łącznie nawet 25 ton ryb. Na miejscu działa restauracja serwująca świeże ryby prosto ze stawu oraz domki do wynajęcia.', 'Wymagana rezerwacja stanowiska. Obowiązuje zasada No Kill na głównym stawie. Limit dzienny na łowisku konsumpcyjnym: 2 ryby/wędkarz. Obowiązkowy podbierak i mata.', '5:00 – 22:00', 40, 11, false, 24, 10.0, 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-nieznanowice_9ae51e0f.jpg'),
  ('2', 'Karpik Zator', 'Graboszyce 47, Zator', 'Zator', 'Małopolskie', 49.9876, 19.4532, 18.3, 4.7, 198, 100, 'Ośrodek rekreacyjno-wypoczynkowy w samym sercu Doliny Karpia. Dwa zbiorniki: łowisko komercyjne (2,6 ha) oraz większy staw No Kill (6 ha) z okazałymi karpiami 20+. Otoczony lasami i zielenią, z dala od miejskiego zgiełku.', 'Na stawie No Kill obowiązuje zasada złów i wypuść. Łowisko komercyjne: bez karty wędkarskiej. Dozwolone metody: gruntowa, spławikowa, feeder.', 'Całą dobę', 25, 8, true, 22, 8.6, 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/15.png'),
  ('3', 'Łowisko Borowa', 'Borzęcin, Borzęcin', 'Borzęcin', 'Małopolskie', 50.1234, 20.6543, 24.1, 4.6, 87, 150, 'Kameralne łowisko karpiowe o powierzchni 5,5 ha położone w lesie dębowo-sosnowym na terenach pokopalnianych. 9 stanowisk dwuosobowych, w tym jedno luksusowe VIP z własnym domkiem i tarasem. Idealne dla tych, którzy cenią spokój i kontakt z naturą.', 'Bezwzględnie obowiązuje zasada No Kill. Wymagana rezerwacja. Limit: 2 wędki na stanowisko. Cisza nocna od 23:00 do 5:00.', 'Całą dobę (z rezerwacją)', 9, 3, true, 19, 5.5, 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-borowa-014.jpg'),
  ('4', 'Na Gołyszu', 'Drogomyśl 43, Drogomyśl', 'Drogomyśl', 'Śląskie', 49.8765, 18.7654, 31.7, 4.9, 421, 180, 'Prestiżowe łowisko karpiowe na Śląsku Cieszyńskim — zbiornik o powierzchni 30 ha z populacją ponad 1000 karpi różnych odmian (pełnołuskie, lampasy, golce, koi). Woda No Kill z 17 stanowiskami dwuosobowymi. Regularnie goszczą tu zawody o zasięgu ogólnopolskim.', 'Zasada No Kill. Wolno wędkować na maksymalnie 4 wędki. Dozwolone namioty i kampery na wyznaczonych miejscach.', 'Całą dobę', 17, 5, true, 27, 30.0, 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/niedamowo-3.jpg'),
  ('5', 'Pstrążna', 'ul. Wyzwolenia 3, Pstrążna', 'Pstrążna', 'Śląskie', 50.0987, 18.3456, 28.4, 4.7, 256, 90, 'Jedno z pierwszych łowisk No Kill w Polsce prowadzone przez Gospodarstwo Rybackie Białeccy. Zbiornik 5 ha między Raciborzem a Rybnikiem. Wydzielone sektory: łowisko konsumpcyjne, łowisko No Kill oraz ekskluzywna "Wyspa" z karpiami 8–20 kg dotychczas niepołowanymi.', 'Różne zasady w zależności od sektora. Na łowisku konsumpcyjnym limit 2 ryby/dzień. Sektor Wyspa — No Kill, rezerwacja obowiązkowa.', '5:00 – 21:00', 22, 9, false, 21, 5.0, 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-borowa-014.jpg'),
  ('6', 'Owczarnia', 'Nowa Wieś, Nowa Wieś', 'Nowa Wieś', 'Małopolskie', 49.8321, 19.1234, 22.8, 4.5, 143, 70, 'Kameralne łowisko u podnóża Beskidu Małego w dolinie Soły. Akwen 6 ha otoczony lasami i polami, 16 stanowisk wędkarskich. Wyjątkowo bogaty rybostan — aż 12 gatunków ryb. Rekord łowiska: karp 29,9 kg. Łowisko czynne całą dobę z możliwością połowów nocnych.', 'Główny staw: zasada No Kill. Dozwolone metody: gruntowa i spławikowa. Brak wymogu karty wędkarskiej. Nocki dozwolone po wcześniejszej rezerwacji.', 'Całą dobę', 16, 6, true, 29.9, 6.0, 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/niedamowo-3.jpg');

-- Galeria zdjęć (zdjęcie główne + pozostałe z puli)
insert into public.fishery_photos (fishery_id, url, sort_order) values
  ('1', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-nieznanowice_9ae51e0f.jpg', 0),
  ('1', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/15.png', 1),
  ('1', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-borowa-014.jpg', 2),
  ('1', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/niedamowo-3.jpg', 3),
  ('2', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/15.png', 0),
  ('2', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-nieznanowice_9ae51e0f.jpg', 1),
  ('2', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-borowa-014.jpg', 2),
  ('2', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/niedamowo-3.jpg', 3),
  ('3', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-borowa-014.jpg', 0),
  ('3', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-nieznanowice_9ae51e0f.jpg', 1),
  ('3', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/15.png', 2),
  ('3', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/niedamowo-3.jpg', 3),
  ('4', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/niedamowo-3.jpg', 0),
  ('4', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-nieznanowice_9ae51e0f.jpg', 1),
  ('4', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/15.png', 2),
  ('4', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-borowa-014.jpg', 3),
  ('5', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-borowa-014.jpg', 0),
  ('5', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-nieznanowice_9ae51e0f.jpg', 1),
  ('5', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/15.png', 2),
  ('5', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/niedamowo-3.jpg', 3),
  ('6', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/niedamowo-3.jpg', 0),
  ('6', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-nieznanowice_9ae51e0f.jpg', 1),
  ('6', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/15.png', 2),
  ('6', 'https://xiwiaiuiwpgxattrxknn.supabase.co/storage/v1/object/public/fishery-photos/lowisko-borowa-014.jpg', 3);

-- Powiązania: łowisko ↔ gatunki
insert into public.fishery_fish (fishery_id, species) values
  ('1', 'Karp'),
  ('1', 'Amur'),
  ('1', 'Sum'),
  ('1', 'Szczupak'),
  ('1', 'Sandacz'),
  ('1', 'Jesiotr'),
  ('1', 'Tołpyga'),
  ('1', 'Karaś'),
  ('2', 'Karp'),
  ('2', 'Amur'),
  ('2', 'Tołpyga'),
  ('2', 'Leszcz'),
  ('2', 'Lin'),
  ('2', 'Szczupak'),
  ('3', 'Karp'),
  ('3', 'Amur'),
  ('3', 'Lin'),
  ('3', 'Karaś'),
  ('4', 'Karp'),
  ('4', 'Amur'),
  ('4', 'Sandacz'),
  ('4', 'Szczupak'),
  ('4', 'Tołpyga'),
  ('4', 'Karaś'),
  ('4', 'Okoń'),
  ('4', 'Kleń'),
  ('4', 'Jaź'),
  ('5', 'Karp'),
  ('5', 'Amur'),
  ('5', 'Szczupak'),
  ('5', 'Okoń'),
  ('5', 'Sum'),
  ('5', 'Jaź'),
  ('5', 'Karaś'),
  ('6', 'Karp'),
  ('6', 'Tołpyga'),
  ('6', 'Karaś'),
  ('6', 'Okoń'),
  ('6', 'Jesiotr'),
  ('6', 'Lin'),
  ('6', 'Sum'),
  ('6', 'Szczupak'),
  ('6', 'Leszcz'),
  ('6', 'Węgorz'),
  ('6', 'Amur'),
  ('6', 'Sandacz');

-- Powiązania: łowisko ↔ udogodnienia
insert into public.fishery_amenities (fishery_id, amenity) values
  ('1', 'Parking'),
  ('1', 'Toaleta'),
  ('1', 'Prysznic'),
  ('1', 'Restauracja'),
  ('1', 'Domki'),
  ('1', 'Sklep z przynętami'),
  ('1', 'Plac zabaw'),
  ('2', 'Parking'),
  ('2', 'Toaleta'),
  ('2', 'Restauracja'),
  ('2', 'Domki'),
  ('2', 'Pokoje'),
  ('2', 'Plac zabaw'),
  ('2', 'Siłownia'),
  ('2', 'WiFi'),
  ('3', 'Parking'),
  ('3', 'Toaleta'),
  ('3', 'Domki VIP'),
  ('3', 'Namiot'),
  ('4', 'Parking'),
  ('4', 'Toaleta'),
  ('4', 'Prysznic'),
  ('4', 'Namiot'),
  ('4', 'Kampery'),
  ('4', 'WiFi'),
  ('5', 'Parking'),
  ('5', 'Toaleta'),
  ('5', 'Sklep z przynętami'),
  ('5', 'Namiot'),
  ('6', 'Parking'),
  ('6', 'Toaleta'),
  ('6', 'Namiot'),
  ('6', 'Nocki');

-- Stanowiska (1..total_spots dla każdego łowiska)
insert into public.fishery_spots (fishery_id, spot_number, capacity, is_vip)
select '1', g, 2, (g = 40 and false)
  from generate_series(1, 40) as g
union all
select '2', g, 2, (g = 25 and false)
  from generate_series(1, 25) as g
union all
select '3', g, 2, (g = 9 and true)
  from generate_series(1, 9) as g
union all
select '4', g, 2, (g = 17 and false)
  from generate_series(1, 17) as g
union all
select '5', g, 2, (g = 22 and false)
  from generate_series(1, 22) as g
union all
select '6', g, 2, (g = 16 and false)
  from generate_series(1, 16) as g;

-- Przykładowe opinie
insert into public.reviews (fishery_id, author_name, rating, comment, visited_on) values
  ('1', 'Marek W.', 5, 'Rewelacyjne miejsce, ryba brała non stop.', '2026-05-10'),
  ('1', 'Anna K.', 5, 'Czysto, spokojnie, świetna restauracja.', '2026-04-28'),
  ('1', 'Tomasz L.', 4, 'Trochę tłoczno w weekend, ale warto.', '2026-05-18'),
  ('2', 'Paweł R.', 5, 'Karpie 20+ to nie mit, złowiłem dwa!', '2026-05-02'),
  ('2', 'Kasia M.', 4, 'Domki wygodne, dzieci miały plac zabaw.', '2026-04-15'),
  ('3', 'Grzegorz S.', 5, 'Cisza i spokój, VIP domek super.', '2026-05-20'),
  ('4', 'Robert N.', 5, 'Najlepsze łowisko karpiowe w PL.', '2026-05-12'),
  ('4', 'Michał D.', 5, 'Stanowiska przestronne, woda zdrowa.', '2026-04-30'),
  ('4', 'Łukasz P.', 5, 'Byłem na zawodach — organizacja na medal.', '2026-05-22'),
  ('5', 'Adam T.', 5, 'Sektor Wyspa to przygoda życia.', '2026-05-08'),
  ('5', 'Ewa Z.', 4, 'Fajne sektory, ceny ok.', '2026-04-19'),
  ('6', 'Jan B.', 5, 'Bogaty rybostan, złowiłem 6 gatunków!', '2026-05-14'),
  ('6', 'Piotr F.', 4, 'Nocki spoko, polecam.', '2026-05-01');

