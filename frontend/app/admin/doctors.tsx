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
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { adminAPI } from '../../src/services/api';
import { DoctorProfile } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDoctorsScreen() {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [bio, setBio] = useState('');
  const [consultationFee, setConsultationFee] = useState('');

  const fetchDoctors = async () => {
    try {
      const response = await adminAPI.getDoctors();
      setDoctors(response.data);
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDoctors();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDoctors();
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setSpecialization('');
    setQualification('');
    setExperienceYears('');
    setBio('');
    setConsultationFee('');
    setSelectedDoctor(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddMode(true);
    setModalVisible(true);
  };

  const openEditModal = (doctor: DoctorProfile) => {
    setSelectedDoctor(doctor);
    setIsAddMode(false);
    setFullName(doctor.full_name);
    setSpecialization(doctor.specialization);
    setQualification(doctor.qualification);
    setExperienceYears(doctor.experience_years.toString());
    setBio(doctor.bio || '');
    setConsultationFee(doctor.consultation_fee.toString());
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (isAddMode) {
      // Validate required fields for new doctor
      if (!email.trim() || !password.trim() || !fullName.trim() || !specialization.trim() || !qualification.trim()) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
    } else {
      if (!specialization.trim() || !qualification.trim()) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (isAddMode) {
        await adminAPI.createDoctor({
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
          phone: phone.trim() || undefined,
          specialization: specialization.trim(),
          qualification: qualification.trim(),
          experience_years: parseInt(experienceYears) || 0,
          bio: bio.trim() || undefined,
          consultation_fee: parseFloat(consultationFee) || 0,
        });
        Alert.alert('Success', 'Doctor created successfully');
      } else {
        await adminAPI.updateDoctor(selectedDoctor!.id, {
          specialization: specialization.trim(),
          qualification: qualification.trim(),
          experience_years: parseInt(experienceYears) || 0,
          bio: bio.trim() || undefined,
          consultation_fee: parseFloat(consultationFee) || 0,
        });
        Alert.alert('Success', 'Doctor profile updated');
      }
      setModalVisible(false);
      resetForm();
      fetchDoctors();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save doctor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (doctor: DoctorProfile) => {
    Alert.alert(
      'Delete Doctor',
      `Are you sure you want to delete Dr. ${doctor.full_name}? This will remove their profile and all event assignments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.deleteDoctor(doctor.id);
              Alert.alert('Success', 'Doctor deleted');
              fetchDoctors();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const renderDoctor = ({ item }: { item: DoctorProfile }) => (
    <View style={styles.doctorCard}>
      <View style={styles.doctorHeader}>
        <View style={styles.doctorAvatar}>
          <Text style={styles.avatarText}>
            {item.full_name?.charAt(0).toUpperCase() || 'D'}
          </Text>
        </View>
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>Dr. {item.full_name}</Text>
          <Text style={styles.doctorEmail}>{item.email}</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Specialization</Text>
          <Text style={styles.detailValue}>{item.specialization}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Qualification</Text>
          <Text style={styles.detailValue}>{item.qualification}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Experience</Text>
          <Text style={styles.detailValue}>{item.experience_years} years</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Fee</Text>
          <Text style={styles.detailValue}>${item.consultation_fee}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
          <Ionicons name="create" size={18} color="#1a73e8" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
          <Ionicons name="trash" size={18} color="#ea4335" />
          <Text style={styles.deleteButtonText}>Delete</Text>
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
        <Text style={styles.headerTitle}>Manage Doctors</Text>
        <Text style={styles.headerSubtitle}>{doctors.length} registered doctors</Text>
      </View>

      {/* Add Doctor Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add New Doctor</Text>
      </TouchableOpacity>

      <FlatList
        data={doctors}
        renderItem={renderDoctor}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a73e8']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="medical-outline" size={60} color="#dadce0" />
            <Text style={styles.emptyText}>No doctors found</Text>
            <Text style={styles.emptySubtext}>Add your first doctor using the button above</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isAddMode ? 'Add New Doctor' : 'Edit Doctor Profile'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#5f6368" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              {isAddMode && (
                <>
                  <Text style={styles.sectionLabel}>Account Details</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email *</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="doctor@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#9aa0a6"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Password *</Text>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Minimum 6 characters"
                      secureTextEntry
                      placeholderTextColor="#9aa0a6"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Dr. John Smith"
                      placeholderTextColor="#9aa0a6"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+1234567890"
                      keyboardType="phone-pad"
                      placeholderTextColor="#9aa0a6"
                    />
                  </View>

                  <View style={styles.divider} />
                  <Text style={styles.sectionLabel}>Professional Details</Text>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Specialization *</Text>
                <TextInput
                  style={styles.input}
                  value={specialization}
                  onChangeText={setSpecialization}
                  placeholder="e.g., Cardiologist, Pediatrician"
                  placeholderTextColor="#9aa0a6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Qualification *</Text>
                <TextInput
                  style={styles.input}
                  value={qualification}
                  onChangeText={setQualification}
                  placeholder="e.g., MD, MBBS, PhD"
                  placeholderTextColor="#9aa0a6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Years of Experience</Text>
                <TextInput
                  style={styles.input}
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  placeholder="e.g., 10"
                  keyboardType="number-pad"
                  placeholderTextColor="#9aa0a6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Brief description about the doctor"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9aa0a6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Consultation Fee ($)</Text>
                <TextInput
                  style={styles.input}
                  value={consultationFee}
                  onChangeText={setConsultationFee}
                  placeholder="e.g., 100"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9aa0a6"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isAddMode ? 'Create Doctor' : 'Save Changes'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34a853',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  doctorCard: {
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
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  doctorEmail: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 2,
  },
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#5f6368',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#202124',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
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
  emptySubtext: {
    fontSize: 13,
    color: '#9aa0a6',
    marginTop: 4,
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
    maxHeight: '90%',
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
    maxHeight: 450,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a73e8',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8eaed',
    marginVertical: 16,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
