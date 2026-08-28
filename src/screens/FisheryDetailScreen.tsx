import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Modal, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../theme/colors';
import { Fishery } from '../data/mockData';
import SpotCalendar from '../components/SpotCalendar';
import AddCatchModal from '../components/AddCatchModal';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const AMENITIES = [
  { label: 'Domki', icon: 'home-outline', match: 'domki' },
  { label: 'Prąd na stanowisku', icon: 'flash-outline', match: 'prąd' },
  { label: 'Parking', icon: 'car-outline', match: 'parking' },
  { label: 'Toaleta', icon: 'water-outline', match: 'toaleta' },
  { label: 'WiFi', icon: 'wifi-outline', match: 'wifi' },
  { label: 'Grill', icon: 'flame-outline', match: 'grill' },
  { label: 'Sklep z przynętami', icon: 'bag-outline', match: 'sklep' },
];

const MS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const fmtDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear()}`;
};

type Tab = 'info' | 'reviews' | 'amenities' | 'rules' | 'records' | 'spots' | 'bathy';
const TABS: { key: Tab; label: string }[] = [
  { key: 'info', label: 'Opis' },
  { key: 'reviews', label: 'Opinie' },
  { key: 'amenities', label: 'Udogodnienia' },
  { key: 'rules', label: 'Regulamin' },
  { key: 'records', label: 'Rekordy' },
  { key: 'spots', label: 'Stanowiska' },
  { key: 'bathy', label: 'Batymetria' },
];

export default function FisheryDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const fishery: Fishery = route.params?.fishery;
  const initialFrom: string | null = route.params?.dateFrom ?? null;
  const initialTo: string | null = route.params?.dateTo ?? null;
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [mapVisible, setMapVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [catchVisible, setCatchVisible] = useState(false);
  const [profile, setProfile] = useState<{ name: string; phone: string } | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [termFree, setTermFree] = useState<number | null>(null);
  const [reviews, setReviews] = useState<{ author_name: string; rating: number; visited_on: string | null; comment: string | null }[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('name, phone').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data as { name: string; phone: string }); });
  }, [user]);

  // Opinie z realnych ocen użytkowników (tabela reviews)
  useEffect(() => {
    const fid = fishery?.id;
    if (!fid) return;
    supabase.from('reviews')
      .select('author_name, rating, visited_on, comment')
      .eq('fishery_id', fid)
      .not('hidden', 'is', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setReviews(data as any); });
  }, [fishery?.id, calendarVisible]);

  // „Wolne w terminie" — z realnej zajętości (RPC), spójnie z kalendarzem
  useEffect(() => {
    const fid = fishery?.id;
    if (!fid || !initialFrom) { setTermFree(null); return; }
    const to = initialTo ?? initialFrom;
    supabase.rpc('fishery_occupancy', { p_fishery: fid, p_from: initialFrom, p_to: to })
      .then(({ data }) => {
        const takenSpots = new Set<number>(((data ?? []) as { spot: number }[]).map((r) => r.spot));
        setTermFree(Math.max(0, fishery.totalSpots - takenSpots.size));
      });
  }, [fishery?.id, fishery?.totalSpots, initialFrom, initialTo]);

  if (!fishery) return null;

  const fav = isFavorite(fishery.id);
  const gallery = (fishery.photos && fishery.photos.length > 0
    ? fishery.photos
    : [fishery.image].filter(Boolean)
  ).slice(0, 5);

  const spotsColor = (termFree ?? fishery.availableSpots) <= 3 ? colors.error : colors.success;

  const openNavigation = () => {
    const { latitude, longitude, name } = fishery;
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${encodeURIComponent(name)}&dirflg=d`,
      android: `google.navigation:q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero — slider zdjęć */}
        <View style={styles.heroContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {gallery.map((img, i) => (
              <Image key={i} source={typeof img === 'string' ? { uri: img } : img} style={styles.heroImage} />
            ))}
          </ScrollView>

          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.65)']}
            style={styles.heroGradient}
            pointerEvents="none"
          />

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heartBtn} onPress={() => toggleFavorite(fishery.id)}>
            <Ionicons name={fav ? 'heart' : 'heart-outline'} size={22} color={fav ? '#EF4444' : '#fff'} />
          </TouchableOpacity>

          {/* Kropki galerii */}
          <View style={styles.dots} pointerEvents="none">
            {gallery.map((_, i) => (
              <View key={i} style={[styles.dot, i === photoIdx && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.heroInfo} pointerEvents="box-none">
            {fishery.premium ? (
              <View style={styles.partnerBadge}>
                <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                <Text style={styles.partnerBadgeText}>Łowisko partnerskie</Text>
              </View>
            ) : (
              <View style={styles.catalogBadge}>
                <Ionicons name="list" size={12} color="#fff" />
                <Text style={styles.catalogBadgeText}>Wpis katalogowy</Text>
              </View>
            )}
            <Text style={styles.heroName}>{fishery.name}</Text>
            <View style={styles.heroLocationRow}>
              <Ionicons name="location" size={14} color={colors.accent} />
              <Text style={styles.heroLocation}>{fishery.location}</Text>
            </View>
            <TouchableOpacity style={styles.mapBtn} onPress={() => setMapVisible(true)}>
              <Ionicons name="map-outline" size={15} color="#fff" />
              <Text style={styles.mapBtnText}>Pokaż na mapie</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatBox icon="star" value={reviews.length ? `${fishery.rating}` : '—'} label={`${reviews.length} opinii`} color="#F59E0B" onPress={() => setActiveTab('reviews')} />
          <StatBox icon="cash-outline" value={`${fishery.priceFrom} zł`} label="od / dzień" color={colors.primary} />
          {fishery.premium ? (
            <StatBox
              icon="people-outline"
              value={termFree != null ? `${termFree}` : `${fishery.availableSpots}/${fishery.totalSpots}`}
              label={termFree != null ? 'wolne w terminie' : 'wolnych miejsc'}
              color={spotsColor}
              onPress={() => setCalendarVisible(true)}
            />
          ) : (
            <StatBox icon="people-outline" value={`${fishery.totalSpots}`} label="stanowisk" color={colors.primary} />
          )}
          <StatBox icon="trophy-outline" value={`${fishery.recordWeight} kg`} label="rekord" color={colors.water} />
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabs}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.tabContent}>
          {activeTab === 'info' && (
            <View>
              {fishery.premium && (
                <TouchableOpacity
                  style={styles.catchBtn}
                  onPress={() => { if (!user) { navigation.navigate('Login'); return; } setCatchVisible(true); }}
                >
                  <Ionicons name="trophy-outline" size={18} color={colors.primary} />
                  <Text style={styles.catchBtnText}>Dodaj połów</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}
              {fishery.types.length > 0 && (
                <View style={styles.typeRow}>
                  {fishery.types.map((t) => (
                    <View key={t} style={styles.typeTag}><Text style={styles.typeTagText}>{t}</Text></View>
                  ))}
                  {fishery.nokill && (
                    <View style={[styles.typeTag, styles.typeTagNokill]}>
                      <Ionicons name="sync-outline" size={12} color={colors.primary} />
                      <Text style={styles.typeTagText}>No Kill</Text>
                    </View>
                  )}
                </View>
              )}
              <Text style={styles.bodyText}>{fishery.description}</Text>
              <View style={styles.hoursRow}>
                <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.hoursText}>Godziny otwarcia: {fishery.openHours}</Text>
              </View>
              <View style={styles.hoursRow}>
                <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.hoursText}>Doba od <Text style={{ fontWeight: '800', color: colors.primary }}>{String(fishery.checkInHour ?? 12).padStart(2, '0')}:00</Text> — zameldowanie i wymeldowanie o tej godzinie</Text>
              </View>
              {(fishery.price24h || fishery.priceDay || fishery.priceNight) && (
                <>
                  <Text style={styles.sectionTitle2}>Cennik</Text>
                  <View style={styles.priceList}>
                    {fishery.price24h ? <View style={styles.priceRow}><Text style={styles.priceRowLabel}>Doba (24h)</Text><Text style={styles.priceRowVal}>{fishery.price24h} zł</Text></View> : null}
                    {fishery.priceDay ? <View style={styles.priceRow}><Text style={styles.priceRowLabel}>Dzień</Text><Text style={styles.priceRowVal}>{fishery.priceDay} zł</Text></View> : null}
                    {fishery.priceNight ? <View style={styles.priceRow}><Text style={styles.priceRowLabel}>Nocka</Text><Text style={styles.priceRowVal}>{fishery.priceNight} zł</Text></View> : null}
                  </View>
                </>
              )}
              <Text style={styles.sectionTitle2}>Gatunki ryb</Text>
              <View style={styles.tagsRow}>
                {fishery.fish.map((f) => (
                  <View key={f} style={styles.fishTag}><Text style={styles.fishTagText}>🐟 {f}</Text></View>
                ))}
              </View>

              {(fishery.phone || fishery.email || fishery.website) && (
                <>
                  <Text style={styles.sectionTitle2}>Kontakt</Text>
                  <View style={styles.contactCard}>
                    {fishery.phone && (
                      <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${fishery.phone!.replace(/\s/g, '')}`)}>
                        <Ionicons name="call-outline" size={18} color={colors.primary} />
                        <Text style={styles.contactText}>{fishery.phone}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                    {fishery.email && (
                      <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${fishery.email}`)}>
                        <Ionicons name="mail-outline" size={18} color={colors.primary} />
                        <Text style={styles.contactText}>{fishery.email}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                    {fishery.website && (
                      <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(fishery.website!)}>
                        <Ionicons name="globe-outline" size={18} color={colors.primary} />
                        <Text style={styles.contactText} numberOfLines={1}>{fishery.website.replace(/^https?:\/\//, '')}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View>
              {reviews.length === 0 ? (
                <View style={styles.notice}>
                  <Ionicons name="star-outline" size={28} color={colors.textSecondary} />
                  <Text style={styles.noticeText}>Brak opinii</Text>
                  <Text style={styles.noticeSub}>Po zakończonej wizycie oceń to łowisko — Twoja opinia pojawi się tutaj.</Text>
                </View>
              ) : (
                reviews.map((r, i) => (
                  <View key={i} style={styles.reviewCard}>
                    <View style={styles.reviewTop}>
                      <Text style={styles.reviewName}>{r.author_name || 'Wędkarz'}</Text>
                      <View style={{ flexDirection: 'row', gap: 1 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={14} color="#F59E0B" />
                        ))}
                      </View>
                    </View>
                    {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                    {r.visited_on ? <Text style={styles.reviewDate}>Wizyta: {fmtDate(r.visited_on)}</Text> : null}
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'amenities' && (
            <View style={styles.amenitiesGrid}>
              {AMENITIES.map((a) => {
                const has = fishery.amenities.some((x) => x.toLowerCase().includes(a.match));
                return (
                  <View key={a.label} style={styles.amenityItem}>
                    <Ionicons name={a.icon as any} size={18} color={has ? colors.accent : colors.border} />
                    <Text style={[styles.amenityText, !has && styles.amenityTextOff]}>{a.label}</Text>
                    <Ionicons
                      name={has ? 'checkmark-circle' : 'close-circle-outline'}
                      size={16}
                      color={has ? colors.success : colors.border}
                    />
                  </View>
                );
              })}
              {/* Dodatkowe (niestandardowe) udogodnienia z bazy — np. „Nocki" */}
              {fishery.amenities
                .filter((x) => !AMENITIES.some((a) => x.toLowerCase().includes(a.match)))
                .map((x) => (
                  <View key={x} style={styles.amenityItem}>
                    <Ionicons name="checkmark-outline" size={18} color={colors.accent} />
                    <Text style={styles.amenityText}>{x}</Text>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  </View>
                ))}
            </View>
          )}

          {activeTab === 'rules' && <Text style={styles.bodyText}>{fishery.rules}</Text>}

          {activeTab === 'records' && (
            fishery.records && fishery.records.length > 0 ? (
              <View style={styles.recordsSection}>
                {fishery.records.map((rec) => (
                  <View key={rec.species} style={styles.recordRow}>
                    <Text style={styles.recordFish}>🐟 {rec.species}</Text>
                    <Text style={styles.recordValue}>{rec.weight.toFixed(1)} kg</Text>
                  </View>
                ))}
                <Text style={styles.recordHint}>Rekordy łowiska</Text>
              </View>
            ) : (
              <View style={styles.notice}>
                <Ionicons name="trophy-outline" size={28} color={colors.textSecondary} />
                <Text style={styles.noticeText}>Brak rekordów</Text>
                <Text style={styles.noticeSub}>To łowisko nie dodało jeszcze rekordów połowów.</Text>
              </View>
            )
          )}

          {activeTab === 'spots' && (
            fishery.spotMap ? (
              <Image source={typeof fishery.spotMap === 'string' ? { uri: fishery.spotMap } : fishery.spotMap} style={styles.mapImage} resizeMode="contain" />
            ) : (
              <View style={styles.notice}>
                <Ionicons name="map-outline" size={28} color={colors.textSecondary} />
                <Text style={styles.noticeText}>Brak mapy stanowisk</Text>
                <Text style={styles.noticeSub}>To łowisko nie dodało jeszcze mapy stanowisk.</Text>
              </View>
            )
          )}

          {activeTab === 'bathy' && (
            fishery.bathyMap ? (
              <Image source={typeof fishery.bathyMap === 'string' ? { uri: fishery.bathyMap } : fishery.bathyMap} style={styles.mapImage} resizeMode="contain" />
            ) : (
              <View style={styles.notice}>
                <Ionicons name="water-outline" size={28} color={colors.textSecondary} />
                <Text style={styles.noticeText}>Brak mapy batymetrycznej</Text>
                <Text style={styles.noticeSub}>To łowisko nie udostępniło jeszcze mapy głębokości.</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.bottomPrice}>od {fishery.priceFrom} zł</Text>
            <Text style={styles.bottomPriceLabel}>za dzień</Text>
          </View>
          {fishery.premium ? (
            <TouchableOpacity style={styles.bookBtn} onPress={() => setCalendarVisible(true)}>
              <Ionicons name="calendar-outline" size={16} color={colors.accent} />
              <Text style={styles.bookBtnText}>Rezerwuj</Text>
            </TouchableOpacity>
          ) : fishery.phone ? (
            <TouchableOpacity style={styles.bookBtn} onPress={() => Linking.openURL(`tel:${fishery.phone!.replace(/\s/g, '')}`)}>
              <Ionicons name="call-outline" size={16} color={colors.accent} />
              <Text style={styles.bookBtnText}>Zadzwoń</Text>
            </TouchableOpacity>
          ) : fishery.website ? (
            <TouchableOpacity style={styles.bookBtn} onPress={() => Linking.openURL(fishery.website!.startsWith('http') ? fishery.website! : `https://${fishery.website}`)}>
              <Ionicons name="globe-outline" size={16} color={colors.accent} />
              <Text style={styles.bookBtnText}>Strona łowiska</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.bookBtn, { opacity: 0.5 }]}>
              <Text style={styles.bookBtnText}>Wkrótce online</Text>
            </View>
          )}
        </View>
      </View>

      {/* Modal — kalendarz / rezerwacja */}
      <Modal visible={calendarVisible} animationType="slide" presentationStyle="pageSheet">
        <SpotCalendar
          totalSpots={fishery.totalSpots}
          fisheryId={fishery.id}
          fisheryName={fishery.name}
          priceFrom={fishery.priceFrom}
          initialFrom={initialFrom}
          initialTo={initialTo}
          userName={profile?.name || user?.name || ''}
          userPhone={profile?.phone || ''}
          spotMap={fishery.spotMap}
          onClose={() => setCalendarVisible(false)}
          onViewReservations={() => {
            setCalendarVisible(false);
            navigation.navigate('MainTabs', { screen: 'Rezerwacje' });
          }}
        />
      </Modal>

      {/* Modal — dodaj połów */}
      {fishery.premium && (
        <AddCatchModal fishery={fishery} visible={catchVisible} onClose={() => setCatchVisible(false)} />
      )}

      {/* Modal z mapą */}
      <Modal visible={mapVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <MapView
            style={StyleSheet.absoluteFill}
            mapType="mutedStandard"
            initialRegion={{ latitude: fishery.latitude, longitude: fishery.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
          >
            <Marker coordinate={{ latitude: fishery.latitude, longitude: fishery.longitude }} anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.pin}>
                <View style={styles.pinBubble}>
                  <Image source={require('../../assets/Ikonka.png')} style={styles.pinFish} resizeMode="contain" />
                </View>
                <View style={styles.pinTip} />
              </View>
            </Marker>
          </MapView>

          <View style={styles.mapTopCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapCardTitle} numberOfLines={1}>{fishery.name}</Text>
              <Text style={styles.mapCardAddr} numberOfLines={2}>{fishery.location}</Text>
            </View>
            <TouchableOpacity onPress={() => setMapVisible(false)} style={styles.mapCloseBtn}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.navBtn} onPress={openNavigation} activeOpacity={0.9}>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.navBtnText}>Nawiguj</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function StatBox({ icon, value, label, color, onPress }: { icon: any; value: string; label: string; color: string; onPress?: () => void }) {
  const content = (
    <>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (onPress) {
    return <TouchableOpacity style={styles.statBox} onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return <View style={styles.statBox}>{content}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heroContainer: { position: 'relative', height: 300 },
  heroImage: { width, height: 300 },
  heroGradient: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  backBtn: { position: 'absolute', top: 52, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
  heartBtn: { position: 'absolute', top: 52, right: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
  dots: { position: 'absolute', top: 14, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
  heroInfo: { position: 'absolute', bottom: 36, left: 16, right: 16 },
  partnerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#fff', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, marginBottom: 8 },
  partnerBadgeText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  catalogBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, marginBottom: 8 },
  catalogBadgeText: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
  heroName: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  heroLocation: { fontSize: 13, color: colors.accent, flex: 1 },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: colors.accent,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start',
  },
  mapBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.card, marginHorizontal: 16, marginTop: -20,
    borderRadius: 16, padding: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  sectionTitle2: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 10 },
  priceList: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  priceRowLabel: { fontSize: 14, color: colors.text },
  priceRowVal: { fontSize: 14, fontWeight: '800', color: colors.primary },
  tabsScroll: { marginTop: 20, marginHorizontal: 16 },
  tabs: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: 12, padding: 4, gap: 2 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  tabContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },
  bodyText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  hoursText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fishTag: { backgroundColor: colors.accent + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  fishTagText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  amenitiesGrid: { gap: 12 },
  amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amenityText: { flex: 1, fontSize: 14, color: colors.text },
  amenityTextOff: { color: colors.textSecondary },
  reviewCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName: { fontSize: 14, fontWeight: '700', color: colors.text },
  reviewComment: { fontSize: 13, color: colors.text, marginTop: 6, lineHeight: 19 },
  reviewDate: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  recordsSection: { gap: 12 },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  recordFish: { fontSize: 15, color: colors.text, fontWeight: '500' },
  recordValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
  recordHint: { fontSize: 12, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  mapImage: { width: '100%', height: 320, borderRadius: 14, backgroundColor: colors.card },
  notice: {
    alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 36, paddingHorizontal: 24,
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  noticeText: { fontSize: 16, fontWeight: '700', color: colors.text },
  noticeSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.card, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottomPrice: { fontSize: 20, fontWeight: '800', color: colors.primary },
  bottomPriceLabel: { fontSize: 12, color: colors.textSecondary },
  bookBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  bookBtnText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  catchBtn: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.accentLight, borderWidth: 1, borderColor: colors.accent, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14 },
  catchBtnText: { fontSize: 15, fontWeight: '800', color: colors.primary },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, backgroundColor: colors.primary,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1, marginRight: 8 },
  modalClose: { padding: 4 },
  modalAddress: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, color: colors.textSecondary, backgroundColor: colors.card },
  modalMapWrap: { flex: 1 },
  modalMap: { flex: 1 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '12', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '30',
  },
  typeTagText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  typeTagNokill: { backgroundColor: colors.accent + '22', borderColor: colors.accent },
  contactCard: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  contactText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  pin: { alignItems: 'center' },
  pinBubble: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: colors.accent,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 6,
  },
  pinFish: { width: 26, height: 26 },
  pinTip: {
    width: 0, height: 0, marginTop: -1,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.accent,
  },
  mapTopCard: {
    position: 'absolute', top: 16, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5,
  },
  mapCardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  mapCardAddr: { fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
  mapCloseBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtn: {
    position: 'absolute', bottom: 28, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  navBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
