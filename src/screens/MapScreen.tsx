import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Image, TouchableWithoutFeedback, Keyboard, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { Fishery } from '../data/mockData';
import CalendarPicker from '../components/CalendarPicker';
import FilterModal, { Filters, defaultFilters } from '../components/FilterModal';
import { useFavorites } from '../context/FavoritesContext';
import { fetchFisheriesPage, FisheryQuery } from '../lib/fisheries';
import { supabase } from '../lib/supabase';

const SORT_OPTIONS = [
  { label: 'Najbliższe', key: 'distance' },
  { label: 'Ocena', key: 'rating' },
  { label: 'Cena rosnąco', key: 'price' },
  { label: 'Największa ryba', key: 'record' },
];

const PAGE_SIZE = 20;
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Odległość po wielkim kole (km) — od pozycji użytkownika do łowiska
const toRad = (d: number) => (d * Math.PI) / 180;
const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Fishery[]>([]);
  const [loadingPage, setLoadingPage] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const reqRef = useRef(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('distance');
  const [showSort, setShowSort] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [locationName, setLocationName] = useState('Lokalizuję…');
  const [locating, setLocating] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [taken, setTaken] = useState<Record<string, number>>({});

  const fetchLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName('Brak lokalizacji');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const places = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const p = places[0];
      const name = p?.city || p?.district || p?.subregion || p?.region || p?.name;
      setLocationName(name || 'Nieznana lokalizacja');
    } catch {
      setLocationName('Brak lokalizacji');
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  // Realna zajętość dla wybranego terminu (lub dziś) — jedno zapytanie dla całej listy
  useEffect(() => {
    const from = dateFrom ?? todayIso();
    const to = dateTo ?? from;
    supabase.rpc('fishery_taken_counts', { p_from: from, p_to: to }).then(({ data }) => {
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: { fishery_id: string; taken: number }) => { m[r.fishery_id] = r.taken; });
      setTaken(m);
    });
  }, [dateFrom, dateTo]);

  const distOf = useCallback(
    (f: Fishery) => (coords ? haversineKm(coords.latitude, coords.longitude, f.latitude, f.longitude) : f.distance),
    [coords],
  );
  const freeOf = (f: Fishery) => Math.max(0, f.totalSpots - (taken[f.id] ?? 0));

  // Debounce wyszukiwarki, żeby nie odpytywać bazy przy każdej literze
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const buildQuery = (offset: number): FisheryQuery => ({
    search: debouncedSearch,
    types: filters.types,
    fish: filters.fish,
    provinces: filters.provinces,
    nokill: filters.nokill,
    sort: sortBy,
    lat: coords?.latitude ?? null,
    lng: coords?.longitude ?? null,
    limit: PAGE_SIZE,
    offset,
  });

  // Doczytywanie kolejnej strony (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true; setLoadingPage(true);
    const off = offsetRef.current;
    const myReq = reqRef.current;
    try {
      const page = await fetchFisheriesPage(buildQuery(off));
      if (myReq !== reqRef.current) return;
      setItems((prev) => [...prev, ...page]);
      offsetRef.current = off + page.length;
      hasMoreRef.current = page.length === PAGE_SIZE;
    } catch {
      hasMoreRef.current = false;
    } finally {
      loadingRef.current = false; setLoadingPage(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters, sortBy, coords]);

  // Reset i pierwsza strona przy zmianie filtrów / szukania / sortowania / lokalizacji
  useEffect(() => {
    const myReq = ++reqRef.current;
    offsetRef.current = 0; hasMoreRef.current = true;
    setInitialLoading(true); loadingRef.current = true; setLoadingPage(true);
    fetchFisheriesPage(buildQuery(0))
      .then((page) => {
        if (myReq !== reqRef.current) return;
        setItems(page);
        offsetRef.current = page.length;
        hasMoreRef.current = page.length === PAGE_SIZE;
      })
      .catch(() => { if (myReq === reqRef.current) { setItems([]); hasMoreRef.current = false; } })
      .finally(() => { if (myReq === reqRef.current) { loadingRef.current = false; setLoadingPage(false); setInitialLoading(false); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, JSON.stringify(filters), sortBy, coords?.latitude, coords?.longitude]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const months = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  const dateLabel = dateFrom
    ? dateTo && dateTo !== dateFrom
      ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
      : formatDate(dateFrom)
    : 'Termin';

  const activeFiltersCount = [
    filters.types.length > 0,
    filters.fish.length > 0,
    filters.amenities.length > 0,
    filters.provinces.length > 0,
    filters.nokill,
  ].filter(Boolean).length;

  return (
    <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowSort(false); }} accessible={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>
            <Text style={styles.logoGreen}>FISHERY </Text>
            <Text style={styles.logoWhite}>FINDER</Text>
          </Text>
          <TouchableOpacity style={styles.locationBtn} onPress={fetchLocation} disabled={locating}>
            {locating
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Ionicons name="location" size={16} color={colors.accent} />}
            <Text style={styles.locationText} numberOfLines={1}>{locationName}</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Szukaj łowiska lub miasta..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Toolbar: Termin + Filtry + Sortuj */}
        <View style={styles.toolbar}>
          {/* Termin */}
          <TouchableOpacity
            style={[styles.toolbarChip, styles.dateChip, dateFrom && styles.dateChipActive]}
            onPress={() => { Keyboard.dismiss(); setShowCalendar(true); }}
          >
            <Ionicons name="calendar-outline" size={14} color={dateFrom ? '#fff' : colors.accent} />
            <Text numberOfLines={1} style={[styles.toolbarChipText, styles.dateChipText, dateFrom && styles.dateChipTextActive]}>{dateLabel}</Text>
            {dateFrom && (
              <TouchableOpacity onPress={() => { setDateFrom(null); setDateTo(null); }}>
                <Ionicons name="close-circle" size={13} color="#fff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Filtry */}
          <TouchableOpacity
            style={[styles.toolbarChip, activeFiltersCount > 0 && styles.filterChipActive]}
            onPress={() => { Keyboard.dismiss(); setShowFilters(true); }}
          >
            <Ionicons name="options-outline" size={14} color={activeFiltersCount > 0 ? '#fff' : colors.text} />
            <Text style={[styles.toolbarChipText, activeFiltersCount > 0 && { color: colors.accent }]}>
              Filtry{activeFiltersCount > 0 ? ` · ${activeFiltersCount}` : ''}
            </Text>
          </TouchableOpacity>

          {/* Sortuj */}
          <View style={styles.sortWrapper}>
            <TouchableOpacity
              style={styles.toolbarChip}
              onPress={() => { Keyboard.dismiss(); setShowSort(!showSort); }}
            >
              <Ionicons name="funnel-outline" size={14} color={colors.text} />
              <Text numberOfLines={1} style={styles.toolbarChipText}>
                {SORT_OPTIONS.find(s => s.key === sortBy)?.label}
              </Text>
              <Ionicons name={showSort ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textSecondary} />
            </TouchableOpacity>
            {showSort && (
              <View style={styles.sortDropdown}>
                <Text style={styles.sortHeader}>Sortuj według</Text>
                {SORT_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.sortOption, sortBy === s.key && styles.sortOptionActive]}
                    onPress={() => { setSortBy(s.key); setShowSort(false); }}
                  >
                    <Text style={[styles.sortOptionText, sortBy === s.key && styles.sortOptionTextActive]}>{s.label}</Text>
                    {sortBy === s.key && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Wyniki */}
        <View style={styles.resultsBar}>
          <Text style={styles.resultsCount}>{items.length}{hasMoreRef.current ? '+' : ''} łowisk</Text>
          {dateFrom && (
            <Text style={styles.dateInfo}>
              <Ionicons name="calendar" size={11} color={colors.accent} /> {dateLabel}
            </Text>
          )}
        </View>

        {/* Lista */}
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <FisheryCard
              fishery={item}
              availableSpots={freeOf(item)}
              distanceKm={distOf(item)}
              hasDate={!!dateFrom}
              onPress={() => navigation.navigate('FisheryDetail', { fishery: item, dateFrom, dateTo })}
            />
          )}
          ListFooterComponent={
            loadingPage && items.length > 0
              ? <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} />
              : null
          }
          ListEmptyComponent={
            initialLoading
              ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
              : <Text style={styles.emptyText}>Brak łowisk spełniających kryteria</Text>
          }
        />

        <CalendarPicker
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          onSelect={(from, to) => { setDateFrom(from); setDateTo(to); }}
        />

        <FilterModal
          visible={showFilters}
          filters={filters}
          onApply={setFilters}
          onClose={() => setShowFilters(false)}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

function FisheryCard({
  fishery, availableSpots, distanceKm, hasDate, onPress,
}: {
  fishery: Fishery;
  availableSpots: number;
  distanceKm: number;
  hasDate: boolean;
  onPress: () => void;
}) {
  const low = availableSpots <= 3;
  const spotsColor = low ? colors.error : colors.success;
  const spotsWord = availableSpots === 1 ? 'stanowisko' : availableSpots < 5 ? 'stanowiska' : 'stanowisk';
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(fishery.id);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image
        source={typeof fishery.image === 'string' ? { uri: fishery.image } : fishery.image}
        style={styles.cardImage}
      />
      <TouchableOpacity style={styles.heartBtn} onPress={() => toggleFavorite(fishery.id)} activeOpacity={0.8}>
        <Ionicons name={fav ? 'heart' : 'heart-outline'} size={18} color={fav ? '#EF4444' : '#fff'} />
      </TouchableOpacity>
      {/* Dostępność: realna tylko dla łowisk partnerskich; katalog -> zapytaj */}
      {fishery.premium ? (
        <View style={[styles.availabilityBadge, { backgroundColor: spotsColor }]}>
          {hasDate && <Ionicons name="calendar" size={10} color="#fff" />}
          <Text style={styles.availabilityBadgeText}>
            {availableSpots} {spotsWord} wolnych
          </Text>
        </View>
      ) : (
        <View style={[styles.availabilityBadge, { backgroundColor: 'rgba(15,43,30,0.82)' }]}>
          <Ionicons name="call-outline" size={10} color="#fff" />
          <Text style={styles.availabilityBadgeText}>Zapytaj o dostępność</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        {fishery.premium && (
          <View style={styles.cardPartner}>
            <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
            <Text style={styles.cardPartnerText}>Łowisko partnerskie Fishery Finder</Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>{fishery.name}</Text>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>{fishery.rating}</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.cardSubtext}>{fishery.city} • {distanceKm.toFixed(1)} km</Text>
        </View>
        {(fishery.types.length > 0 || fishery.nokill) && (
          <View style={styles.typeRow}>
            {fishery.types.map((t) => (
              <View key={t} style={styles.typeChip}><Text style={styles.typeChipText}>{t}</Text></View>
            ))}
            {fishery.nokill && (
              <View style={[styles.typeChip, styles.typeChipNokill]}>
                <Text style={styles.typeChipText}>No Kill</Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.fishRow}>
          {fishery.fish.slice(0, 4).map((f) => (
            <View key={f} style={styles.fishTag}>
              <Text style={styles.fishTagText}>{f}</Text>
            </View>
          ))}
          {fishery.fish.length > 4 && (
            <View style={styles.fishTag}>
              <Text style={styles.fishTagText}>+{fishery.fish.length - 4}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.price}>od <Text style={styles.priceValue}>{fishery.priceFrom} zł</Text>/dzień</Text>
          <View style={styles.detailsBtn}>
            <Text style={styles.detailsBtnText}>Szczegóły</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.accent} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: colors.primary,
  },
  logoText: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  logoGreen: { color: colors.accent },
  logoWhite: { color: '#FFFFFF' },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 170 },
  locationText: { color: colors.accent, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 12, borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, height: 46,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginTop: 10,
  },
  toolbarChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
  },
  toolbarChipText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  dateChip: { borderColor: colors.accent, borderWidth: 1.5, flexShrink: 1 },
  dateChipText: { flexShrink: 1 },
  dateChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dateChipTextActive: { color: '#fff' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortWrapper: { position: 'relative', marginLeft: 'auto' },
  sortDropdown: {
    position: 'absolute', right: 0, top: 42, zIndex: 100,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: colors.border, padding: 6, width: 210,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16, shadowRadius: 20, elevation: 12,
  },
  sortHeader: {
    fontSize: 11, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: 10, paddingTop: 6, paddingBottom: 8,
  },
  sortOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 11, borderRadius: 10, marginBottom: 2,
  },
  sortOptionActive: { backgroundColor: colors.accent + '1F' },
  sortOptionText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  sortOptionTextActive: { color: colors.primary, fontWeight: '700' },
  resultsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  resultsCount: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 40, fontSize: 14 },
  dateInfo: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  list: { paddingBottom: 24, paddingTop: 4 },
  card: {
    backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden',
    marginHorizontal: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardImage: { width: '100%', height: 160 },
  heartBtn: {
    position: 'absolute', top: 12, left: 12,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  availabilityBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  availabilityBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  cardPartner: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  cardPartnerText: { fontSize: 11.5, fontWeight: '800', color: colors.primary },
  cardBody: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  cardSubtext: { fontSize: 13, color: colors.textSecondary },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  typeChip: {
    backgroundColor: colors.primary + '12', paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: colors.primary + '26',
  },
  typeChipText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  typeChipNokill: { backgroundColor: colors.accent + '22', borderColor: colors.accent },
  fishRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  fishTag: { backgroundColor: colors.accent + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  fishTagText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 13, color: colors.textSecondary },
  priceValue: { fontWeight: '700', color: colors.text, fontSize: 15 },
  detailsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
  },
  detailsBtnText: { fontSize: 13, fontWeight: '800', color: colors.accent, letterSpacing: 0.2 },
});
