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
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { eventsAPI, slotsAPI } from '../../src/services/api';
import { Event, DoctorProfile, TimeSlot } from '../../src/types';
import { formatDate, formatTime } from '../../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [doctorStatus, setDoctorStatus] = useState<any>(null);
  const [mySlots, setMySlots] = useState<TimeSlot[]>([]);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreatingSlots, setIsCreatingSlots] = useState(false);
  
  // Slot creation form
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState('15');
  
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
      
      // If user is a doctor, check their status for this event
      if (user?.role === 'doctor') {
        try {
          const statusRes = await eventsAPI.getMyStatus(id!);
          setDoctorStatus(statusRes.data);
          
          // If doctor is assigned, fetch their slots
          if (statusRes.data.is_assigned && statusRes.data.doctor_id) {
            const slotsRes = await slotsAPI.getForDoctor(id!, statusRes.data.doctor_id);
            setMySlots(slotsRes.data);
          }
        } catch (error) {
          console.log('Could not fetch doctor status');
        }
      }
    } catch (error) {
      console.error('Failed to fetch event details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    setIsJoining(true);
    try {
      await eventsAPI.joinEvent(id!);
      Alert.alert('Success', 'You have joined this event! Now add your available time slots.');
      fetchEventDetails();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to join event');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateSlots = async () => {
    if (!doctorStatus?.doctor_id) {
      Alert.alert('Error', 'Please join the event first');
      return;
    }

    setIsCreatingSlots(true);
    try {
      await slotsAPI.createBulk({
        event_id: id!,
        start_time: slotStartTime,
        end_time: slotEndTime,
        slot_duration_minutes: parseInt(slotDuration) || 15,
      });
      Alert.alert('Success', 'Time slots created successfully!');
      setShowSlotModal(false);
      fetchEventDetails();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create slots');
    } finally {
      setIsCreatingSlots(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
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
              setMySlots(prev => prev.filter(s => s.id !== slotId));
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete slot');
            }
          },
        },
      ]
    );
  };

  const handleUnassignDoctor = (doctor: DoctorProfile) => {
    Alert.alert(
      'Remove Doctor',
      `Are you sure you want to remove Dr. ${doctor.full_name} from this event?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventsAPI.removeDoctor(id!, doctor.id);
              setDoctors(prev => prev.filter(d => d.id !== doctor.id));
              Alert.alert('Success', 'Doctor removed from event');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to remove doctor');
            }
          },
        },
      ]
    );
  };

  const renderDoctor = ({ item }: { item: DoctorProfile }) => (
    <TouchableOpacity
      style={styles.doctorCard}
      onPress={() => user?.role === 'patient' ? router.push(`/booking/${id}/${item.id}`) : null}
      activeOpacity={user?.role === 'patient' ? 0.7 : 1}
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
      {user?.role === 'patient' && (
        <Ionicons name="chevron-forward" size={24} color="#1a73e8" />
      )}
      {user?.role === 'admin' && (
        <TouchableOpacity 
          style={styles.unassignButton}
          onPress={() => handleUnassignDoctor(item)}
        >
          <Ionicons name="person-remove" size={18} color="#ea4335" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderMySlot = ({ item }: { item: TimeSlot }) => (
    <View style={[styles.slotItem, item.is_booked && styles.slotItemBooked]}>
      <View style={styles.slotInfo}>
        <Text style={styles.slotTime}>
          {formatTime(item.start_time)} - {formatTime(item.end_time)}
        </Text>
        {item.is_booked && (
          <View style={styles.bookedBadge}>
            <Text style={styles.bookedText}>Booked</Text>
          </View>
        )}
      </View>
      {!item.is_booked && (
        <TouchableOpacity onPress={() => handleDeleteSlot(item.id)}>
          <Ionicons name="trash-outline" size={20} color="#ea4335" />
        </TouchableOpacity>
      )}
    </View>
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

  const isDoctor = user?.role === 'doctor';
  const hasProfile = doctorStatus?.has_profile;
  const isAssigned = doctorStatus?.is_assigned;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Event Banner */}
      {event.banner_image ? (
        <Image
          source={{ uri: `data:image/png;base64,${event.banner_image}` }}
          style={styles.bannerImage}
          resizeMode="contain"
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
              {(event.maps_url || event.waze_url) && (
                <View style={styles.navButtonsRow}>
                  {event.maps_url ? (
                    <TouchableOpacity
                      style={styles.navButton}
                      onPress={() => Linking.openURL(event.maps_url!)}
                    >
                      <Ionicons name="map" size={16} color="#1a73e8" />
                      <Text style={styles.navButtonText}>Google Maps</Text>
                    </TouchableOpacity>
                  ) : null}
                  {event.waze_url ? (
                    <TouchableOpacity
                      style={[styles.navButton, styles.wazeButton]}
                      onPress={() => Linking.openURL(event.waze_url!)}
                    >
                      <Ionicons name="navigate" size={16} color="#33ccff" />
                      <Text style={[styles.navButtonText, styles.wazeButtonText]}>Waze</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>About this event</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        </View>

        {/* Doctor Actions - Join Event & Add Slots */}
        {isDoctor && (
          <View style={styles.doctorActionsCard}>
            <Text style={styles.sectionTitle}>Your Participation</Text>
            
            {!hasProfile ? (
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={24} color="#f9ab00" />
                <Text style={styles.warningText}>
                  Please complete your doctor profile first to join events.
                </Text>
                <TouchableOpacity 
                  style={styles.profileButton}
                  onPress={() => router.push('/(tabs)/profile')}
                >
                  <Text style={styles.profileButtonText}>Go to Profile</Text>
                </TouchableOpacity>
              </View>
            ) : !isAssigned ? (
              <View style={styles.joinSection}>
                <Text style={styles.joinText}>
                  Join this event to offer consultations to patients.
                </Text>
                <TouchableOpacity
                  style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
                  onPress={handleJoinEvent}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={20} color="#fff" />
                      <Text style={styles.joinButtonText}>Join This Event</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.slotsSection}>
                <View style={styles.slotsSummary}>
                  <Ionicons name="checkmark-circle" size={24} color="#34a853" />
                  <Text style={styles.joinedText}>You're participating in this event</Text>
                </View>
                
                <View style={styles.slotsHeader}>
                  <Text style={styles.slotsTitle}>
                    Your Time Slots ({mySlots.length})
                  </Text>
                  <TouchableOpacity
                    style={styles.addSlotButton}
                    onPress={() => setShowSlotModal(true)}
                  >
                    <Ionicons name="add" size={18} color="#1a73e8" />
                    <Text style={styles.addSlotButtonText}>Add Slots</Text>
                  </TouchableOpacity>
                </View>

                {mySlots.length > 0 ? (
                  <FlatList
                    data={mySlots}
                    renderItem={renderMySlot}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.noSlots}>
                    <Ionicons name="time-outline" size={32} color="#dadce0" />
                    <Text style={styles.noSlotsText}>No slots created yet</Text>
                    <Text style={styles.noSlotsSubtext}>Add your available time slots</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

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
          <Text style={styles.sectionTitle}>Available Doctors ({doctors.length})</Text>
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

      {/* Slot Creation Modal */}
      <Modal
        visible={showSlotModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSlotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Time Slots</Text>
              <TouchableOpacity onPress={() => setShowSlotModal(false)}>
                <Ionicons name="close" size={24} color="#5f6368" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Create your available consultation slots for this event. Patients will be able to book these times.
              </Text>

              <View style={styles.timeRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Start Time</Text>
                  <TextInput
                    style={styles.input}
                    value={slotStartTime}
                    onChangeText={setSlotStartTime}
                    placeholder="09:00"
                    placeholderTextColor="#9aa0a6"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>End Time</Text>
                  <TextInput
                    style={styles.input}
                    value={slotEndTime}
                    onChangeText={setSlotEndTime}
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

              <View style={styles.slotPreview}>
                <Ionicons name="information-circle" size={18} color="#1a73e8" />
                <Text style={styles.slotPreviewText}>
                  This will create {Math.floor(
                    ((parseInt(slotEndTime.split(':')[0]) * 60 + parseInt(slotEndTime.split(':')[1] || '0')) -
                    (parseInt(slotStartTime.split(':')[0]) * 60 + parseInt(slotStartTime.split(':')[1] || '0'))) / 
                    (parseInt(slotDuration) || 15)
                  )} slots of {slotDuration} minutes each
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSlotModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, isCreatingSlots && styles.createButtonDisabled]}
                onPress={handleCreateSlots}
                disabled={isCreatingSlots}
              >
                {isCreatingSlots ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Create Slots</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    height: undefined,
    aspectRatio: 537 / 748,
    backgroundColor: '#e8f0fe',
  },
  bannerPlaceholder: {
    width: '100%',
    height: undefined,
    aspectRatio: 537 / 748,
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
  navButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a73e8',
  },
  wazeButton: {
    backgroundColor: '#e0f7fa',
  },
  wazeButtonText: {
    color: '#00acc1',
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
  doctorActionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 12,
  },
  warningBox: {
    backgroundColor: '#fef7e0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#5f6368',
    textAlign: 'center',
    marginVertical: 8,
  },
  profileButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  profileButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  joinSection: {
    alignItems: 'center',
  },
  joinText: {
    fontSize: 14,
    color: '#5f6368',
    textAlign: 'center',
    marginBottom: 16,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34a853',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  slotsSection: {
    marginTop: 8,
  },
  slotsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  joinedText: {
    fontSize: 14,
    color: '#34a853',
    fontWeight: '500',
  },
  slotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addSlotButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a73e8',
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  slotItemBooked: {
    backgroundColor: '#fef7e0',
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
  },
  bookedBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bookedText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#f9ab00',
  },
  noSlots: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noSlotsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5f6368',
    marginTop: 8,
  },
  noSlotsSubtext: {
    fontSize: 12,
    color: '#9aa0a6',
    marginTop: 4,
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
  unassignButton: {
    padding: 10,
    backgroundColor: '#fce8e6',
    borderRadius: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#5f6368',
    marginBottom: 20,
    lineHeight: 20,
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
    paddingVertical: 12,
    fontSize: 15,
    color: '#202124',
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  slotPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  slotPreviewText: {
    fontSize: 13,
    color: '#1a73e8',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f3f4',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5f6368',
  },
  createButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
