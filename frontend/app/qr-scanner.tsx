import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { appointmentsAPI } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { getStatusColor } from '../src/utils/helpers';
import { useLanguage } from '../src/context/LanguageContext';

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedAppointment, setVerifiedAppointment] = useState<any>(null);
  const router = useRouter();
  const { t, statusLabel } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setVerifiedAppointment(null);
    }, [])
  );

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || isVerifying) return;
    
    setScanned(true);
    setIsVerifying(true);

    try {
      // Parse QR data
      const qrData = JSON.parse(data);
      const appointmentId = qrData.appointment_id;

      if (!appointmentId) {
        Alert.alert('Invalid QR Code', 'This QR code does not contain valid appointment data');
        setScanned(false);
        setIsVerifying(false);
        return;
      }

      // Verify with backend
      const response = await appointmentsAPI.verify(appointmentId);
      setVerifiedAppointment(response.data);
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.response?.data?.detail || 'Could not verify this appointment',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleComplete = async () => {
    if (!verifiedAppointment) return;

    try {
      await appointmentsAPI.complete(verifiedAppointment.appointment_id);
      Alert.alert('Success', 'Appointment marked as completed', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to complete appointment');
    }
  };

  const resetScan = () => {
    setScanned(false);
    setVerifiedAppointment(null);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={60} color="#5f6368" />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to scan appointment QR codes
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (verifiedAppointment) {
    return (
      <ScrollView style={styles.resultContainer} contentContainerStyle={styles.resultContent}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#34a853" />
        </View>
        <Text style={styles.successTitle}>Appointment Verified</Text>

        <View style={styles.appointmentCard}>
          <View style={styles.statusRow}>
            <Text style={styles.cardLabel}>{t('common.status')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(verifiedAppointment.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(verifiedAppointment.status) }]}>
                {statusLabel(verifiedAppointment.status)}
              </Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <View style={styles.patientPhotoHolder}>
              {verifiedAppointment.patient_profile_image ? (
                <Image
                  source={{ uri: `data:image/png;base64,${verifiedAppointment.patient_profile_image}` }}
                  style={styles.patientPhoto}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={20} color="#1a73e8" />
              )}
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>{t('common.patient')}</Text>
              <Text style={styles.cardValue}>{verifiedAppointment.patient_name}</Text>
            </View>
          </View>

          {verifiedAppointment.patient_phone && (
            <View style={styles.cardRow}>
              <Ionicons name="call" size={20} color="#1a73e8" />
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>{t('common.phone')}</Text>
                <Text style={styles.cardValue}>{verifiedAppointment.patient_phone}</Text>
              </View>
            </View>
          )}

          <View style={styles.cardRow}>
            <Ionicons name="calendar" size={20} color="#1a73e8" />
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>{t('common.event')}</Text>
              <Text style={styles.cardValue}>{verifiedAppointment.event_name}</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <Ionicons name="time" size={20} color="#1a73e8" />
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>{t('common.time')}</Text>
              <Text style={styles.cardValue}>{verifiedAppointment.slot_time}</Text>
            </View>
          </View>

          {verifiedAppointment.reason && (
            <View style={styles.cardRow}>
              <Ionicons name="document-text" size={20} color="#1a73e8" />
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>{t('common.reason')}</Text>
                <Text style={styles.cardValue}>{verifiedAppointment.reason}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          {verifiedAppointment.status === 'confirmed' && (
            <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.completeButtonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.scanAgainButton} onPress={resetScan}>
            <Ionicons name="scan" size={20} color="#1a73e8" />
            <Text style={styles.scanAgainButtonText}>{t('appointments.scanQr')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.scanText}>Position QR code within the frame</Text>
        </View>
      </CameraView>

      {isVerifying && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Verifying appointment...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#1a73e8',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#202124',
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: '#5f6368',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  resultContent: {
    padding: 20,
    alignItems: 'center',
  },
  successIcon: {
    marginVertical: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 24,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  patientPhotoHolder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  patientPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: '#5f6368',
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#202124',
    marginTop: 2,
  },
  actionButtons: {
    width: '100%',
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
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f0fe',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanAgainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a73e8',
  },
});
