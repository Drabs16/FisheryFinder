import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Fishery } from '../data/mockData';

const SPOTS = Array.from({ length: 10 }, (_, i) => ({
  id: `${i + 1}`,
  number: i + 1,
  available: ![3, 7, 8].includes(i + 1),
}));

const DATES = [
  { label: 'Dziś', date: 'Czw 29 maja' },
  { label: 'Jutro', date: 'Pt 30 maja' },
  { label: 'Sob', date: 'Sob 31 maja' },
  { label: 'Nie', date: 'Nie 1 cze' },
  { label: 'Pon', date: 'Pon 2 cze' },
];

export default function BookingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const fishery: Fishery = route.params?.fishery;

  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [days, setDays] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');

  const total = fishery.priceFrom * days;

  const handleBook = () => {
    if (!selectedSpot) {
      Alert.alert('Wybierz stanowisko', 'Zaznacz wolne stanowisko na mapie poniżej.');
      return;
    }
    Alert.alert(
      'Rezerwacja potwierdzona! 🎣',
      `Stanowisko #${selectedSpot} zarezerwowane na ${DATES[selectedDate].date}.\nDo zapłaty: ${total} zł`,
      [{ text: 'Super!', onPress: () => navigation.navigate('MainTabs') }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rezerwacja</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Fishery name */}
        <View style={styles.fisheryCard}>
          <Ionicons name="location" size={18} color={colors.accent} />
          <Text style={styles.fisheryName}>{fishery.name}</Text>
        </View>

        {/* Date picker */}
        <Text style={styles.sectionLabel}>Wybierz datę</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
          {DATES.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dateChip, selectedDate === i && styles.dateChipActive]}
              onPress={() => setSelectedDate(i)}
            >
              <Text style={[styles.dateLabel, selectedDate === i && styles.dateLabelActive]}>{d.label}</Text>
              <Text style={[styles.dateDate, selectedDate === i && styles.dateDateActive]}>{d.date}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Days counter */}
        <Text style={styles.sectionLabel}>Liczba dni</Text>
        <View style={styles.daysRow}>
          <TouchableOpacity
            style={styles.daysBtn}
            onPress={() => setDays(Math.max(1, days - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.daysValue}>{days}</Text>
          <TouchableOpacity
            style={styles.daysBtn}
            onPress={() => setDays(Math.min(7, days + 1))}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Spot picker */}
        <Text style={styles.sectionLabel}>Wybierz stanowisko</Text>
        <View style={styles.spotsGrid}>
          {SPOTS.map((spot) => (
            <TouchableOpacity
              key={spot.id}
              style={[
                styles.spotBtn,
                !spot.available && styles.spotBtnTaken,
                selectedSpot === spot.id && styles.spotBtnSelected,
              ]}
              onPress={() => spot.available && setSelectedSpot(spot.id)}
              disabled={!spot.available}
            >
              <Text style={[
                styles.spotText,
                !spot.available && styles.spotTextTaken,
                selectedSpot === spot.id && styles.spotTextSelected,
              ]}>
                {spot.number}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.legendText}>Wolne</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Wybrane</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
            <Text style={styles.legendText}>Zajęte</Text>
          </View>
        </View>

        {/* Payment */}
        <Text style={styles.sectionLabel}>Metoda płatności</Text>
        <View style={styles.paymentRow}>
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'online' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('online')}
          >
            <Ionicons name="card-outline" size={20} color={paymentMethod === 'online' ? '#fff' : colors.text} />
            <Text style={[styles.paymentText, paymentMethod === 'online' && styles.paymentTextActive]}>Online (BLIK/karta)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Ionicons name="cash-outline" size={20} color={paymentMethod === 'cash' ? '#fff' : colors.text} />
            <Text style={[styles.paymentText, paymentMethod === 'cash' && styles.paymentTextActive]}>Gotówka na miejscu</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{fishery.priceFrom} zł × {days} {days === 1 ? 'dzień' : 'dni'}</Text>
            <Text style={styles.summaryValue}>{total} zł</Text>
          </View>
          {paymentMethod === 'online' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Opłata serwisowa (5%)</Text>
              <Text style={styles.summaryValue}>{Math.round(total * 0.05)} zł</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.totalLabel}>Razem</Text>
            <Text style={styles.totalValue}>
              {paymentMethod === 'online' ? Math.round(total * 1.05) : total} zł
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Book button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
          <Text style={styles.bookBtnText}>Potwierdź rezerwację</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  content: { padding: 16, paddingBottom: 120 },
  fisheryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, padding: 14, borderRadius: 12,
    marginBottom: 20, borderWidth: 1, borderColor: colors.border,
  },
  fisheryName: { fontSize: 15, fontWeight: '600', color: colors.text },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateRow: { marginBottom: 20 },
  dateChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.card, marginRight: 10,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  dateLabelActive: { color: colors.accentLight },
  dateDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  dateDateActive: { color: '#fff' },
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  daysBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  daysValue: { fontSize: 22, fontWeight: '800', color: colors.text, minWidth: 30, textAlign: 'center' },
  spotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  spotBtn: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.accent + '20', borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  spotBtnTaken: { backgroundColor: colors.border, borderColor: colors.border },
  spotBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  spotText: { fontSize: 15, fontWeight: '700', color: colors.accent },
  spotTextTaken: { color: colors.textSecondary },
  spotTextSelected: { color: '#fff' },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.textSecondary },
  paymentRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  paymentOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
  },
  paymentOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  paymentText: { fontSize: 12, fontWeight: '500', color: colors.text, flex: 1 },
  paymentTextActive: { color: '#fff' },
  summary: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: colors.textSecondary },
  summaryValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
  summaryTotal: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  bookBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
