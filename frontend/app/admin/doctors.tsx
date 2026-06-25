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
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { adminAPI } from '../../src/services/api';
import { DoctorDutySlot, DoctorProfile } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MAX_DOCTOR_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

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
  const [profileImage, setProfileImage] = useState('');
  const [profileImageSize, setProfileImageSize] = useState('');
  const [dutySlots, setDutySlots] = useState<DoctorDutySlot[]>([]);
  const [generatorDay, setGeneratorDay] = useState('Monday');
  const [generatorStartTime, setGeneratorStartTime] = useState('09:00');
  const [generatorEndTime, setGeneratorEndTime] = useState('17:00');
  const [generatorInterval, setGeneratorInterval] = useState('15');

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
    setProfileImage('');
    setProfileImageSize('');
    setDutySlots([]);
    setGeneratorDay('Monday');
    setGeneratorStartTime('09:00');
    setGeneratorEndTime('17:00');
    setGeneratorInterval('15');
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
    setProfileImage(doctor.profile_image || '');
    setProfileImageSize(doctor.profile_image ? 'Existing uploaded photo' : '');
    setDutySlots(doctor.duty_slots || []);
    setGeneratorDay('Monday');
    setGeneratorStartTime('09:00');
    setGeneratorEndTime('17:00');
    setGeneratorInterval('15');
    setModalVisible(true);
  };

  const timeToMinutes = (time: string) => {
    const [hourValue, minuteValue] = time.split(':');
    const hours = Number(hourValue);
    const minutes = Number(minuteValue);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const minutesToTime = (totalMinutes: number) =>
    `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60)
      .toString()
      .padStart(2, '0')}`;

  const generateDutySlots = () => {
    const startMinutes = timeToMinutes(generatorStartTime);
    const endMinutes = timeToMinutes(generatorEndTime);
    const interval = Number(generatorInterval);

    if (startMinutes === null || endMinutes === null) {
      Alert.alert('Error', 'Please enter start and end time in HH:MM format');
      return;
    }
    if (!Number.isFinite(interval) || interval <= 0) {
      Alert.alert('Error', 'Interval must be greater than 0 minutes');
      return;
    }
    if (endMinutes <= startMinutes) {
      Alert.alert('Error', 'End time must be later than start time');
      return;
    }

    const generatedSlots: DoctorDutySlot[] = [];
    let currentMinutes = startMinutes;

    while (currentMinutes + interval <= endMinutes) {
      generatedSlots.push({
        day_of_week: generatorDay,
        start_time: minutesToTime(currentMinutes),
        end_time: minutesToTime(currentMinutes + interval),
        slot_duration_minutes: interval,
      });
      currentMinutes += interval;
    }

    if (generatedSlots.length === 0) {
      Alert.alert('Error', 'The selected range is shorter than the interval');
      return;
    }

    setDutySlots((current) => [
      ...current.filter((slot) => slot.day_of_week !== generatorDay),
      ...generatedSlots,
    ]);
  };

  const updateDutySlot = (index: number, updates: Partial<DoctorDutySlot>) => {
    setDutySlots((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...updates } : slot))
    );
  };

  const removeDutySlot = (index: number) => {
    setDutySlots((current) => current.filter((_, slotIndex) => slotIndex !== index));
  };

  const normalizeDutySlots = () =>
    dutySlots
      .filter((slot) => slot.day_of_week && slot.start_time && slot.end_time)
      .map((slot) => ({
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_duration_minutes: Number(slot.slot_duration_minutes) || 15,
      }));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handlePickDoctorPhoto = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Upload Photo', 'Photo upload is available in the web app.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      if (file.size > MAX_DOCTOR_PHOTO_SIZE_BYTES) {
        Alert.alert('Photo Too Large', 'Please upload a doctor photo smaller than 2 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        setProfileImage(base64);
        setProfileImageSize(`${file.name} (${formatFileSize(file.size)})`);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleRemoveDoctorPhoto = () => {
    setProfileImage('');
    setProfileImageSize('');
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
          profile_image: profileImage || undefined,
          consultation_fee: parseFloat(consultationFee) || 0,
          duty_slots: normalizeDutySlots(),
        });
        Alert.alert('Success', 'Doctor created successfully');
      } else {
        await adminAPI.updateDoctor(selectedDoctor!.id, {
          specialization: specialization.trim(),
          qualification: qualification.trim(),
          experience_years: parseInt(experienceYears) || 0,
          bio: bio.trim() || undefined,
          profile_image: profileImage || undefined,
          consultation_fee: parseFloat(consultationFee) || 0,
          duty_slots: normalizeDutySlots(),
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

      <View style={styles.dutySummary}>
        <View style={styles.dutySummaryHeader}>
          <Ionicons name="time-outline" size={16} color="#1a73e8" />
          <Text style={styles.dutySummaryTitle}>On-duty time slots</Text>
        </View>
        {item.duty_slots && item.duty_slots.length > 0 ? (
          item.duty_slots.map((slot, index) => (
            <Text key={`${slot.day_of_week}-${slot.start_time}-${index}`} style={styles.dutySummaryText}>
              {slot.day_of_week}: {slot.start_time} - {slot.end_time} ({slot.slot_duration_minutes} min)
            </Text>
          ))
        ) : (
          <Text style={styles.dutyEmptyText}>No duty slots configured</Text>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.dutyButton} onPress={() => openEditModal(item)}>
          <Ionicons name="calendar" size={18} color="#188038" />
          <Text style={styles.dutyButtonText}>Duty Slots</Text>
        </TouchableOpacity>
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

              <View style={styles.photoUploadSection}>
                <Text style={styles.inputLabel}>Doctor Photo</Text>
                <View style={styles.photoUploadRow}>
                  <View style={styles.photoPreview}>
                    {profileImage ? (
                      <Image
                        source={{ uri: `data:image/png;base64,${profileImage}` }}
                        style={styles.photoPreviewImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={28} color="#9aa0a6" />
                    )}
                  </View>
                  <View style={styles.photoUploadInfo}>
                    <Text style={styles.photoHelpText}>
                      Upload JPG, PNG, or WebP. Maximum size: 2 MB.
                    </Text>
                    {profileImageSize ? (
                      <Text style={styles.photoSizeText}>{profileImageSize}</Text>
                    ) : null}
                    <View style={styles.photoActions}>
                      <TouchableOpacity style={styles.uploadPhotoButton} onPress={handlePickDoctorPhoto}>
                        <Ionicons name="cloud-upload-outline" size={18} color="#1a73e8" />
                        <Text style={styles.uploadPhotoButtonText}>
                          {profileImage ? 'Change Photo' : 'Upload Photo'}
                        </Text>
                      </TouchableOpacity>
                      {profileImage ? (
                        <TouchableOpacity style={styles.removePhotoButton} onPress={handleRemoveDoctorPhoto}>
                          <Ionicons name="trash-outline" size={18} color="#ea4335" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>

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

              <View style={styles.divider} />
              <View style={styles.dutySectionHeader}>
                <View>
                  <Text style={styles.sectionLabel}>On-duty Available Times</Text>
                  <Text style={styles.dutyHint}>Enter a time range and interval, then generate slots automatically.</Text>
                </View>
              </View>

              <View style={styles.generatorCard}>
                <Text style={styles.generatorTitle}>Generate duty slots</Text>
                <Text style={styles.inputLabel}>Day</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.daySelector}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayChip,
                        generatorDay === day && styles.dayChipSelected,
                      ]}
                      onPress={() => setGeneratorDay(day)}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          generatorDay === day && styles.dayChipTextSelected,
                        ]}
                      >
                        {day.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.timeRow}>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.inputLabel}>Start Time</Text>
                    <TextInput
                      style={styles.input}
                      value={generatorStartTime}
                      onChangeText={setGeneratorStartTime}
                      placeholder="09:00"
                      placeholderTextColor="#9aa0a6"
                    />
                  </View>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.inputLabel}>End Time</Text>
                    <TextInput
                      style={styles.input}
                      value={generatorEndTime}
                      onChangeText={setGeneratorEndTime}
                      placeholder="17:00"
                      placeholderTextColor="#9aa0a6"
                    />
                  </View>
                  <View style={styles.durationInputGroup}>
                    <Text style={styles.inputLabel}>Interval</Text>
                    <TextInput
                      style={styles.input}
                      value={generatorInterval}
                      onChangeText={setGeneratorInterval}
                      placeholder="15"
                      keyboardType="number-pad"
                      placeholderTextColor="#9aa0a6"
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.generateSlotsButton} onPress={generateDutySlots}>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.generateSlotsButtonText}>Generate Slots</Text>
                </TouchableOpacity>
              </View>

              {dutySlots.length === 0 ? (
                <View style={styles.noDutySlotsBox}>
                  <Ionicons name="calendar-outline" size={24} color="#9aa0a6" />
                  <Text style={styles.noDutySlotsText}>No generated duty slots yet</Text>
                </View>
              ) : (
                dutySlots.map((slot, index) => (
                  <View key={`duty-slot-${index}`} style={styles.dutySlotCard}>
                    <View style={styles.dutySlotHeader}>
                      <Text style={styles.dutySlotTitle}>
                        {slot.day_of_week}: {slot.start_time} - {slot.end_time}
                      </Text>
                      <TouchableOpacity onPress={() => removeDutySlot(index)}>
                        <Ionicons name="trash-outline" size={20} color="#ea4335" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.timeRow}>
                      <View style={styles.timeInputGroup}>
                        <Text style={styles.inputLabel}>Start</Text>
                        <TextInput
                          style={styles.input}
                          value={slot.start_time}
                          onChangeText={(value) => updateDutySlot(index, { start_time: value })}
                          placeholder="09:00"
                          placeholderTextColor="#9aa0a6"
                        />
                      </View>
                      <View style={styles.timeInputGroup}>
                        <Text style={styles.inputLabel}>End</Text>
                        <TextInput
                          style={styles.input}
                          value={slot.end_time}
                          onChangeText={(value) => updateDutySlot(index, { end_time: value })}
                          placeholder="17:00"
                          placeholderTextColor="#9aa0a6"
                        />
                      </View>
                      <View style={styles.durationInputGroup}>
                        <Text style={styles.inputLabel}>Minutes</Text>
                        <TextInput
                          style={styles.input}
                          value={String(slot.slot_duration_minutes)}
                          onChangeText={(value) =>
                            updateDutySlot(index, { slot_duration_minutes: parseInt(value) || 15 })
                          }
                          placeholder="15"
                          keyboardType="number-pad"
                          placeholderTextColor="#9aa0a6"
                        />
                      </View>
                    </View>
                  </View>
                ))
              )}
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
  dutySummary: {
    backgroundColor: '#f1f8f4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ceead6',
  },
  dutySummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dutySummaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#202124',
  },
  dutySummaryText: {
    fontSize: 13,
    color: '#3c4043',
    marginTop: 3,
  },
  dutyEmptyText: {
    fontSize: 13,
    color: '#5f6368',
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 12,
  },
  dutyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  dutyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#188038',
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
  photoUploadSection: {
    marginBottom: 18,
  },
  photoUploadRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  photoPreview: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#eef2f7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreviewImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  photoUploadInfo: {
    flex: 1,
  },
  photoHelpText: {
    fontSize: 13,
    color: '#5f6368',
    lineHeight: 18,
  },
  photoSizeText: {
    fontSize: 12,
    color: '#188038',
    fontWeight: '600',
    marginTop: 6,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  uploadPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  uploadPhotoButtonText: {
    color: '#1a73e8',
    fontSize: 13,
    fontWeight: '600',
  },
  removePhotoButton: {
    backgroundColor: '#fce8e6',
    padding: 8,
    borderRadius: 8,
  },
  dutySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  dutyHint: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: -6,
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34a853',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addSlotButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  noDutySlotsBox: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e8eaed',
    marginBottom: 16,
  },
  noDutySlotsText: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 6,
  },
  generatorCard: {
    backgroundColor: '#e8f0fe',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#d2e3fc',
  },
  generatorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#174ea6',
    marginBottom: 10,
  },
  generateSlotsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a73e8',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 12,
  },
  generateSlotsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dutySlotCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  dutySlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dutySlotTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
  },
  daySelector: {
    marginBottom: 12,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8eaed',
    marginRight: 8,
  },
  dayChipSelected: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5f6368',
  },
  dayChipTextSelected: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeInputGroup: {
    flex: 1,
  },
  durationInputGroup: {
    width: 92,
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
