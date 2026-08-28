import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useReservations } from '../context/ReservationsContext';

// Baner zjeżdżający z góry, gdy realtime/refetch wykryje świeże potwierdzenie rezerwacji.
export default function ConfirmationBanner() {
  const { freshConfirmation, dismissFreshConfirmation } = useReservations();
  const y = useRef(new Animated.Value(-120)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!freshConfirmation) return;
    Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    timer.current = setTimeout(hide, 5000);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshConfirmation]);

  const hide = () => {
    Animated.timing(y, { toValue: -120, duration: 220, useNativeDriver: true })
      .start(() => dismissFreshConfirmation());
  };

  if (!freshConfirmation) return null;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: y }] }]}>
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={hide}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rezerwacja potwierdzona ✅</Text>
          <Text style={styles.sub} numberOfLines={1}>{freshConfirmation.fishery}</Text>
        </View>
        <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
    paddingTop: Platform.OS === 'ios' ? 52 : 36, paddingHorizontal: 12,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.primary, borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontWeight: '800', fontSize: 14 },
  sub: { color: colors.accentLight, fontWeight: '600', fontSize: 13, marginTop: 1 },
});
