import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import { formatNotificationTimeAgo, getNotificationRoute } from '../../utils/notifications';
import {
  Card,
  CardContent,
  Button,
  Badge,
  EmptyState,
  PageHeader,
  LoadingState
} from '../../components/ui';

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'orders', label: 'Orders' },
  { id: 'complaints', label: 'Complaints' },
  { id: 'reports', label: 'Reports' },
];

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
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

  /* Client-side type filter */
  const displayed = useMemo(() => {
    if (typeFilter === 'all') return notifications;
    
    return notifications.filter((n) => {
      const title = n.title.toLowerCase();
      const isOrder = n.type === 'order_update' || n.type === 'payment' || n.type === 'queue_update' || title.includes('order');
      const isComplaint = n.type === 'complaint' || title.includes('complaint');
      const isReport = n.type === 'inventory' || n.type === 'system' || title.includes('report');

      if (typeFilter === 'orders') return isOrder;
      if (typeFilter === 'complaints') return isComplaint;
      if (typeFilter === 'reports') {
        // Only show as report if it's NOT an order or complaint (since those often use 'system' type)
        return isReport && !isOrder && !isComplaint;
      }
      return true;
    });
  }, [notifications, typeFilter]);

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

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader 
          title="Notifications"
          description={`${total} total notifications`}
          actions={
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={handleMarkAll}
                icon={CheckCheck}
              >
                Mark all read
              </Button>
              <Button 
                as={Link} 
                to="/staff" 
                variant="outline"
                icon={ArrowLeft}
              >
                Back to Dashboard
              </Button>
            </div>
          }
        />

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setTypeFilter(f.id)}
              className={[
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                typeFilter === f.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-12">
              <LoadingState message="Loading notifications..." />
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-12">
              <EmptyState 
                icon={Bell}
                title="No notifications"
                description="You're all caught up here."
              />
            </div>
          ) : (
            displayed.map((n) => {
              const isUrgent = n.urgency === 'Urgent';
              const isUnread = !n.isRead;
              return (
                <Card
                  key={n._id}
                  className={`transition-all duration-200 cursor-pointer overflow-hidden ${
                    isUnread ? 'bg-blue-50/30' : 'bg-white'
                  } ${isUrgent ? 'border-l-4 border-l-red-500' : ''}`}
                  onClick={() => {
                    if (isUnread) handleMarkRead(n._id);
                    navigate(getNotificationRoute(n, 'Staff'));
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <span
                          className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                            isUrgent ? 'bg-red-500' : isUnread ? 'bg-blue-500' : 'bg-slate-300'
                          }`}
                          title={n.urgency}
                        />
                        <div>
                          <p className={`text-base ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                            {n.title}
                          </p>
                          <p className={`mt-1 text-sm leading-relaxed ${isUnread ? 'text-slate-700' : 'text-slate-500'}`}>
                            {n.message}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {n.relatedEntity && (
                              <Badge variant="secondary" className="text-[10px]">
                                {n.relatedEntity}
                              </Badge>
                            )}
                            <span className="text-xs text-slate-400">
                              {formatNotificationTimeAgo(n.createdAt)}
                            </span>
                            {isUnread ? (
                              <Badge variant="primary" className="text-[10px]">Unread</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Read</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {isUnread && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(n._id);
                          }}
                          disabled={markingId === n._id}
                          isLoading={markingId === n._id}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              icon={ChevronLeft}
            >
              Previous
            </Button>
            <span className="text-sm font-medium text-slate-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
            >
              Next <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
