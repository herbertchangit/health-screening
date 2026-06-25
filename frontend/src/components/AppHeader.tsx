import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Talk with Doc',
  '/appointments': 'Appointments',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/admin/events': 'Manage Events',
  '/admin/users': 'Manage Users',
  '/admin/doctors': 'Manage Doctors',
  '/admin/appointments': 'Manage Appointments',
  '/admin/news': 'Manage News',
  '/manage-slots': 'Manage Slots',
  '/create-event': 'Create Event',
};

const MAIN_PATHS = new Set(['/', '/appointments', '/notifications', '/profile']);

export default function AppHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isAuthenticated || !user) return null;

  const title = PAGE_TITLES[pathname]
    || (pathname.startsWith('/event/') ? 'Event Details' : 'Talk with Doc');
  const showBack = !MAIN_PATHS.has(pathname);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/(auth)/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.titleGroup}>
        {showBack ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      <View style={styles.accountGroup}>
        <Text style={styles.userName} numberOfLines={1}>{user.full_name}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={isLoggingOut} accessibilityRole="button" accessibilityLabel="Logout">
          {isLoggingOut ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="log-out-outline" size={20} color="#fff" />}
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: Platform.OS === 'web' ? 58 : 92, paddingTop: Platform.OS === 'web' ? 0 : 34, paddingHorizontal: 16, backgroundColor: '#1a73e8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  title: { flex: 1, color: '#fff', fontSize: 19, fontWeight: '700' },
  accountGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName: { color: '#fff', fontSize: 13, fontWeight: '600', maxWidth: 150 },
  logoutButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.18)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
