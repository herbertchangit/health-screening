import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/context/LanguageContext';
import LanguageToggle from '../../src/components/LanguageToggle';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { t, roleLabel } = useLanguage();
  const router = useRouter();

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        role,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.detail || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const RoleButton = ({ value, label, icon }: { value: 'patient' | 'doctor' | 'admin'; label: string; icon: string }) => (
    <TouchableOpacity
      style={[styles.roleButton, role === value && styles.roleButtonActive]}
      onPress={() => setRole(value)}
    >
      <Ionicons name={icon as any} size={24} color={role === value ? '#1a73e8' : '#5f6368'} />
      <Text style={[styles.roleButtonText, role === value && styles.roleButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.languageRow}>
            <LanguageToggle compact />
          </View>

          <View style={styles.headerContainer}>
            <Text style={styles.title}>{t('auth.createAccount')}</Text>
            <Text style={styles.subtitle}>{t('auth.joinToday')}</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>{t('common.role')}</Text>
            <View style={styles.roleContainer}>
              <RoleButton value="patient" label={roleLabel('patient')} icon="person" />
              <RoleButton value="doctor" label={roleLabel('doctor')} icon="medkit" />
              <RoleButton value="admin" label={roleLabel('admin')} icon="shield" />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#5f6368" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={`${t('common.fullName')} *`}
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor="#9aa0a6"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#5f6368" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={`${t('common.email')} *`}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9aa0a6"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#5f6368" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('common.phone')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#9aa0a6"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#5f6368" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={`${t('auth.password')} *`}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#9aa0a6"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#5f6368"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#5f6368" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={`${t('auth.confirmPassword')} *`}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#9aa0a6"
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>{t('auth.createAccount')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('auth.alreadyAccount')}</Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>{t('auth.signIn')}</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  languageRow: {
    alignSelf: 'center',
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5f6368',
  },
  formContainer: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e8eaed',
  },
  roleButtonActive: {
    borderColor: '#1a73e8',
    backgroundColor: '#e8f0fe',
  },
  roleButtonText: {
    marginTop: 8,
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: '#1a73e8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#202124',
  },
  registerButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#5f6368',
    fontSize: 14,
  },
  loginLink: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '600',
  },
});
