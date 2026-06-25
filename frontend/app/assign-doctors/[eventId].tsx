import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { eventsAPI, doctorsAPI } from '../../src/services/api';
import { Event, DoctorProfile } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

export default function AssignDoctorsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [allDoctors, setAllDoctors] = useState<DoctorProfile[]>([]);
  const [assignedDoctors, setAssignedDoctors] = useState<DoctorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (eventId) {
        fetchData();
      }
    }, [eventId])
  );

  const fetchData = async () => {
    try {
      const [eventRes, allDoctorsRes, assignedRes] = await Promise.all([
        eventsAPI.getById(eventId!),
        doctorsAPI.getAll(),
        eventsAPI.getDoctors(eventId!),
      ]);
      setEvent(eventRes.data);
      setAllDoctors(allDoctorsRes.data);
      setAssignedDoctors(assignedRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isAssigned = (doctorId: string) => {
    return assignedDoctors.some((d) => d.id === doctorId);
  };

  const handleAssign = async (doctorId: string) => {
    setAssigningId(doctorId);
    try {
      const response = await eventsAPI.assignDoctor(eventId!, doctorId);
      const doctor = allDoctors.find((d) => d.id === doctorId);
      if (doctor) {
        setAssignedDoctors((prev) => [...prev, doctor]);
      }
      Alert.alert(
        'Success',
        `Doctor assigned to event. ${response.data?.created_slots || 0} appointment slot(s) generated automatically.`
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to assign doctor');
    } finally {
      setAssigningId(null);
    }
  };

  const handleRemove = async (doctorId: string) => {
    Alert.alert(
      'Remove Doctor',
      'Are you sure you want to remove this doctor from the event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setAssigningId(doctorId);
            try {
              await eventsAPI.removeDoctor(eventId!, doctorId);
              setAssignedDoctors((prev) => prev.filter((d) => d.id !== doctorId));
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to remove doctor');
            } finally {
              setAssigningId(null);
            }
          },
        },
      ]
    );
  };

  const renderDoctor = ({ item }: { item: DoctorProfile }) => {
    const assigned = isAssigned(item.id);
    const isProcessing = assigningId === item.id;

    return (
      <View style={styles.doctorCard}>
        <View style={styles.doctorAvatar}>
          {item.profile_image ? (
            <Image
              source={{ uri: `data:image/png;base64,${item.profile_image}` }}
              style={styles.doctorAvatarImage}
              resizeMode="cover"
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
          <View style={styles.dutyInfoBox}>
            <Ionicons name="time-outline" size={14} color="#188038" />
            <Text style={styles.dutyInfoText}>
              {(item.duty_slots || []).length} configured duty slot{(item.duty_slots || []).length === 1 ? '' : 's'}
            </Text>
          </View>
          {(item.duty_slots || []).length > 0 && (
            <Text style={styles.dutyPreview} numberOfLines={2}>
              {(item.duty_slots || [])
                .slice(0, 3)
                .map((slot) => `${slot.day_of_week} ${slot.start_time}-${slot.end_time}`)
                .join(', ')}
              {(item.duty_slots || []).length > 3 ? '…' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.actionButton,
            assigned ? styles.removeButton : styles.assignButton,
          ]}
          onPress={() => (assigned ? handleRemove(item.id) : handleAssign(item.id))}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={assigned ? '#ea4335' : '#1a73e8'} />
          ) : (
            <>
              <Ionicons
                name={assigned ? 'remove-circle' : 'add-circle'}
                size={18}
                color={assigned ? '#ea4335' : '#1a73e8'}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  assigned ? styles.removeButtonText : styles.assignButtonText,
                ]}
              >
                {assigned ? 'Remove' : 'Assign'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Event Info */}
      {event && (
        <View style={styles.eventCard}>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventInfo}>
            {assignedDoctors.length} doctor(s) assigned
          </Text>
        </View>
      )}

      {/* Doctors List */}
      <FlatList
        data={allDoctors}
        renderItem={renderDoctor}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="medical-outline" size={60} color="#dadce0" />
            <Text style={styles.emptyText}>No registered doctors</Text>
            <Text style={styles.emptySubtext}>Doctors need to register and create profiles first</Text>
          </View>
        }
      />
    </View>
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
  eventCard: {
    backgroundColor: '#1a73e8',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  eventInfo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  doctorAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
  },
  doctorSpecialization: {
    fontSize: 13,
    color: '#1a73e8',
    marginTop: 2,
  },
  doctorQualification: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 2,
  },
  dutyInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  dutyInfoText: {
    fontSize: 12,
    color: '#188038',
    fontWeight: '600',
  },
  dutyPreview: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  assignButton: {
    backgroundColor: '#e8f0fe',
  },
  removeButton: {
    backgroundColor: '#fce8e6',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  assignButtonText: {
    color: '#1a73e8',
  },
  removeButtonText: {
    color: '#ea4335',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5f6368',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9aa0a6',
    marginTop: 4,
    textAlign: 'center',
  },
});
