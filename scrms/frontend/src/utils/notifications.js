export const NOTIFICATION_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'order_update', label: 'Order Updates' },
  { id: 'complaint', label: 'Complaints' },
  { id: 'system', label: 'System' },
];

export const Reposys_NOTIFICATIONS_CHANGED_EVENT = 'reposys-notifications-changed';

export const emitNotificationsChanged = () => {
  window.dispatchEvent(new Event(Reposys_NOTIFICATIONS_CHANGED_EVENT));
};

export const formatNotificationTimeAgo = (value) => {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: diffDays >= 365 ? 'numeric' : undefined,
  });
};

export const getNotificationRoute = (notification, role) => {
  if (!notification || !notification.type) return '#';
  
  const { type, title } = notification;

  if (role === 'Admin') {
    if (type === 'system' && title && title.includes('Staff Report')) return '/admin/staff-reports';
    if (type === 'complaint') return '/admin/complaints';
    if (type === 'inventory') return '/admin/inventory';
    if (['order_update', 'payment', 'queue_update'].includes(type)) return '/admin/transactions';
    if (type === 'system' || type === 'rating_prompt') return '/admin/activity-logs';
    return '/admin';
  }
  
  if (role === 'Staff') {
    if (type === 'complaint') return '/staff';
    if (type === 'inventory') return '/staff';
    if (type === 'system') return '/staff/reports';
    if (['order_update', 'payment', 'queue_update'].includes(type)) return '/staff';
    return '/staff';
  }
  
  if (['order_update', 'payment', 'queue_update'].includes(type) && notification.relatedEntity) {
    return `/orders/${notification.relatedEntity}`;
  }
  if (type === 'complaint') return '/complaints';
  
  return '/dashboard';
};
