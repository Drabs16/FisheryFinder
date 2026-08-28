import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { PaymentMethod, PAYMENT_LABELS, isOnline, SERVICE_FEE } from '../context/ReservationsContext';

const PAYMENTS: { key: PaymentMethod; icon: any }[] = [
  { key: 'cash', icon: 'cash-outline' },
  { key: 'blik', icon: 'phone-portrait-outline' },
  { key: 'p24', icon: 'card-outline' },
  { key: 'applepay', icon: 'logo-apple' },
  { key: 'googlepay', icon: 'logo-google' },
];

interface Props {
  visible: boolean;
  fishery: string;
  spots: number[];
  dateLabel: string;
  days: number;
  pricePerDay: number;
  name: string;
  phone: string;
  onClose: () => void;
  onConfirm: (payment: PaymentMethod, total: number) => void;
}

export default function BookingConfirmSheet({
  visible, fishery, spots, dateLabel, days, pricePerDay, name, phone, onClose, onConfirm,
}: Props) {
  const [payment, setPayment] = useState<PaymentMethod>('blik');
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  if (!visible) return null;

  const base = spots.length * pricePerDay * Math.max(1, days);
  const fee = isOnline(payment) ? Math.round(base * SERVICE_FEE) : 0;
  const total = base + fee;

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>Podsumowanie rezerwacji</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
          {/* Dane rezerwacji */}
          <View style={styles.card}>
            <Row icon="fish-outline" label="Łowisko" value={fishery} />
            <Row icon="person-outline" label="Imię i nazwisko" value={name || '—'} />
            <Row icon="call-outline" label="Telefon" value={phone || 'Uzupełnij w profilu'} />
            <Row icon="grid-outline" label={spots.length > 1 ? 'Stanowiska' : 'Stanowisko'} value={[...spots].sort((a, b) => a - b).join(', ')} />
            <Row icon="calendar-outline" label="Termin" value={dateLabel} last />
          </View>

          {/* Płatność */}
          <Text style={styles.sectionLabel}>Metoda płatności</Text>
          <View style={styles.payGrid}>
            {PAYMENTS.map((p) => {
              const active = payment === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.payItem, active && styles.payItemActive]}
                  onPress={() => setPayment(p.key)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={p.icon} size={20} color={active ? colors.accent : colors.text} />
                  <Text style={[styles.payText, active && styles.payTextActive]}>{PAYMENT_LABELS[p.key]}</Text>
                  {active && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cennik */}
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{pricePerDay} zł × {spots.length} {spots.length === 1 ? 'stan.' : 'stan.'} × {Math.max(1, days)} {days === 1 ? 'dzień' : 'dni'}</Text>
              <Text style={styles.priceValue}>{base} zł</Text>
            </View>
            {fee > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Opłata serwisowa (5%)</Text>
                <Text style={styles.priceValue}>{fee} zł</Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.priceTotalRow]}>
              <Text style={styles.totalLabel}>Razem</Text>
              <Text style={styles.totalValue}>{total} zł</Text>
            </View>
            {!isOnline(payment) && (
              <Text style={styles.cashNote}>Płatność gotówką na miejscu — bez opłaty serwisowej.</Text>
            )}
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(payment, total)} activeOpacity={0.9}>
          <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
          <Text style={styles.confirmText}>Potwierdź i zarezerwuj · {total} zł</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function Row({ icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 50 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.background, borderRadius: 14, paddingHorizontal: 14, marginBottom: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 13, color: colors.textSecondary, width: 110 },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: '700', flex: 1, textAlign: 'right' },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  payGrid: { gap: 8, marginBottom: 18 },
  payItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff',
  },
  payItemActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  payText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  payTextActive: { color: '#fff' },
  priceCard: { backgroundColor: colors.background, borderRadius: 14, padding: 16, gap: 10, marginBottom: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  priceValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  priceTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 2 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: 20, fontWeight: '900', color: colors.primary },
  cashNote: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, marginTop: 16,
  },
  confirmText: { color: colors.accent, fontSize: 15, fontWeight: '800' },
});
