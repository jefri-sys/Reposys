import { useContext, useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Moon, Sun, UserRound, Printer, WalletCards, Settings } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextObject';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import NotificationItem from './notifications/NotificationItem';
import {
  Reposys_NOTIFICATIONS_CHANGED_EVENT,
  emitNotificationsChanged,
} from '../utils/notifications';

const USER_NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/orders', label: 'My Orders' },
  { to: '/complaints', label: 'Complaints' },
  { to: '/tools', label: 'Document Tools' },
  { to: '/notifications', label: 'Notifications' },
];

const getNotificationLink = (notification) => {
  switch (notification.type) {
    case 'order_update':
      if (notification.title === 'Split Request Declined' && notification.relatedEntity) {
        return `/orders/${notification.relatedEntity}`;
      }
      return '/orders';
    case 'complaint':
      return '/complaints';
    case 'rating_prompt':
      return notification.relatedOrderId ? `/orders/${notification.relatedOrderId}` : '/orders';
    case 'payment':
      if (notification.title === 'Split Payment Request' || notification.title === 'Split Request Received') {
        return '/split-requests';
      }
      if (notification.title === 'Split Payment Received' && notification.relatedEntity) {
        return `/orders/${notification.relatedEntity}`;
      }
      return '/orders';
    case 'inventory':
      return '/admin/inventory';
    case 'system':
      return '/dashboard';
    default:
      return '/dashboard';
  }
};

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const socket = useSocket();
  const { isDark, toggleTheme } = useTheme();
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [bellAnimationTick, setBellAnimationTick] = useState(0);
  const notificationDropdownRef = useRef(null);
  const accountDropdownRef = useRef(null);

  const loadNotificationSummary = async () => {
    try {
      const response = await api.get('/notifications');
      setUnreadCount(Number(response.data?.unreadCount) || 0);
      if (isNotificationMenuOpen) {
        setRecentNotifications(Array.isArray(response.data?.notifications) ? response.data.notifications : []);
      }
    } catch {
      if (isNotificationMenuOpen) setRecentNotifications([]);
      setUnreadCount(0);
    }
  };

  const loadRecentNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const response = await api.get('/notifications');
      setUnreadCount(Number(response.data?.unreadCount) || 0);
      setRecentNotifications(Array.isArray(response.data?.notifications) ? response.data.notifications : []);
    } catch {
      setRecentNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (!user?._id && !user?.id) return;
    loadNotificationSummary();
  }, [user?._id, user?.id]);

  useEffect(() => {
    if (!isNotificationMenuOpen && !isAccountMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      const inside = notificationDropdownRef.current?.contains(event.target) || accountDropdownRef.current?.contains(event.target);
      if (!inside) { setIsNotificationMenuOpen(false); setIsAccountMenuOpen(false); }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isAccountMenuOpen, isNotificationMenuOpen]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleNotification = () => {
      setUnreadCount((c) => c + 1);
      setBellAnimationTick((t) => t + 1);
      if (isNotificationMenuOpen) loadRecentNotifications();
    };
    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [isNotificationMenuOpen, socket]);

  useEffect(() => {
    const handler = () => {
      loadNotificationSummary();
      if (isNotificationMenuOpen) loadRecentNotifications();
    };
    window.addEventListener(Reposys_NOTIFICATIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(Reposys_NOTIFICATIONS_CHANGED_EVENT, handler);
  }, [isNotificationMenuOpen]);

  const handleToggleNotificationMenu = async () => {
    const next = !isNotificationMenuOpen;
    setIsNotificationMenuOpen(next);
    setIsAccountMenuOpen(false);
    if (next) await loadRecentNotifications();
  };

  const handleToggleAccountMenu = () => {
    setIsAccountMenuOpen((s) => !s);
    setIsNotificationMenuOpen(false);
  };

  const handleAccountLogout = async () => {
    setIsAccountMenuOpen(false);
    await logout();
  };

  const handleMarkSingleRead = async (notification) => {
    if (!notification?._id) return;
    if (!notification.isRead) {
      try {
        await api.patch(`/notifications/${notification._id}/read`);
        await loadNotificationSummary();
        emitNotificationsChanged();
      } catch { /* silent */ }
    }
    setIsNotificationMenuOpen(false);
    const link = getNotificationLink(notification);
    if (notification.type === 'rating_prompt' && notification.relatedOrderId) {
      navigate(link, { state: { openRating: true } });
    } else {
      navigate(link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      await loadNotificationSummary();
      setRecentNotifications([]);
      emitNotificationsChanged();
    } catch { /* silent */ }
  };

  return (
    <nav className="relative z-[45] border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 transition-colors group-hover:bg-sky-100">
              <Printer className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xl font-black tracking-tighter text-sky-700">Reposys</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400 border-l border-slate-200 pl-3 hidden sm:block">{user?.role || 'User'}</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="Toggle dark mode"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            <div ref={notificationDropdownRef} className="relative">
              <button
                type="button"
                onClick={handleToggleNotificationMenu}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                aria-label="Open notifications"
              >
                <span key={bellAnimationTick} className={bellAnimationTick > 0 ? 'animate-bell-shake' : ''}>
                  <Bell className="h-5 w-5" />
                </span>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] animate-pulse items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationMenuOpen ? (
                <div className="fixed left-4 right-4 top-20 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[360px] z-50 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_-30px_rgba(15,23,42,0.4)]">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h2 className="text-sm font-bold text-slate-950">Notifications</h2>
                    <button type="button" onClick={handleMarkAllRead} className="text-xs font-semibold text-sky-600 transition hover:text-sky-500">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-[360px] space-y-3 overflow-y-auto bg-slate-50/70 px-3 py-3">
                    {isLoadingNotifications ? (
                      <div className="flex justify-center py-10">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
                      </div>
                    ) : recentNotifications.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                        No unread notifications right now.
                      </div>
                    ) : recentNotifications.map((notification) => (
                      <NotificationItem key={notification._id} notification={notification} onClick={() => handleMarkSingleRead(notification)} />
                    ))}
                  </div>
                  <div className="border-t border-slate-200 bg-white px-4 py-3">
                    <Link to="/notifications" onClick={() => setIsNotificationMenuOpen(false)} className="text-sm font-semibold text-sky-600 transition hover:text-sky-500">
                      View all notifications
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Settings */}
            <Link
              to="/settings"
              title="Settings"
              aria-label="Open settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Settings className="h-5 w-5" />
            </Link>

            {/* Wallet */}
            {(user?.role === 'Student' || user?.role === 'Faculty') ? (
              <Link
                to="/wallet"
                title="My Wallet"
                aria-label="Open wallet"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <WalletCards className="h-5 w-5" />
              </Link>
            ) : null}

            {/* Account */}
            <div ref={accountDropdownRef} className="relative">
              <button
                type="button"
                onClick={handleToggleAccountMenu}
                className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                aria-label="Open account menu"
              >
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-slate-950">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-400">{user?.email || ''}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <UserRound className="h-5 w-5" />
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {isAccountMenuOpen ? (
                <div className="fixed left-4 right-4 top-20 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-64 z-50 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_80px_-30px_rgba(15,23,42,0.35)]">
                  <div className="border-b border-slate-200 px-4 py-4">
                    <p className="text-sm font-semibold text-slate-950">{user?.name || 'User'}</p>
                    <p className="mt-1 text-xs text-slate-500">{user?.email || ''}</p>
                  </div>
                  <div className="p-2">
                    <Link to="/profile" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950">
                      <UserRound className="h-4 w-4" />
                      My Profile
                    </Link>
                    <button type="button" onClick={handleAccountLogout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {USER_NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => [
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                isActive
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              ].join(' ')}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
