import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import VoivodeshipMap from './VoivodeshipMap';

// JEDEN spójny słownik z panelem i web
const FISH_OPTIONS = ['Karp', 'Amur', 'Szczupak', 'Sandacz', 'Okoń', 'Sum', 'Lin', 'Leszcz', 'Karaś', 'Jesiotr', 'Węgorz', 'Pstrąg'];

const AMENITY_OPTIONS = [
  { key: 'domki', label: 'Domki', icon: 'home-outline' },
  { key: 'prad', label: 'Prąd na stanowisku', icon: 'flash-outline' },
  { key: 'parking', label: 'Parking', icon: 'car-outline' },
  { key: 'toaleta', label: 'Toaleta', icon: 'water-outline' },
  { key: 'wifi', label: 'WiFi', icon: 'wifi-outline' },
  { key: 'grill', label: 'Grill', icon: 'flame-outline' },
  { key: 'sklep', label: 'Sklep z przynętami', icon: 'bag-outline' },
];

const TYPE_OPTIONS = [
  { key: 'Komercyjne', label: 'Komercyjne' },
  { key: 'Karpiowe', label: 'Karpiowe' },
  { key: 'Spinningowe', label: 'Spinningowe' },
  { key: 'Feederowe', label: 'Feederowe' },
  { key: 'Spławikowe', label: 'Spławikowe' },
  { key: 'Muchowe', label: 'Muchowe' },
  { key: 'Specjalne', label: 'Specjalne' },
];

export interface Filters {
  types: string[];
  fish: string[];
  amenities: string[];
  provinces: string[];
  nokill: boolean;
  minSpots: number;
}

export const defaultFilters: Filters = {
  types: [],
  fish: [],
  amenities: [],
  provinces: [],
  nokill: false,
  minSpots: 1,
};

interface Props {
  visible: boolean;
  filters: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
}

export default function FilterModal({ visible, filters, onApply, onClose }: Props) {
  const [local, setLocal] = useState<Filters>(filters);

  const toggle = (arr: string[], key: string): string[] =>
    arr.includes(key) ? arr.filter(x => x !== key) : [...arr, key];

  const activeCount = [
    local.types.length > 0,
    local.fish.length > 0,
    local.amenities.length > 0,
    local.provinces.length > 0,
    local.nokill,
  ].filter(Boolean).length;

  const reset = () => setLocal(defaultFilters);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Filtry {activeCount > 0 && <Text style={styles.badge}> · {activeCount}</Text>}</Text>
          <TouchableOpacity onPress={reset}>
            <Text style={styles.resetBtn}>Wyczyść</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Typ łowiska */}
          <Section title="Typ łowiska">
            <View style={styles.tagsGrid}>
              {TYPE_OPTIONS.map((t) => (
                <Chip
                  key={t.key}
                  label={t.label}
                  active={local.types.includes(t.key)}
                  onPress={() => setLocal(f => ({ ...f, types: toggle(f.types, t.key) }))}
                />
              ))}
              <Chip
                label="No Kill"
                active={local.nokill}
                onPress={() => setLocal(f => ({ ...f, nokill: !f.nokill }))}
              />
            </View>
          </Section>

          {/* Gatunki ryb */}
          <Section title="Gatunki ryb">
            <View style={styles.tagsGrid}>
              {FISH_OPTIONS.map((fish) => (
                <Chip
                  key={fish}
                  label={`🐟 ${fish}`}
                  active={local.fish.includes(fish)}
                  onPress={() => setLocal(f => ({ ...f, fish: toggle(f.fish, fish) }))}
                />
              ))}
            </View>
          </Section>

          {/* Województwo — interaktywna mapka */}
          <Section title="Województwo">
            <Text style={styles.provinceHint}>
              {local.provinces.length > 0
                ? `Zaznaczono: ${local.provinces.length}`
                : 'Dotknij, aby wybrać (możesz kilka)'}
            </Text>
            <VoivodeshipMap
              selected={local.provinces}
              onToggle={(name) => setLocal(f => ({ ...f, provinces: toggle(f.provinces, name) }))}
            />
          </Section>

          {/* Udogodnienia */}
          <Section title="Udogodnienia">
            <View style={styles.amenitiesGrid}>
              {AMENITY_OPTIONS.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={[styles.amenityItem, local.amenities.includes(a.key) && styles.amenityItemActive]}
                  onPress={() => setLocal(f => ({ ...f, amenities: toggle(f.amenities, a.key) }))}
                >
                  <Ionicons
                    name={a.icon as any}
                    size={20}
                    color={local.amenities.includes(a.key) ? colors.accent : colors.textSecondary}
                  />
                  <Text style={[styles.amenityLabel, local.amenities.includes(a.key) && styles.amenityLabelActive]}>
                    {a.label}
                  </Text>
                  {local.amenities.includes(a.key) && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Apply button */}
        <View style={styles.applyBar}>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => { onApply(local); onClose(); }}
          >
            <Text style={styles.applyBtnText}>
              Pokaż wyniki {activeCount > 0 ? `(${activeCount} filtr${activeCount === 1 ? '' : 'y'})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  badge: { color: colors.accent },
  resetBtn: { fontSize: 14, color: colors.error, fontWeight: '600' },
  content: { padding: 20 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  chipTextActive: { color: colors.accent, fontWeight: '700' },
  amenitiesGrid: { gap: 2 },
  amenityItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', padding: 14, borderRadius: 12,
    marginBottom: 2, borderWidth: 1, borderColor: colors.border,
  },
  amenityItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  amenityLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  amenityLabelActive: { color: '#fff' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  switchDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  provinceHint: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginBottom: 12 },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  dropdownText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  provinceList: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginTop: 4, overflow: 'hidden' },
  provinceItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  provinceItemActive: { backgroundColor: colors.accent + '15' },
  provinceText: { fontSize: 14, color: colors.text },
  provinceTextActive: { color: colors.primary, fontWeight: '700' },
  applyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 36, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  applyBtn: {
    backgroundColor: colors.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  applyBtnText: { color: colors.accent, fontSize: 16, fontWeight: '800' },
});
