import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'zh';

export type TranslationKey =
  | 'app.name'
  | 'language.english'
  | 'language.chinese'
  | 'nav.events'
  | 'nav.appointments'
  | 'nav.notifications'
  | 'nav.profile'
  | 'nav.manageEvents'
  | 'nav.manageUsers'
  | 'nav.manageDoctors'
  | 'nav.manageAppointments'
  | 'nav.manageNews'
  | 'nav.manageSlots'
  | 'nav.createEvent'
  | 'nav.eventDetails'
  | 'nav.doctorProfile'
  | 'nav.bookAppointment'
  | 'nav.appointmentDetails'
  | 'nav.scanQr'
  | 'nav.assignDoctors'
  | 'nav.news'
  | 'auth.login'
  | 'auth.signInToContinue'
  | 'auth.email'
  | 'auth.password'
  | 'auth.signIn'
  | 'auth.noAccount'
  | 'auth.signUp'
  | 'auth.createAccount'
  | 'auth.joinToday'
  | 'auth.alreadyAccount'
  | 'auth.confirmPassword'
  | 'auth.loginFailed'
  | 'common.logout'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.saveProfile'
  | 'common.saveChanges'
  | 'common.createUser'
  | 'common.success'
  | 'common.error'
  | 'common.status'
  | 'common.all'
  | 'common.confirmed'
  | 'common.completed'
  | 'common.cancelled'
  | 'common.pending'
  | 'common.noShow'
  | 'common.active'
  | 'common.inactive'
  | 'common.activate'
  | 'common.deactivate'
  | 'common.phone'
  | 'common.email'
  | 'common.name'
  | 'common.fullName'
  | 'common.role'
  | 'common.date'
  | 'common.time'
  | 'common.doctor'
  | 'common.patient'
  | 'common.event'
  | 'common.reason'
  | 'common.viewDetails'
  | 'role.patient'
  | 'role.doctor'
  | 'role.admin'
  | 'profile.patientProfile'
  | 'profile.patientPhoto'
  | 'profile.doctorProfile'
  | 'profile.editProfile'
  | 'profile.createDoctorProfile'
  | 'profile.dashboard'
  | 'profile.totalUsers'
  | 'profile.doctors'
  | 'profile.activeEvents'
  | 'profile.appointments'
  | 'profile.deletePatientProfile'
  | 'profile.uploadHelp'
  | 'profile.uploadPhoto'
  | 'profile.changePhoto'
  | 'profile.specialization'
  | 'profile.qualification'
  | 'profile.experience'
  | 'profile.yearsExperience'
  | 'profile.bio'
  | 'profile.consultationFee'
  | 'appointments.upcoming'
  | 'appointments.past'
  | 'appointments.noAppointments'
  | 'appointments.bookFromEvent'
  | 'appointments.patientBookingInfo'
  | 'appointments.scanQr'
  | 'appointments.manageSlots'
  | 'appointments.totalAppointments'
  | 'appointments.noFound'
  | 'appointments.changeStatus'
  | 'appointments.deleteAppointment'
  | 'booking.selectTimeSlot'
  | 'booking.noSlots'
  | 'booking.checkBackLater'
  | 'booking.patientDetails'
  | 'booking.patientInformation'
  | 'booking.reasonForVisit'
  | 'booking.summary'
  | 'booking.fee'
  | 'booking.confirmBooking'
  | 'booking.viewAppointments'
  | 'users.totalUsers'
  | 'users.noUsers'
  | 'users.editUser'
  | 'users.password'
  | 'users.newPasswordOptional';

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    'app.name': 'Talk with Doc',
    'language.english': 'EN',
    'language.chinese': '中文',
    'nav.events': 'Events',
    'nav.appointments': 'Appointments',
    'nav.notifications': 'Notifications',
    'nav.profile': 'Profile',
    'nav.manageEvents': 'Manage Events',
    'nav.manageUsers': 'Manage Users',
    'nav.manageDoctors': 'Manage Doctors',
    'nav.manageAppointments': 'Manage Appointments',
    'nav.manageNews': 'Manage News',
    'nav.manageSlots': 'Manage Slots',
    'nav.createEvent': 'Create Event',
    'nav.eventDetails': 'Event Details',
    'nav.doctorProfile': 'Doctor Profile',
    'nav.bookAppointment': 'Book Appointment',
    'nav.appointmentDetails': 'Appointment Details',
    'nav.scanQr': 'Scan QR Code',
    'nav.assignDoctors': 'Assign Doctors',
    'nav.news': 'News',
    'auth.login': 'Login',
    'auth.signInToContinue': 'Sign in to continue',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.signIn': 'Sign In',
    'auth.noAccount': 'Don’t have an account? ',
    'auth.signUp': 'Sign Up',
    'auth.createAccount': 'Create Account',
    'auth.joinToday': 'Join Talk with Doc today',
    'auth.alreadyAccount': 'Already have an account? ',
    'auth.confirmPassword': 'Confirm Password',
    'auth.loginFailed': 'Login Failed',
    'common.logout': 'Logout',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.saveProfile': 'Save Profile',
    'common.saveChanges': 'Save Changes',
    'common.createUser': 'Create User',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.status': 'Status',
    'common.all': 'All',
    'common.confirmed': 'Confirmed',
    'common.completed': 'Completed',
    'common.cancelled': 'Cancelled',
    'common.pending': 'Pending',
    'common.noShow': 'No show',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.activate': 'Activate',
    'common.deactivate': 'Deactivate',
    'common.phone': 'Phone',
    'common.email': 'Email',
    'common.name': 'Name',
    'common.fullName': 'Full Name',
    'common.role': 'Role',
    'common.date': 'Date',
    'common.time': 'Time',
    'common.doctor': 'Doctor',
    'common.patient': 'Patient',
    'common.event': 'Event',
    'common.reason': 'Reason',
    'common.viewDetails': 'View Details',
    'role.patient': 'Patient',
    'role.doctor': 'Doctor',
    'role.admin': 'Administrator',
    'profile.patientProfile': 'Patient Profile',
    'profile.patientPhoto': 'Patient Photo',
    'profile.doctorProfile': 'Doctor Profile',
    'profile.editProfile': 'Edit Profile',
    'profile.createDoctorProfile': 'Create Doctor Profile',
    'profile.dashboard': 'Dashboard',
    'profile.totalUsers': 'Total Users',
    'profile.doctors': 'Doctors',
    'profile.activeEvents': 'Active Events',
    'profile.appointments': 'Appointments',
    'profile.deletePatientProfile': 'Delete Patient Profile',
    'profile.uploadHelp': 'Upload JPG, PNG, or WebP. Maximum size: 2 MB.',
    'profile.uploadPhoto': 'Upload Photo',
    'profile.changePhoto': 'Change Photo',
    'profile.specialization': 'Specialization',
    'profile.qualification': 'Qualification',
    'profile.experience': 'Experience',
    'profile.yearsExperience': 'Years of Experience',
    'profile.bio': 'Bio',
    'profile.consultationFee': 'Consultation Fee',
    'appointments.upcoming': 'Upcoming',
    'appointments.past': 'Past',
    'appointments.noAppointments': 'No appointments',
    'appointments.bookFromEvent': 'Book an appointment from an event',
    'appointments.patientBookingInfo': 'Patient booking information',
    'appointments.scanQr': 'Scan QR',
    'appointments.manageSlots': 'Manage Slots',
    'appointments.totalAppointments': 'total appointments',
    'appointments.noFound': 'No appointments found',
    'appointments.changeStatus': 'Status',
    'appointments.deleteAppointment': 'Delete Appointment',
    'booking.selectTimeSlot': 'Select Time Slot',
    'booking.noSlots': 'No available slots',
    'booking.checkBackLater': 'Please check back later',
    'booking.patientDetails': 'Patient Details',
    'booking.patientInformation': 'Patient information',
    'booking.reasonForVisit': 'Reason for Visit',
    'booking.summary': 'Booking Summary',
    'booking.fee': 'Fee',
    'booking.confirmBooking': 'Confirm Booking',
    'booking.viewAppointments': 'View Appointments',
    'users.totalUsers': 'total users',
    'users.noUsers': 'No users found',
    'users.editUser': 'Edit User',
    'users.password': 'Password',
    'users.newPasswordOptional': 'New Password (optional)',
  },
  zh: {
    'app.name': 'Talk with Doc',
    'language.english': 'EN',
    'language.chinese': '中文',
    'nav.events': '活动',
    'nav.appointments': '预约',
    'nav.notifications': '通知',
    'nav.profile': '个人资料',
    'nav.manageEvents': '管理活动',
    'nav.manageUsers': '管理用户',
    'nav.manageDoctors': '管理医生',
    'nav.manageAppointments': '管理预约',
    'nav.manageNews': '管理新闻',
    'nav.manageSlots': '管理时段',
    'nav.createEvent': '创建活动',
    'nav.eventDetails': '活动详情',
    'nav.doctorProfile': '医生资料',
    'nav.bookAppointment': '预约挂号',
    'nav.appointmentDetails': '预约详情',
    'nav.scanQr': '扫描二维码',
    'nav.assignDoctors': '分配医生',
    'nav.news': '新闻',
    'auth.login': '登录',
    'auth.signInToContinue': '请登录以继续',
    'auth.email': '电邮',
    'auth.password': '密码',
    'auth.signIn': '登录',
    'auth.noAccount': '还没有账号？',
    'auth.signUp': '注册',
    'auth.createAccount': '创建账号',
    'auth.joinToday': '立即加入 Talk with Doc',
    'auth.alreadyAccount': '已有账号？',
    'auth.confirmPassword': '确认密码',
    'auth.loginFailed': '登录失败',
    'common.logout': '退出',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.saveProfile': '保存资料',
    'common.saveChanges': '保存更改',
    'common.createUser': '创建用户',
    'common.success': '成功',
    'common.error': '错误',
    'common.status': '状态',
    'common.all': '全部',
    'common.confirmed': '已确认',
    'common.completed': '已完成',
    'common.cancelled': '已取消',
    'common.pending': '待确认',
    'common.noShow': '未出席',
    'common.active': '启用',
    'common.inactive': '停用',
    'common.activate': '启用',
    'common.deactivate': '停用',
    'common.phone': '电话',
    'common.email': '电邮',
    'common.name': '姓名',
    'common.fullName': '全名',
    'common.role': '角色',
    'common.date': '日期',
    'common.time': '时间',
    'common.doctor': '医生',
    'common.patient': '患者',
    'common.event': '活动',
    'common.reason': '原因',
    'common.viewDetails': '查看详情',
    'role.patient': '患者',
    'role.doctor': '医生',
    'role.admin': '管理员',
    'profile.patientProfile': '患者资料',
    'profile.patientPhoto': '患者照片',
    'profile.doctorProfile': '医生资料',
    'profile.editProfile': '编辑资料',
    'profile.createDoctorProfile': '创建医生资料',
    'profile.dashboard': '仪表板',
    'profile.totalUsers': '用户总数',
    'profile.doctors': '医生',
    'profile.activeEvents': '进行中活动',
    'profile.appointments': '预约',
    'profile.deletePatientProfile': '删除患者资料',
    'profile.uploadHelp': '上传 JPG、PNG 或 WebP。最大 2 MB。',
    'profile.uploadPhoto': '上传照片',
    'profile.changePhoto': '更换照片',
    'profile.specialization': '专科',
    'profile.qualification': '资历',
    'profile.experience': '经验',
    'profile.yearsExperience': '从业年数',
    'profile.bio': '简介',
    'profile.consultationFee': '咨询费',
    'appointments.upcoming': '即将到来',
    'appointments.past': '过去',
    'appointments.noAppointments': '没有预约',
    'appointments.bookFromEvent': '请从活动中预约',
    'appointments.patientBookingInfo': '患者预约资料',
    'appointments.scanQr': '扫码',
    'appointments.manageSlots': '管理时段',
    'appointments.totalAppointments': '个预约',
    'appointments.noFound': '没有找到预约',
    'appointments.changeStatus': '状态',
    'appointments.deleteAppointment': '删除预约',
    'booking.selectTimeSlot': '选择时段',
    'booking.noSlots': '没有可用时段',
    'booking.checkBackLater': '请稍后再查看',
    'booking.patientDetails': '患者资料',
    'booking.patientInformation': '患者信息',
    'booking.reasonForVisit': '就诊原因',
    'booking.summary': '预约摘要',
    'booking.fee': '费用',
    'booking.confirmBooking': '确认预约',
    'booking.viewAppointments': '查看预约',
    'users.totalUsers': '个用户',
    'users.noUsers': '没有找到用户',
    'users.editUser': '编辑用户',
    'users.password': '密码',
    'users.newPasswordOptional': '新密码（可选）',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (key: TranslationKey) => string;
  statusLabel: (status: string) => string;
  roleLabel: (role: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const STORAGE_KEY = 'language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'en' || stored === 'zh') {
        setLanguageState(stored);
      }
    });
  }, []);

  const setLanguage = async (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(STORAGE_KEY, nextLanguage);
  };

  const value = useMemo<LanguageContextType>(() => {
    const t = (key: TranslationKey) => translations[language][key] || translations.en[key] || key;

    const statusLabel = (status: string) => {
      const normalized = status.toLowerCase();
      if (normalized === 'confirmed') return t('common.confirmed');
      if (normalized === 'completed') return t('common.completed');
      if (normalized === 'cancelled') return t('common.cancelled');
      if (normalized === 'pending') return t('common.pending');
      if (normalized === 'no_show') return t('common.noShow');
      return status;
    };

    const roleLabel = (role: string) => {
      if (role === 'patient') return t('role.patient');
      if (role === 'doctor') return t('role.doctor');
      if (role === 'admin') return t('role.admin');
      return role;
    };

    return {
      language,
      setLanguage,
      toggleLanguage: () => setLanguage(language === 'en' ? 'zh' : 'en'),
      t,
      statusLabel,
      roleLabel,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
