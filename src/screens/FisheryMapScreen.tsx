import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Fishery } from '../data/mockData';
import { useFisheries } from '../context/FisheriesContext';
import * as Location from 'expo-location';

const SPECIES = [
  'Karp', 'Amur', 'Szczupak', 'Sandacz', 'Sum', 'Karaś',
  'Lin', 'Leszcz', 'Okoń', 'Jesiotr', 'Tołpyga', 'Węgorz',
];

export default function FisheryMapScreen() {
  const navigation = useNavigation<any>();
  const { fisheries: allFisheries } = useFisheries();
  const [selected, setSelected] = useState<Fishery | null>(null);
  const [filters, setFilters] = useState<string[]>([]);

  const toggleFilter = (key: string) => {
    setSelected(null);
    setFilters((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const clearFilters = () => { setSelected(null); setFilters([]); };

  const nokill = filters.includes('nokill');
  const species = filters.filter((k) => k !== 'nokill');

  const fisheries = allFisheries.filter((f) => {
    if (nokill && !f.nokill) return false;
    if (species.length > 0 && !species.some((s) => f.fish.includes(s))) return false;
    return true;
  });
  const mapRef = useRef<MapView>(null);
  const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const didInit = useRef(false);

  const recenter = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setUserLoc(coord);
      // Wycentruj na mojej pozycji i zresetuj obrót mapy do północy
      mapRef.current?.animateCamera(
        { center: coord, heading: 0, pitch: 0, zoom: 12, altitude: 9000 },
        { duration: 700 },
      );
    } catch {
      // brak lokalizacji — zostaje widok domyślny
    } finally {
      setLocating(false);
    }
  }, []);

  const handleMapReady = useCallback(() => {
    if (didInit.current) return;
    didInit.current = true;
    recenter();
  }, [recenter]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>
          <Text style={styles.logoGreen}>FISHERY </Text>
          <Text style={styles.logoWhite}>FINDER</Text>
        </Text>
        <Text style={styles.headerSub}>{fisheries.length} łowisk</Text>
      </View>

      {/* Szybkie filtry */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          <Chip label="Wszystkie" icon="apps-outline" active={filters.length === 0} onPress={clearFilters} />
          <Chip label="No Kill" icon="sync-outline" active={nokill} onPress={() => toggleFilter('nokill')} />
          {SPECIES.map((s) => (
            <Chip key={s} label={s} icon="fish-outline" active={filters.includes(s)} onPress={() => toggleFilter(s)} />
          ))}
        </ScrollView>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="mutedStandard"
        onMapReady={handleMapReady}
        initialRegion={{
          latitude: 52.15,
          longitude: 21.05,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
      >
        {fisheries.map((fishery) => {
          const isSel = selected?.id === fishery.id;
          return (
            <Marker
              key={fishery.id}
              coordinate={{ latitude: fishery.latitude, longitude: fishery.longitude }}
              onPress={(e) => {
                e.stopPropagation();
                setSelected(fishery);
              }}
              tracksViewChanges
            >
              <View style={[styles.marker, isSel && styles.markerSelected]}>
                <Image source={require('../../assets/Ikonka.png')} style={styles.markerIcon} resizeMode="contain" />
                <Text style={[styles.markerPrice, isSel && styles.markerPriceSel]}>{fishery.priceFrom} zł</Text>
              </View>
            </Marker>
          );
        })}

        {/* Moja lokalizacja */}
        {userLoc && (
          <Marker coordinate={userLoc} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges>
            <View style={styles.userHalo}>
              <View style={styles.userDot} />
            </View>
          </Marker>
        )}
      </MapView>


      {/* Przycisk: wycentruj na mojej lokalizacji + reset do północy */}
      <TouchableOpacity
        style={[styles.locateBtn, { bottom: selected ? 250 : 32 }]}
        onPress={recenter}
        activeOpacity={0.85}
      >
        {locating
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Ionicons name="navigate" size={22} color={colors.primary} />}
      </TouchableOpacity>

      {/* Bottom sheet po kliknięciu markera */}
      {selected && (
        <View style={styles.bottomSheet}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <Image source={typeof selected.image === 'string' ? { uri: selected.image } : selected.image} style={styles.sheetImage} />
          {selected.premium && (
            <View style={styles.sheetPartner}>
              <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
              <Text style={styles.sheetPartnerText}>Partner</Text>
            </View>
          )}
          <View style={styles.sheetBody}>
            <View style={styles.sheetTop}>
              <Text style={styles.sheetName} numberOfLines={1}>{selected.name}</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{selected.rating}</Text>
              </View>
            </View>
            <View style={styles.sheetRow}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.sheetSub}>{selected.city} • {selected.distance} km</Text>
            </View>
            <View style={styles.sheetRow}>
              <Ionicons name="fish-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.sheetSub} numberOfLines={1}>{selected.fish.join(', ')}</Text>
            </View>
            <View style={styles.sheetFooter}>
              <Text style={styles.sheetPrice}>
                od <Text style={styles.sheetPriceVal}>{selected.priceFrom} zł</Text>/dzień
              </Text>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => navigation.navigate('FisheryDetail', { fishery: selected })}
              >
                <Text style={styles.detailBtnText}>Zobacz więcej</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function Chip({ label, icon, active, onPress }: { label: string; icon: any; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={13} color={active ? colors.primary : '#fff'} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: colors.primary,
  },
  logoText: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  logoGreen: { color: colors.accent },
  logoWhite: { color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: colors.accent, fontWeight: '700' },
  filterBar: { backgroundColor: colors.primary, paddingBottom: 12 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  chipTextActive: { color: colors.primary, fontWeight: '800' },
  map: { flex: 1 },
  marker: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    height: 32, paddingHorizontal: 9, borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2, borderColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  markerSelected: {
    borderColor: colors.accent,
    borderWidth: 3,
    transform: [{ scale: 1.12 }],
  },
  markerIcon: { width: 18, height: 18 },
  markerIconSel: {},
  markerPrice: { fontSize: 12, fontWeight: '800', color: colors.primary },
  markerPriceSel: { color: colors.accent },
  userHalo: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(30,136,229,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  userDot: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.water,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  userIcon: { width: 22, height: 22, tintColor: '#fff' },
  locateBtn: {
    position: 'absolute', right: 16,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    padding: 4,
  },
  sheetImage: { width: '100%', height: 120 },
  sheetPartner: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  sheetPartnerText: { fontSize: 11.5, fontWeight: '800', color: colors.primary },
  sheetBody: { padding: 14 },
  sheetTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  sheetName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sheetSub: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  sheetFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 10,
  },
  sheetPrice: { fontSize: 13, color: colors.textSecondary },
  sheetPriceVal: { fontWeight: '700', color: colors.text, fontSize: 15 },
  detailBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  detailBtnText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
});
