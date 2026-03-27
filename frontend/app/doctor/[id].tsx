import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doctorsAPI } from '../../src/services/api';
import { DoctorProfile } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

export default function DoctorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (id) {
      fetchDoctor();
    }
  }, [id]);

  const fetchDoctor = async () => {
    try {
      const response = await doctorsAPI.getById(id!);
      setDoctor(response.data);
    } catch (error) {
      console.error('Failed to fetch doctor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#ea4335" />
        <Text style={styles.errorText}>Doctor not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Header */}
      <View style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          {doctor.profile_image ? (
            <Image
              source={{ uri: `data:image/png;base64,${doctor.profile_image}` }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>
              {doctor.full_name?.charAt(0).toUpperCase() || 'D'}
            </Text>
          )}
        </View>
        <Text style={styles.doctorName}>Dr. {doctor.full_name}</Text>
        <Text style={styles.specialization}>{doctor.specialization}</Text>
        <Text style={styles.qualification}>{doctor.qualification}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="briefcase" size={24} color="#1a73e8" />
          <Text style={styles.statValue}>{doctor.experience_years}+</Text>
          <Text style={styles.statLabel}>Years Exp.</Text>
        </View>
        {doctor.consultation_fee > 0 && (
          <View style={styles.statItem}>
            <Ionicons name="cash" size={24} color="#34a853" />
            <Text style={styles.statValue}>${doctor.consultation_fee}</Text>
            <Text style={styles.statLabel}>Fee</Text>
          </View>
        )}
      </View>

      {/* Bio */}
      {doctor.bio && (
        <View style={styles.bioCard}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{doctor.bio}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 18,
    color: '#5f6368',
    marginTop: 16,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  doctorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 16,
    color: '#1a73e8',
    marginBottom: 4,
  },
  qualification: {
    fontSize: 14,
    color: '#5f6368',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#202124',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 4,
  },
  bioCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    color: '#5f6368',
    lineHeight: 22,
  },
});
