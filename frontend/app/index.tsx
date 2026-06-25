import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Login from './(auth)/login';

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  if (!isLoading) {
    return <Login />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.iconWrapper}>
          <Ionicons name="medical" size={60} color="#1a73e8" />
        </View>
        <Text style={styles.title}>Talk with Doc</Text>
        <Text style={styles.subtitle}>Book appointments seamlessly</Text>
      </View>
      <ActivityIndicator size="large" color="#1a73e8" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5f6368',
  },
  loader: {
    marginTop: 20,
  },
});
