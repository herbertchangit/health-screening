import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { eventsAPI, newsAPI } from '../../src/services/api';
import { Event, NewsPost } from '../../src/types';
import { formatDate, formatTime } from '../../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';

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

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [newsList, setNewsList] = useState<NewsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      if (user?.role === 'doctor') {
        const newsRes = await newsAPI.getAll();
        setEvents([]);
        setNewsList(newsRes.data);
      } else {
        const [eventsRes, newsRes] = await Promise.all([
          eventsAPI.getAll(),
          newsAPI.getAll(),
        ]);
        setEvents(eventsRes.data);
        setNewsList(newsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      // Auto-refresh every 5 minutes
      autoRefreshRef.current = setInterval(fetchData, 5 * 60 * 1000);
      return () => {
        if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      };
    }, [user?.role])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatNewsDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderNewsCard = (item: NewsPost) => {
    const catColor = CATEGORY_COLORS[item.category] || '#5f6368';
    const catIcon = CATEGORY_ICONS[item.category] || 'newspaper';

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.newsCard}
        onPress={() => router.push(`/news/${item.id}`)}
        activeOpacity={0.7}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: `data:image/png;base64,${item.thumbnail}` }}
            style={styles.newsThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.newsIconContainer}>
            <Ionicons name={catIcon as any} size={24} color={catColor} />
          </View>
        )}
        <View style={styles.newsContent}>
          <View style={styles.newsTopRow}>
            <View style={[styles.newsCatBadge, { backgroundColor: catColor + '18' }]}>
              <Text style={[styles.newsCatText, { color: catColor }]}>
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Text>
            </View>
            {item.is_pinned && (
              <Ionicons name="pin" size={12} color="#f59e0b" />
            )}
            {item.is_urgent && (
              <View style={styles.urgentDot} />
            )}
          </View>
          <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.newsSummary} numberOfLines={2}>{item.summary}</Text>
          <Text style={styles.newsDate}>{formatNewsDate(item.publish_date)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEvent = (item: Event) => (
    <TouchableOpacity
      key={item.id}
      style={styles.eventCard}
      onPress={() => router.push(`/event/${item.id}`)}
      activeOpacity={0.7}
    >
      {item.banner_image ? (
        <Image
          source={{ uri: `data:image/png;base64,${item.banner_image}` }}
          style={styles.eventImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.eventImagePlaceholder}>
          <Ionicons name="calendar" size={40} color="#93c5fd" />
        </View>
      )}
      <View style={styles.eventContent}>
        <Text style={styles.eventName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.eventInfo}>
          <Ionicons name="calendar-outline" size={14} color="#5f6368" />
          <Text style={styles.eventInfoText}>{formatDate(item.event_date)}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Ionicons name="time-outline" size={14} color="#5f6368" />
          <Text style={styles.eventInfoText}>
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </Text>
        </View>
        <View style={styles.eventInfo}>
          <Ionicons name="location-outline" size={14} color="#5f6368" />
          <Text style={styles.eventInfoText} numberOfLines={1}>{item.location}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#1a73e8" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  const sections = [];

  // Admin button section
  if (user?.role === 'admin') {
    sections.push({ key: 'admin', data: ['admin'] });
  }

  // News section
  if (newsList.length > 0) {
    sections.push({ key: 'news', title: 'Latest News', data: ['news'] });
  }

  // Events section - doctors only see latest news here
  if (user?.role !== 'doctor') {
    sections.push({ key: 'events', title: 'Upcoming Events', data: ['events'] });
  }

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(item, index) => item + index}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a73e8']} />
      }
      renderSectionHeader={({ section }) => {
        if (section.key === 'admin') return null;
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.key === 'news' && (
              <TouchableOpacity onPress={() => router.push('/news-list')}>
                <Text style={styles.viewMore}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }}
      renderItem={({ section }) => {
        if (section.key === 'admin') {
          return (
            <View style={styles.adminRow}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/create-event')}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.createButtonText}>Create Event</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: '#34a853' }]}
                onPress={() => router.push('/admin/news')}
              >
                <Ionicons name="newspaper" size={18} color="#fff" />
                <Text style={styles.createButtonText}>Manage News</Text>
              </TouchableOpacity>
            </View>
          );
        }

        if (section.key === 'news') {
          return (
            <View style={styles.newsSection}>
              {newsList.slice(0, 5).map(renderNewsCard)}
            </View>
          );
        }

        if (section.key === 'events') {
          if (events.length === 0) {
            return (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={60} color="#dadce0" />
                <Text style={styles.emptyText}>No upcoming events</Text>
                <Text style={styles.emptySubtext}>Check back later for new health events</Text>
              </View>
            );
          }
          return (
            <View style={styles.eventsSection}>
              {events.map(renderEvent)}
            </View>
          );
        }

        return null;
      }}
    />
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
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202124',
  },
  viewMore: {
    fontSize: 14,
    color: '#1a73e8',
    fontWeight: '600',
  },
  // Admin
  adminRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a73e8',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // News section
  newsSection: {
    paddingHorizontal: 16,
  },
  newsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginVertical: 5,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  newsThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  newsIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsContent: {
    flex: 1,
    marginLeft: 12,
  },
  newsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  newsCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newsCatText: {
    fontSize: 10,
    fontWeight: '700',
  },
  urgentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea4335',
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#202124',
    lineHeight: 19,
    marginBottom: 3,
  },
  newsSummary: {
    fontSize: 12,
    color: '#5f6368',
    lineHeight: 16,
    marginBottom: 4,
  },
  newsDate: {
    fontSize: 11,
    color: '#9aa0a6',
  },
  // Events section
  eventsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginVertical: 6,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  eventImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
    marginLeft: 12,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventInfoText: {
    fontSize: 13,
    color: '#5f6368',
    marginLeft: 6,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
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
  },
});
