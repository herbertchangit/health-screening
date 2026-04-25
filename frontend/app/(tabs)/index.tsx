import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  ScrollView,
  TextInput,
  FlatList,
  Platform,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { eventsAPI, newsAPI, doctorsAPI } from '../../src/services/api';
import { Event, NewsPost, DoctorProfile } from '../../src/types';
import { formatDate, formatTime } from '../../src/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORY_COLORS: Record<string, string> = {
  announcement: '#4B7BFF',
  promotion: '#34a853',
  alert: '#ea4335',
  general: '#5f6368',
};

const SPECIALTIES = [
  { name: 'General', icon: 'medkit-outline', color: '#4B7BFF', bg: '#E8EEFF' },
  { name: 'Cardiology', icon: 'heart-outline', color: '#FF6B8A', bg: '#FFE8ED' },
  { name: 'Mental\nHealth', icon: 'brain-outline' as any, color: '#4ECDC4', bg: '#E0F8F5' },
  { name: 'Dental', icon: 'happy-outline', color: '#9B6BFF', bg: '#F0E8FF' },
];

export default function HomeScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [newsList, setNewsList] = useState<NewsPost[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      const [eventsRes, newsRes, doctorsRes] = await Promise.all([
        eventsAPI.getAll(),
        newsAPI.getAll(),
        doctorsAPI.getAll().catch(() => ({ data: [] })),
      ]);
      setEvents(eventsRes.data);
      setNewsList(newsRes.data);
      setDoctors(doctorsRes.data || []);
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
      autoRefreshRef.current = setInterval(fetchData, 5 * 60 * 1000);
      return () => {
        if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      };
    }, [])
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B7BFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4B7BFF']} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ===== HERO SECTION ===== */}
      <View style={[styles.heroSection, { paddingTop: insets.top + 12 }]}>  
        <View style={styles.heroHeader}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="medical" size={18} color="#fff" />
            </View>
            <Text style={styles.logoText}>Talk with Doc</Text>
          </View>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#3C4043" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroContent}>
          <View style={styles.heroTextArea}>
            <Text style={styles.heroTitle}>
              Talk to a doctor,{'\n'}anytime, anywhere
            </Text>
            <Text style={styles.heroSubtitle}>
              Book an appointment and consult{'\n'}with trusted doctors easily.
            </Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => {
                if (events.length > 0) {
                  router.push(`/event/${events[0].id}`);
                }
              }}
            >
              <Ionicons name="calendar" size={18} color="#fff" />
              <Text style={styles.heroButtonText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ===== SEARCH BAR ===== */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#A0A4B0" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events or doctors..."
            placeholderTextColor="#A0A4B0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* ===== ADMIN QUICK ACTIONS ===== */}
      {user?.role === 'admin' && (
        <View style={styles.adminSection}>
          <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/create-event')}>
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.adminBtnText}>Create Event</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.adminBtn, styles.adminBtnGreen]} onPress={() => router.push('/admin/news')}>
            <Ionicons name="newspaper" size={18} color="#fff" />
            <Text style={styles.adminBtnText}>Manage News</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ===== SPECIALTIES / CATEGORIES ===== */}
      <View style={styles.specialtiesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.specialtiesRow}>
          {SPECIALTIES.map((spec, idx) => (
            <TouchableOpacity key={idx} style={styles.specialtyCard}>
              <View style={[styles.specialtyIconWrap, { backgroundColor: spec.bg }]}>  
                <Ionicons name={spec.icon as any} size={28} color={spec.color} />
              </View>
              <Text style={styles.specialtyLabel}>{spec.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ===== LATEST NEWS ===== */}
      {newsList.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest News</Text>
            <TouchableOpacity onPress={() => router.push('/news-list')}>
              <Text style={styles.viewAllText}>View all  &gt;</Text>
            </TouchableOpacity>
          </View>
          {newsList.slice(0, 3).map((item) => {
            const catColor = CATEGORY_COLORS[item.category] || '#5f6368';
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
                  <View style={[styles.newsIconBox, { backgroundColor: catColor + '15' }]}>  
                    <Ionicons name="newspaper" size={22} color={catColor} />
                  </View>
                )}
                <View style={styles.newsContent}>
                  <View style={styles.newsMetaRow}>
                    <View style={[styles.newsCatBadge, { backgroundColor: catColor + '18' }]}>  
                      <Text style={[styles.newsCatText, { color: catColor }]}>
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                      </Text>
                    </View>
                    {item.is_pinned && <Ionicons name="pin" size={12} color="#f59e0b" />}
                    {item.is_urgent && <View style={styles.urgentDot} />}
                  </View>
                  <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.newsSummary} numberOfLines={1}>{item.summary}</Text>
                  <Text style={styles.newsDate}>{formatNewsDate(item.publish_date)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C8CBD0" style={{ alignSelf: 'center' }} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ===== UPCOMING EVENTS ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
        </View>
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={50} color="#D0D3DA" />
            <Text style={styles.emptyText}>No upcoming events</Text>
            <Text style={styles.emptySubtext}>Check back later for new health events</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsRow}>
            {events.map((item) => (
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
                    <Ionicons name="calendar" size={36} color="#93c5fd" />
                  </View>
                )}
                <View style={styles.eventBody}>
                  <Text style={styles.eventName} numberOfLines={2}>{item.name}</Text>
                  <View style={styles.eventInfoRow}>
                    <Ionicons name="calendar-outline" size={13} color="#8E92A0" />
                    <Text style={styles.eventInfoText}>{formatDate(item.event_date)}</Text>
                  </View>
                  <View style={styles.eventInfoRow}>
                    <Ionicons name="time-outline" size={13} color="#8E92A0" />
                    <Text style={styles.eventInfoText}>
                      {formatTime(item.start_time)} - {formatTime(item.end_time)}
                    </Text>
                  </View>
                  <View style={styles.eventInfoRow}>
                    <Ionicons name="location-outline" size={13} color="#8E92A0" />
                    <Text style={styles.eventInfoText} numberOfLines={1}>{item.location}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ===== AVAILABLE DOCTORS ===== */}
      {doctors.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Doctors</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View all  &gt;</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.doctorsRow}>
            {doctors.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.doctorCard}
                onPress={() => router.push(`/doctor/${doc.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.doctorImageWrap}>
                  <View style={styles.doctorAvatar}>
                    <Ionicons name="person" size={36} color="#4B7BFF" />
                  </View>
                  <View style={styles.availableBadge}>
                    <View style={styles.availableDot} />
                    <Text style={styles.availableText}>Available</Text>
                  </View>
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName} numberOfLines={1}>{doc.full_name}</Text>
                  <Text style={styles.doctorSpec} numberOfLines={1}>{doc.specialization}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={13} color="#FFD54F" />
                    <Text style={styles.ratingText}>4.9</Text>
                    <Text style={styles.ratingCount}>({Math.floor(Math.random() * 100 + 20)})</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FC',
  },

  // ===== HERO =====
  heroSection: {
    backgroundColor: '#E8EEFF',
    paddingBottom: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#4B7BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3E50',
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  heroContent: {
    paddingHorizontal: 20,
  },
  heroTextArea: {
    maxWidth: '75%',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1D26',
    lineHeight: 36,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#5A5F72',
    lineHeight: 20,
    marginBottom: 20,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4B7BFF',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-start',
    shadowColor: '#4B7BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ===== SEARCH =====
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: -18,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1D26',
  },

  // ===== ADMIN =====
  adminSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 8,
  },
  adminBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B7BFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  adminBtnGreen: {
    backgroundColor: '#34a853',
  },
  adminBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // ===== SPECIALTIES =====
  specialtiesSection: {
    marginBottom: 8,
  },
  specialtiesRow: {
    paddingHorizontal: 20,
    gap: 14,
    paddingVertical: 8,
  },
  specialtyCard: {
    alignItems: 'center',
    width: 80,
  },
  specialtyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  specialtyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3C4043',
    textAlign: 'center',
    lineHeight: 16,
  },

  // ===== SECTIONS =====
  section: {
    marginTop: 8,
    paddingBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1D26',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4B7BFF',
    fontWeight: '600',
  },

  // ===== NEWS CARDS =====
  newsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  newsThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  newsIconBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsContent: {
    flex: 1,
    marginLeft: 12,
  },
  newsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  newsCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newsCatText: {
    fontSize: 10,
    fontWeight: '700',
  },
  urgentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ea4335',
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D26',
    lineHeight: 19,
    marginBottom: 2,
  },
  newsSummary: {
    fontSize: 12,
    color: '#8E92A0',
    lineHeight: 16,
    marginBottom: 3,
  },
  newsDate: {
    fontSize: 11,
    color: '#B0B3BC',
  },

  // ===== EVENTS =====
  eventsRow: {
    paddingHorizontal: 20,
    gap: 14,
  },
  eventCard: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  eventImage: {
    width: '100%',
    height: 120,
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#E8EEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventBody: {
    padding: 14,
  },
  eventName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 8,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  eventInfoText: {
    fontSize: 12,
    color: '#8E92A0',
  },

  // ===== DOCTORS =====
  doctorsRow: {
    paddingHorizontal: 20,
    gap: 14,
  },
  doctorCard: {
    width: 165,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  doctorImageWrap: {
    height: 110,
    backgroundColor: '#E8EEFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  doctorAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#D5DFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34a853',
  },
  availableText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#34a853',
  },
  doctorInfo: {
    padding: 12,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 2,
  },
  doctorSpec: {
    fontSize: 12,
    color: '#8E92A0',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1D26',
  },
  ratingCount: {
    fontSize: 12,
    color: '#B0B3BC',
  },

  // ===== EMPTY =====
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8E92A0',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#B0B3BC',
    marginTop: 4,
  },
});
