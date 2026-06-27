import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid date';
    return format(date, 'MMM dd, yyyy');
  } catch {
    return 'Invalid date';
  }
};

export const formatDateTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid date';
    return format(date, 'MMM dd, yyyy hh:mm a');
  } catch {
    return 'Invalid date';
  }
};

export const formatTime = (time: string): string => {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return time;
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'confirmed':
      return '#4CAF50';
    case 'completed':
      return '#2196F3';
    case 'cancelled':
      return '#F44336';
    case 'pending':
      return '#FFC107';
    case 'no_show':
      return '#9E9E9E';
    default:
      return '#757575';
  }
};

export const getRoleLabel = (role: string, language: 'en' | 'zh' = 'en'): string => {
  if (language === 'zh') {
    switch (role) {
      case 'patient':
        return '患者';
      case 'doctor':
        return '医生';
      case 'admin':
        return '管理员';
      default:
        return role;
    }
  }

  switch (role) {
    case 'patient':
      return 'Patient';
    case 'doctor':
      return 'Doctor';
    case 'admin':
      return 'Administrator';
    default:
      return role;
  }
};
