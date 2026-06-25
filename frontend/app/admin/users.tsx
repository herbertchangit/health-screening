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
import { User } from '../../src/types';
import { getRoleLabel } from '../../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [isActive, setIsActive] = useState(true);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const resetForm = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('patient');
    setIsActive(true);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFullName(user.full_name);
    setEmail(user.email);
    setPhone(user.phone || '');
    setPassword('');
    setRole(user.role);
    setIsActive(user.is_active);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Error', 'Full name and email are required');
      return;
    }
    if (!editingUser && password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (editingUser && password && password.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    const payload: any = {
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      is_active: isActive,
    };
    if (password) payload.password = password;

    setIsSaving(true);
    try {
      if (editingUser) {
        await adminAPI.updateUser(editingUser.id, payload);
        Alert.alert('Success', 'User updated');
      } else {
        await adminAPI.createUser(payload);
        Alert.alert('Success', 'User created');
      }
      setModalVisible(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await adminAPI.updateUserStatus(user.id, !user.is_active);
      Alert.alert('Success', `User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleDelete = (user: User) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.full_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.deleteUser(user.id);
              Alert.alert('Success', 'User deleted');
              fetchUsers();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return '#ea4335';
      case 'doctor': return '#1a73e8';
      default: return '#34a853';
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          {item.profile_image ? (
            <Image
              source={{ uri: `data:image/png;base64,${item.profile_image}` }}
              style={styles.userAvatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarText}>
              {item.full_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.full_name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
        </View>
        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleBadgeColor(item.role) }]}>
            {getRoleLabel(item.role)}
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#e6f4ea' : '#fce8e6' }]}>
          <View style={[styles.statusDot, { backgroundColor: item.is_active ? '#34a853' : '#ea4335' }]} />
          <Text style={[styles.statusText, { color: item.is_active ? '#34a853' : '#ea4335' }]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
          <Ionicons name="create" size={18} color="#1a73e8" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleStatus(item)}>
          <Ionicons name={item.is_active ? 'pause' : 'play'} size={18} color="#f9ab00" />
          <Text style={[styles.actionText, { color: '#f9ab00' }]}>
            {item.is_active ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
          <Ionicons name="trash" size={18} color="#ea4335" />
          <Text style={[styles.actionText, { color: '#ea4335' }]}>Delete</Text>
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
        <Text style={styles.headerTitle}>Manage Users</Text>
        <Text style={styles.headerSubtitle}>{users.length} total users</Text>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
        <Ionicons name="person-add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Create User</Text>
      </TouchableOpacity>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a73e8']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#dadce0" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingUser ? 'Edit User' : 'Create User'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#5f6368" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full name"
                placeholderTextColor="#9aa0a6"
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="user@example.com"
                placeholderTextColor="#9aa0a6"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                placeholderTextColor="#9aa0a6"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>
                {editingUser ? 'New Password (optional)' : 'Password *'}
              </Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={editingUser ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                placeholderTextColor="#9aa0a6"
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.roleSelector}>
                {(['patient', 'doctor', 'admin'] as const).map((roleOption) => (
                  <TouchableOpacity
                    key={roleOption}
                    style={[styles.roleOption, role === roleOption && styles.roleOptionSelected]}
                    onPress={() => setRole(roleOption)}
                  >
                    <Text style={[styles.roleOptionText, role === roleOption && styles.roleOptionTextSelected]}>
                      {getRoleLabel(roleOption)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Status</Text>
              <TouchableOpacity
                style={[styles.statusSelector, { backgroundColor: isActive ? '#e6f4ea' : '#fce8e6' }]}
                onPress={() => setIsActive(!isActive)}
              >
                <Ionicons
                  name={isActive ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={isActive ? '#34a853' : '#ea4335'}
                />
                <Text style={{ color: isActive ? '#34a853' : '#ea4335', fontWeight: '600' }}>
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
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
                  <Text style={styles.saveButtonText}>{editingUser ? 'Save Changes' : 'Create User'}</Text>
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
    gap: 8,
    backgroundColor: '#34a853',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
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
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  userEmail: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#9aa0a6',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a73e8',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e8eaed',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 15,
    color: '#202124',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dadce0',
    backgroundColor: '#fff',
  },
  roleOptionSelected: {
    borderColor: '#1a73e8',
    backgroundColor: '#e8f0fe',
  },
  roleOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5f6368',
  },
  roleOptionTextSelected: {
    color: '#1a73e8',
  },
  statusSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f3f4',
  },
  cancelButtonText: {
    color: '#5f6368',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1a73e8',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
