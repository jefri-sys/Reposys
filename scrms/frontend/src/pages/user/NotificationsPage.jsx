import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Bell } from 'lucide-react';
import api from '../../services/api';
import NotificationItem from '../../components/notifications/NotificationItem';
import {
  NOTIFICATION_FILTERS,
  Reposys_NOTIFICATIONS_CHANGED_EVENT,
  emitNotificationsChanged,
} from '../../utils/notifications';
import {
  Card,
  CardContent,
  Button,
  EmptyState,
  LoadingState,
  PageHeader
} from '../../components/ui';

const PAGE_SIZE = 10;

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
      return notification.relatedOrderId 
        ? `/orders/${notification.relatedOrderId}` 
        : '/orders';
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

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeDeleteId, setActiveDeleteId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadNotifications = async (page = currentPage, filter = activeFilter) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.get('/notifications/all', {
        params: {
          page,
          limit: PAGE_SIZE,
          filter,
        },
      });

      setNotifications(Array.isArray(response.data?.notifications) ? response.data.notifications : []);
      setPagination({
        page: response.data?.pagination?.page || page,
        totalPages: response.data?.pagination?.totalPages || 1,
        total: response.data?.pagination?.total || 0,
      });
    } catch (loadError) {
      setNotifications([]);
      setPagination({
        page: 1,
        totalPages: 1,
        total: 0,
      });
      setError(loadError.response?.data?.message || 'Could not load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(currentPage, activeFilter);
  }, [activeFilter, currentPage]);

  useEffect(() => {
    const handleNotificationsChanged = () => {
      loadNotifications(currentPage, activeFilter);
    };

    window.addEventListener(Reposys_NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);

    return () => {
      window.removeEventListener(Reposys_NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    };
  }, [activeFilter, currentPage]);

  const handleMarkRead = async (notification) => {
    if (!notification?._id) return;

    if (!notification.isRead) {
      try {
        await api.patch(`/notifications/${notification._id}/read`);
        if (activeFilter === 'unread') {
          setNotifications((currentNotifications) => currentNotifications.filter(
            (currentNotification) => currentNotification._id !== notification._id
          ));
        } else {
          setNotifications((currentNotifications) => currentNotifications.map((currentNotification) => (
            currentNotification._id === notification._id
              ? { ...currentNotification, isRead: true }
              : currentNotification
          )));
        }
        emitNotificationsChanged();
      } catch {
        // Keep the existing UI state if the update fails.
      }
    }

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
      if (activeFilter === 'unread') {
        setNotifications([]);
      } else {
        setNotifications((currentNotifications) => currentNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        })));
      }
      setMessage('All notifications marked as read.');
      setError('');
      emitNotificationsChanged();
    } catch (actionError) {
      setMessage('');
      setError(actionError.response?.data?.message || 'Could not mark notifications as read.');
    }
  };

  const handleDelete = async (notificationId) => {
    if (!notificationId || activeDeleteId) return;

    setActiveDeleteId(notificationId);

    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications((currentNotifications) => currentNotifications.filter(
        (notification) => notification._id !== notificationId
      ));
      setMessage('Notification deleted.');
      setError('');
      emitNotificationsChanged();
    } catch (deleteError) {
      setMessage('');
      setError(deleteError.response?.data?.message || 'Could not delete notification.');
    } finally {
      setActiveDeleteId('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader 
          title="Notifications"
          description="Review every alert from orders, complaints, system updates, and account activity."
          actions={
            <Button variant="outline" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          }
        />

        <div className="flex flex-wrap gap-2">
          {NOTIFICATION_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => {
                setCurrentPage(1);
                setActiveFilter(filter.id);
                setMessage('');
                setError('');
              }}
              className={[
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                activeFilter === filter.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
              ].join(' ')}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16">
                <LoadingState message="Loading notifications..." />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12">
                <EmptyState 
                  icon={Bell}
                  title="No notifications found"
                  description="Try another filter or check back later for new updates."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onClick={() => handleMarkRead(notification)}
                    trailingAction={(
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        disabled={activeDeleteId === notification._id}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(notification._id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total notifications
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
