import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { myCatches, deleteCatch, CatchReport } from '../lib/catches';
import { useFisheries } from '../context/FisheriesContext';

const MS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const fmt = (iso: string) => { const d = new Date(`${iso}T12:00:00`); return `${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear()}`; };

export default function MyCatchesScreen() {
  const navigation = useNavigation<any>();
  const { fisheries } = useFisheries();
  const [items, setItems] = useState<CatchReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    myCatches().then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);
  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const openFishery = (c: CatchReport) => {
    const f = fisheries.find((x) => x.id === c.fisheryId);
    if (f) navigation.navigate('FisheryDetail', { fishery: f });
  };

  const remove = (c: CatchReport) => {
    Alert.alert('Usunąć połów?', `${c.species}${c.weight ? ` · ${c.weight} kg` : ''}`, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń', style: 'destructive', onPress: async () => {
          setItems((p) => p.filter((x) => x.id !== c.id));
          try { await deleteCatch(c.id); } catch { load(); }
        },
      },
    ]);
  };

  const best = items.reduce((m, c) => (c.weight && c.weight > m ? c.weight : m), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moje połowy</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={64} color={colors.border} />
          <Text style={styles.emptyText}>Dziennik jest pusty</Text>
          <Text style={styles.emptySub}>Wejdź na łowisko partnerskie i dodaj swój pierwszy połów.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statV}>{items.length}</Text><Text style={styles.statL}>połowów</Text></View>
              <View style={styles.stat}><Text style={styles.statV}>{best ? `${best} kg` : '—'}</Text><Text style={styles.statL}>rekord</Text></View>
              <View style={styles.stat}><Text style={styles.statV}>{new Set(items.map((c) => c.fisheryId)).size}</Text><Text style={styles.statL}>łowisk</Text></View>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => openFishery(item)} onLongPress={() => remove(item)}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPh]}><Ionicons name="fish-outline" size={30} color={colors.primary} /></View>
              )}
              {item.weight != null && <View style={styles.weight}><Text style={styles.weightText}>{item.weight} kg</Text></View>}
              <View style={styles.body}>
                <Text style={styles.species}>{item.species}</Text>
                <Text style={styles.fishery} numberOfLines={1}><Ionicons name="location-outline" size={12} color={colors.textSecondary} /> {item.fisheryName}</Text>
                <Text style={styles.meta}>{fmt(item.caughtOn)}{item.spotNumber != null ? ` · Stanowisko ${item.spotNumber}` : ''}</Text>
                {!!item.note && <Text style={styles.note} numberOfLines={2}>{item.note}</Text>}
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
  header: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  list: { padding: 16, gap: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  stat: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  statV: { fontSize: 20, fontWeight: '800', color: colors.primary },
  statL: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
  card: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  photo: { width: '100%', height: 200 },
  photoPh: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentLight },
  weight: { position: 'absolute', left: 12, top: 168, backgroundColor: 'rgba(14,43,30,0.88)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  weightText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  body: { padding: 14 },
  species: { fontSize: 16, fontWeight: '800', color: colors.text },
  fishery: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  meta: { fontSize: 12.5, color: colors.textSecondary, marginTop: 6 },
  note: { fontSize: 13, color: colors.text, marginTop: 8, lineHeight: 19 },
});
