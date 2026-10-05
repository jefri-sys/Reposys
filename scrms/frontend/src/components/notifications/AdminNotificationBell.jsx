import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, AlertTriangle, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { formatNotificationTimeAgo, getNotificationRoute } from '../../utils/notifications';

/* ── Urgent toast ─────────────────────────────────────────────── */
const UrgentToast = ({ notification, onDismiss }) => (
  <div className="animate-slide-in-top fixed left-1/2 top-4 z-[9999] flex w-[min(92vw,520px)] -translate-x-1/2 items-start gap-3 rounded-2xl border border-red-300 bg-red-600 px-5 py-4 shadow-2xl">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
      <AlertTriangle className="h-5 w-5 text-white" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold text-white">{notification.title}</p>
      <p className="mt-0.5 text-[13px] leading-5 text-red-100">{notification.message}</p>
      {notification.relatedEntity && (
        <span className="mt-1.5 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">
          {notification.relatedEntity}
        </span>
      )}
    </div>
    <button
      type="button"
      onClick={onDismiss}
      className="shrink-0 rounded-xl p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
      aria-label="Dismiss"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
);

/* ── Dropdown notification row ────────────────────────────────── */
const DropdownRow = ({ notification, onMarkRead, onNavigate }) => {
  const isUrgent = notification.urgency === 'Urgent';
  const isUnread = !notification.isRead;

  const handleClick = () => {
    if (isUnread) onMarkRead(notification._id);
    onNavigate(notification);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        'w-full rounded-2xl border px-4 py-3 text-left transition',
        isUrgent ? 'border-red-200' : 'border-slate-200',
        isUnread ? 'bg-sky-50 hover:bg-sky-100' : 'bg-white hover:bg-slate-50',
        isUrgent ? 'border-l-4 border-l-red-500' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-950">{notification.title}</p>
        {isUnread && (
          <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
        )}
      </div>
      <p className="mt-1 text-[13px] leading-5 text-slate-600 line-clamp-2">{notification.message}</p>
      <div className="mt-2 flex items-center gap-2">
        {notification.relatedEntity && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {notification.relatedEntity}
          </span>
        )}
        <span className="text-xs text-slate-400">{formatNotificationTimeAgo(notification.createdAt)}</span>
      </div>
    </button>
  );
};

/* ── Main component ───────────────────────────────────────────── */
const AdminNotificationBell = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [urgentToast, setUrgentToast] = useState(null);
  const toastTimerRef = useRef(null);

  /* Fetch unread count on mount */
  useEffect(() => {
    api.get('/notifications/unread-count')
      .then((res) => setUnreadCount(res.data?.count ?? 0))
      .catch(() => {});
  }, []);

  /* Dismiss urgent toast helper */
  const dismissToast = useCallback(() => {
    clearTimeout(toastTimerRef.current);
    setUrgentToast(null);
  }, []);

  /* Socket listeners */
  useEffect(() => {
    if (!socket) return undefined;

    const handleNotification = (data) => {
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => [data, ...prev]);
    };

    const handleUrgent = (data) => {
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => [data, ...prev]);
      setUrgentToast(data);
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setUrgentToast(null), 5000);
    };

    socket.on('notification', handleNotification);
    socket.on('urgent_notification', handleUrgent);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('urgent_notification', handleUrgent);
    };
  }, [socket]);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!isOpen) return undefined;

    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  /* Load dropdown notifications */
  const loadDropdown = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/notifications?limit=5');
      setNotifications(Array.isArray(res.data?.notifications) ? res.data.notifications : []);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) loadDropdown();
  };

  /* Mark single read */
  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      /* silent */
    }
  };

  /* Mark all read */
  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* silent */
    }
  };

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <>
      {/* Urgent toast */}
      {urgentToast && (
        <UrgentToast notification={urgentToast} onDismiss={dismissToast} />
      )}

      <div ref={dropdownRef} className="relative">
        {/* Bell button */}
        <button
          id="admin-notification-bell"
          type="button"
          onClick={handleToggle}
          aria-label="Admin notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
              {badgeLabel}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-3 w-[340px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_-30px_rgba(15,23,42,0.4)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-950">Notifications</h2>
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-sky-600 transition hover:text-sky-500"
              >
                Mark all read
              </button>
            </div>

            {/* List */}
            <div className="max-h-[380px] space-y-2 overflow-y-auto custom-scrollbar bg-slate-50/60 px-3 py-3">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownRow
                    key={n._id}
                    notification={n}
                    onMarkRead={handleMarkRead}
                    onNavigate={(notif) => {
                      setIsOpen(false);
                      navigate(getNotificationRoute(notif, 'Admin'));
                    }}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-white px-4 py-3">
              <Link
                to="/admin/notifications"
                onClick={() => setIsOpen(false)}
                className="text-sm font-semibold text-sky-600 transition hover:text-sky-500"
              >
                View all notifications
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminNotificationBell;
