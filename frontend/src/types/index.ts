export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  profile_image?: string;
  role: 'patient' | 'doctor' | 'admin';
  is_active: boolean;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  bio?: string;
  profile_image?: string;
  consultation_fee: number;
  duty_slots?: DoctorDutySlot[];
}

export interface DoctorDutySlot {
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  location: string;
  address: string;
  maps_url?: string;
  waze_url?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  banner_image?: string;
  max_capacity: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  client_request_id?: string;
}

export interface TimeSlot {
  id: string;
  event_id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_booked: boolean;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  event_id: string;
  slot_id: string;
  patient_name: string;
  patient_phone?: string;
  patient_profile_image?: string;
  reason?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  qr_code?: string;
  created_at: string;
  updated_at: string;
  event_name?: string;
  event_date?: string;
  event_location?: string;
  slot_time?: string;
  doctor_name?: string;
  doctor_specialization?: string;
  doctor_profile_image?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface NewsPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  thumbnail?: string;
  category: 'announcement' | 'promotion' | 'alert' | 'general';
  is_pinned: boolean;
  is_urgent: boolean;
  is_published: boolean;
  publish_date: string;
  created_by: string;
  author_name: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
