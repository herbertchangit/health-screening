import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { adminAPI } from '../../src/services/api';
import { Appointment } from '../../src/types';
import { formatDate, getStatusColor } from '../../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../src/context/LanguageContext';

export default function AdminAppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const { t, statusLabel } = useLanguage();

  const fetchAppointments = async () => {
    try {
      const response = await adminAPI.getAppointments();
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

  const normalizeDoctorName = (name?: string) =>
    (name || '').replace(/^dr\.?\s+/i, '').trim();

  const handleChangeStatus = (appointment: Appointment) => {
    const statuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    Alert.alert(
      'Change Status',
      `Select new status for this appointment`,
      [
        ...statuses.map(status => ({
          text: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
          onPress: async () => {
            if (status !== appointment.status) {
              try {
                await adminAPI.updateAppointmentStatus(appointment.id, status);
                Alert.alert('Success', 'Status updated');
                fetchAppointments();
              } catch (error: any) {
                Alert.alert('Error', error.response?.data?.detail || 'Failed to update');
              }
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDelete = (appointment: Appointment) => {
    Alert.alert(
      'Delete Appointment',
      `Are you sure you want to delete this appointment for ${appointment.patient_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.deleteAppointment(appointment.id);
              Alert.alert('Success', 'Appointment deleted');
              fetchAppointments();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const filteredAppointments = (filterStatus
    ? appointments.filter(a => a.status === filterStatus)
    : appointments
  ).sort((a, b) => {
    const doctorCompare = normalizeDoctorName(a.doctor_name).localeCompare(normalizeDoctorName(b.doctor_name));
    if (doctorCompare !== 0) return doctorCompare;
    return getAppointmentTimeValue(a) - getAppointmentTimeValue(b);
  });

  const statusCounts = {
    all: appointments.length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  const renderAppointment = ({ item }: { item: Appointment }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.patientSummaryRow}>
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
          <View style={styles.patientSummary}>
            <Text style={styles.patientName}>{item.patient_name}</Text>
            <Text style={styles.patientSubtext}>Patient</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {statusLabel(item.status)}
            </Text>
          </View>
          <Text style={styles.appointmentDate}>
            {item.event_date ? formatDate(item.event_date) : 'TBD'}
          </Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <View style={styles.patientMiniAvatar}>
            {item.patient_profile_image ? (
              <Image
                source={{ uri: `data:image/png;base64,${item.patient_profile_image}` }}
                style={styles.patientMiniAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person" size={14} color="#5f6368" />
            )}
          </View>
          <Text style={styles.detailText}>{item.patient_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.doctorMiniAvatar}>
            {item.doctor_profile_image ? (
              <Image
                source={{ uri: `data:image/png;base64,${item.doctor_profile_image}` }}
                style={styles.doctorMiniAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="medical" size={16} color="#5f6368" />
            )}
          </View>
          <Text style={styles.detailText}>Dr. {item.doctor_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#5f6368" />
          <Text style={styles.detailText}>{item.event_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#5f6368" />
          <Text style={styles.detailText}>{item.slot_time}</Text>
        </View>
        {item.reason && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text" size={16} color="#5f6368" />
            <Text style={styles.detailText} numberOfLines={2}>{item.reason}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.statusButton} onPress={() => handleChangeStatus(item)}>
          <Ionicons name="swap-horizontal" size={18} color="#1a73e8" />
          <Text style={styles.statusButtonText}>{t('common.status')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
          <Ionicons name="trash" size={18} color="#ea4335" />
          <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('nav.manageAppointments')}</Text>
        <Text style={styles.headerSubtitle}>{appointments.length} {t('appointments.totalAppointments')}</Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, !filterStatus && styles.filterChipActive]}
          onPress={() => setFilterStatus(null)}
        >
          <Text style={[styles.filterText, !filterStatus && styles.filterTextActive]}>
            {t('common.all')} ({statusCounts.all})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'confirmed' && styles.filterChipActive]}
          onPress={() => setFilterStatus('confirmed')}
        >
          <Text style={[styles.filterText, filterStatus === 'confirmed' && styles.filterTextActive]}>
            {t('common.confirmed')} ({statusCounts.confirmed})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'completed' && styles.filterChipActive]}
          onPress={() => setFilterStatus('completed')}
        >
          <Text style={[styles.filterText, filterStatus === 'completed' && styles.filterTextActive]}>
            {t('common.completed')} ({statusCounts.completed})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'cancelled' && styles.filterChipActive]}
          onPress={() => setFilterStatus('cancelled')}
        >
          <Text style={[styles.filterText, filterStatus === 'cancelled' && styles.filterTextActive]}>
            {t('common.cancelled')} ({statusCounts.cancelled})
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
            <Text style={styles.emptyText}>{t('appointments.noFound')}</Text>
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
  header: {
    backgroundColor: '#1a73e8',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f3f4',
  },
  filterChipActive: {
    backgroundColor: '#1a73e8',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5f6368',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  patientSummaryRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientSummary: {
    flex: 1,
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
  patientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#202124',
  },
  patientSubtext: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
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
  appointmentDate: {
    fontSize: 13,
    color: '#5f6368',
  },
  detailsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  patientMiniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  patientMiniAvatarImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  doctorMiniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  doctorMiniAvatarImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  detailText: {
    fontSize: 14,
    color: '#202124',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a73e8',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fce8e6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ea4335',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#5f6368',
    marginTop: 12,
  },
});
