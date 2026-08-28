import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { Fishery } from '../data/mockData';
import { addCatch } from '../lib/catches';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const shiftDay = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const nd = new Date(y, m - 1, d + n);
  return `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
};
const MS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const fmtDay = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MS[m - 1]} ${y}`; };

type Photo = { uri: string; base64: string; ext: string };

export default function AddCatchModal({ fishery, visible, onClose, onAdded }: {
  fishery: Fishery; visible: boolean; onClose: () => void; onAdded?: () => void;
}) {
  const [species, setSpecies] = useState('');
  const [weight, setWeight] = useState('');
  const [spot, setSpot] = useState<number | null>(null);
  const [caughtOn, setCaughtOn] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);

  const spots = Array.from({ length: fishery.totalSpots || 0 }, (_, i) => i + 1);

  const reset = () => { setSpecies(''); setWeight(''); setSpot(null); setCaughtOn(todayLocal()); setNote(''); setPhoto(null); };

  const pick = async (camera: boolean) => {
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Brak dostępu', 'Pozwól na dostęp do ' + (camera ? 'aparatu' : 'zdjęć') + ' w ustawieniach.'); return; }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    const b64 = res.canceled ? null : res.assets?.[0]?.base64;
    if (!res.canceled && b64) {
      const a = res.assets[0];
      setPhoto({ uri: a.uri, base64: b64, ext: (a.uri.split('.').pop() || 'jpg').toLowerCase() });
    }
  };

  const submit = async () => {
    if (!species.trim()) { Alert.alert('Podaj gatunek', 'Wpisz lub wybierz gatunek ryby.'); return; }
    const w = weight ? Number(weight.replace(',', '.')) : null;
    if (w != null && (Number.isNaN(w) || w <= 0)) { Alert.alert('Waga', 'Waga musi być liczbą większą od zera.'); return; }
    setBusy(true);
    try {
      await addCatch({
        fisheryId: fishery.id, species: species.trim(), weight: w, spotNumber: spot, caughtOn, note,
        photoBase64: photo?.base64 ?? null, photoExt: photo?.ext,
      });
      reset();
      onAdded?.();
      onClose();
    } catch (e: any) {
      Alert.alert('Błąd', e?.message ?? 'Nie udało się zapisać połowu.');
    }
    setBusy(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.hClose}><Ionicons name="close" size={22} color={colors.text} /></TouchableOpacity>
          <View>
            <Text style={styles.hTitle}>Dodaj połów</Text>
            <Text style={styles.hSub}>{fishery.name}</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Zdjęcie */}
          {photo ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photo.uri }} style={styles.photo} />
              <TouchableOpacity style={styles.photoClear} onPress={() => setPhoto(null)}><Ionicons name="close" size={16} color="#fff" /></TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoBtns}>
              <TouchableOpacity style={styles.photoBtn} onPress={() => pick(true)}>
                <Ionicons name="camera-outline" size={22} color={colors.primary} /><Text style={styles.photoBtnText}>Zrób zdjęcie</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={() => pick(false)}>
                <Ionicons name="images-outline" size={22} color={colors.primary} /><Text style={styles.photoBtnText}>Z galerii</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Gatunek */}
          <Text style={styles.label}>Gatunek</Text>
          <TextInput style={styles.input} value={species} onChangeText={setSpecies} placeholder="np. Karp" placeholderTextColor={colors.textSecondary} />
          {fishery.fish.length > 0 && (
            <View style={styles.chips}>
              {fishery.fish.slice(0, 8).map((f) => (
                <TouchableOpacity key={f} style={[styles.chip, species === f && styles.chipOn]} onPress={() => setSpecies(f)}>
                  <Text style={[styles.chipText, species === f && styles.chipTextOn]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Waga */}
          <Text style={styles.label}>Waga <Text style={styles.opt}>· kg, opcjonalnie</Text></Text>
          <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="np. 8,5" placeholderTextColor={colors.textSecondary} />

          {/* Stanowisko */}
          {spots.length > 0 && (
            <>
              <Text style={styles.label}>Stanowisko <Text style={styles.opt}>· opcjonalnie</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <TouchableOpacity style={[styles.spot, spot == null && styles.spotOn]} onPress={() => setSpot(null)}>
                  <Text style={[styles.spotText, spot == null && styles.spotTextOn]}>—</Text>
                </TouchableOpacity>
                {spots.map((s) => (
                  <TouchableOpacity key={s} style={[styles.spot, spot === s && styles.spotOn]} onPress={() => setSpot(s)}>
                    <Text style={[styles.spotText, spot === s && styles.spotTextOn]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Data */}
          <Text style={styles.label}>Data połowu</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setCaughtOn((d) => shiftDay(d, -1))}><Ionicons name="chevron-back" size={18} color={colors.primary} /></TouchableOpacity>
            <Text style={styles.dateText}>{caughtOn === todayLocal() ? 'Dziś' : fmtDay(caughtOn)}</Text>
            <TouchableOpacity style={[styles.dateBtn, caughtOn >= todayLocal() && { opacity: 0.35 }]} disabled={caughtOn >= todayLocal()} onPress={() => setCaughtOn((d) => shiftDay(d, 1))}><Ionicons name="chevron-forward" size={18} color={colors.primary} /></TouchableOpacity>
          </View>

          {/* Notatka */}
          <Text style={styles.label}>Notatka <Text style={styles.opt}>· opcjonalnie</Text></Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={note} onChangeText={setNote} multiline placeholder="Przynęta, metoda, pora dnia…" placeholderTextColor={colors.textSecondary} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.submit, busy && { opacity: 0.7 }]} disabled={busy} onPress={submit}>
            {busy ? <ActivityIndicator color={colors.accent} /> : <><Ionicons name="checkmark" size={18} color={colors.accent} /><Text style={styles.submitText}>Zapisz połów</Text></>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  hClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  hTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  hSub: { fontSize: 13, color: colors.textSecondary },
  photoWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 6 },
  photo: { width: '100%', height: 220 },
  photoClear: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  photoBtns: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  photoBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 22, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.card },
  photoBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 7 },
  opt: { fontWeight: '400', color: colors.textSecondary, fontSize: 12 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: colors.text },
  chipTextOn: { color: colors.accent },
  spot: { minWidth: 44, height: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  spotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  spotText: { fontSize: 15, fontWeight: '800', color: colors.text },
  spotTextOn: { color: colors.accent },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  dateText: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.text },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 14 },
  submitText: { color: colors.accent, fontSize: 16, fontWeight: '800' },
});
