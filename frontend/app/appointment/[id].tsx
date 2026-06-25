import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { appointmentsAPI } from '../../src/services/api';
import { Appointment } from '../../src/types';
import { formatDate, formatTime, getStatusColor } from '../../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';

export default function AppointmentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchAppointment();
    }
  }, [id]);

  const fetchAppointment = async () => {
    try {
      const response = await appointmentsAPI.getById(id!);
      setAppointment(response.data);
    } catch (error) {
      console.error('Failed to fetch appointment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await appointmentsAPI.cancel(id!);
              Alert.alert('Success', 'Appointment cancelled');
              fetchAppointment();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to cancel');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleComplete = async () => {
    try {
      await appointmentsAPI.complete(id!);
      Alert.alert('Success', 'Appointment marked as completed');
      fetchAppointment();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to complete');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#ea4335" />
        <Text style={styles.errorText}>Appointment not found</Text>
      </View>
    );
  }

  const canCancel = appointment.status === 'confirmed' || appointment.status === 'pending';
  const canComplete = user?.role === 'doctor' && appointment.status === 'confirmed';
  const isDoctor = user?.role === 'doctor';

  const patientInformationCard = (
    <View style={styles.detailsCard}>
      <Text style={styles.sectionTitle}>Patient Information</Text>

      <View style={styles.detailRow}>
        <View style={[styles.detailIcon, styles.patientDetailPhotoHolder]}>
          {appointment.patient_profile_image ? (
            <Image
              source={{ uri: `data:image/png;base64,${appointment.patient_profile_image}` }}
              style={styles.patientDetailPhoto}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={20} color="#1a73e8" />
          )}
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Name</Text>
          <Text style={styles.detailValue}>{appointment.patient_name}</Text>
        </View>
      </View>

      {appointment.patient_phone && (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="call" size={20} color="#1a73e8" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{appointment.patient_phone}</Text>
          </View>
        </View>
      )}

      {appointment.reason && (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="document-text" size={20} color="#1a73e8" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Reason for Visit</Text>
            <Text style={styles.detailValue}>{appointment.reason}</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Status Badge */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
          <Ionicons
            name={appointment.status === 'confirmed' ? 'checkmark-circle' : 'time'}
            size={18}
            color={getStatusColor(appointment.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* QR Code */}
      {appointment.qr_code && appointment.status !== 'cancelled' && !isDoctor && (
        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Your Appointment QR Code</Text>
          <View style={styles.qrContainer}>
            <Image
              source={{ uri: `data:image/png;base64,${appointment.qr_code}` }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.qrHint}>Show this QR code to the doctor at your appointment</Text>
        </View>
      )}

      {isDoctor && patientInformationCard}

      {/* Appointment Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Appointment Details</Text>
        
        <View style={styles.detailRow}>
          <View style={[styles.detailIcon, styles.doctorDetailPhotoHolder]}>
            {appointment.doctor_profile_image ? (
              <Image
                source={{ uri: `data:image/png;base64,${appointment.doctor_profile_image}` }}
                style={styles.doctorDetailPhoto}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="medical" size={20} color="#1a73e8" />
            )}
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Doctor</Text>
            <Text style={styles.detailValue}>Dr. {appointment.doctor_name}</Text>
            <Text style={styles.detailSubvalue}>{appointment.doctor_specialization}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="calendar" size={20} color="#1a73e8" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {appointment.event_date ? formatDate(appointment.event_date) : 'TBD'}
            </Text>
            <Text style={styles.detailSubvalue}>{appointment.slot_time}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="location" size={20} color="#1a73e8" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Event & Location</Text>
            <Text style={styles.detailValue}>{appointment.event_name}</Text>
            <Text style={styles.detailSubvalue}>{appointment.event_location}</Text>
          </View>
        </View>
      </View>

      {!isDoctor && patientInformationCard}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {canComplete && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
          >
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.completeButtonText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}

        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator color="#ea4335" />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color="#ea4335" />
                <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  qrSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 16,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrHint: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 12,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doctorDetailPhotoHolder: {
    overflow: 'hidden',
  },
  doctorDetailPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  patientDetailPhotoHolder: {
    overflow: 'hidden',
  },
  patientDetailPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#5f6368',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#202124',
  },
  detailSubvalue: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 2,
  },
  actionsContainer: {
    gap: 12,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34a853',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fce8e6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ea4335',
  },
});
