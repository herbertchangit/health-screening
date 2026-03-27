import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { eventsAPI } from '../../src/services/api';
import { Event, DoctorProfile } from '../../src/types';
import { formatDate, formatTime } from '../../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const [eventRes, doctorsRes] = await Promise.all([
        eventsAPI.getById(id!),
        eventsAPI.getDoctors(id!),
      ]);
      setEvent(eventRes.data);
      setDoctors(doctorsRes.data);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDoctor = ({ item }: { item: DoctorProfile }) => (
    <TouchableOpacity
      style={styles.doctorCard}
      onPress={() => router.push(`/booking/${id}/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.doctorAvatar}>
        {item.profile_image ? (
          <Image
            source={{ uri: `data:image/png;base64,${item.profile_image}` }}
            style={styles.doctorImage}
          />
        ) : (
          <Text style={styles.avatarText}>
            {item.full_name?.charAt(0).toUpperCase() || 'D'}
          </Text>
        )}
      </View>
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>Dr. {item.full_name}</Text>
        <Text style={styles.doctorSpecialization}>{item.specialization}</Text>
        <Text style={styles.doctorQualification}>{item.qualification}</Text>
        <View style={styles.doctorMeta}>
          <Ionicons name="time-outline" size={14} color="#5f6368" />
          <Text style={styles.metaText}>{item.experience_years} years exp.</Text>
          {item.consultation_fee > 0 && (
            <>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>${item.consultation_fee}</Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#1a73e8" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#ea4335" />
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Event Banner */}
      {event.banner_image ? (
        <Image
          source={{ uri: `data:image/png;base64,${event.banner_image}` }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.bannerPlaceholder}>
          <Ionicons name="calendar" size={60} color="#93c5fd" />
        </View>
      )}

      <View style={styles.contentContainer}>
        {/* Event Info */}
        <View style={styles.eventInfoCard}>
          <Text style={styles.eventName}>{event.name}</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#1a73e8" />
            <Text style={styles.infoText}>{formatDate(event.event_date)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#1a73e8" />
            <Text style={styles.infoText}>
              {formatTime(event.start_time)} - {formatTime(event.end_time)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#1a73e8" />
            <View style={styles.locationInfo}>
              <Text style={styles.infoText}>{event.location}</Text>
              <Text style={styles.addressText}>{event.address}</Text>
            </View>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>About this event</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        </View>

        {/* Admin Actions */}
        {user?.role === 'admin' && (
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => router.push(`/assign-doctors/${id}`)}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.assignButtonText}>Assign Doctors</Text>
          </TouchableOpacity>
        )}

        {/* Doctors List */}
        <View style={styles.doctorsSection}>
          <Text style={styles.sectionTitle}>Available Doctors</Text>
          {doctors.length === 0 ? (
            <View style={styles.emptyDoctors}>
              <Ionicons name="medical-outline" size={40} color="#dadce0" />
              <Text style={styles.emptyText}>No doctors assigned yet</Text>
            </View>
          ) : (
            <FlatList
              data={doctors}
              renderItem={renderDoctor}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  bannerImage: {
    width: '100%',
    height: 200,
  },
  bannerPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 16,
  },
  eventInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#202124',
  },
  locationInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 2,
  },
  descriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#5f6368',
    lineHeight: 22,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a73e8',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  doctorsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 12,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  doctorSpecialization: {
    fontSize: 14,
    color: '#1a73e8',
    marginTop: 2,
  },
  doctorQualification: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 2,
  },
  doctorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#5f6368',
  },
  metaDot: {
    color: '#5f6368',
    marginHorizontal: 4,
  },
  emptyDoctors: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 12,
  },
});
