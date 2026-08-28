import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  message: string;
  time?: string;
  label?: string;
}

// Czysty „SMS" w stylu wiadomości na telefonie — używany w potwierdzeniu,
// anulowaniu i przypomnieniach.
export default function SmsBubble({ message, time, label = 'Wiadomość SMS' }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.senderRow}>
        <View style={styles.senderIcon}>
          <Image source={require('../../assets/Ikonka.png')} style={styles.senderImg} resizeMode="contain" />
        </View>
        <Text style={styles.sender}>Fishery Finder</Text>
        <View style={styles.smsTag}>
          <Ionicons name="chatbubble-ellipses-outline" size={10} color={colors.textSecondary} />
          <Text style={styles.smsTagText}>{label}</Text>
        </View>
      </View>
      <View style={styles.bubble}>
        <Text style={styles.message}>{message}</Text>
      </View>
      {time ? <Text style={styles.time}>{time}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  senderIcon: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  senderImg: { width: 15, height: 15, tintColor: '#fff' },
  sender: { fontSize: 13, fontWeight: '800', color: colors.text, flex: 1 },
  smsTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  smsTagText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  bubble: {
    backgroundColor: '#EAF4EE',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  message: { fontSize: 13.5, color: colors.text, lineHeight: 20 },
  time: { fontSize: 11, color: colors.textSecondary, marginTop: 5, marginLeft: 4 },
});
