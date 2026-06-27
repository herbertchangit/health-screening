import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { appointmentsAPI } from '../../src/services/api';
import { Appointment } from '../../src/types';
import { formatDate, formatTime, getStatusColor } from '../../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const router = useRouter();
  const { user } = useAuth();
  const { t, statusLabel } = useLanguage();

  const fetchAppointments = async () => {
    try {
      const response = await appointmentsAPI.getAll();
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const getAppointmentTimeValue = (appointment: Appointment) => {
    const dateValue = appointment.event_date ? new Date(appointment.event_date).getTime() : 0;
    const startTime = appointment.slot_time?.split(' - ')[0] || '00:00';
    const [hour = '0', minute = '0'] = startTime.split(':');
    return dateValue + (parseInt(hour, 10) || 0) * 60 * 60 * 1000 + (parseInt(minute, 10) || 0) * 60 * 1000;
  };

  const filteredAppointments = appointments
    .filter((apt) => {
      const isCompleted = apt.status === 'completed' || apt.status === 'cancelled';
      return activeTab === 'past' ? isCompleted : !isCompleted;
    })
    .sort((a, b) => getAppointmentTimeValue(a) - getAppointmentTimeValue(b));

  const renderAppointment = ({ item }: { item: Appointment }) => (
    <TouchableOpacity
      style={styles.appointmentCard}
      onPress={() => router.push(`/appointment/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.appointmentHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {statusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentInfo}>
        {user?.role === 'doctor' ? (
          <>
            <View style={styles.doctorSummaryRow}>
              <View style={styles.patientAvatar}>
                {item.patient_profile_image ? (
                  <Image
                    source={{ uri: `data:image/png;base64,${item.patient_profile_image}` }}
                    style={styles.patientAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={18} color="#1a73e8" />
                )}
              </View>
              <View style={styles.doctorSummaryText}>
                <Text style={styles.doctorName}>{item.patient_name || t('common.patient')}</Text>
                <Text style={styles.specialization}>{t('appointments.patientBookingInfo')}</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.doctorSummaryRow}>
              <View style={styles.doctorAvatar}>
                {item.doctor_profile_image ? (
                  <Image
                    source={{ uri: `data:image/png;base64,${item.doctor_profile_image}` }}
                    style={styles.doctorAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="medical" size={18} color="#1a73e8" />
                )}
              </View>
              <View style={styles.doctorSummaryText}>
                <Text style={styles.doctorName}>{item.doctor_name || t('common.doctor')}</Text>
                <Text style={styles.specialization}>{item.doctor_specialization}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.appointmentDetails}>
        {user?.role === 'doctor' && item.patient_phone ? (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color="#5f6368" />
            <Text style={styles.detailText}>{item.patient_phone}</Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color="#5f6368" />
          <Text style={styles.detailText}>
            {item.event_date ? formatDate(item.event_date) : 'TBD'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={14} color="#5f6368" />
          <Text style={styles.detailText}>{item.slot_time || 'TBD'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color="#5f6368" />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.event_name || 'Event'}
          </Text>
        </View>
        {user?.role === 'doctor' && item.reason ? (
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={14} color="#5f6368" />
            <Text style={styles.detailText} numberOfLines={2}>
              {item.reason}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.viewDetails}>{t('common.viewDetails')}</Text>
        <Ionicons name="chevron-forward" size={16} color="#1a73e8" />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Doctor-specific actions */}
      {user?.role === 'doctor' && (
        <View style={styles.doctorActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/qr-scanner')}
          >
            <Ionicons name="qr-code" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>{t('appointments.scanQr')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/manage-slots')}
          >
            <Ionicons name="time" size={20} color="#1a73e8" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>{t('appointments.manageSlots')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            {t('appointments.upcoming')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            {t('appointments.past')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a73e8']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={60} color="#dadce0" />
            <Text style={styles.emptyText}>
              {t('appointments.noAppointments')}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'upcoming'
                ? t('appointments.bookFromEvent')
                : t('appointments.noAppointments')}
            </Text>
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
  doctorActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a73e8',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: '#e8f0fe',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: '#1a73e8',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1a73e8',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5f6368',
  },
  tabTextActive: {
    color: '#1a73e8',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentInfo: {
    marginBottom: 12,
  },
  doctorSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  doctorSummaryText: {
    flex: 1,
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  doctorAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  patientAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  specialization: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 4,
  },
  appointmentDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#5f6368',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  viewDetails: {
    fontSize: 13,
    color: '#1a73e8',
    fontWeight: '500',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
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
    paddingHorizontal: 32,
  },
});
