import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth APIs
export const authAPI = {
  register: (data: { email: string; password: string; full_name: string; phone?: string; role: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateMe: (data: { full_name?: string; phone?: string; profile_image?: string | null }) =>
    api.put('/auth/me', data),
  deleteMe: () => api.delete('/auth/me'),
};

// Events APIs
export const eventsAPI = {
  getAll: (activeOnly = true) => api.get(`/events?active_only=${activeOnly}`),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: any) => api.post('/events', data),
  update: (id: string, data: any) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  getDoctors: (eventId: string) => api.get(`/events/${eventId}/doctors`),
  assignDoctor: (eventId: string, doctorId: string) => api.post(`/events/${eventId}/doctors/${doctorId}`),
  removeDoctor: (eventId: string, doctorId: string) => api.delete(`/events/${eventId}/doctors/${doctorId}`),
  // Doctor self-service
  joinEvent: (eventId: string) => api.post(`/events/${eventId}/join`),
  getMyStatus: (eventId: string) => api.get(`/events/${eventId}/my-status`),
};

// Doctors APIs
export const doctorsAPI = {
  getAll: () => api.get('/doctors'),
  getById: (id: string) => api.get(`/doctors/${id}`),
  createProfile: (data: any) => api.post('/doctors/profile', data),
  getMyProfile: () => api.get('/doctors/profile'),
  updateProfile: (data: any) => api.put('/doctors/profile', data),
};

// Slots APIs
export const slotsAPI = {
  getForDoctor: (eventId: string, doctorId: string, availableOnly = false) =>
    api.get(`/events/${eventId}/doctors/${doctorId}/slots?available_only=${availableOnly}`),
  createBulk: (data: { event_id: string; start_time: string; end_time: string; slot_duration_minutes: number }) =>
    api.post('/slots/bulk', data),
  delete: (slotId: string) => api.delete(`/slots/${slotId}`),
};

// Appointments APIs
export const appointmentsAPI = {
  getAll: () => api.get('/appointments'),
  getById: (id: string) => api.get(`/appointments/${id}`),
  create: (data: any) => api.post('/appointments', data),
  cancel: (id: string) => api.put(`/appointments/${id}/cancel`),
  complete: (id: string) => api.put(`/appointments/${id}/complete`),
  verify: (appointmentId: string) => api.post(`/appointments/verify?appointment_id=${appointmentId}`),
};

// Notifications APIs
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// News APIs
export const newsAPI = {
  getAll: (params?: { category?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    const qs = queryParams.toString();
    return api.get(`/news${qs ? '?' + qs : ''}`);
  },
  getById: (id: string) => api.get(`/news/${id}`),
  create: (data: any) => api.post('/news', data),
  update: (id: string, data: any) => api.put(`/news/${id}`, data),
  delete: (id: string) => api.delete(`/news/${id}`),
};

// Admin APIs
export const adminAPI = {
  // Users
  getUsers: () => api.get('/admin/users'),
  createUser: (data: any) => api.post('/admin/users', data),
  updateUser: (userId: string, data: any) => api.put(`/admin/users/${userId}`, data),
  updateUserRole: (userId: string, role: string) => api.put(`/admin/users/${userId}/role?role=${role}`),
  updateUserStatus: (userId: string, isActive: boolean) => api.put(`/admin/users/${userId}/status?is_active=${isActive}`),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
  
  // Doctors
  getDoctors: () => api.get('/admin/doctors'),
  createDoctor: (data: any) => api.post('/admin/doctors', data),
  updateDoctor: (doctorId: string, data: any) => api.put(`/admin/doctors/${doctorId}`, data),
  deleteDoctor: (doctorId: string) => api.delete(`/admin/doctors/${doctorId}`),
  
  // Appointments
  getAppointments: () => api.get('/admin/appointments'),
  updateAppointmentStatus: (appointmentId: string, status: string) => 
    api.put(`/admin/appointments/${appointmentId}/status?status=${status}`),
  deleteAppointment: (appointmentId: string) => api.delete(`/admin/appointments/${appointmentId}`),
  
  // Stats
  getStats: () => api.get('/admin/stats'),
};
