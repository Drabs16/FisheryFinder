import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useFavorites } from '../context/FavoritesContext';
import { useFisheries } from '../context/FisheriesContext';

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const { favorites, toggleFavorite } = useFavorites();
  const { fisheries } = useFisheries();
  const list = fisheries.filter((f) => favorites.includes(f.id));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ulubione łowiska</Text>
        <View style={{ width: 38 }} />
      </View>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={64} color={colors.border} />
          <Text style={styles.emptyText}>Brak ulubionych</Text>
          <Text style={styles.emptySub}>Dodaj łowiska serduszkiem, aby mieć je pod ręką</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('FisheryDetail', { fishery: item })}
              activeOpacity={0.85}
            >
              <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={styles.cardImage} />
              <TouchableOpacity style={styles.heartBtn} onPress={() => toggleFavorite(item.id)} activeOpacity={0.8}>
                <Ionicons name="heart" size={18} color="#EF4444" />
              </TouchableOpacity>
              <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                </View>
                <View style={styles.cardRow}>
                  <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.cardSub}>{item.city} • {item.distance} km</Text>
                </View>
                <Text style={styles.price}>od <Text style={styles.priceVal}>{item.priceFrom} zł</Text>/dzień</Text>
              </View>
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
  list: { padding: 16, gap: 16 },
  card: {
    backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardImage: { width: '100%', height: 150 },
  heartBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: 14 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  cardSub: { fontSize: 13, color: colors.textSecondary },
  price: { fontSize: 13, color: colors.textSecondary },
  priceVal: { fontWeight: '700', color: colors.text, fontSize: 15 },
});
