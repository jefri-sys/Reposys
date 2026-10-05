import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trash2, 
  Bell, 
  CheckCheck, 
  Package, 
  MessageSquare, 
  Star, 
  CreditCard,
  Settings,
  Info
} from 'lucide-react';
import api from '../../services/api';
import {
  NOTIFICATION_FILTERS,
  Reposys_NOTIFICATIONS_CHANGED_EVENT,
  emitNotificationsChanged,
  formatNotificationTimeAgo
} from '../../utils/notifications';

const PAGE_SIZE = 15; // Increased slightly for mobile infinite-scroll feel

const getNotificationIcon = (type) => {
  switch (type) {
    case 'order_update': return <Package size={20} className="text-sky-500" />;
    case 'complaint': return <MessageSquare size={20} className="text-amber-500" />;
    case 'rating_prompt': return <Star size={20} className="text-yellow-500" />;
    case 'payment': return <CreditCard size={20} className="text-emerald-500" />;
    case 'system': return <Settings size={20} className="text-slate-500" />;
    default: return <Info size={20} className="text-[#003d9b]" />;
  }
};

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

const MobileNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeDeleteId, setActiveDeleteId] = useState('');

  const loadNotifications = async (page = 1, filter = activeFilter, append = false) => {
    if (!append) setIsLoading(true);

    try {
      const response = await api.get('/notifications/all', {
        params: { page, limit: PAGE_SIZE, filter },
      });

      const newNotifications = Array.isArray(response.data?.notifications) ? response.data.notifications : [];
      
      setNotifications(prev => append ? [...prev, ...newNotifications] : newNotifications);
      setPagination({
        page: response.data?.pagination?.page || page,
        totalPages: response.data?.pagination?.totalPages || 1,
        total: response.data?.pagination?.total || 0,
      });
    } catch (loadError) {
      if (!append) {
        setNotifications([]);
        setPagination({ page: 1, totalPages: 1, total: 0 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(1, activeFilter, false);
    setCurrentPage(1);
  }, [activeFilter]);

  useEffect(() => {
    const handleNotificationsChanged = () => {
      loadNotifications(1, activeFilter, false);
      setCurrentPage(1);
    };
    window.addEventListener(Reposys_NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    return () => {
      window.removeEventListener(Reposys_NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    };
  }, [activeFilter]);

  const handleLoadMore = () => {
    if (currentPage < pagination.totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadNotifications(nextPage, activeFilter, true);
    }
  };

  const handleMarkRead = async (notification) => {
    if (!notification?._id) return;

    if (!notification.isRead) {
      try {
        await api.patch(`/notifications/${notification._id}/read`);
        if (activeFilter === 'unread') {
          setNotifications(prev => prev.filter(n => n._id !== notification._id));
        } else {
          setNotifications(prev => prev.map(n => 
            n._id === notification._id ? { ...n, isRead: true } : n
          ));
        }
        emitNotificationsChanged();
      } catch {
        // Fallback
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
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
      emitNotificationsChanged();
    } catch {
      // Ignore error for now on mobile
    }
  };

  const handleDelete = async (notificationId) => {
    if (!notificationId || activeDeleteId) return;
    setActiveDeleteId(notificationId);
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      emitNotificationsChanged();
    } catch {
      // Ignore error
    } finally {
      setActiveDeleteId('');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-['Inter'] pb-24">
      {/* Header Area */}
      <div className="bg-white px-5 pt-6 pb-4 rounded-b-[32px] shadow-[0_8px_30px_rgba(0,61,155,0.06)] relative z-10">
        <div className="flex justify-end items-center mb-4">
          <button 
            onClick={handleMarkAllRead}
            className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 active:bg-slate-100 transition-colors"
          >
            <CheckCheck size={20} />
          </button>
        </div>

        {/* Filters Scrollable Row */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {NOTIFICATION_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-[14px] text-[13px] font-bold transition-colors ${
                activeFilter === filter.id
                  ? 'bg-[#003d9b] text-white shadow-md shadow-[#003d9b]/20'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 active:bg-slate-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 px-4 mt-6 flex flex-col gap-3">
        {isLoading && currentPage === 1 ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-[24px] h-[100px] border border-slate-100" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 bg-[#e9edff] text-[#003d9b] rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Bell size={32} />
            </div>
            <h3 className="font-['Hanken_Grotesk'] text-[18px] font-bold text-slate-800">All caught up!</h3>
            <p className="text-[14px] text-slate-500 mt-2">
              You have no {activeFilter === 'all' ? '' : activeFilter} notifications at the moment.
            </p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => handleMarkRead(notification)}
                className={`relative flex items-start gap-4 p-4 rounded-[24px] border transition-all active:scale-[0.98] ${
                  notification.isRead 
                    ? 'bg-white border-slate-200 shadow-sm' 
                    : 'bg-[#f4f7ff] border-[#003d9b]/20 shadow-sm'
                }`}
              >
                {!notification.isRead && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                )}
                
                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center shadow-sm ${
                  notification.isRead ? 'bg-slate-50 border border-slate-100' : 'bg-white border border-[#e9edff]'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 pr-2">
                  <h4 className={`text-[15px] font-bold leading-tight ${
                    notification.isRead ? 'text-slate-800' : 'text-[#003d9b]'
                  }`}>
                    {notification.title}
                  </h4>
                  <p className={`text-[13px] mt-1 line-clamp-2 ${
                    notification.isRead ? 'text-slate-500' : 'text-slate-700 font-medium'
                  }`}>
                    {notification.message}
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-2">
                    {formatNotificationTimeAgo(notification.createdAt)}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification._id);
                  }}
                  disabled={activeDeleteId === notification._id}
                  className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center active:bg-rose-50 active:text-rose-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {currentPage < pagination.totalPages && (
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="w-full py-4 mt-2 mb-6 rounded-[20px] bg-white border border-slate-200 text-[14px] font-bold text-[#003d9b] active:bg-slate-50"
              >
                {isLoading ? 'Loading...' : 'Load older notifications'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MobileNotifications;
