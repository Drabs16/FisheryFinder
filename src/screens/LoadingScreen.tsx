import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  onFinish: () => void;
}

export default function LoadingScreen({ onFinish }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
    ).start();

    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish, pulse, spin, fade]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.center, { opacity: fade }]}>
        <Text style={styles.brand}>
          <Text style={styles.brandAccent}>FISHERY </Text>
          <Text style={styles.brandWhite}>FINDER</Text>
        </Text>
        <Animated.Image
          source={require('../../assets/Ikonka.png')}
          style={[styles.icon, { transform: [{ scale }] }]}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Znajdź swoje łowisko</Text>
      </Animated.View>

      <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
      <Text style={styles.loadingText}>Ładowanie…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  brand: { fontSize: 28, fontWeight: '900', letterSpacing: 2, marginBottom: 30 },
  brandAccent: { color: colors.accent },
  brandWhite: { color: '#FFFFFF' },
  icon: { width: 120, height: 120, tintColor: colors.accent },
  tagline: {
    color: colors.accentLight, fontSize: 12, fontWeight: '700',
    letterSpacing: 3, textTransform: 'uppercase', marginTop: 24,
  },
  spinner: {
    position: 'absolute', bottom: 110,
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: colors.accent,
  },
  loadingText: {
    position: 'absolute', bottom: 74,
    color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1,
  },
});
