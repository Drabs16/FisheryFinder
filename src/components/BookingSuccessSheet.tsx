import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  phone: string;
  onViewReservations: () => void;
  onClose: () => void;
}

export default function BookingSuccessSheet({
  visible, phone, onViewReservations, onClose,
}: Props) {
  const pop = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      pop.setValue(0); fade.setValue(0);
      Animated.parallel([
        Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [visible, pop, fade]);

  if (!visible) return null;

  const ringScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={styles.overlay}>
      <View style={styles.backdrop} />
      <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
        <Animated.View style={[styles.checkRing, { transform: [{ scale: ringScale }] }]}>
          <Ionicons name="checkmark" size={44} color="#fff" />
        </Animated.View>

        <Text style={styles.title}>Dziękujemy za rezerwację!</Text>
        <Text style={styles.subtitle}>
          Twoje stanowisko czeka. Szczegóły znajdziesz w zakładce Rezerwacje.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
            <Text style={styles.infoText}>Potwierdzenie SMS wysłaliśmy na {phone || 'Twój numer'}.</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="notifications-outline" size={16} color={colors.primary} />
            <Text style={styles.infoText}>Przypomnimy Ci SMS-em tydzień przed terminem.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={onViewReservations} activeOpacity={0.9}>
          <Text style={styles.primaryText}>Zobacz moje rezerwacje</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
          <Text style={styles.secondaryText}>Gotowe</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 60 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
  },
  checkRing: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowColor: colors.success, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  title: { fontSize: 21, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 8 },
  infoCard: {
    width: '100%', marginTop: 20, gap: 10,
    backgroundColor: colors.background, borderRadius: 14, padding: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  infoText: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600', lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, width: '100%', marginTop: 22,
  },
  primaryText: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  secondaryBtn: { paddingVertical: 12, marginTop: 4 },
  secondaryText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
