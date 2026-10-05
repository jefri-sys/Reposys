import { startTransition, useContext, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Clock3,
  CreditCard,
  WalletCards,
  Download,
  FileText,
  Info,
  MessageCircle,
  Package,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContextObject';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { formatNotificationTimeAgo } from '../../utils/notifications';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import MobileHome from './MobileHome';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Input,
  Select,
  EmptyState,
  LoadingState
} from '../../components/ui';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const ACTIVE_ORDER_STATUSES = ['In_Queue', 'Processing'];
const ACTIVE_STATS_STATUSES = ['In_Queue', 'Processing', 'ReadyForPickup'];

const ROLE_BADGE_STYLES = {
  Student: 'primary',
  Faculty: 'success',
};

const STATUS_STYLES = {
  Pending: 'warning',
  In_Queue: 'primary',
  Processing: 'purple',
  ReadyForPickup: 'success',
  Completed: 'success',
  Cancelled: 'danger',
};
const RECENT_ORDER_STATUS_FILTERS = ['All', ...Object.keys(STATUS_STYLES)];

const NOTIFICATION_TYPE_STYLES = {
  order_update: { Icon: Package, shellClass: 'bg-sky-100 text-sky-700' },
  payment: { Icon: CreditCard, shellClass: 'bg-emerald-100 text-emerald-700' },
  complaint: { Icon: MessageCircle, shellClass: 'bg-red-100 text-red-700' },
  inventory: { Icon: AlertTriangle, shellClass: 'bg-amber-100 text-amber-700' },
  system: { Icon: Info, shellClass: 'bg-slate-200 text-slate-700' },
  rating_prompt: { Icon: Star, shellClass: 'bg-yellow-100 text-yellow-700' },
  queue_update: { Icon: Bell, shellClass: 'bg-sky-100 text-sky-700' },
};

const QUICK_ACTIONS = [
  { title: 'New Order', description: 'Upload files and place a fresh reprography request.', to: '/orders/new', Icon: FileText },
  { title: 'My Orders', description: 'Review live jobs, past receipts, and full order history.', to: '/orders', Icon: Package },
  { title: 'My Complaints', description: 'Track issues, responses, and follow-ups from the team.', to: '/complaints', Icon: MessageCircle },
  { title: 'Document Tools', description: 'Use quick tools before you submit your next print job.', to: '/tools', Icon: Sparkles },
  { title: 'Wallet', description: 'Manage your digital wallet balance and top up.', to: '/wallet', Icon: WalletCards },
  { title: 'Friends', description: 'Search for classmates and manage friend requests.', to: '/friends', Icon: Users },
  { title: 'Chat', description: 'Message your friends and groups in real-time.', to: '/chat', Icon: MessageCircle },
];

const formatOrderState = (value = '') => value.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();

const formatDate = (value) => (
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'
);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getOrderCost = (order) => Number(order?.finalCost ?? order?.estimatedCost ?? 0);

const getSectionError = (message) => (
  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
    {message}
  </div>
);

const useCountUp = (value, duration = 900) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const targetValue = Number(value) || 0;
    if (targetValue === 0) {
      setDisplayValue(0);
      return undefined;
    }
    let frameId = 0;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - ((1 - progress) ** 3);
      setDisplayValue(targetValue * easedProgress);
      if (progress < 1) frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [duration, value]);

  return displayValue;
};

const StatCard = ({ label, helper, value, formatter }) => {
  const animatedValue = useCountUp(value);
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{formatter(animatedValue)}</p>
        <p className="mt-1 text-sm text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
};

const QuickActionCard = ({ action, unreadCount, pendingFriendsCount, onChatClick }) => {
  const { Icon, description, title, to } = action;
  return (
    <Card className="group h-full transition-all duration-200 hover:shadow-md hover:border-slate-300">
      <Link to={to} onClick={title === 'Chat' ? onChatClick : undefined} className="flex flex-col h-full p-5 sm:p-6">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-sky-50 group-hover:text-sky-600 mb-4">
          <Icon className="h-6 w-6" />
          {title === 'Chat' && unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
              {unreadCount}
            </span>
          )}
          {title === 'Friends' && pendingFriendsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
              {pendingFriendsCount}
            </span>
          )}
        </div>
        <div className="flex-1 flex flex-col">
          <h3 className="text-base font-semibold text-slate-900 flex items-center justify-between">
            {title}
            <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100 group-hover:translate-x-1" />
          </h3>
          <p className="mt-2 text-sm text-slate-500 line-clamp-2">{description}</p>
        </div>
      </Link>
    </Card>
  );
};

const NotificationPreview = ({ notification }) => {
  const notificationStyle = NOTIFICATION_TYPE_STYLES[notification?.type] || NOTIFICATION_TYPE_STYLES.system;
  const { Icon, shellClass } = notificationStyle;

  return (
    <div className="flex gap-4 p-4 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
      <div className={['mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full', shellClass].join(' ')}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{notification?.title || 'Notification'}</p>
            <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{notification?.message || ''}</p>
          </div>
          {!notification?.isRead && (
            <span className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-hidden="true" />
          )}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">{formatNotificationTimeAgo(notification?.createdAt)}</p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [recentOrderSearch, setRecentOrderSearch] = useState('');
  const [recentOrderStatusFilter, setRecentOrderStatusFilter] = useState('All');
  const [shopOpen, setShopOpen] = useState(true);
  const [waitInfo, setWaitInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptOrderId, setReceiptOrderId] = useState('');
  const [flashMessage, setFlashMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingFriendsCount, setPendingFriendsCount] = useState(0);
  const [usageSummary, setUsageSummary] = useState(null);
  const [errors, setErrors] = useState({
    orders: '',
    notifications: '',
    shopStatus: '',
  });

  const activeOrder = useMemo(() => recentOrders.find((order) => ACTIVE_ORDER_STATUSES.includes(order.status)) || null, [recentOrders]);
  const totalOrdersPlaced = Number(usageSummary?.totalOrders ?? user?.totalOrders ?? 0);
  const totalAmountSpent = Number(usageSummary?.totalSpend ?? user?.totalSpend ?? 0);
  const activeOrdersCount = recentOrders.filter((order) => ACTIVE_STATS_STATUSES.includes(order.status)).length;
  const pendingCollectionCount = recentOrders.filter((order) => order.status === 'ReadyForPickup').length;

  const visibleRecentOrders = useMemo(() => {
    const searchValue = recentOrderSearch.trim().toLowerCase();
    return recentOrders.filter((order) => {
      const matchesSearch = !searchValue || order.tokenNumber?.toLowerCase().includes(searchValue) || order.serviceType?.toLowerCase().includes(searchValue);
      const matchesStatus = recentOrderStatusFilter === 'All' || order.status === recentOrderStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [recentOrderSearch, recentOrders, recentOrderStatusFilter]);

  useEffect(() => {
    let isActive = true;
    const loadDashboard = async () => {
      setIsLoading(true);
      setFlashMessage('');

      const [ordersResult, notificationsResult, shopStatusResult, unreadResult, pendingFriendsResult, usageSummaryResult] = await Promise.allSettled([
        api.get('/orders/my-orders', { params: { limit: 5 } }),
        api.get('/notifications', { params: { limit: 3 } }),
        api.get('/config/shop-status'),
        api.get('/messages/unread-count'),
        api.get('/friends/pending'),
        api.get('/users/me/usage-summary'),
      ]);

      if (!isActive) return;

      const nextOrders = ordersResult.status === 'fulfilled' ? (Array.isArray(ordersResult.value.data?.orders) ? ordersResult.value.data.orders : []) : [];
      if (nextOrders.length > 0) {
        try { localStorage.setItem('reposys_last_orders', JSON.stringify(nextOrders)); } catch (e) { console.error(e); }
      }
      
      const nextNotifications = notificationsResult.status === 'fulfilled' ? (Array.isArray(notificationsResult.value.data?.notifications) ? notificationsResult.value.data.notifications : []) : [];
      const nextUnreadCount = unreadResult.status === 'fulfilled' ? (Number(unreadResult.value.data?.unreadCount) || 0) : 0;
      const nextPendingFriendsCount = pendingFriendsResult.status === 'fulfilled' ? (Array.isArray(pendingFriendsResult.value.data) ? pendingFriendsResult.value.data.length : 0) : 0;
      const nextUsageSummary = usageSummaryResult.status === 'fulfilled' ? usageSummaryResult.value.data : null;
      const nextErrors = {
        orders: ordersResult.status === 'rejected' ? (ordersResult.reason.response?.data?.message || 'Could not load your recent orders.') : '',
        notifications: notificationsResult.status === 'rejected' ? (notificationsResult.reason.response?.data?.message || 'Could not load recent notifications.') : '',
        shopStatus: shopStatusResult.status === 'rejected' ? (shopStatusResult.reason.response?.data?.message || 'Could not load the current shop status.') : '',
      };

      startTransition(() => {
        setRecentOrders(nextOrders);
        setRecentNotifications(nextNotifications);
        setShopOpen(shopStatusResult.status === 'fulfilled' ? shopStatusResult.value.data?.isOpen !== false : true);
        setUnreadCount(nextUnreadCount);
        setPendingFriendsCount(nextPendingFriendsCount);
        setUsageSummary(nextUsageSummary);
        setErrors(nextErrors);
      });
      setIsLoading(false);
    };

    loadDashboard();
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (!activeOrder?._id) {
      setWaitInfo(null);
      return undefined;
    }
    let isActive = true;
    const loadWaitInfo = async () => {
      try {
        const response = await api.get(`/orders/${activeOrder._id}/wait`);
        if (!isActive) return;
        startTransition(() => setWaitInfo(response.data || null));
      } catch {
        if (!isActive) return;
        startTransition(() => setWaitInfo(null));
      }
    };
    loadWaitInfo();
    return () => { isActive = false; };
  }, [activeOrder?._id, activeOrder?.status]);

  useEffect(() => {
    if (!socket) return undefined;
    if (user?._id) socket.emit('joinUserRoom', user._id);

    const handleQueueUpdate = (payload = {}) => {
      if (activeOrder?._id && payload.orderId && String(payload.orderId) !== String(activeOrder._id)) return;
      if (typeof payload.position !== 'number' && typeof payload.waitMinutes !== 'number') return;
      startTransition(() => {
        setWaitInfo((current) => ({
          position: payload.position ?? current?.position ?? null,
          waitMinutes: payload.waitMinutes ?? current?.waitMinutes ?? null,
        }));
      });
    };

    const handleOrderUpdate = (payload = {}) => {
      const incomingOrder = payload.order || null;
      if (!incomingOrder?._id) return;
      startTransition(() => {
        setRecentOrders((currentOrders) => {
          const dedupedOrders = [incomingOrder, ...currentOrders.filter((order) => String(order._id) !== String(incomingOrder._id))];
          return [...dedupedOrders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, 5);
        });
      });
    };

    const handleNotification = async () => {
      try {
        const response = await api.get('/notifications', { params: { limit: 3 } });
        startTransition(() => {
          setRecentNotifications(Array.isArray(response.data?.notifications) ? response.data.notifications : []);
          setErrors((current) => ({ ...current, notifications: '' }));
        });
      } catch (err) {
        startTransition(() => {
          setErrors((current) => ({ ...current, notifications: err.response?.data?.message || 'Could not refresh notifications.' }));
        });
      }
    };

    const handleShopClosed = () => setShopOpen(false);
    const handleShopOpened = () => setShopOpen(true);
    const handleNewMessage = (message) => {
      const recipientIdStr = message.recipientId?._id?.toString() || message.recipientId?.toString();
      if (recipientIdStr === user?._id?.toString()) setUnreadCount((prev) => prev + 1);
    };
    const handleFriendRequest = () => setPendingFriendsCount((prev) => prev + 1);

    socket.on('queue_update', handleQueueUpdate);
    socket.on('order_update', handleOrderUpdate);
    socket.on('notification', handleNotification);
    socket.on('shop_closed', handleShopClosed);
    socket.on('shop_opened', handleShopOpened);
    socket.on('newMessage', handleNewMessage);
    socket.on('friendRequest', handleFriendRequest);

    return () => {
      socket.off('queue_update', handleQueueUpdate);
      socket.off('order_update', handleOrderUpdate);
      socket.off('notification', handleNotification);
      socket.off('shop_closed', handleShopClosed);
      socket.off('shop_opened', handleShopOpened);
      socket.off('newMessage', handleNewMessage);
      socket.off('friendRequest', handleFriendRequest);
    };
  }, [activeOrder?._id, socket, user?._id]);

  const handleDownloadReceipt = async (orderId, tokenNumber) => {
    if (!orderId || receiptOrderId) return;
    setReceiptOrderId(orderId);
    setFlashMessage('');
    try {
      const response = await api.get(`/orders/${orderId}/receipt`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${tokenNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let errorMessage = 'Could not download the receipt.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch (e) {
          // ignore
        }
      } else {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setFlashMessage(errorMessage);
    } finally {
      setReceiptOrderId('');
    }
  };

  const width = useWindowWidth();
  if (width < 768) {
    return <MobileHome />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 sm:px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-8 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-r from-sky-50 via-sky-100 to-white bg-[length:200%_200%] animate-floating-gradient overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-700 mb-2">Dashboard</p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-4">
              {getGreeting()}, {user?.name || 'User'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge variant={ROLE_BADGE_STYLES[user?.role] || 'primary'} className="!px-3 !py-1">
                {user?.role || 'Student'}
              </Badge>
              {user?.verified && <Badge variant="success" className="!px-3 !py-1">Verified</Badge>}
            </div>
            <p className="text-sm font-medium text-slate-700">
              College ID: <span className="font-bold text-slate-900">{user?.collegeId || '--'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 relative z-10">
             <Button icon={FileText} size="lg" className="shadow-md" as={Link} to="/orders/new">
                New Order
             </Button>
          </div>
        </div>

        {!shopOpen && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800 flex items-start gap-3">
             <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
             The reprography centre is currently closed. You can place orders, but processing will begin when the shop opens.
          </div>
        )}

        {user?.pendingRoleApproval && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-5 py-4 text-sm font-medium text-orange-800 flex items-start gap-3">
             <Info className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
             Faculty role approval is pending. Your request will be reviewed by the admin shortly.
          </div>
        )}

        {errors.shopStatus && getSectionError(errors.shopStatus)}
        {flashMessage && getSectionError(flashMessage)}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Orders" helper="Lifetime requests" value={totalOrdersPlaced} formatter={(val) => Math.round(val).toLocaleString('en-IN')} />
          <StatCard label="Total Spent" helper="Lifetime expenditure" value={totalAmountSpent} formatter={(val) => CURRENCY_FORMATTER.format(val)} />
          <StatCard label="Active Orders" helper="Queued or processing" value={activeOrdersCount} formatter={(val) => Math.round(val).toLocaleString('en-IN')} />
          <StatCard label="Pending Pickup" helper="Ready for collection" value={pendingCollectionCount} formatter={(val) => Math.round(val).toLocaleString('en-IN')} />
        </div>

        {activeOrder && (
          <Card className="overflow-hidden shadow-sm border border-slate-200 bg-white">
            <CardContent className="p-6 sm:p-8">
               <div className="flex items-start justify-between mb-4">
                 <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">Active Order</span>
                 <span className="bg-sky-50 text-sky-600 border border-sky-100 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider animate-pulse">
                   {formatOrderState(activeOrder.status)}
                 </span>
               </div>
               
               <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 mb-2">
                 {activeOrder.tokenNumber}
               </h2>
               <p className="text-sm font-medium text-slate-500 mb-8">
                 {activeOrder.serviceType} / {activeOrder.pageCount || 0} page{activeOrder.pageCount !== 1 ? 's' : ''}
               </p>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                 <div className="rounded-3xl border border-sky-200 bg-sky-50/30 p-6 sm:p-8">
                   <p className="text-xs font-semibold text-sky-700 tracking-widest uppercase mb-4">Queue Position</p>
                   <p className="text-3xl font-semibold text-slate-900 mb-3">{waitInfo?.position ?? '--'}</p>
                   <p className="text-sm font-medium text-slate-500">Updated live from the queue service.</p>
                 </div>
                 <div className="rounded-3xl border border-indigo-200 bg-indigo-50/30 p-6 sm:p-8">
                   <p className="text-xs font-semibold text-indigo-700 tracking-widest uppercase mb-4">Estimated Wait</p>
                   <p className="text-3xl font-semibold text-slate-900 mb-3">{typeof waitInfo?.waitMinutes === 'number' ? `${waitInfo.waitMinutes}m` : '--'}</p>
                   <p className="text-sm font-medium text-slate-500">Time remaining before the counter reaches your job.</p>
                 </div>
               </div>

               <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
                 <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 mb-6 shadow-sm">
                   <Clock3 className="h-4 w-4 text-slate-500" />
                   <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Live Tracking Enabled</span>
                 </div>
                 <h3 className="text-xl font-semibold text-slate-900 mb-3">Track this order in real time</h3>
                 <p className="text-sm font-medium text-slate-500 mb-8">Queue and order updates are synced live, so this card stays current without a manual refresh.</p>
                 <Button as={Link} to={`/orders/${activeOrder._id}`} className="w-full h-14 text-lg font-medium rounded-2xl shadow-sm">
                   Track Live
                 </Button>
               </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard
                key={action.title}
                action={action}
                unreadCount={unreadCount}
                pendingFriendsCount={pendingFriendsCount}
                onChatClick={() => setUnreadCount(0)}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                 <div>
                   <CardTitle>Recent Orders</CardTitle>
                   <CardDescription>Your last 5 print requests.</CardDescription>
                 </div>
                 <Button variant="outline" size="sm" as={Link} to="/orders">View All</Button>
              </CardHeader>
              
              <CardContent className="p-0">
                 {recentOrders.length > 0 && (
                   <div className="p-4 border-b border-slate-100 bg-slate-50/50 grid gap-3 md:grid-cols-2">
                      <Input 
                        placeholder="Search token or service..." 
                        value={recentOrderSearch}
                        onChange={(e) => setRecentOrderSearch(e.target.value)}
                      />
                      <Select 
                        value={recentOrderStatusFilter}
                        onChange={(e) => setRecentOrderStatusFilter(e.target.value)}
                        options={RECENT_ORDER_STATUS_FILTERS.map(s => ({
                          value: s,
                          label: s === 'All' ? 'All statuses' : formatOrderState(s)
                        }))}
                      />
                   </div>
                 )}
                 
                 {errors.orders ? (
                   <div className="p-6 text-sm text-red-600 bg-red-50">{errors.orders}</div>
                 ) : recentOrders.length === 0 ? (
                   <EmptyState 
                     icon={Package} 
                     title="No orders yet" 
                     description="You haven't placed any print orders yet." 
                     action={<Button as={Link} to="/orders/new">Create Order</Button>}
                   />
                 ) : visibleRecentOrders.length === 0 ? (
                   <div className="p-12 text-center text-slate-500 text-sm">No recent orders match those filters.</div>
                 ) : (
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Token</TableHead>
                         <TableHead>Service</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead className="text-right">Action</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {visibleRecentOrders.map((order) => (
                         <TableRow key={order._id}>
                           <TableCell className="font-medium">{order.tokenNumber || '--'}</TableCell>
                           <TableCell>
                             <div className="flex flex-col">
                               <span>{order.serviceType || '--'}</span>
                               <span className="text-xs text-slate-400">{formatDate(order.createdAt)}</span>
                             </div>
                           </TableCell>
                           <TableCell>
                             <Badge variant={STATUS_STYLES[order.status] || 'default'}>
                               {formatOrderState(order.status)}
                             </Badge>
                           </TableCell>
                           <TableCell className="text-right">
                             <div className="flex items-center justify-end gap-2">
                               <Button variant="ghost" size="sm" as={Link} to={`/orders/${order._id}`}>View</Button>
                               {order.status === 'Completed' && (
                                 <Button 
                                   variant="outline" 
                                   size="sm"
                                   icon={Download}
                                   isLoading={receiptOrderId === order._id}
                                   onClick={() => handleDownloadReceipt(order._id, order.tokenNumber)}
                                 >
                                   Receipt
                                 </Button>
                               )}
                             </div>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Recent updates</CardDescription>
                </div>
                <Link to="/notifications" className="text-sm font-medium text-blue-600 hover:text-blue-700">See all</Link>
              </CardHeader>
              <CardContent className="p-0">
                {errors.notifications ? (
                   <div className="p-6 text-sm text-red-600 bg-red-50">{errors.notifications}</div>
                ) : recentNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-900">All caught up</p>
                    <p className="text-sm text-slate-500 mt-1">No new notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentNotifications.map((notification) => (
                      <NotificationPreview key={notification._id || `${notification.title}-${notification.createdAt}`} notification={notification} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
