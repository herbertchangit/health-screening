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
import { useFocusEffect, useRouter } from 'expo-router';
import { eventsAPI } from '../../src/services/api';
import { Event } from '../../src/types';
import { formatDate, formatTime } from '../../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AdminEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [wazeUrl, setWazeUrl] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [maxCapacity, setMaxCapacity] = useState('100');
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getAll(false); // Get all events including inactive
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const resetForm = () => {
    setFormError('');
    setName('');
    setDescription('');
    setLocation('');
    setAddress('');
    setMapsUrl('');
    setWazeUrl('');
    setEventDate(new Date());
    setStartTime('09:00');
    setEndTime('17:00');
    setMaxCapacity('100');
    setBannerImage(null);
    setIsActive(true);
    setSelectedEvent(null);
  };

  const openAddModal = () => {
    resetForm();
    setSuccessMessage('');
    setSubmissionId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setIsAddMode(true);
    setModalVisible(true);
  };

  const openEditModal = (event: Event) => {
    setFormError('');
    setSelectedEvent(event);
    setIsAddMode(false);
    setName(event.name);
    setDescription(event.description);
    setLocation(event.location);
    setAddress(event.address);
    setMapsUrl(event.maps_url || '');
    setWazeUrl(event.waze_url || '');
    setEventDate(new Date(event.event_date));
    setStartTime(event.start_time);
    setEndTime(event.end_time);
    setMaxCapacity(event.max_capacity.toString());
    setBannerImage(event.banner_image || null);
    setIsActive(event.is_active);
    setModalVisible(true);
  };

  const pickImageOnWeb = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const image = document.createElement('img');
        image.onload = () => {
          const maxSize = 1600;
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          if (!context) return;
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          setBannerImage(canvas.toDataURL('image/png', 0.85).split(',')[1]);
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      pickImageOnWeb();
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [537, 748],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setBannerImage(result.assets[0].base64);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [537, 748],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setBannerImage(result.assets[0].base64);
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === 'web') {
      pickImageOnWeb();
      return;
    }

    Alert.alert(
      'Add Event Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Remove Photo', onPress: () => setBannerImage(null), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    setFormError('');
    if (!name.trim() || !description.trim() || !location.trim() || !address.trim()) {
      setFormError('Please fill in all required fields.');
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      setFormError('Start time and end time are required.');
      return;
    }

    setIsSaving(true);
    try {
      const eventData = {
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        address: address.trim(),
        maps_url: mapsUrl.trim() || null,
        waze_url: wazeUrl.trim() || null,
        event_date: eventDate.toISOString(),
        start_time: startTime,
        end_time: endTime,
        max_capacity: parseInt(maxCapacity) || 100,
        banner_image: bannerImage,
        is_active: isActive,
        client_request_id: isAddMode ? submissionId : undefined,
      };

      if (isAddMode) {
        await eventsAPI.create(eventData);
        setSuccessMessage('Event created successfully.');
      } else {
        await eventsAPI.update(selectedEvent!.id, eventData);
        setSuccessMessage('Event updated successfully.');
      }
      setModalVisible(false);
      resetForm();
      await fetchEvents();
      if (Platform.OS !== 'web') {
        Alert.alert('Success', isAddMode ? 'Event created successfully' : 'Event updated successfully');
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to save event';
      setFormError(message);
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = async (event: Event) => {
    if (deletingEventId) return;

    setDeletingEventId(event.id);
    setSuccessMessage('');
    try {
      await eventsAPI.delete(event.id);
      setEvents((currentEvents) => currentEvents.filter((item) => item.id !== event.id));
      setSuccessMessage(`"${event.name}" was deleted.`);
      if (Platform.OS !== 'web') {
        Alert.alert('Success', 'Event deleted');
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to delete event';
      if (Platform.OS === 'web') {
        setSuccessMessage('');
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleDelete = (event: Event) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Delete "${event.name}"? This will also remove all doctor assignments and time slots.`
      );
      if (confirmed) {
        void deleteEvent(event);
      }
      return;
    }

    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.name}"? This will also remove all doctor assignments and time slots.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteEvent(event),
        },
      ]
    );
  };

  const toggleEventStatus = async (event: Event) => {
    try {
      await eventsAPI.update(event.id, { is_active: !event.is_active });
      fetchEvents();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
    }
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <View style={styles.eventCard}>
      <TouchableOpacity
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${item.name}`}
        onPress={() => router.push(`/event/${item.id}`)}
      >
      {/* Event Banner */}
      {item.banner_image ? (
        <Image
          source={{ uri: `data:image/png;base64,${item.banner_image}` }}
          style={styles.eventBanner}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.eventBannerPlaceholder}>
          <Ionicons name="image-outline" size={40} color="#dadce0" />
          <Text style={styles.placeholderText}>No image</Text>
        </View>
      )}

        <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventName} numberOfLines={2}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#e6f4ea' : '#fce8e6' }]}>
            <Text style={[styles.statusText, { color: item.is_active ? '#34a853' : '#ea4335' }]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color="#5f6368" />
            <Text style={styles.detailText}>{formatDate(item.event_date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color="#5f6368" />
            <Text style={styles.detailText}>
              {formatTime(item.start_time)} - {formatTime(item.end_time)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color="#5f6368" />
            <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={14} color="#5f6368" />
            <Text style={styles.detailText}>Capacity: {item.max_capacity}</Text>
          </View>
        </View>

        </View>
      </TouchableOpacity>

      <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.toggleButton} 
            onPress={() => toggleEventStatus(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.is_active ? 'Deactivate' : 'Activate'} ${item.name}`}
          >
            <Ionicons 
              name={item.is_active ? 'pause' : 'play'} 
              size={16} 
              color={item.is_active ? '#f9ab00' : '#34a853'} 
            />
            <Text style={[styles.toggleButtonText, { color: item.is_active ? '#f9ab00' : '#34a853' }]}>
              {item.is_active ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
          >
            <Ionicons name="create" size={16} color="#1a73e8" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
            disabled={deletingEventId === item.id}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
          >
            {deletingEventId === item.id ? (
              <ActivityIndicator size="small" color="#ea4335" />
            ) : (
              <Ionicons name="trash" size={16} color="#ea4335" />
            )}
            <Text style={styles.deleteButtonText}>
              {deletingEventId === item.id ? 'Deleting...' : 'Delete'}
            </Text>
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
        <Text style={styles.headerTitle}>Manage Events</Text>
        <Text style={styles.headerSubtitle}>{events.length} total events</Text>
      </View>

      {successMessage ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={20} color="#137333" />
          <Text style={styles.successText}>{successMessage}</Text>
          <TouchableOpacity onPress={() => setSuccessMessage('')}>
            <Ionicons name="close" size={18} color="#137333" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Add Event Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Create New Event</Text>
      </TouchableOpacity>

      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a73e8']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#dadce0" />
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptySubtext}>Create your first event using the button above</Text>
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
                {isAddMode ? 'Create New Event' : 'Edit Event'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#5f6368" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Photo Upload Section */}
              <View style={styles.imageSection}>
                <Text style={styles.inputLabel}>Event Banner</Text>
                <TouchableOpacity style={styles.imagePickerButton} onPress={showImageOptions}>
                  {bannerImage ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${bannerImage}` }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera" size={32} color="#5f6368" />
                      <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Event Name *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Community Health Camp"
                  placeholderTextColor="#9aa0a6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the event and its purpose"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9aa0a6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Venue Name *</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g., City Community Center"
                  placeholderTextColor="#9aa0a6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Address *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g., 123 Main St, City, State 12345"
                  multiline
                  numberOfLines={2}
                  placeholderTextColor="#9aa0a6"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Google Maps URL</Text>
                <TextInput
                  style={styles.input}
                  value={mapsUrl}
                  onChangeText={setMapsUrl}
                  placeholder="https://maps.google.com/..."
                  placeholderTextColor="#9aa0a6"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Waze URL</Text>
                <TextInput
                  style={styles.input}
                  value={wazeUrl}
                  onChangeText={setWazeUrl}
                  placeholder="https://waze.com/ul/..."
                  placeholderTextColor="#9aa0a6"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Event Date *</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.dateButton}>
                    <Ionicons name="calendar-outline" size={20} color="#1a73e8" />
                    {React.createElement('input', {
                      type: 'date',
                      value: `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`,
                      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                        const selected = event.target.value;
                        if (selected) setEventDate(new Date(`${selected}T00:00:00`));
                      },
                      style: {
                        flex: 1,
                        border: 0,
                        outline: 'none',
                        background: 'transparent',
                        color: '#202124',
                        fontSize: 15,
                        fontFamily: 'inherit',
                      },
                      'aria-label': 'Event date',
                    })}
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#1a73e8" />
                      <Text style={styles.dateButtonText}>{formatDisplayDate(eventDate)}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={eventDate}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                          setShowDatePicker(false);
                          if (date) setEventDate(date);
                        }}
                      />
                    )}
                  </>
                )}
              </View>

              <View style={styles.timeRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Start Time *</Text>
                  <TextInput
                    style={styles.input}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="09:00"
                    placeholderTextColor="#9aa0a6"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>End Time *</Text>
                  <TextInput
                    style={styles.input}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="17:00"
                    placeholderTextColor="#9aa0a6"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Max Capacity</Text>
                <TextInput
                  style={styles.input}
                  value={maxCapacity}
                  onChangeText={setMaxCapacity}
                  placeholder="100"
                  keyboardType="number-pad"
                  placeholderTextColor="#9aa0a6"
                />
              </View>

              {!isAddMode && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Event Status</Text>
                  <TouchableOpacity 
                    style={[styles.statusToggle, { backgroundColor: isActive ? '#e6f4ea' : '#fce8e6' }]}
                    onPress={() => setIsActive(!isActive)}
                  >
                    <Ionicons 
                      name={isActive ? 'checkmark-circle' : 'close-circle'} 
                      size={20} 
                      color={isActive ? '#34a853' : '#ea4335'} 
                    />
                    <Text style={[styles.statusToggleText, { color: isActive ? '#34a853' : '#ea4335' }]}>
                      {isActive ? 'Active - Visible to users' : 'Inactive - Hidden from users'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {formError ? (
                <View style={styles.formErrorBox}>
                  <Ionicons name="alert-circle" size={18} color="#c5221f" />
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}
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
                    {isAddMode ? 'Create Event' : 'Save Changes'}
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
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventBanner: {
    width: '100%',
    height: 140,
  },
  eventBannerPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#9aa0a6',
    marginTop: 4,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eventDetails: {
    gap: 6,
    marginBottom: 12,
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
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#e6f4ea',
  },
  successText: {
    flex: 1,
    color: '#137333',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef7e0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a73e8',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fce8e6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 12,
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
  imageSection: {
    marginBottom: 16,
  },
  imagePickerButton: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e8eaed',
    borderStyle: 'dashed',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 8,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e8eaed',
    gap: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: '#202124',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  statusToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  formErrorBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fce8e6',
  },
  formErrorText: {
    flex: 1,
    color: '#c5221f',
    fontSize: 13,
    fontWeight: '500',
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
