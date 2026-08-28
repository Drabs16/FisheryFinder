import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import AppDialog from '../components/AppDialog';

const PROVINCES = [
  'Dolnośląskie', 'Kujawsko-pomorskie', 'Lubelskie', 'Lubuskie',
  'Łódzkie', 'Małopolskie', 'Mazowieckie', 'Opolskie',
  'Podkarpackie', 'Podlaskie', 'Pomorskie', 'Śląskie',
  'Świętokrzyskie', 'Warmińsko-mazurskie', 'Wielkopolskie', 'Zachodniopomorskie',
];

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProvinces, setShowProvinces] = useState(false);
  const [info, setInfo] = useState<{ title: string; message: string; success: boolean } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (data) {
        setName(data.name ?? '');
        setEmail(data.email ?? user?.email ?? '');
        setPhone(data.phone ?? '');
        setProvince(data.province ?? '');
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      setInfo({ title: 'Uzupełnij dane', message: 'Imię i nazwisko jest wymagane.', success: false });
      return;
    }
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setInfo({ title: 'Sprawdź e-mail', message: 'Podaj poprawny adres e-mail.', success: false });
      return;
    }
    setLoading(true);
    const emailChanged = mail !== (user?.email ?? '').toLowerCase();
    let authErr: { message: string } | null = null;
    if (emailChanged) {
      const { error: e } = await supabase.auth.updateUser({ email: mail });
      authErr = e;
    }
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user?.id, email: mail, name, phone, province })
      .select();
    setLoading(false);
    if (authErr || error) {
      setInfo({ title: 'Nie udało się zapisać', message: (authErr || error)!.message, success: false });
    } else {
      setInfo({
        title: 'Zapisano!',
        message: emailChanged
          ? 'Profil zaktualizowany. Na nowy adres wysłaliśmy link potwierdzający zmianę e-maila.'
          : 'Twój profil został zaktualizowany.',
        success: true,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edytuj profil</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.accent} size="small" /> : <Text style={styles.saveBtnText}>Zapisz</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar placeholder */}
        <TouchableOpacity style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.avatarLabel}>Zmień zdjęcie</Text>
        </TouchableOpacity>

        {/* Dane podstawowe */}
        <Text style={styles.sectionTitle}>Dane podstawowe</Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Imię i nazwisko"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Adres e-mail"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="call-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Numer telefonu"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Województwo */}
        <Text style={styles.sectionTitle}>Województwo</Text>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowProvinces(!showProvinces)}>
          <Ionicons name="location-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <Text style={[styles.dropdownText, !province && { color: colors.textSecondary }]}>
            {province || 'Wybierz województwo'}
          </Text>
          <Ionicons name={showProvinces ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        {showProvinces && (
          <View style={styles.dropdownList}>
            {PROVINCES.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.dropdownItem, province === p && styles.dropdownItemActive]}
                onPress={() => { setProvince(p); setShowProvinces(false); }}
              >
                <Text style={[styles.dropdownItemText, province === p && styles.dropdownItemTextActive]}>{p}</Text>
                {province === p && <Ionicons name="checkmark" size={16} color={colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AppDialog
        visible={!!info}
        icon={info?.success ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        tone={info?.success ? 'success' : 'danger'}
        title={info?.title ?? ''}
        message={info?.message}
        confirmLabel="OK"
        onConfirm={() => {
          const ok = info?.success;
          setInfo(null);
          if (ok) navigation.goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  saveBtn: { paddingHorizontal: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.accent },
  content: { padding: 16 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  avatarLabel: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 20,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, height: 52, marginBottom: 10,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: colors.text },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, height: 52,
  },
  dropdownText: { flex: 1, fontSize: 15, color: colors.text },
  dropdownList: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownItemActive: { backgroundColor: colors.accent + '15' },
  dropdownItemText: { fontSize: 14, color: colors.text },
  dropdownItemTextActive: { color: colors.primary, fontWeight: '600' },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
  },
  tagActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  tagTextActive: { color: colors.accent, fontWeight: '700' },
});
