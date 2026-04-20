import React from 'react';
import { Tabs, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { View, Text, StyleSheet, Platform } from 'react-native';

const TAB_TITLES: Record<string, string> = {
  index: 'Talk with Doc',
  appointments: 'Appointments',
  notifications: 'Notifications',
  profile: 'Profile',
};

export default function TabLayout() {
  const { user } = useAuth();
  const segments = useSegments();
  const fullName = user?.full_name || '';

  // Get current tab name from segments
  const currentTab = segments.length > 1 ? segments[1] : 'index';
  const headerTitle = TAB_TITLES[currentTab] || 'Talk with Doc';

  return (
    <View style={styles.wrapper}>
      {/* Custom Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        {fullName ? (
          <View style={styles.userBadge}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              Hi, {fullName}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Tab Navigator */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#1a73e8',
          tabBarInactiveTintColor: '#5f6368',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e8eaed',
            paddingBottom: Platform.OS === 'ios' ? 28 : 16,
            paddingTop: 8,
            height: Platform.OS === 'ios' ? 85 : 72,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Events',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="appointments"
          options={{
            title: 'Appointments',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="clipboard" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  headerBar: {
    backgroundColor: '#1a73e8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 180,
  },
});
