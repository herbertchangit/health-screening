import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Switch,
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { newsAPI } from '../../src/services/api';
import { NewsPost } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const CATEGORIES = ['general', 'announcement', 'promotion', 'alert'];
const CATEGORY_COLORS: Record<string, string> = {
  announcement: '#1a73e8',
  promotion: '#34a853',
  alert: '#ea4335',
  general: '#5f6368',
};

export default function AdminNewsScreen() {
  const [newsList, setNewsList] = useState<NewsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsPost | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [isPinned, setIsPinned] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  const fetchNews = async () => {
    try {
      const response = await newsAPI.getAll();
      setNewsList(response.data);
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNews();
    }, [])
  );

  const resetForm = () => {
    setTitle('');
    setSummary('');
    setContent('');
    setCategory('general');
    setIsPinned(false);
    setIsUrgent(false);
    setIsPublished(true);
    setThumbnail(null);
    setEditingNews(null);
  };

  const openCreate = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (news: NewsPost) => {
    setEditingNews(news);
    setTitle(news.title);
    setSummary(news.summary);
    setContent(news.content);
    setCategory(news.category);
    setIsPinned(news.is_pinned);
    setIsUrgent(news.is_urgent);
    setIsPublished(news.is_published);
    setThumbnail(news.thumbnail || null);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setThumbnail(result.assets[0].base64);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !summary.trim() || !content.trim()) {
      Alert.alert('Error', 'Title, summary and content are required');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        category,
        is_pinned: isPinned,
        is_urgent: isUrgent,
        is_published: isPublished,
      };
      if (thumbnail) payload.thumbnail = thumbnail;

      if (editingNews) {
        await newsAPI.update(editingNews.id, payload);
        Alert.alert('Success', 'News updated');
      } else {
        await newsAPI.create(payload);
        Alert.alert('Success', 'News created');
      }
      setModalVisible(false);
      resetForm();
      fetchNews();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (news: NewsPost) => {
    Alert.alert('Delete News', `Delete "${news.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await newsAPI.delete(news.id);
            fetchNews();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderNewsItem = ({ item }: { item: NewsPost }) => {
    const catColor = CATEGORY_COLORS[item.category] || '#5f6368';
    return (
      <View style={styles.newsCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
            <Text style={[styles.catText, { color: catColor }]}>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </Text>
          </View>
          <View style={styles.badges}>
            {item.is_pinned && (
              <View style={styles.pinIcon}>
                <Ionicons name="pin" size={14} color="#f59e0b" />
              </View>
            )}
            {item.is_urgent && (
              <View style={styles.urgentIcon}>
                <Ionicons name="alert-circle" size={14} color="#ea4335" />
              </View>
            )}
            {!item.is_published && (
              <View style={styles.draftIcon}>
                <Text style={styles.draftText}>Draft</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardSummary} numberOfLines={2}>{item.summary}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>
            {new Date(item.publish_date).toLocaleDateString()}
          </Text>
          <Text style={styles.cardViews}>{item.view_count} views</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Ionicons name="create-outline" size={16} color="#1a73e8" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={16} color="#ea4335" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.createBtnText}>Create News</Text>
      </TouchableOpacity>

      <FlatList
        data={newsList}
        renderItem={renderNewsItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNews(); }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={50} color="#dadce0" />
            <Text style={styles.emptyText}>No news yet</Text>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingNews ? 'Edit News' : 'Create News'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="News title" />

            <Text style={styles.label}>Summary *</Text>
            <TextInput style={[styles.input, styles.textArea]} value={summary} onChangeText={setSummary} placeholder="Short summary (2 lines)" multiline numberOfLines={3} />

            <Text style={styles.label}>Content *</Text>
            <TextInput style={[styles.input, styles.contentArea]} value={content} onChangeText={setContent} placeholder="Full article content" multiline numberOfLines={8} />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Thumbnail Image</Text>
            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
              {thumbnail ? (
                <Image source={{ uri: `data:image/png;base64,${thumbnail}` }} style={styles.thumbnailPreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={30} color="#9aa0a6" />
                  <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Pin to top</Text>
              <Switch value={isPinned} onValueChange={setIsPinned} trackColor={{ true: '#1a73e8' }} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Mark as urgent</Text>
              <Switch value={isUrgent} onValueChange={setIsUrgent} trackColor={{ true: '#ea4335' }} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Published</Text>
              <Switch value={isPublished} onValueChange={setIsPublished} trackColor={{ true: '#34a853' }} />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8', margin: 16, marginBottom: 8, paddingVertical: 12, borderRadius: 12 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  newsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  catText: { fontSize: 11, fontWeight: '600' },
  badges: { flexDirection: 'row', gap: 6 },
  pinIcon: { padding: 2 },
  urgentIcon: { padding: 2 },
  draftIcon: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  draftText: { fontSize: 11, color: '#9aa0a6', fontWeight: '500' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#202124', marginBottom: 4 },
  cardSummary: { fontSize: 13, color: '#5f6368', lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardDate: { fontSize: 12, color: '#9aa0a6' },
  cardViews: { fontSize: 12, color: '#9aa0a6' },
  cardActions: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', paddingVertical: 8, backgroundColor: '#e8f0fe', borderRadius: 8 },
  editBtnText: { fontSize: 14, color: '#1a73e8', fontWeight: '500' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', paddingVertical: 8, backgroundColor: '#fce8e6', borderRadius: 8 },
  deleteBtnText: { fontSize: 14, color: '#ea4335', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: '#9aa0a6', marginTop: 12 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e8eaed', paddingTop: Platform.OS === 'ios' ? 56 : 16 },
  modalCancel: { fontSize: 16, color: '#5f6368' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#202124' },
  modalSave: { fontSize: 16, color: '#1a73e8', fontWeight: '600' },
  modalBody: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#3c4043', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#dadce0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#202124', backgroundColor: '#fafafa' },
  textArea: { height: 80, textAlignVertical: 'top' },
  contentArea: { height: 160, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e8eaed' },
  categoryChipActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  categoryChipText: { fontSize: 13, color: '#5f6368', fontWeight: '500' },
  categoryChipTextActive: { color: '#fff' },
  imagePickerBtn: { borderWidth: 1, borderColor: '#dadce0', borderRadius: 12, overflow: 'hidden', borderStyle: 'dashed' },
  thumbnailPreview: { width: '100%', height: 160 },
  imagePlaceholder: { height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  imagePlaceholderText: { fontSize: 13, color: '#9aa0a6', marginTop: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  switchLabel: { fontSize: 15, color: '#3c4043' },
});
