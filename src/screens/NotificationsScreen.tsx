import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useReservations, Reservation } from '../context/ReservationsContext';

const MS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const parseIso = (s: string) => new Date(`${s}T12:00:00`);

const fmtRange = (r: Reservation) => {
  const a = parseIso(r.dateFrom);
  const b = parseIso(r.dateTo);
  if (r.dateFrom === r.dateTo) return `${a.getDate()} ${MS[a.getMonth()]} ${a.getFullYear()}`;
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MS[a.getMonth()]} ${a.getFullYear()}`;
  return `${a.getDate()} ${MS[a.getMonth()]} – ${b.getDate()} ${MS[b.getMonth()]} ${b.getFullYear()}`;
};

const ago = (ms?: number) => {
  if (!ms) return '';
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return 'przed chwilą';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min temu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} godz. temu`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? 'dzień' : 'dni'} temu`;
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { notifications, markNotificationsSeen } = useReservations();

  // Wejście na ekran = przeczytane.
  useEffect(() => { markNotificationsSeen(); }, [markNotificationsSeen]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} accessibilityLabel="Wstecz">
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Powiadomienia</Text>
        <View style={{ width: 42 }} />
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={60} color={colors.border} />
          <Text style={styles.emptyTitle}>Brak powiadomień</Text>
          <Text style={styles.emptyText}>Gdy właściciel potwierdzi Twoją rezerwację, zobaczysz to tutaj.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {notifications.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Rezerwacje' })}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="checkmark-circle" size={26} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Rezerwacja potwierdzona ✅</Text>
                <Text style={styles.sub}>{r.fishery}</Text>
                <Text style={styles.meta}>
                  {fmtRange(r)} · {r.spots.length > 1 ? 'stanowiska' : 'stanowisko'} {r.spots.join(', ')}
                </Text>
                <Text style={styles.ago}>{ago(r.confirmedAt)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 14 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  item: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 12,
  },
  iconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EAF7F0', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 14, fontWeight: '600', color: colors.primaryLight, marginTop: 2 },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  ago: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
