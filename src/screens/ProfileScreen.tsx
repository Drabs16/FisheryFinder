import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useReservations } from '../context/ReservationsContext';
import { useFavorites } from '../context/FavoritesContext';
import { supabase } from '../lib/supabase';
import AppDialog from '../components/AppDialog';
import InfoSheet from '../components/InfoSheet';

interface Profile { name: string; phone: string; province: string; }

const MENU = [
  { icon: 'notifications-outline', label: 'Powiadomienia', key: 'notifications' as const },
  { icon: 'shield-checkmark-outline', label: 'Prywatność i RODO', key: 'privacy' as const },
  { icon: 'help-circle-outline', label: 'Pomoc i FAQ', key: 'faq' as const },
  { icon: 'star-outline', label: 'Oceń aplikację', key: 'rate' as const },
];

const FAQ = [
  { q: 'Jak zarezerwować stanowisko?', a: 'Wejdź w łowisko, wybierz „Rezerwuj", zaznacz termin i stanowiska, a następnie potwierdź. Otrzymasz SMS z potwierdzeniem.' },
  { q: 'Czy mogę anulować rezerwację?', a: 'Tak. W zakładce Rezerwacje wybierz rezerwację i „Anuluj". Zwrot środków następuje do 3 dni roboczych.' },
  { q: 'Jak działa płatność?', a: 'Możesz zapłacić online (BLIK, Przelewy24, Apple/Google Pay) z opłatą serwisową 5% lub gotówką na miejscu bez dopłaty.' },
  { q: 'Czy dostanę przypomnienie?', a: 'Tak, wysyłamy SMS przypominający tydzień przed terminem zasiadki.' },
];

type SheetKey = 'notifications' | 'privacy' | 'faq' | 'rate' | null;

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const { reservations } = useReservations();
  const { favorites } = useFavorites();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [sheet, setSheet] = useState<SheetKey>(null);
  const [notif, setNotif] = useState({ push: true, sms: true, promos: false });
  const [rateStars, setRateStars] = useState(0);
  const [rateThanks, setRateThanks] = useState(false);

  const reviewsCount = reservations.filter((r) => r.rating && r.rating > 0).length;

  useEffect(() => { if (user?.id) fetchProfile(); }, [user]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { if (user?.id) fetchProfile(); });
    return unsub;
  }, [navigation, user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('name, phone, province').eq('id', user?.id).single();
    if (data) setProfile(data as Profile);
  };

  const initials = (profile?.name || user?.name || 'U')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const submitRating = () => {
    setSheet(null);
    if (rateStars > 0) setRateThanks(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{profile?.name || user?.name || 'Użytkownik'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {profile?.province ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.locationText}>{profile.province}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
            <Text style={styles.editBtnText}>Edytuj profil</Text>
          </TouchableOpacity>
        </View>

        {/* Stats — klikalne */}
        <View style={styles.statsRow}>
          <StatItem value={`${reservations.length}`} label="Rezerwacje" onPress={() => navigation.navigate('MainTabs', { screen: 'Rezerwacje' })} />
          <View style={styles.statDivider} />
          <StatItem value={`${favorites.length}`} label="Ulubione" onPress={() => navigation.navigate('Favorites')} />
          <View style={styles.statDivider} />
          <StatItem value={`${reviewsCount}`} label="Opinie" onPress={() => navigation.navigate('MyReviews')} />
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyCatches')}>
            <Ionicons name="trophy-outline" size={20} color={colors.primary} />
            <Text style={styles.menuLabel}>Moje połowy</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {MENU.map((item) => (
            <TouchableOpacity key={item.key} style={styles.menuItem} onPress={() => setSheet(item.key)}>
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => setShowLogout(true)}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Wyloguj się</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Fishery Finder v1.0.0</Text>
      </ScrollView>

      {/* Powiadomienia */}
      <InfoSheet visible={sheet === 'notifications'} title="Powiadomienia" onClose={() => setSheet(null)}>
        <NotifRow label="Powiadomienia push" desc="O statusie rezerwacji i wiadomościach" value={notif.push} onChange={(v) => setNotif((n) => ({ ...n, push: v }))} />
        <NotifRow label="Przypomnienia SMS" desc="Tydzień przed zasiadką" value={notif.sms} onChange={(v) => setNotif((n) => ({ ...n, sms: v }))} />
        <NotifRow label="Oferty i promocje" desc="Nowości i rabaty od łowisk" value={notif.promos} onChange={(v) => setNotif((n) => ({ ...n, promos: v }))} />
        <TouchableOpacity style={styles.sheetBtn} onPress={() => setSheet(null)}>
          <Text style={styles.sheetBtnText}>Zapisz ustawienia</Text>
        </TouchableOpacity>
      </InfoSheet>

      {/* Prywatność i RODO */}
      <InfoSheet visible={sheet === 'privacy'} title="Prywatność i RODO" onClose={() => setSheet(null)}>
        <Text style={styles.bodyText}>
          Twoje dane (imię, e-mail, numer telefonu) przetwarzamy wyłącznie w celu realizacji rezerwacji i kontaktu z łowiskiem, zgodnie z RODO (rozporządzenie UE 2016/679).
        </Text>
        <Text style={styles.bodyText}>
          Masz prawo do wglądu, sprostowania oraz usunięcia swoich danych w dowolnym momencie. Nie udostępniamy Twoich danych podmiotom trzecim w celach marketingowych.
        </Text>
        <Text style={styles.bodyText}>
          Dane rezerwacji udostępniamy właścicielowi łowiska tylko w zakresie niezbędnym do obsługi Twojej wizyty.
        </Text>
        <TouchableOpacity style={styles.sheetBtn} onPress={() => setSheet(null)}>
          <Text style={styles.sheetBtnText}>Rozumiem</Text>
        </TouchableOpacity>
      </InfoSheet>

      {/* Pomoc i FAQ */}
      <InfoSheet visible={sheet === 'faq'} title="Pomoc i FAQ" onClose={() => setSheet(null)}>
        {FAQ.map((item, i) => (
          <View key={i} style={styles.faqItem}>
            <Text style={styles.faqQ}>{item.q}</Text>
            <Text style={styles.faqA}>{item.a}</Text>
          </View>
        ))}
        <Text style={styles.faqContact}>Nie znalazłeś odpowiedzi? Napisz: pomoc@fisheryfinder.pl</Text>
      </InfoSheet>

      {/* Oceń aplikację */}
      <InfoSheet visible={sheet === 'rate'} title="Oceń aplikację" onClose={() => setSheet(null)}>
        <Text style={styles.rateHint}>Podoba Ci się Fishery Finder? Daj znać, jak nam idzie!</Text>
        <View style={styles.rateStars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setRateStars(s)} activeOpacity={0.7}>
              <Ionicons name={s <= rateStars ? 'star' : 'star-outline'} size={40} color="#F59E0B" />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.sheetBtn, rateStars === 0 && styles.sheetBtnDisabled]} onPress={submitRating} disabled={rateStars === 0}>
          <Text style={styles.sheetBtnText}>Wyślij ocenę</Text>
        </TouchableOpacity>
      </InfoSheet>

      <AppDialog
        visible={rateThanks}
        icon="heart"
        tone="success"
        title="Dziękujemy za ocenę!"
        message="Twoja opinia pomaga nam rozwijać Fishery Finder."
        confirmLabel="Gotowe"
        onConfirm={() => { setRateThanks(false); setRateStars(0); }}
      />

      <AppDialog
        visible={showLogout}
        icon="log-out-outline"
        tone="danger"
        title="Wylogować się?"
        message="Wrócisz do ekranu logowania. Twoje dane pozostaną bezpieczne."
        confirmLabel="Wyloguj się"
        onConfirm={() => { setShowLogout(false); logout(); }}
        cancelLabel="Anuluj"
        onCancel={() => setShowLogout(false)}
      />
    </View>
  );
}

function StatItem({ value, label, onPress }: { value: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.statItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function NotifRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.notifRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.notifLabel}>{label}</Text>
        <Text style={styles.notifDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={value ? colors.primary : '#fff'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  avatarSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: colors.card, marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '700', color: colors.text },
  userEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 13, color: colors.textSecondary },
  editBtn: { borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginTop: 14 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  statsRow: { flexDirection: 'row', backgroundColor: colors.card, marginBottom: 12, paddingVertical: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  menuSection: { backgroundColor: colors.card, marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLabel: { flex: 1, fontSize: 15, color: colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, padding: 14, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.error + '40' },
  logoutText: { fontSize: 15, fontWeight: '600', color: colors.error },
  version: { textAlign: 'center', fontSize: 12, color: colors.border, marginBottom: 32 },
  // Sheet content
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  notifLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  notifDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sheetBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  sheetBtnDisabled: { backgroundColor: colors.border },
  sheetBtnText: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  bodyText: { fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: 12 },
  faqItem: { marginBottom: 16 },
  faqQ: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 4 },
  faqA: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  faqContact: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 4 },
  rateHint: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 4 },
  rateStars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 20 },
});
