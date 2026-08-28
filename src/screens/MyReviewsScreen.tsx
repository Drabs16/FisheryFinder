import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useReservations } from '../context/ReservationsContext';
import { useFisheries } from '../context/FisheriesContext';

const MS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const fmt = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear()}`;
};

export default function MyReviewsScreen() {
  const navigation = useNavigation<any>();
  const { reservations } = useReservations();
  const { fisheries } = useFisheries();
  const reviews = reservations.filter((r) => r.rating && r.rating > 0);

  const openFishery = (name: string) => {
    const f = fisheries.find((x) => x.name === name);
    if (f) navigation.navigate('FisheryDetail', { fishery: f });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moje opinie</Text>
        <View style={{ width: 38 }} />
      </View>

      {reviews.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={64} color={colors.border} />
          <Text style={styles.emptyText}>Brak opinii</Text>
          <Text style={styles.emptySub}>Oceń zakończone wizyty w zakładce Rezerwacje</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openFishery(item.fishery)} activeOpacity={0.85}>
              <View style={styles.cardTop}>
                <Text style={styles.fishery} numberOfLines={1}>{item.fishery}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons key={s} name={s <= item.rating! ? 'star' : 'star-outline'} size={18} color="#F59E0B" />
                ))}
              </View>
              <Text style={styles.date}>Wizyta: {fmt(item.dateFrom)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  list: { padding: 16, gap: 14 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fishery: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 10 },
  date: { fontSize: 13, color: colors.textSecondary, marginTop: 10 },
});
