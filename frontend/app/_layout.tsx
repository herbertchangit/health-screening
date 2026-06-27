import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import AppHeader from '../src/components/AppHeader';
import { LanguageProvider } from '../src/context/LanguageContext';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </LanguageProvider>
  );
}

function AppNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AppHeader />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: '#f5f5f5',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Login', headerShown: false }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Create Account', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Event Details' }} />
        <Stack.Screen name="doctor/[id]" options={{ title: 'Doctor Profile' }} />
        <Stack.Screen name="booking/[eventId]/[doctorId]" options={{ title: 'Book Appointment' }} />
        <Stack.Screen name="appointment/[id]" options={{ title: 'Appointment Details' }} />
        <Stack.Screen name="qr-scanner" options={{ title: 'Scan QR Code' }} />
        <Stack.Screen name="create-event" options={{ title: 'Create Event' }} />
        <Stack.Screen name="manage-slots" options={{ title: 'Manage Slots' }} />
        <Stack.Screen name="assign-doctors/[eventId]" options={{ title: 'Assign Doctors' }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="news/[id]" options={{ title: 'News' }} />
      </Stack>
    </View>
  );
}
