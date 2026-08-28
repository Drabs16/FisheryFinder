import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

const PROVINCES = [
  'Dolnośląskie', 'Kujawsko-pomorskie', 'Lubelskie', 'Lubuskie',
  'Łódzkie', 'Małopolskie', 'Mazowieckie', 'Opolskie',
  'Podkarpackie', 'Podlaskie', 'Pomorskie', 'Śląskie',
  'Świętokrzyskie', 'Warmińsko-mazurskie', 'Wielkopolskie', 'Zachodniopomorskie',
];

const ROWS: string[][] = [];
for (let i = 0; i < PROVINCES.length; i += 2) ROWS.push(PROVINCES.slice(i, i + 2));

interface Props {
  selected: string[];
  onToggle: (name: string) => void;
}

export default function VoivodeshipMap({ selected, onToggle }: Props) {
  return (
    <View style={styles.grid}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((name) => {
            const sel = selected.includes(name);
            return (
              <TouchableOpacity
                key={name}
                style={[styles.tile, sel && styles.tileSel]}
                onPress={() => onToggle(name)}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.tileText, sel && styles.tileTextSel]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: colors.accent + '18', borderWidth: 1.5, borderColor: colors.accent + '55',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  tileSel: { backgroundColor: colors.primary, borderColor: colors.primary },
  tileText: { fontSize: 13, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  tileTextSel: { color: colors.accent },
});
