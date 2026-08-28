import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import AppDialog from '../components/AppDialog';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Wypełnij e-mail i hasło, aby się zalogować.');
      return;
    }
    setLoading(true);
    const error = await login(email, password);
    setLoading(false);
    if (error) {
      setErrorMsg('Nieprawidłowy e-mail lub hasło. Spróbuj ponownie.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoSection}>
        <Text style={styles.brand}>
          <Text style={styles.brandAccent}>FISHERY </Text>
          <Text style={styles.brandWhite}>FINDER</Text>
        </Text>
        <Image source={require('../../assets/Ikonka.png')} style={styles.brandIcon} resizeMode="contain" />
        <Text style={styles.tagline}>Znajdź swoje łowisko</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Zaloguj się</Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Hasło"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Zapomniałeś hasła?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.loginBtnText}>Zaloguj się</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>lub</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerBtnText}>Utwórz nowe konto</Text>
        </TouchableOpacity>
      </View>

      <AppDialog
        visible={!!errorMsg}
        icon="alert-circle-outline"
        tone="danger"
        title="Nie udało się zalogować"
        message={errorMsg ?? ''}
        confirmLabel="OK"
        onConfirm={() => setErrorMsg(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontSize: 30, fontWeight: '900', letterSpacing: 2, marginBottom: 22 },
  brandAccent: { color: colors.accent },
  brandWhite: { color: '#FFFFFF' },
  brandIcon: { width: 132, height: 132, tintColor: colors.accent },
  tagline: {
    color: colors.accentLight, fontSize: 12, fontWeight: '700',
    letterSpacing: 3, textTransform: 'uppercase', marginTop: 22,
  },
  form: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 48,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 24 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: colors.text },
  eyeBtn: { padding: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loginBtnText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.textSecondary },
  registerBtn: {
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  registerBtnText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
});
