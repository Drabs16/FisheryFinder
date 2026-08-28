import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  icon?: any;
  tone?: 'primary' | 'danger' | 'success';
  title: string;
  message?: string;
  note?: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
}

const TONES = {
  primary: { bg: colors.primary, fg: colors.accent, iconBg: colors.primary, iconFg: colors.accent },
  danger: { bg: colors.error, fg: '#fff', iconBg: colors.error + '18', iconFg: colors.error },
  success: { bg: colors.primary, fg: colors.accent, iconBg: colors.success, iconFg: '#fff' },
};

export default function AppDialog({
  visible, icon, tone = 'primary', title, message, note, confirmLabel, onConfirm, cancelLabel, onCancel,
}: Props) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible, fade]);

  if (!visible) return null;
  const t = TONES[tone];

  return (
    <View style={styles.overlay}>
      <View style={styles.backdrop} />
      <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
        {icon && (
          <View style={[styles.iconCircle, { backgroundColor: t.iconBg }]}>
            <Ionicons name={icon} size={28} color={t.iconFg} />
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {note ? <Text style={styles.note}>{note}</Text> : null}

        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: t.bg }]} onPress={onConfirm} activeOpacity={0.9}>
          <Text style={[styles.confirmText, { color: t.fg }]}>{confirmLabel}</Text>
        </TouchableOpacity>
        {cancelLabel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 80 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 22, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
  },
  iconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '900', color: colors.text, textAlign: 'center' },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  note: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  confirmBtn: { borderRadius: 14, paddingVertical: 15, width: '100%', alignItems: 'center', marginTop: 20 },
  confirmText: { fontSize: 15, fontWeight: '800' },
  cancelBtn: { paddingVertical: 12, marginTop: 2 },
  cancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
