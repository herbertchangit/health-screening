import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { eventsAPI, slotsAPI, appointmentsAPI, doctorsAPI } from '../../../src/services/api';
import { Event, TimeSlot, DoctorProfile } from '../../../src/types';
import { formatDate, formatTime } from '../../../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';

export default function BookingScreen() {
  const { eventId, doctorId } = useLocalSearchParams<{ eventId: string; doctorId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [reason, setReason] = useState('');
  const [bookingNotice, setBookingNotice] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error';
    redirectToAppointments?: boolean;
    refreshSlots?: boolean;
  } | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (eventId && doctorId) {
      fetchData();
    }
  }, [eventId, doctorId]);

  useEffect(() => {
    if (user) {
      setPatientName(user.full_name || '');
      setPatientPhone(user.phone || '');
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [eventRes, doctorRes, slotsRes] = await Promise.all([
        eventsAPI.getById(eventId!),
        doctorsAPI.getById(doctorId!),
        slotsAPI.getForDoctor(eventId!, doctorId!, true),
      ]);
      setEvent(eventRes.data);
      setDoctor(doctorRes.data);
      setSlots(slotsRes.data);
    } catch (error) {
      console.error('Failed to fetch booking data:', error);
      setBookingNotice({
        title: 'Error',
        message: 'Failed to load booking information',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeBookingNotice = async () => {
    const notice = bookingNotice;
    setBookingNotice(null);
    if (notice?.refreshSlots) {
      await fetchData();
    }
    if (notice?.redirectToAppointments) {
      router.replace('/appointments');
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot) {
      setBookingNotice({
        title: 'Select Time Slot',
        message: 'Please select a time slot before confirming your booking.',
        type: 'error',
      });
      return;
    }

    if (!patientName.trim()) {
      setBookingNotice({
        title: 'Patient Name Required',
        message: 'Please enter patient name before confirming your booking.',
        type: 'error',
      });
      return;
    }

    setIsBooking(true);
    try {
      await appointmentsAPI.create({
        doctor_id: doctorId,
        event_id: eventId,
        slot_id: selectedSlot.id,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim() || undefined,
        reason: reason.trim() || undefined,
      });

      setBookingNotice({
        title: 'Booking Confirmed!',
        message: 'Your appointment has been booked successfully. Tap OK to view your appointment list.',
        type: 'success',
        redirectToAppointments: true,
      });
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Failed to book appointment. Please try again.';
      const isConflict =
        detail.toLowerCase().includes('overlap') ||
        detail.toLowerCase().includes('already have an appointment') ||
        detail.toLowerCase().includes('already booked');

      setBookingNotice({
        title: isConflict ? 'Timeslot Conflict' : 'Booking Failed',
        message: detail,
        type: 'error',
        refreshSlots: isConflict,
      });
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Info */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorAvatar}>
            {doctor?.profile_image ? (
              <Image
                source={{ uri: `data:image/png;base64,${doctor.profile_image}` }}
                style={styles.doctorAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>
                {doctor?.full_name?.charAt(0).toUpperCase() || 'D'}
              </Text>
            )}
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>Dr. {doctor?.full_name}</Text>
            <Text style={styles.doctorSpecialization}>{doctor?.specialization}</Text>
            <Text style={styles.doctorQualification}>{doctor?.qualification}</Text>
          </View>
        </View>

        {/* Event Info */}
        <View style={styles.eventCard}>
          <Text style={styles.eventName}>{event?.name}</Text>
          <View style={styles.eventDetails}>
            <View style={styles.eventRow}>
              <Ionicons name="calendar-outline" size={16} color="#5f6368" />
              <Text style={styles.eventText}>{event ? formatDate(event.event_date) : ''}</Text>
            </View>
            <View style={styles.eventRow}>
              <Ionicons name="location-outline" size={16} color="#5f6368" />
              <Text style={styles.eventText}>{event?.location}</Text>
            </View>
          </View>
        </View>

        {/* Time Slots */}
        <View style={styles.slotsSection}>
          <Text style={styles.sectionTitle}>Select Time Slot</Text>
          {slots.length === 0 ? (
            <View style={styles.noSlots}>
              <Ionicons name="time-outline" size={40} color="#dadce0" />
              <Text style={styles.noSlotsText}>No available slots</Text>
              <Text style={styles.noSlotsSubtext}>Please check back later</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotButton,
                    selectedSlot?.id === slot.id && styles.slotButtonSelected,
                  ]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text
                    style={[
                      styles.slotTime,
                      selectedSlot?.id === slot.id && styles.slotTimeSelected,
                    ]}
                  >
                    {formatTime(slot.start_time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Patient Details */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Patient Details</Text>

          <View style={styles.patientSummaryRow}>
            <View style={styles.patientAvatar}>
              {user?.profile_image ? (
                <Image
                  source={{ uri: `data:image/png;base64,${user.profile_image}` }}
                  style={styles.patientAvatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={22} color="#1a73e8" />
              )}
            </View>
            <View style={styles.patientSummaryText}>
              <Text style={styles.patientSummaryName}>{patientName || user?.full_name || 'Patient'}</Text>
              <Text style={styles.patientSummaryLabel}>Patient information</Text>
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="Enter patient name"
              placeholderTextColor="#9aa0a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={patientPhone}
              onChangeText={setPatientPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              placeholderTextColor="#9aa0a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reason for Visit</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Briefly describe your concern"
              multiline
              numberOfLines={3}
              placeholderTextColor="#9aa0a6"
            />
          </View>
        </View>

        {/* Summary */}
        {selectedSlot && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Doctor</Text>
              <Text style={styles.summaryValue}>Dr. {doctor?.full_name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>{event ? formatDate(event.event_date) : ''}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>
                {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
              </Text>
            </View>
            {doctor?.consultation_fee ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fee</Text>
                <Text style={styles.summaryValue}>${doctor.consultation_fee}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Book Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.bookButton,
            (!selectedSlot || isBooking) && styles.bookButtonDisabled,
          ]}
          onPress={handleBooking}
          disabled={!selectedSlot || isBooking}
        >
          {isBooking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.bookButtonText}>Confirm Booking</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={bookingNotice !== null}
        animationType="fade"
        transparent
        onRequestClose={closeBookingNotice}
      >
        <View style={styles.noticeOverlay}>
          <View style={styles.noticeCard}>
            <View
              style={[
                styles.noticeIcon,
                bookingNotice?.type === 'success' ? styles.noticeIconSuccess : styles.noticeIconError,
              ]}
            >
              <Ionicons
                name={bookingNotice?.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={34}
                color="#fff"
              />
            </View>
            <Text style={styles.noticeTitle}>{bookingNotice?.title}</Text>
            <Text style={styles.noticeMessage}>{bookingNotice?.message}</Text>
            <TouchableOpacity
              style={[
                styles.noticeButton,
                bookingNotice?.type === 'success' ? styles.noticeButtonSuccess : styles.noticeButtonError,
              ]}
              onPress={closeBookingNotice}
            >
              <Text style={styles.noticeButtonText}>
                {bookingNotice?.redirectToAppointments ? 'View Appointments' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  doctorAvatarImage: {
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
    marginLeft: 12,
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
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
  eventCard: {
    backgroundColor: '#e8f0fe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a73e8',
    marginBottom: 8,
  },
  eventDetails: {
    gap: 6,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventText: {
    fontSize: 13,
    color: '#5f6368',
  },
  slotsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 12,
  },
  noSlots: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5f6368',
    marginTop: 12,
  },
  noSlotsSubtext: {
    fontSize: 13,
    color: '#9aa0a6',
    marginTop: 4,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8eaed',
    minWidth: 90,
    alignItems: 'center',
  },
  slotButtonSelected: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
  },
  slotTimeSelected: {
    color: '#ffffff',
  },
  formSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  patientSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  patientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  patientAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  patientSummaryText: {
    flex: 1,
  },
  patientSummaryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202124',
  },
  patientSummaryLabel: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 2,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e8f0fe',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#5f6368',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8eaed',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  noticeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noticeCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  noticeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noticeIconSuccess: {
    backgroundColor: '#34a853',
  },
  noticeIconError: {
    backgroundColor: '#ea4335',
  },
  noticeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
    textAlign: 'center',
    marginBottom: 8,
  },
  noticeMessage: {
    fontSize: 15,
    color: '#5f6368',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 22,
  },
  noticeButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  noticeButtonSuccess: {
    backgroundColor: '#34a853',
  },
  noticeButtonError: {
    backgroundColor: '#1a73e8',
  },
  noticeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
