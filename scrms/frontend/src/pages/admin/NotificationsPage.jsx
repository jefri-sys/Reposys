import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Bell, CheckCheck, ArrowLeft, Clock } from 'lucide-react';
import api from '../../services/api';
import { formatNotificationTimeAgo, getNotificationRoute } from '../../utils/notifications';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  PageHeader,
  EmptyState,
  Badge
} from '../../components/ui';

const URGENCY_FILTERS = [
  { id: 'all', label: 'All Notifications' },
  { id: 'Normal', label: 'Normal' },
  { id: 'Urgent', label: 'Urgent' },
];

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [markingId, setMarkingId] = useState('');
  const navigate = useNavigate();

  const limit = 20;

  const load = useCallback(async (pageNum) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/notifications/all?page=${pageNum}&limit=${limit}`);
      setNotifications(Array.isArray(res.data?.notifications) ? res.data.notifications : []);
      setTotal(res.data?.total ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  /* Client-side urgency filter */
  const displayed = useMemo(() => {
    if (urgencyFilter === 'all') return notifications;
    return notifications.filter((n) => n.urgency === urgencyFilter);
  }, [notifications, urgencyFilter]);

  const handleMarkRead = async (id) => {
    if (markingId) return;
    setMarkingId(id);
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      /* silent */
    } finally {
      setMarkingId('');
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* silent */
    }
  };

  const getVisiblePages = (currentPage, totalPagesCount) => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPagesCount, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: Math.max(0, end - adjustedStart + 1) }, (_, index) => adjustedStart + index);
  };

  const visiblePages = getVisiblePages(page, totalPages);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader 
          title="Notifications"
          description={`You have ${unreadCount} unread notifications out of ${total} total.`}
          actions={
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleMarkAll} 
                icon={CheckCheck}
                disabled={unreadCount === 0}
              >
                Mark all as read
              </Button>
              <Button as={Link} to="/admin" variant="primary" icon={ArrowLeft}>
                Back to Admin
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap gap-2">
          {URGENCY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setUrgencyFilter(f.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                urgencyFilter === f.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-slate-400" />
              Inbox
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={`sk-${i}`} className="p-5 flex gap-4 animate-pulse bg-white">
                    <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 w-3/4 rounded bg-slate-200" />
                      <div className="h-3 w-1/2 rounded bg-slate-100" />
                      <div className="h-2 w-24 rounded bg-slate-100 mt-4" />
                    </div>
                  </div>
                ))
              ) : displayed.length === 0 ? (
                <div className="p-12">
                  <EmptyState 
                    title="No notifications"
                    description={urgencyFilter === 'all' ? "You're all caught up. No new notifications." : `No ${urgencyFilter.toLowerCase()} notifications found.`}
                    icon={Bell}
                  />
                </div>
              ) : (
                displayed.map((n) => {
                  const isUrgent = n.urgency === 'Urgent';
                  const isUnread = !n.isRead;
                  
                  return (
                    <div
                      key={n._id}
                      className={`group relative flex gap-4 p-5 transition-colors hover:bg-slate-50 cursor-pointer ${
                        isUnread ? 'bg-blue-50/30' : 'bg-white'
                      }`}
                      onClick={() => {
                        if (isUnread) handleMarkRead(n._id);
                        navigate(getNotificationRoute(n, 'Admin'));
                      }}
                    >
                      {/* Left border indicator for unread */}
                      {isUnread && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                      )}
                      
                      {/* Icon */}
                      <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                        isUrgent ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isUrgent ? <AlertCircle className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4 mb-1">
                          <p className={`text-sm ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatNotificationTimeAgo(n.createdAt)}
                          </div>
                        </div>
                        
                        <p className={`text-sm mb-3 ${isUnread ? 'text-slate-700' : 'text-slate-500'}`}>
                          {n.message}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {n.relatedEntity && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                              {n.relatedEntity}
                            </Badge>
                          )}
                          {isUrgent && (
                            <Badge variant="danger" className="text-[10px] uppercase tracking-wider">
                              Urgent
                            </Badge>
                          )}
                          {isUnread && (
                            <Badge variant="primary" className="text-[10px] uppercase tracking-wider bg-blue-100 text-blue-700 border-blue-200">
                              New
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {isUnread && (
                        <div className="shrink-0 flex items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(n._id);
                            }}
                            disabled={markingId === n._id}
                            isLoading={markingId === n._id}
                          >
                            Mark Read
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm font-medium text-slate-500">
                  Page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{totalPages}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    Previous
                  </Button>

                  <div className="hidden sm:flex gap-1">
                    {visiblePages.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        disabled={isLoading}
                        className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${
                          pageNumber === page
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationsPage;
