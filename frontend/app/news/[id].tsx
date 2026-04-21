import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { newsAPI } from '../../src/services/api';
import { NewsPost } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

const CATEGORY_COLORS: Record<string, string> = {
  announcement: '#1a73e8',
  promotion: '#34a853',
  alert: '#ea4335',
  general: '#5f6368',
};

const CATEGORY_ICONS: Record<string, string> = {
  announcement: 'megaphone',
  promotion: 'pricetag',
  alert: 'warning',
  general: 'newspaper',
};

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [news, setNews] = useState<NewsPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, [id]);

  const fetchNews = async () => {
    try {
      const response = await newsAPI.getById(id!);
      setNews(response.data);
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (!news) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="newspaper-outline" size={60} color="#dadce0" />
        <Text style={styles.errorText}>News not found</Text>
      </View>
    );
  }

  const publishDate = new Date(news.publish_date);
  const catColor = CATEGORY_COLORS[news.category] || '#5f6368';
  const catIcon = CATEGORY_ICONS[news.category] || 'newspaper';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {news.thumbnail ? (
        <Image
          source={{ uri: `data:image/png;base64,${news.thumbnail}` }}
          style={styles.heroImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.heroPlaceholder}>
          <Ionicons name={catIcon as any} size={60} color="#93c5fd" />
        </View>
      )}

      <View style={styles.articleBody}>
        {/* Category & meta */}
        <View style={styles.metaRow}>
          <View style={[styles.categoryBadge, { backgroundColor: catColor + '18' }]}>
            <Ionicons name={catIcon as any} size={14} color={catColor} />
            <Text style={[styles.categoryText, { color: catColor }]}>
              {news.category.charAt(0).toUpperCase() + news.category.slice(1)}
            </Text>
          </View>
          {news.is_pinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={12} color="#f59e0b" />
              <Text style={styles.pinnedText}>Pinned</Text>
            </View>
          )}
          {news.is_urgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="alert-circle" size={12} color="#fff" />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{news.title}</Text>

        <View style={styles.authorRow}>
          <Ionicons name="person-circle-outline" size={18} color="#5f6368" />
          <Text style={styles.authorText}>{news.author_name}</Text>
          <Text style={styles.dotSep}>-</Text>
          <Ionicons name="time-outline" size={14} color="#9aa0a6" />
          <Text style={styles.dateText}>
            {publishDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Ionicons name="eye-outline" size={14} color="#9aa0a6" />
          <Text style={styles.viewCount}>{news.view_count} views</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.contentText}>{news.content}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  errorText: { fontSize: 16, color: '#5f6368', marginTop: 12 },
  heroImage: { width: '100%', height: undefined, aspectRatio: 537 / 748, backgroundColor: '#e8f0fe' },
  heroPlaceholder: { width: '100%', height: undefined, aspectRatio: 537 / 748, backgroundColor: '#e8f0fe', justifyContent: 'center', alignItems: 'center' },
  articleBody: { padding: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  pinnedText: { fontSize: 11, color: '#f59e0b', fontWeight: '600' },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ea4335', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  urgentText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#202124', lineHeight: 32, marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  authorText: { fontSize: 14, color: '#5f6368', fontWeight: '500' },
  dotSep: { color: '#9aa0a6', fontSize: 14 },
  dateText: { fontSize: 13, color: '#9aa0a6' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  viewCount: { fontSize: 13, color: '#9aa0a6' },
  divider: { height: 1, backgroundColor: '#e8eaed', marginBottom: 20 },
  contentText: { fontSize: 16, lineHeight: 26, color: '#3c4043' },
});
