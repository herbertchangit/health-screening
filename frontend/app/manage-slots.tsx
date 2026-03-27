import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { eventsAPI, slotsAPI, doctorsAPI } from '../src/services/api';
import { Event, TimeSlot } from '../src/types';
import { formatDate, formatTime } from '../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';

export default function ManageSlotsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  
  // Form state
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState('15');

  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      // Get doctor profile
      const profileRes = await doctorsAPI.getMyProfile();
      setDoctorProfile(profileRes.data);

      // Get events where this doctor is assigned
      const eventsRes = await eventsAPI.getAll();
      setEvents(eventsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSlots = async (eventId: string) => {
    if (!doctorProfile) return;
    try {
      const response = await slotsAPI.getForDoctor(eventId, doctorProfile.id);
      setSlots(response.data);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    }
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    fetchSlots(event.id);
  };

  const handleCreateSlots = async () => {
    if (!selectedEvent || !doctorProfile) {
      Alert.alert('Error', 'Please select an event first');
      return;
    }

    setIsCreating(true);
    try {
      await slotsAPI.createBulk({
        event_id: selectedEvent.id,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: parseInt(slotDuration) || 15,
      });

      Alert.alert('Success', 'Time slots created successfully');
      fetchSlots(selectedEvent.id);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create slots');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSlot = (slotId: string) => {
    Alert.alert(
      'Delete Slot',
      'Are you sure you want to delete this slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await slotsAPI.delete(slotId);
              setSlots(prev => prev.filter(s => s.id !== slotId));
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete slot');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (!doctorProfile) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="person-outline" size={60} color="#dadce0" />
        <Text style={styles.emptyText}>Doctor Profile Required</Text>
        <Text style={styles.emptySubtext}>Please complete your doctor profile first</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Event Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Event</Text>
        {events.length === 0 ? (
          <View style={styles.noEvents}>
            <Text style={styles.noEventsText}>No events available</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventChip,
                  selectedEvent?.id === event.id && styles.eventChipSelected,
                ]}
                onPress={() => handleEventSelect(event)}
              >
                <Text
                  style={[
                    styles.eventChipText,
                    selectedEvent?.id === event.id && styles.eventChipTextSelected,
                  ]}
                >
                  {event.name}
                </Text>
                <Text
                  style={[
                    styles.eventChipDate,
                    selectedEvent?.id === event.id && styles.eventChipDateSelected,
                  ]}
                >
                  {formatDate(event.event_date)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {selectedEvent && (
        <>
          {/* Create Slots Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create Time Slots</Text>
            
            <View style={styles.timeRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor="#9aa0a6"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>End Time</Text>
                <TextInput
                  style={styles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="17:00"
                  placeholderTextColor="#9aa0a6"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Slot Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={slotDuration}
                onChangeText={setSlotDuration}
                placeholder="15"
                keyboardType="number-pad"
                placeholderTextColor="#9aa0a6"
              />
            </View>

            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleCreateSlots}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Generate Slots</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Existing Slots */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Your Slots ({slots.length})
            </Text>
            {slots.length === 0 ? (
              <View style={styles.noSlots}>
                <Ionicons name="time-outline" size={40} color="#dadce0" />
                <Text style={styles.noSlotsText}>No slots created yet</Text>
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot) => (
                  <View
                    key={slot.id}
                    style={[
                      styles.slotCard,
                      slot.is_booked && styles.slotCardBooked,
                    ]}
                  >
                    <View style={styles.slotInfo}>
                      <Text style={styles.slotTime}>
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </Text>
                      {slot.is_booked && (
                        <View style={styles.bookedBadge}>
                          <Text style={styles.bookedText}>Booked</Text>
                        </View>
                      )}
                    </View>
                    {!slot.is_booked && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteSlot(slot.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ea4335" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 24,
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 12,
  },
  noEvents: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noEventsText: {
    fontSize: 14,
    color: '#5f6368',
  },
  eventChip: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e8eaed',
    minWidth: 160,
  },
  eventChipSelected: {
    borderColor: '#1a73e8',
    backgroundColor: '#e8f0fe',
  },
  eventChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 4,
  },
  eventChipTextSelected: {
    color: '#1a73e8',
  },
  eventChipDate: {
    fontSize: 12,
    color: '#5f6368',
  },
  eventChipDateSelected: {
    color: '#1a73e8',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#202124',
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a73e8',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  noSlots: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 12,
  },
  slotsGrid: {
    gap: 10,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  slotCardBooked: {
    backgroundColor: '#f1f3f4',
  },
  slotInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
  },
  bookedBadge: {
    backgroundColor: '#fef7e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bookedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#f9ab00',
  },
  deleteButton: {
    padding: 8,
  },
});
