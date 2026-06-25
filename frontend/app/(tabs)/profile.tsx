import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { doctorsAPI, adminAPI, authAPI } from '../../src/services/api';
import { getRoleLabel } from '../../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';

const MAX_PATIENT_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

export default function ProfileScreen() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [patientIsEditing, setPatientIsEditing] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientPhoto, setPatientPhoto] = useState('');
  const [patientPhotoSize, setPatientPhotoSize] = useState('');
  
  // Doctor profile form states
  const [isEditing, setIsEditing] = useState(false);
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [bio, setBio] = useState('');
  const [consultationFee, setConsultationFee] = useState('');

  useEffect(() => {
    if (user?.role === 'doctor') {
      fetchDoctorProfile();
    } else if (user?.role === 'admin') {
      fetchAdminStats();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'patient') {
      setPatientName(user.full_name || '');
      setPatientPhone(user.phone || '');
      setPatientPhoto(user.profile_image || '');
      setPatientPhotoSize(user.profile_image ? 'Existing uploaded photo' : '');
    }
  }, [user]);

  const fetchDoctorProfile = async () => {
    try {
      const response = await doctorsAPI.getMyProfile();
      setDoctorProfile(response.data);
      setSpecialization(response.data.specialization);
      setQualification(response.data.qualification);
      setExperienceYears(response.data.experience_years.toString());
      setBio(response.data.bio || '');
      setConsultationFee(response.data.consultation_fee.toString());
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No profile exists, show create form
        setIsEditing(true);
      }
    }
  };

  const fetchAdminStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setAdminStats(response.data);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    }
  };

  const saveDoctorProfile = async () => {
    if (!specialization.trim() || !qualification.trim() || !experienceYears.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const profileData = {
        specialization: specialization.trim(),
        qualification: qualification.trim(),
        experience_years: parseInt(experienceYears) || 0,
        bio: bio.trim(),
        consultation_fee: parseFloat(consultationFee) || 0,
      };

      if (doctorProfile) {
        await doctorsAPI.updateProfile(profileData);
      } else {
        await doctorsAPI.createProfile(profileData);
      }
      
      await fetchDoctorProfile();
      setIsEditing(false);
      Alert.alert('Success', 'Profile saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handlePickPatientPhoto = () => {
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

      if (file.size > MAX_PATIENT_PHOTO_SIZE_BYTES) {
        Alert.alert('Photo Too Large', 'Please upload a patient photo smaller than 2 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        setPatientPhoto(base64);
        setPatientPhotoSize(`${file.name} (${formatFileSize(file.size)})`);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const resetPatientForm = () => {
    setPatientName(user?.full_name || '');
    setPatientPhone(user?.phone || '');
    setPatientPhoto(user?.profile_image || '');
    setPatientPhotoSize(user?.profile_image ? 'Existing uploaded photo' : '');
    setPatientIsEditing(false);
  };

  const savePatientProfile = async () => {
    if (!patientName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.updateMe({
        full_name: patientName.trim(),
        phone: patientPhone.trim(),
        profile_image: patientPhoto || null,
      });
      await refreshUser();
      setPatientIsEditing(false);
      Alert.alert('Success', 'Patient profile saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save patient profile');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePatientProfile = async () => {
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Delete your patient profile and appointment history? This cannot be undone.')
        : true;

    if (!confirmed) return;

    setIsLoading(true);
    try {
      await authAPI.deleteMe();
      await logout();
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete patient profile');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPatientProfile = () => (
    <View style={styles.profileSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Patient Profile</Text>
        {!patientIsEditing && (
          <TouchableOpacity onPress={() => setPatientIsEditing(true)}>
            <Ionicons name="create-outline" size={24} color="#1a73e8" />
          </TouchableOpacity>
        )}
      </View>

      {patientIsEditing ? (
        <>
          <View style={styles.photoUploadSection}>
            <Text style={styles.inputLabel}>Patient Photo</Text>
            <View style={styles.photoUploadRow}>
              <View style={styles.photoPreview}>
                {patientPhoto ? (
                  <Image
                    source={{ uri: `data:image/png;base64,${patientPhoto}` }}
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
                {patientPhotoSize ? (
                  <Text style={styles.photoSizeText}>{patientPhotoSize}</Text>
                ) : null}
                <View style={styles.photoActions}>
                  <TouchableOpacity style={styles.uploadPhotoButton} onPress={handlePickPatientPhoto}>
                    <Ionicons name="cloud-upload-outline" size={18} color="#1a73e8" />
                    <Text style={styles.uploadPhotoButtonText}>
                      {patientPhoto ? 'Change Photo' : 'Upload Photo'}
                    </Text>
                  </TouchableOpacity>
                  {patientPhoto ? (
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => {
                        setPatientPhoto('');
                        setPatientPhotoSize('');
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ea4335" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="Your full name"
              placeholderTextColor="#9aa0a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={patientPhone}
              onChangeText={setPatientPhone}
              placeholder="Your phone number"
              keyboardType="phone-pad"
              placeholderTextColor="#9aa0a6"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={resetPatientForm} disabled={isLoading}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.disabledButton]}
              onPress={savePatientProfile}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.profileInfo}>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Full Name</Text>
            <Text style={styles.profileValue}>{user?.full_name || '-'}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Email</Text>
            <Text style={styles.profileValue}>{user?.email || '-'}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Phone</Text>
            <Text style={styles.profileValue}>{user?.phone || '-'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.deleteProfileButton, isLoading && styles.disabledDangerButton]}
            onPress={deletePatientProfile}
            disabled={isLoading}
          >
            <Ionicons name="trash-outline" size={18} color="#d93025" />
            <Text style={styles.deleteProfileText}>Delete Patient Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderDoctorProfileForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>
        {doctorProfile ? 'Edit Profile' : 'Create Doctor Profile'}
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Specialization *</Text>
        <TextInput
          style={styles.input}
          value={specialization}
          onChangeText={setSpecialization}
          placeholder="e.g., Cardiologist, General Physician"
          placeholderTextColor="#9aa0a6"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Qualification *</Text>
        <TextInput
          style={styles.input}
          value={qualification}
          onChangeText={setQualification}
          placeholder="e.g., MBBS, MD"
          placeholderTextColor="#9aa0a6"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Years of Experience *</Text>
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
          placeholder="Tell patients about yourself"
          multiline
          numberOfLines={3}
          placeholderTextColor="#9aa0a6"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Consultation Fee</Text>
        <TextInput
          style={styles.input}
          value={consultationFee}
          onChangeText={setConsultationFee}
          placeholder="e.g., 500"
          keyboardType="decimal-pad"
          placeholderTextColor="#9aa0a6"
        />
      </View>

      <View style={styles.buttonRow}>
        {doctorProfile && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setIsEditing(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.disabledButton]}
          onPress={saveDoctorProfile}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDoctorProfile = () => (
    <View style={styles.profileSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Doctor Profile</Text>
        <TouchableOpacity onPress={() => setIsEditing(true)}>
          <Ionicons name="create-outline" size={24} color="#1a73e8" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.profileInfo}>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Specialization</Text>
          <Text style={styles.profileValue}>{doctorProfile.specialization}</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Qualification</Text>
          <Text style={styles.profileValue}>{doctorProfile.qualification}</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Experience</Text>
          <Text style={styles.profileValue}>{doctorProfile.experience_years} years</Text>
        </View>
        {doctorProfile.bio && (
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Bio</Text>
            <Text style={styles.profileValue}>{doctorProfile.bio}</Text>
          </View>
        )}
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Consultation Fee</Text>
          <Text style={styles.profileValue}>${doctorProfile.consultation_fee}</Text>
        </View>
      </View>
    </View>
  );

  const renderAdminStats = () => (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle}>Dashboard</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={28} color="#1a73e8" />
          <Text style={styles.statNumber}>{adminStats?.total_users || 0}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="medkit" size={28} color="#34a853" />
          <Text style={styles.statNumber}>{adminStats?.total_doctors || 0}</Text>
          <Text style={styles.statLabel}>Doctors</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={28} color="#ea4335" />
          <Text style={styles.statNumber}>{adminStats?.active_events || 0}</Text>
          <Text style={styles.statLabel}>Active Events</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="clipboard" size={28} color="#fbbc04" />
          <Text style={styles.statNumber}>{adminStats?.total_appointments || 0}</Text>
          <Text style={styles.statLabel}>Appointments</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          {user?.profile_image ? (
            <Image
              source={{ uri: `data:image/png;base64,${user.profile_image}` }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getRoleLabel(user?.role || '')}</Text>
          </View>
        </View>
      </View>

      {/* Admin Stats */}
      {user?.role === 'admin' && adminStats && renderAdminStats()}

      {/* Patient Profile */}
      {user?.role === 'patient' && renderPatientProfile()}

      {/* Doctor Profile */}
      {user?.role === 'doctor' && (
        isEditing || !doctorProfile ? renderDoctorProfileForm() : renderDoctorProfile()
      )}

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        {/* Admin Management Options */}
        {user?.role === 'admin' && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/admin/events')}
            >
              <Ionicons name="calendar" size={22} color="#ea4335" />
              <Text style={styles.actionButtonText}>Manage Events</Text>
              <Ionicons name="chevron-forward" size={22} color="#9aa0a6" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/admin/users')}
            >
              <Ionicons name="people" size={22} color="#1a73e8" />
              <Text style={styles.actionButtonText}>Manage Users</Text>
              <Ionicons name="chevron-forward" size={22} color="#9aa0a6" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/admin/doctors')}
            >
              <Ionicons name="medkit" size={22} color="#34a853" />
              <Text style={styles.actionButtonText}>Manage Doctors</Text>
              <Ionicons name="chevron-forward" size={22} color="#9aa0a6" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/admin/appointments')}
            >
              <Ionicons name="clipboard" size={22} color="#fbbc04" />
              <Text style={styles.actionButtonText}>Manage Appointments</Text>
              <Ionicons name="chevron-forward" size={22} color="#9aa0a6" />
            </TouchableOpacity>
          </>
        )}

        {user?.role === 'doctor' && doctorProfile && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/manage-slots')}
          >
            <Ionicons name="time" size={22} color="#5f6368" />
            <Text style={styles.actionButtonText}>Manage Time Slots</Text>
            <Ionicons name="chevron-forward" size={22} color="#9aa0a6" />
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
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#202124',
  },
  userEmail: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a73e8',
  },
  statsSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#202124',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 4,
  },
  profileSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: {
    gap: 12,
  },
  profileRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    paddingBottom: 12,
  },
  profileLabel: {
    fontSize: 12,
    color: '#5f6368',
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 15,
    color: '#202124',
  },
  formSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButton: {
    backgroundColor: '#93c5fd',
  },
  deleteProfileButton: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f4c7c3',
    backgroundColor: '#fce8e6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteProfileText: {
    color: '#d93025',
    fontWeight: '700',
    fontSize: 14,
  },
  disabledDangerButton: {
    opacity: 0.55,
  },
  actionsSection: {
    marginHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#202124',
  },
});
