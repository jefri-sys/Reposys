import React, { startTransition, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArchiveX,
  ArrowUpDown,
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ClipboardList,
  Clock3,
  GripVertical,
  IndianRupee,
  LogOut,
  Mail,
  PackageCheck,
  Settings2,
  Store,
  Users,
  CheckCircle2,
  AlertCircle,
  Zap,
  Lock,
  Unlock,
  CalendarClock
} from 'lucide-react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContextObject';
import { useSocket } from '../../context/SocketContext';
import AdminNotificationBell from '../../components/notifications/AdminNotificationBell';
import PrinterManagement from '../../components/admin/PrinterManagement';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Badge,
  LoadingState,
  EmptyState,
  PageHeader
} from '../../components/ui';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const QUEUE_SERVICE_TYPES = ['Printing', 'Photocopying', 'Scanning', 'Binding'];
const EMPTY_QUEUE_MAP = QUEUE_SERVICE_TYPES.reduce((accumulator, serviceType) => ({
  ...accumulator,
  [serviceType]: [],
}), {});

const STAT_CARDS = [
  { key: 'totalOrdersToday', label: 'Total Orders Today', icon: ClipboardList, variant: 'blue' },
  { key: 'ordersInQueue', label: 'Orders In Queue', icon: Clock3, variant: 'amber' },
  { key: 'ordersProcessing', label: 'Orders Processing', icon: Boxes, variant: 'indigo' },
  { key: 'ordersReadyForPickup', label: 'Orders Ready for Pickup', icon: PackageCheck, variant: 'emerald' },
  {
    key: 'revenueToday',
    label: 'Revenue Today',
    icon: IndianRupee,
    variant: 'lime',
    formatValue: (value) => CURRENCY_FORMATTER.format(Number(value) || 0),
  },
  { key: 'openComplaints', label: 'Open Complaints', icon: AlertTriangle, variant: 'rose' },
  { key: 'itemsBelowThreshold', label: 'Items Below Threshold', icon: Boxes, variant: 'orange' },
  { key: 'uncollectedOrders', label: 'Uncollected Orders', icon: ArchiveX, variant: 'fuchsia' },
];

const NAV_LINKS = [
  {
    to: '/admin/users',
    label: 'User Management',
    description: 'Approve faculty roles, search users, and manage staff access.',
    icon: Users,
    variant: 'blue',
  },
  {
    to: '/admin/analytics',
    label: 'System Analytics',
    description: 'Review reports, trends, and exportable operational summaries.',
    icon: BarChart3,
    variant: 'violet',
  },
  {
    to: '/admin/transactions',
    label: 'Transaction History',
    description: 'Inspect payment records, filter by method or status, and review linked order details.',
    icon: IndianRupee,
    variant: 'emerald',
  },
  {
    to: '/admin/activity-logs',
    label: 'Activity Logs',
    description: 'Review admin audit entries with action filters, date range controls, and searchable descriptions.',
    icon: ClipboardList,
    variant: 'amber',
  },
  {
    to: '/admin/automation-logs',
    label: 'Automation Logs',
    description: 'Track SPAE events, monitor printer assignments, and audit background print jobs.',
    icon: Settings2,
    variant: 'slate',
  },
  {
    to: '/admin/complaints',
    label: 'Complaints',
    description: 'Handle complaint conversations, review filters, and update issue workflow from the admin console.',
    icon: AlertTriangle,
    variant: 'rose',
  },
  {
    to: '/admin/inventory',
    label: 'Inventory',
    description: 'Track stock levels, update paper and toner counts, and review depletion forecasts for key supplies.',
    icon: Boxes,
    variant: 'orange',
  },
  {
    to: '/admin/staff-reports',
    label: 'Staff Reports',
    description: 'Review, acknowledge, and resolve operational issues reported by staff.',
    icon: ClipboardList,
    variant: 'blue',
  },
  {
    to: '/admin/inquiries',
    label: 'Contact Inquiries',
    description: 'View and respond to support messages submitted by users.',
    icon: Mail,
    variant: 'indigo',
  },
];

const PRICING_FIELDS = [
  { key: 'printBW', label: 'B&W Print', prefix: 'Rs' },
  { key: 'printColour', label: 'Colour Print', prefix: 'Rs' },
  { key: 'doubleSidedMultiplier', label: 'Double-Sided Multiplier', prefix: 'x' },
  { key: 'photocopy', label: 'Photocopy', prefix: 'Rs' },
  { key: 'scanning', label: 'Scanning', prefix: 'Rs' },
  { key: 'bindingSpiral', label: 'Spiral Binding', prefix: 'Rs' },
  { key: 'bindingStaple', label: 'Staple Binding', prefix: 'Rs' },
];

const STATUS_BADGE_STYLES = {
  In_Queue: 'primary',
  Processing: 'indigo',
};

const ROLE_BADGE_STYLES = {
  Faculty: 'primary',
  Student: 'secondary',
  Staff: 'violet',
  Admin: 'danger',
  Guest: 'warning',
};

const EMPTY_PRICING_FORM = PRICING_FIELDS.reduce((accumulator, field) => ({
  ...accumulator,
  [field.key]: '',
}), {});

const QUEUE_SCROLL_STYLE = {
  scrollbarGutter: 'stable',
  scrollbarWidth: 'thin',
};
const QUEUE_AUTO_SCROLL_EDGE_PX = 96;
const QUEUE_AUTO_SCROLL_STEP_PX = 20;

const getQueueMapFromResponse = (payload = {}) => QUEUE_SERVICE_TYPES.reduce((accumulator, serviceType) => ({
  ...accumulator,
  [serviceType]: Array.isArray(payload[serviceType]) ? payload[serviceType] : [],
}), {});

const formatOrderState = (value = '') => value
  .replace(/_/g, ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .trim();

const getShopModeLabel = (source, isOpen) => {
  if (source === 'manual') {
    return isOpen ? 'Manually Open' : 'Manually Closed';
  }

  return 'Following Schedule';
};

const getNextOpenText = (nextOpenTime) => {
  if (!nextOpenTime) {
    return 'No future opening window is configured.';
  }

  const parsedDate = new Date(nextOpenTime);
  if (Number.isNaN(parsedDate.getTime())) {
    return `Next opening window: ${nextOpenTime}`;
  }

  return `Next opening window: ${parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

const StatCardSkeleton = () => (
  <Card className="animate-pulse shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="h-3 w-28 rounded-full bg-slate-200" />
          <div className="mt-4 h-8 w-24 rounded-lg bg-slate-200" />
        </div>
        <div className="h-12 w-12 rounded-xl bg-slate-200" />
      </div>
    </CardContent>
  </Card>
);

const StatCard = ({ label, value, icon: Icon, variant, formatValue }) => {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    lime: 'bg-lime-100 text-lime-700',
    rose: 'bg-rose-100 text-rose-700',
    orange: 'bg-orange-100 text-orange-700',
    fuchsia: 'bg-fuchsia-100 text-fuchsia-700',
    violet: 'bg-violet-100 text-violet-700',
  };

  return (
    <Card className="shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {formatValue ? formatValue(value) : value}
            </p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const QueueOrderCard = ({
  order,
  queueLength,
  isBusy,
  isDragging,
  isDropTarget,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const userRole = order.userId?.role || order.userRole || 'Guest';
  const userName = order.userId?.name || order.guestEmail || 'Guest user';
  const statusVariant = STATUS_BADGE_STYLES[order.status] || 'secondary';
  const roleVariant = ROLE_BADGE_STYLES[userRole] || 'secondary';

  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, order)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => onDragOver(event, order)}
      onDragLeave={() => onDragLeave(order)}
      onDrop={(event) => onDrop(event, order)}
      className={`rounded-xl border bg-white p-4 transition-all ${
        isDragging ? 'cursor-grabbing border-slate-300 opacity-60 shadow-none' : 'cursor-grab border-slate-200 hover:border-slate-300 shadow-sm'
      } ${isDropTarget ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 text-slate-400">
            <GripVertical className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Position {order.position}</p>
            <h3 className="text-lg font-semibold text-slate-900">{order.tokenNumber}</h3>
            <p className="text-sm text-slate-600 font-medium">{userName}</p>
          </div>
        </div>
        <Badge variant={statusVariant}>
          {formatOrderState(order.status)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant={roleVariant} className="text-[10px]">
          {userRole}
        </Badge>
        <Badge variant="secondary" className="text-[10px] bg-slate-50 border-slate-200 text-slate-700">
          {order.pageCount || 0} pages
        </Badge>
        <Badge variant="secondary" className="text-[10px] bg-slate-50 border-slate-200 text-slate-700">
          {order.estimatedDuration || 0} min
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onDragStart={(event) => event.preventDefault()}
          onClick={() => onMove(order, 'up')}
          disabled={isBusy || order.position <= 1}
          className="flex-1 text-xs"
          icon={ChevronUp}
        >
          Move Up
        </Button>
        <Button
          variant="outline"
          size="sm"
          onDragStart={(event) => event.preventDefault()}
          onClick={() => onMove(order, 'down')}
          disabled={isBusy || order.position >= queueLength}
          className="flex-1 text-xs"
          icon={ChevronDown}
        >
          Move Down
        </Button>
      </div>

      {isDropTarget && (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-blue-700 text-center">
          Drop here to move to position {order.position}
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const socket = useSocket();
  const [stats, setStats] = useState(null);
  const [pricingForm, setPricingForm] = useState(EMPTY_PRICING_FORM);
  const [spaeStatus, setSpaeStatus] = useState(null);
  const [shopStatus, setShopStatus] = useState({
    isOpen: true,
    source: 'schedule',
    nextOpenTime: null,
  });
  const [shopMode, setShopMode] = useState('manual_open');
  const [queueMap, setQueueMap] = useState(EMPTY_QUEUE_MAP);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isPricingLoading, setIsPricingLoading] = useState(true);
  const [isShopLoading, setIsShopLoading] = useState(true);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [shopAction, setShopAction] = useState('');
  const [draggedOrder, setDraggedOrder] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [pendingReorder, setPendingReorder] = useState(null);
  const [reorderReason, setReorderReason] = useState('');
  const [isSubmittingReorder, setIsSubmittingReorder] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const queueContainerRefs = useRef({});

  const totalQueuedOrders = useMemo(
    () => QUEUE_SERVICE_TYPES.reduce((total, serviceType) => total + queueMap[serviceType].length, 0),
    [queueMap]
  );

  const loadShopStatus = async () => {
    const response = await api.get('/config/shop-status');
    const payload = response.data || {};

    startTransition(() => {
      setShopStatus({
        isOpen: payload.isOpen !== false,
        source: payload.source || 'schedule',
        nextOpenTime: payload.nextOpenTime || null,
      });
      if (payload.shopMode) {
        setShopMode(payload.shopMode);
      } else {
        const derivedMode = payload.source === 'schedule'
          ? 'schedule'
          : (payload.isOpen !== false ? 'manual_open' : 'manual_close');
        setShopMode(derivedMode);
      }
    });
  };

  const loadQueues = async () => {
    const response = await api.get('/queue');
    startTransition(() => {
      setQueueMap(getQueueMapFromResponse(response.data));
    });
  };

  useEffect(() => {
    let isActive = true;

    const loadDashboard = async () => {
      setError('');
      setMessage('');
      setIsStatsLoading(true);
      setIsPricingLoading(true);
      setIsShopLoading(true);
      setIsQueueLoading(true);

      const [statsResult, pricingResult, shopResult, queueResult, spaeResult] = await Promise.allSettled([
        api.get('/admin/dashboard-stats'),
        api.get('/admin/pricing'),
        api.get('/config/shop-status'),
        api.get('/queue'),
        api.get('/automation/status')
      ]);

      if (!isActive) {
        return;
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data?.stats || {});
      } else {
        setError(statsResult.reason?.response?.data?.message || 'Could not load dashboard statistics.');
      }

      if (pricingResult.status === 'fulfilled') {
        const pricing = pricingResult.value.data?.pricing || {};
        startTransition(() => {
          setPricingForm(PRICING_FIELDS.reduce((accumulator, field) => ({
            ...accumulator,
            [field.key]: typeof pricing[field.key] === 'number' ? String(pricing[field.key]) : '',
          }), {}));
        });
      } else if (statsResult.status === 'fulfilled') {
        setError('Could not load system pricing.');
      }

      if (shopResult.status === 'fulfilled') {
        const payload = shopResult.value.data || {};
        setShopStatus({
          isOpen: payload.isOpen !== false,
          source: payload.source || 'schedule',
          nextOpenTime: payload.nextOpenTime || null,
        });
        if (payload.shopMode) {
          setShopMode(payload.shopMode);
        } else {
          const derivedMode = payload.source === 'schedule'
            ? 'schedule'
            : (payload.isOpen !== false ? 'manual_open' : 'manual_close');
          setShopMode(derivedMode);
        }
      } else if (statsResult.status === 'fulfilled') {
        setError('Could not load shop status.');
      }

      if (queueResult.status === 'fulfilled') {
        setQueueMap(getQueueMapFromResponse(queueResult.value.data));
      } else if (statsResult.status === 'fulfilled') {
        setError(queueResult.reason?.response?.data?.message || 'Could not load queue data.');
      }

      if (spaeResult.status === 'fulfilled') {
        setSpaeStatus(spaeResult.value.data);
      }

      setIsStatsLoading(false);
      setIsPricingLoading(false);
      setIsShopLoading(false);
      setIsQueueLoading(false);
    };

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleQueueUpdate = (payload = {}) => {
      if (!payload.serviceType || !QUEUE_SERVICE_TYPES.includes(payload.serviceType)) {
        return;
      }

      startTransition(() => {
        setQueueMap((current) => ({
          ...current,
          [payload.serviceType]: Array.isArray(payload.queue) ? payload.queue : [],
        }));
      });
    };

    socket.on('queue_update', handleQueueUpdate);

    return () => {
      socket.off('queue_update', handleQueueUpdate);
    };
  }, [socket]);

  const handlePricingInputChange = (event) => {
    const { name, value } = event.target;
    setPricingForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSavePricing = async (event) => {
    event.preventDefault();
    setIsSavingPricing(true);
    setError('');
    setMessage('');

    try {
      const pricingPayload = PRICING_FIELDS.reduce((accumulator, field) => {
        const numericValue = Number(pricingForm[field.key]);
        if (!Number.isFinite(numericValue)) {
          throw new Error(`Enter a valid number for ${field.label}.`);
        }

        return {
          ...accumulator,
          [field.key]: numericValue,
        };
      }, {});

      await api.patch('/admin/pricing', {
        pricing: pricingPayload,
      });

      setMessage('Pricing updated. New estimates will use the revised service rates immediately.');
      setTimeout(() => setMessage(''), 5000);
    } catch (saveError) {
      setError(saveError.response?.data?.message || saveError.message || 'Could not update pricing.');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleShopModeChange = async (nextState) => {
    setShopAction(String(nextState));
    setError('');
    setMessage('');

    try {
      const response = await api.patch('/admin/shop/toggle', {
        isManuallyOpen: nextState,
      });

      await loadShopStatus();
      setMessage(response.data?.message || 'Shop status updated.');
      setTimeout(() => setMessage(''), 5000);
    } catch (shopError) {
      setError(shopError.response?.data?.message || 'Could not update the shop status.');
    } finally {
      setShopAction('');
    }
  };

  const handleFollowSchedule = async () => {
    setShopAction('null');
    try {
      const response = await api.post('/admin/follow-schedule');
      await loadShopStatus();
      setShopMode('schedule');
    } catch (err) {
      console.error('Follow schedule error:', err);
      setError('Could not update schedule mode.');
    } finally {
      setShopAction('');
    }
  };

  const handleDragStart = (event, order) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(order._id));

    setDraggedOrder({
      orderId: String(order._id),
      tokenNumber: order.tokenNumber,
      serviceType: order.serviceType,
      currentPosition: order.position,
    });
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedOrder(null);
    setDropTarget(null);
  };

  const autoScrollQueueContainer = (serviceType, clientY) => {
    const container = queueContainerRefs.current[serviceType];
    if (!container) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    const distanceFromTop = clientY - bounds.top;
    const distanceFromBottom = bounds.bottom - clientY;

    if (distanceFromTop < QUEUE_AUTO_SCROLL_EDGE_PX) {
      const intensity = (QUEUE_AUTO_SCROLL_EDGE_PX - distanceFromTop) / QUEUE_AUTO_SCROLL_EDGE_PX;
      container.scrollTop -= Math.ceil(QUEUE_AUTO_SCROLL_STEP_PX * Math.max(intensity, 0.35));
      return;
    }

    if (distanceFromBottom < QUEUE_AUTO_SCROLL_EDGE_PX) {
      const intensity = (QUEUE_AUTO_SCROLL_EDGE_PX - distanceFromBottom) / QUEUE_AUTO_SCROLL_EDGE_PX;
      container.scrollTop += Math.ceil(QUEUE_AUTO_SCROLL_STEP_PX * Math.max(intensity, 0.35));
    }
  };

  const handleCardDragOver = (event, order) => {
    if (!draggedOrder || draggedOrder.serviceType !== order.serviceType || draggedOrder.orderId === String(order._id)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    autoScrollQueueContainer(order.serviceType, event.clientY);
    setDropTarget({
      serviceType: order.serviceType,
      orderId: String(order._id),
    });
  };

  const handleCardDragLeave = (order) => {
    if (dropTarget?.orderId === String(order._id)) {
      setDropTarget(null);
    }
  };

  const handleCardDrop = (event, order) => {
    event.preventDefault();

    if (!draggedOrder || draggedOrder.serviceType !== order.serviceType || draggedOrder.orderId === String(order._id)) {
      return;
    }

    setPendingReorder({
      orderId: draggedOrder.orderId,
      tokenNumber: draggedOrder.tokenNumber,
      serviceType: draggedOrder.serviceType,
      currentPosition: draggedOrder.currentPosition,
      newPosition: order.position,
      direction: draggedOrder.currentPosition > order.position ? 'up' : 'down',
    });
    setReorderReason('');
    setDraggedOrder(null);
    setDropTarget(null);
  };

  const handleQueueContainerDragOver = (event, serviceType) => {
    if (!draggedOrder || draggedOrder.serviceType !== serviceType) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    autoScrollQueueContainer(serviceType, event.clientY);
  };

  const handleQueueMove = (order, direction) => {
    const newPosition = direction === 'up' ? order.position - 1 : order.position + 1;
    if (newPosition < 1) {
      return;
    }

    setPendingReorder({
      orderId: String(order._id),
      tokenNumber: order.tokenNumber,
      serviceType: order.serviceType,
      currentPosition: order.position,
      newPosition,
      direction,
    });
    setReorderReason('');
    setDraggedOrder(null);
    setDropTarget(null);
  };

  const closeReorderModal = () => {
    setPendingReorder(null);
    setReorderReason('');
    setIsSubmittingReorder(false);
    setDraggedOrder(null);
    setDropTarget(null);
  };

  const submitReorder = async (event) => {
    event.preventDefault();

    if (!pendingReorder) {
      return;
    }

    const trimmedReason = reorderReason.trim();
    if (!trimmedReason) {
      setError('Reason is required for queue reorder.');
      return;
    }

    setIsSubmittingReorder(true);
    setError('');
    setMessage('');

    try {
      const response = await api.patch('/admin/queue/reorder', {
        orderId: pendingReorder.orderId,
        newPosition: pendingReorder.newPosition,
        reason: trimmedReason,
      });

      await loadQueues();
      closeReorderModal();
      setMessage(response.data?.success
        ? `Queue override saved for ${pendingReorder.tokenNumber}. Activity log entry created with your reason.`
        : 'Queue override saved.');
      setTimeout(() => setMessage(''), 5000);
    } catch (reorderError) {
      setError(reorderError.response?.data?.message || 'Could not reorder this queue item.');
      setIsSubmittingReorder(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="Operations Dashboard"
          actions={
            <div className="flex items-center gap-3">
              <AdminNotificationBell />
              <Button
                variant="dangerOutline"
                onClick={logout}
                icon={LogOut}
              >
                Logout
              </Button>
            </div>
          }
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {message}
          </div>
        )}

        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isStatsLoading
              ? Array.from({ length: 9 }, (_, index) => <StatCardSkeleton key={`stat-skeleton-${index}`} />)
              : (
                <>
                  {STAT_CARDS.map((card) => (
                    <StatCard
                      key={card.key}
                      label={card.label}
                      value={stats?.[card.key] ?? 0}
                      icon={card.icon}
                      variant={card.variant}
                      formatValue={card.formatValue}
                    />
                  ))}
                  <Card className={`shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${spaeStatus && !spaeStatus.spae?.enabled ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">SPAE Status</p>
                            <Badge variant={spaeStatus?.spae?.enabled ? 'success' : 'warning'} className="text-[10px]">
                              {spaeStatus?.spae?.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <p className="text-xl font-semibold tracking-tight text-slate-900 mt-1">
                            {spaeStatus?.activeJobs ?? 0} Active Jobs
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Queue: {spaeStatus?.activeJobs ?? 0} / {spaeStatus?.spae?.maxQueueSize ?? 0}
                          </p>
                        </div>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${spaeStatus?.spae?.enabled ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                          <Zap className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Settings2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Pricing</p>
                  <CardTitle>Service price controls</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSavePricing}>
                <div className="grid gap-5 md:grid-cols-2">
                  {PRICING_FIELDS.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">{field.label}</label>
                      <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
                        <span className="px-4 text-sm font-semibold text-slate-500 border-r border-slate-200">{field.prefix}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name={field.key}
                          value={pricingForm[field.key]}
                          onChange={handlePricingInputChange}
                          disabled={isPricingLoading || isSavingPricing}
                          className="w-full bg-white px-4 py-2.5 text-sm text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-4">
                  <Button
                    type="submit"
                    disabled={isPricingLoading || isSavingPricing}
                    isLoading={isSavingPricing}
                    className="w-full sm:w-auto min-w-[140px]"
                  >
                    Save Pricing
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Shop Status</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className={`rounded-xl border px-5 py-5 ${
                shopStatus.isOpen ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
              }`}>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Current State</p>
                <p className="text-3xl font-bold">{shopStatus.isOpen ? 'Shop is Open' : 'Shop is Closed'}</p>
                <p className="mt-2 text-sm font-medium opacity-90">
                  {shopMode === 'schedule' ? 'Following Schedule' :
                    shopMode === 'manual_close' ? 'Manually Closed' :
                      'Manually Open'}
                </p>
                {!shopStatus.isOpen && (
                  <p className="mt-2 text-sm opacity-80">{getNextOpenText(shopStatus.nextOpenTime)}</p>
                )}
              </div>

              <div className="mt-6 grid gap-5">
                <Button
                  variant="primary"
                  icon={Unlock}
                  onClick={() => handleShopModeChange(true)}
                  disabled={isShopLoading || shopAction !== '' || shopMode === 'manual_open'}
                  isLoading={shopAction === 'true'}
                >
                  Force Open Shop
                </Button>
                <Button
                  variant="danger"
                  icon={Lock}
                  onClick={() => handleShopModeChange(false)}
                  disabled={isShopLoading || shopAction !== '' || shopMode === 'manual_close'}
                  isLoading={shopAction === 'false'}
                >
                  Force Close Shop
                </Button>
                <Button
                  variant="outline"
                  icon={CalendarClock}
                  onClick={handleFollowSchedule}
                  disabled={isShopLoading || shopAction !== '' || shopMode === 'schedule'}
                  isLoading={shopAction === 'null'}
                >
                  Return to Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4 pt-4 border-t border-slate-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Navigation</p>
            <h2 className="text-2xl font-bold text-slate-900">Admin tools</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {NAV_LINKS.map(({ to, label, description, icon: Icon, variant }) => {
              const colorMap = {
                blue: 'bg-blue-100 text-blue-700',
                amber: 'bg-amber-100 text-amber-700',
                indigo: 'bg-indigo-100 text-indigo-700',
                emerald: 'bg-emerald-100 text-emerald-700',
                rose: 'bg-rose-100 text-rose-700',
                orange: 'bg-orange-100 text-orange-700',
                violet: 'bg-violet-100 text-violet-700',
              };

              return (
                <Link
                  key={to}
                  to={to}
                  className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md flex flex-col h-full"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${colorMap[variant]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{label}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed flex-1">{description}</p>
                  <div className="mt-4 pt-4 border-t border-slate-100 text-sm font-semibold text-blue-600 transition-colors group-hover:text-blue-700 flex items-center">
                    Open section
                    <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <PrinterManagement />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Queue Override</p>
            </div>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              {isQueueLoading ? 'Loading queues...' : `${totalQueuedOrders} active queue items`}
            </Badge>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {QUEUE_SERVICE_TYPES.map((serviceType) => {
              const queue = queueMap[serviceType] || [];

              return (
                <Card key={serviceType} className="bg-slate-50 border-slate-200">
                  <CardHeader className="pb-3 border-b border-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{serviceType}</CardTitle>
                      </div>
                      <Badge variant="outline" className="bg-white gap-1.5" icon={ArrowUpDown}>
                        {queue.length} items
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isQueueLoading ? (
                      <div className="p-10">
                        <LoadingState message={`Loading ${serviceType.toLowerCase()} queue...`} />
                      </div>
                    ) : queue.length === 0 ? (
                      <div className="p-10">
                        <EmptyState 
                          title="Empty queue"
                          description="No active orders in this sub-queue right now."
                        />
                      </div>
                    ) : (
                      <div
                        className="max-h-[34rem] overflow-y-auto p-4 space-y-3"
                        style={QUEUE_SCROLL_STYLE}
                        ref={(node) => {
                          queueContainerRefs.current[serviceType] = node;
                        }}
                        onDragOver={(event) => handleQueueContainerDragOver(event, serviceType)}
                      >
                        {queue.map((order) => (
                          <QueueOrderCard
                            key={order._id}
                            order={order}
                            queueLength={queue.length}
                            isBusy={isSubmittingReorder}
                            isDragging={draggedOrder?.orderId === String(order._id)}
                            isDropTarget={dropTarget?.orderId === String(order._id)}
                            onMove={handleQueueMove}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleCardDragOver}
                            onDragLeave={handleCardDragLeave}
                            onDrop={handleCardDrop}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>

      {pendingReorder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 sm:p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Confirm Queue Override</p>
            <h2 className="text-2xl font-bold text-slate-900">Reason required</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              <span className="font-semibold">{pendingReorder.tokenNumber}</span> will move {pendingReorder.direction === 'up' ? 'up' : 'down'} in the <span className="font-semibold">{pendingReorder.serviceType}</span> queue from position {pendingReorder.currentPosition} to position {pendingReorder.newPosition}.
            </p>

            <form className="mt-6 space-y-5" onSubmit={submitReorder}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Reason for manual reorder</label>
                <textarea
                  required
                  rows={4}
                  value={reorderReason}
                  onChange={(event) => setReorderReason(event.target.value)}
                  placeholder="Explain why this order needs to move."
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-shadow focus-visible:border-sky-500 focus-visible:ring-1 focus-visible:ring-sky-500 resize-none"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-start gap-3 text-sm text-slate-600">
                <AlertCircle className="h-5 w-5 shrink-0 text-slate-400" />
                <p>This action is logged with your admin ID, the affected order, the reason, and the timestamp.</p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeReorderModal}
                  disabled={isSubmittingReorder}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingReorder || !reorderReason.trim()}
                  isLoading={isSubmittingReorder}
                  className="w-full sm:w-auto"
                >
                  Confirm Reorder
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
