import {
  startTransition,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  CheckCheck,
  ClipboardList,
  ExternalLink,
  Layers3,
  Lock,
  LogOut,
  Package,
  Printer,
  ScanSearch,
  Copy,
  BookCopy,
  X,
  Users,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContextObject';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import StaffNotificationBell from '../../components/notifications/StaffNotificationBell';
import StaffComplaintsPanel from '../../components/complaints/StaffComplaintsPanel';
import StaffInventoryPanel from '../../components/inventory/StaffInventoryPanel';
import StaffPrinterPanel from '../../components/ui/StaffPrinterPanel';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  LoadingState,
  EmptyState,
  PageHeader
} from '../../components/ui';

const SERVICE_TYPES = ['Printing', 'Photocopying', 'Scanning', 'Binding'];

const EMPTY_QUEUE_MAP = {
  Printing: [],
  Photocopying: [],
  Scanning: [],
  Binding: [],
};

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const SERVICE_ICONS = {
  Printing: Printer,
  Photocopying: Copy,
  Scanning: ScanSearch,
  Binding: BookCopy,
};

const ROLE_BADGE_VARIANTS = {
  Faculty: 'primary',
  Student: 'success',
  Guest: 'warning',
  Staff: 'secondary',
  Admin: 'danger',
};

const PAYMENT_BADGE_VARIANTS = {
  Cash_Pending: 'warning',
  Cash_Collected: 'success',
  Pending: 'secondary',
  Paid: 'success',
};

const STATUS_BADGE_VARIANTS = {
  In_Queue: 'primary',
  Processing: 'indigo',
  ReadyForPickup: 'success',
  Completed: 'success',
  Partial: 'warning',
};

const READY_FOR_PICKUP_STATUS = 'ReadyForPickup';
const QUEUE_BLOCKING_STATUSES = ['In_Queue', 'Processing'];

const formatOrderState = (value = '') => value
  .replace(/_/g, ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .trim();

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getQueueMapFromResponse = (payload = {}) => ({
  Printing: Array.isArray(payload.Printing) ? payload.Printing : [],
  Photocopying: Array.isArray(payload.Photocopying) ? payload.Photocopying : [],
  Scanning: Array.isArray(payload.Scanning) ? payload.Scanning : [],
  Binding: Array.isArray(payload.Binding) ? payload.Binding : [],
});

const toIdValue = (value) => (typeof value === 'object' && value !== null ? value._id || value.id || '' : value || '');
const getUserName = (order) => order.userId?.name || order.guestEmail || 'Guest user';
const getUserRole = (order) => order.userId?.role || order.userRole || (order.isGuest ? 'Guest' : 'User');
const getUserDepartment = (order) => order.userId?.department || '';
const getCompletedTimestamp = (order) => {
  const completedEntry = [...(order.statusHistory || [])]
    .reverse()
    .find((entry) => entry?.status === 'Completed');

  return completedEntry?.timestamp || order.updatedAt || order.createdAt || null;
};

const getQueueWaitMinutes = (queue, orderId) => {
  const queueIndex = queue.findIndex((queueOrder) => String(queueOrder._id) === String(orderId));

  if (queueIndex <= 0) {
    return 0;
  }

  return queue
    .filter((queueOrder, index) => (
      index < queueIndex && QUEUE_BLOCKING_STATUSES.includes(queueOrder.status)
    ))
    .reduce((total, queueOrder) => total + (Number(queueOrder.estimatedDuration) || 0), 0);
};

const computeIsPrimary = (order, staffAssignment) => {
  if (!staffAssignment || staffAssignment === 'All') {
    return true;
  }
  if (staffAssignment === 'Guest') {
    return order.isGuest === true;
  }
  const role = order.userRole || order.userId?.role || (order.isGuest ? 'Guest' : 'Student');
  return role === staffAssignment;
};

const NewOrderToast = ({ notification, onAction, onDismiss }) => (
  <div className="animate-in slide-in-from-top-2 fixed right-6 top-6 z-[100] flex w-80 flex-col gap-3 rounded-lg border border-sky-200 bg-white p-5 shadow-lg">
    <div className="flex items-start justify-between gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
        <Package className="h-5 w-5" />
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
    <div>
      <p className="text-sm font-bold text-slate-900">{notification.title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{notification.message}</p>
    </div>
    <Button
      onClick={() => onAction(notification)}
      className="w-full"
      size="sm"
    >
      View in Queue
    </Button>
  </div>
);

const CountdownBadge = ({ autoProcessAt }) => {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!autoProcessAt) return null;
    const diff = Math.floor((new Date(autoProcessAt).getTime() - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    if (!autoProcessAt) return;
    const interval = setInterval(() => {
      const diff = Math.floor((new Date(autoProcessAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [autoProcessAt]);

  if (secondsLeft === null || secondsLeft === undefined) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      Auto in {formatted}
    </div>
  );
};

const renderInventoryRows = (inventoryData) => {
  if (!inventoryData || typeof inventoryData !== 'object') {
    return [];
  }

  const summarySource = inventoryData.summary && typeof inventoryData.summary === 'object'
    ? inventoryData.summary
    : inventoryData;

  return Object.entries(summarySource)
    .filter(([, value]) => typeof value !== 'object')
    .slice(0, 6);
};

const METRIC_COLOR_MAP = {
  blue: { bg: 'bg-blue-100/70', icon: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-100/70', icon: 'text-emerald-600' },
  sky: { bg: 'bg-sky-100/70', icon: 'text-sky-600' },
  rose: { bg: 'bg-rose-100/70', icon: 'text-rose-600' },
};

const MetricCard = ({ label, value, icon: Icon, color = 'blue' }) => {
  const { bg, icon: iconColor } = METRIC_COLOR_MAP[color] || METRIC_COLOR_MAP.blue;

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex flex-col justify-center h-12">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 leading-none">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 leading-none tracking-tight">{value}</p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${bg} ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DetailRow = ({ label, value, valueClass = '' }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`mt-1 text-sm font-semibold text-slate-900 ${valueClass}`}>{value}</p>
  </div>
);

const QueueCard = ({ currentUserId, order, queue, onSelect, isPrimary = true, printJobMap = {} }) => {
  const role = getUserRole(order);
  const waitMinutes = getQueueWaitMinutes(queue, order._id);
  const isPickupPending = order.status === READY_FOR_PICKUP_STATUS;
  const isLockedByAnotherUser = Boolean(
    order.lockedBy && String(toIdValue(order.lockedBy)) !== String(currentUserId)
  );
  const printJob = printJobMap[order._id];

  return (
    <Card
      id={`order-${order._id}`}
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${isPickupPending
        ? 'border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50/30'
        : isPrimary
          ? 'border-slate-200 border-l-4 border-l-sky-500'
          : 'border-slate-200 border-l-4 border-l-slate-300 bg-slate-50/50'
        }`}
      onClick={() => onSelect(order)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Token Number</p>
            <h3 className="text-2xl font-bold text-slate-900">{order.tokenNumber}</h3>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={STATUS_BADGE_VARIANTS[order.status] || 'secondary'}>
              {formatOrderState(order.status)}
            </Badge>
            {order.autoProcessAt && order.status === 'In_Queue' && (
              <CountdownBadge autoProcessAt={order.autoProcessAt} />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm font-semibold text-slate-900">{getUserName(order)}</span>
          <Badge variant={ROLE_BADGE_VARIANTS[role] || 'secondary'}>{role}</Badge>

          {order.isGuest && (
            <Badge variant="warning">Guest</Badge>
          )}
          {order.paymentStatus === 'Cash_Pending' && (
            <Badge variant="warning">Cash</Badge>
          )}
          {isPickupPending && (
            <Badge variant="success" icon={Package}>Pickup Pending</Badge>
          )}
          {order.printConfig?.printInstructions && (
            <Badge variant="secondary" icon={ClipboardList}>Instructions</Badge>
          )}
          {isLockedByAnotherUser && (
            <Badge variant="danger" icon={Lock}>Locked</Badge>
          )}
          {order.isGroupOrder && (
            <Badge variant="primary" icon={Users}>
              {order.groupOrderId?.participants?.length ? `Group • ${order.groupOrderId.participants.length}` : 'Group'}
            </Badge>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailRow label="Service" value={order.serviceType} />
          <DetailRow label="Pages" value={order.pageCount ?? 0} />
          <DetailRow label="Queue Wait" value={`${waitMinutes} min`} />
          <DetailRow label="Est. Duration" value={`${order.estimatedDuration ?? 0} min`} />
        </div>

        {order.preferredPickupSlot && (
          <div className="mt-4">
            <Badge variant="secondary">Pickup: {order.preferredPickupSlot}</Badge>
          </div>
        )}

        {getUserDepartment(order) && (
          <p className="mt-3 text-sm text-slate-500">{getUserDepartment(order)}</p>
        )}

        {/* SPAE Print Job Info */}
        {printJob ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
            {printJob.status === 'Manual Required' ? (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 bg-slate-100 text-slate-500 font-semibold text-[10px]">MANUAL</span>
            ) : (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 bg-blue-100 text-blue-700 font-semibold text-[10px]">AUTO</span>
            )}
            {printJob.status && printJob.status !== 'Pending' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700">
                {printJob.status === 'Queued' && 'Waiting for dispatch'}
                {printJob.status === 'Assigned' && 'Printer selected'}
                {printJob.status === 'Dispatching' && 'Sending to Print Agent'}
                {printJob.status === 'Printing' && '🖨 Printer confirmed printing'}
                {printJob.status === 'Printed' && '✓ Printing completed'}
                {printJob.status === 'Inspection' && 'Staff quality check'}
                {printJob.status === 'Manual Required' && '⚠️ Manual Required'}
                {printJob.status === 'Failed' && '✗ Dispatch/printing failed'}
                {/* Fallbacks */}
                {printJob.status === 'Dispatched' && 'Sent to Printer'}
              </span>
            )}
            <span>Printer: {printJob.printerName}</span>
            <span>·</span>
            <span>Position: #{printJob.queuePosition}</span>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100 pt-2">
            <span className="inline-flex items-center rounded px-1.5 py-0.5 bg-slate-100 text-slate-500 font-semibold text-[10px]">MANUAL</span>
            <span>No print job assigned yet</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CompletedOrderCard = ({ order, onSelect }) => {
  const role = getUserRole(order);
  const completedTimestamp = getCompletedTimestamp(order);

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 hover:border-slate-300"
      onClick={() => onSelect(order)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Completed Order</p>
            <h3 className="text-2xl font-bold text-slate-900">{order.tokenNumber}</h3>
          </div>
          <Badge variant={STATUS_BADGE_VARIANTS[order.status] || 'secondary'}>
            {formatOrderState(order.status)}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm font-semibold text-slate-900">{getUserName(order)}</span>
          <Badge variant={ROLE_BADGE_VARIANTS[role] || 'secondary'}>{role}</Badge>
          <Badge variant={PAYMENT_BADGE_VARIANTS[order.paymentStatus] || 'secondary'}>
            {formatOrderState(order.paymentStatus)}
          </Badge>
          {order.isGroupOrder && (
            <Badge variant="primary" icon={Users}>
              {order.groupOrderId?.participants?.length ? `Group • ${order.groupOrderId.participants.length}` : 'Group'}
            </Badge>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailRow label="Service" value={order.serviceType} />
          <DetailRow label="Pages" value={order.pageCount ?? 0} />
          <DetailRow label="Completed" value={formatDateTime(completedTimestamp)} />
          <DetailRow label="Final Amount" value={CURRENCY_FORMATTER.format(order.finalCost || order.estimatedCost || 0)} />
        </div>
      </CardContent>
    </Card>
  );
};

const StaffDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const socket = useSocket();
  const [queueMap, setQueueMap] = useState(EMPTY_QUEUE_MAP);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [printJobMap, setPrintJobMap] = useState({});

  const fetchPrintJobs = async (allOrders, merge = false) => {
    if (!allOrders || allOrders.length === 0) return;
    const activeOrders = allOrders.filter(o => !['Completed', 'Cancelled'].includes(o.status));
    const results = await Promise.allSettled(
      activeOrders.map(order => api.get(`/automation/printjobs/${order._id}`))
    );
    const newMap = {};
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value?.data?.job) {
        newMap[activeOrders[index]._id] = result.value.data.job;
      }
    });
    if (merge) {
      setPrintJobMap(prev => ({ ...prev, ...newMap }));
    } else {
      setPrintJobMap(newMap);
    }
  };
  const [activeTab, setActiveTab] = useState('Printing');
  const [groupOrderFilter, setGroupOrderFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [shopOpen, setShopOpen] = useState(true);
  const [completedToday, setCompletedToday] = useState(0);
  const [staffAssignment, setStaffAssignment] = useState('All');
  const [showMyQueueOnly, setShowMyQueueOnly] = useState(false);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [inventoryUnavailable, setInventoryUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompletedLoading, setIsCompletedLoading] = useState(true);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [activeAction, setActiveAction] = useState('');
  const [activeDocumentId, setActiveDocumentId] = useState('');
  const [otp, setOtp] = useState('');
  const [partialPages, setPartialPages] = useState('');
  const [showPartialForm, setShowPartialForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeToast, setActiveToast] = useState(null);
  const selectedOrderIdRef = useRef('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [autoProcessingEnabled, setAutoProcessingEnabled] = useState(false);
  const [autoProcessingDelay, setAutoProcessingDelay] = useState(2);
  const [autoProcessingLoading, setAutoProcessingLoading] = useState(false);
  const [autoProcessingError, setAutoProcessingError] = useState('');
  const [autoProcessingSuccess, setAutoProcessingSuccess] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toastTimerRef = useRef(null);

  const handleToastAction = (notification) => {
    setActiveToast(null);
    clearTimeout(toastTimerRef.current);

    const serviceType = notification.relatedServiceType;
    if (serviceType && SERVICE_TYPES.includes(serviceType)) {
      setActiveTab(serviceType);

      // Give time for tab to switch then scroll
      setTimeout(() => {
        const element = document.getElementById(`order-${notification.relatedOrderId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-sky-500', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-sky-500', 'ring-offset-2');
          }, 3000);
        }
      }, 300);
    }
  };

  useEffect(() => {
    selectedOrderIdRef.current = selectedOrder?._id || '';
  }, [selectedOrder?._id]);

  useEffect(() => () => {
    if (selectedOrderIdRef.current) {
      api.patch(`/orders/${selectedOrderIdRef.current}/unlock`).catch(() => { });
    }
  }, []);

  const refreshCompletedOrders = async (options = {}) => {
    const { silent = false } = options;

    if (!silent) {
      setIsCompletedLoading(true);
    }

    try {
      const response = await api.get('/staff/orders/completed?limit=12');
      startTransition(() => {
        setCompletedOrders(Array.isArray(response.data?.orders) ? response.data.orders : []);
        if (typeof response.data?.completedToday === 'number') {
          setCompletedToday(response.data.completedToday);
        }
      });
    } catch {
      if (!silent) {
        setCompletedOrders([]);
      }
    } finally {
      if (!silent) {
        setIsCompletedLoading(false);
      }
    }
  };

  if (isMobile) {
    return <Navigate to="/staff/queue" replace />;
  }

  useEffect(() => {
    let isActive = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setIsCompletedLoading(true);
      setError('');

      const [queueResult, shopStatusResult, inventoryResult, completedResult] = await Promise.allSettled([
        api.get('/queue'),
        api.get('/config/shop-status'),
        api.get('/inventory/summary'),
        api.get('/staff/orders/completed?limit=12'),
      ]);

      if (!isActive) {
        return;
      }

      if (queueResult.status === 'rejected') {
        setError(queueResult.reason.response?.data?.message || 'Could not load the live queues.');
        setIsLoading(false);
        setIsCompletedLoading(false);
        return;
      }

      const newQueueMap = getQueueMapFromResponse(queueResult.value.data);
      startTransition(() => {
        setQueueMap(newQueueMap);
        setStaffAssignment(queueResult.value.data?.staffAssignment || 'All');
      });
      fetchPrintJobs(Object.values(newQueueMap).flat());

      if (shopStatusResult.status === 'fulfilled') {
        setShopOpen(shopStatusResult.value.data?.isOpen !== false);
      } else {
        setShopOpen(true);
      }

      if (inventoryResult.status === 'fulfilled') {
        setInventorySummary(inventoryResult.value.data || null);
        setInventoryUnavailable(false);
      } else {
        setInventorySummary(null);
        setInventoryUnavailable(true);
      }

      if (completedResult.status === 'fulfilled') {
        const completedData = completedResult.value.data;
        setCompletedOrders(Array.isArray(completedData?.orders) ? completedData.orders : []);
        if (typeof completedData?.completedToday === 'number') {
          setCompletedToday(completedData.completedToday);
        }
      } else {
        setCompletedOrders([]);
      }

      setIsLoading(false);
      setIsCompletedLoading(false);
    };

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const loadAutoProcessingConfig = async () => {
      try {
        const response = await api.get('/spae/auto-processing');
        if (response.data?.success) {
          setAutoProcessingEnabled(response.data.spae.autoProcessingEnabled ?? false);
          setAutoProcessingDelay(response.data.spae.autoProcessingDelay ?? 2);
        }
      } catch (err) {
        console.error('Failed to load auto-processing config:', err);
      }
    };
    loadAutoProcessingConfig();
  }, []);

  const handleSaveAutoProcessing = async () => {
    setAutoProcessingLoading(true);
    setAutoProcessingError('');
    setAutoProcessingSuccess('');
    try {
      const response = await api.patch('/spae/auto-processing', {
        autoProcessingEnabled,
        autoProcessingDelay,
      });
      if (response.data?.success) {
        setAutoProcessingSuccess('Auto-processing configuration saved.');
        setTimeout(() => setAutoProcessingSuccess(''), 3000);
      }
    } catch (err) {
      setAutoProcessingError(err.response?.data?.message || 'Failed to save configuration.');
    } finally {
      setAutoProcessingLoading(false);
    }
  };

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleQueueUpdate = (payload = {}) => {
      const resolvedServiceType = payload.serviceType || payload.queue?.[0]?.serviceType;

      if (!resolvedServiceType || !SERVICE_TYPES.includes(resolvedServiceType)) {
        return;
      }

      startTransition(() => {
        setQueueMap((current) => ({
          ...current,
          [resolvedServiceType]: Array.isArray(payload.queue) ? payload.queue : [],
        }));
      });
      if (Array.isArray(payload.queue)) {
        fetchPrintJobs(payload.queue, true);
      }
    };

    const handleOrderCompleted = () => {
      setCompletedToday((current) => current + 1);
    };

    const handleShopClosed = () => {
      setShopOpen(false);
    };

    const handleShopOpened = () => {
      setShopOpen(true);
    };

    const handleNotification = (data) => {
      // Only show toast if it's a new or cancelled order related to queue
      if (data.type === 'order_update' || data.title.includes('New Order') || data.title.includes('Cancelled')) {
        setActiveToast(data);
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setActiveToast(null), 8000);
      }
    };

    const handlePrintJobUpdate = (payload) => {
      if (!payload?.orderId || !payload?.status) return;
      setPrintJobMap((prev) => {
        const existingJob = prev[payload.orderId];
        if (!existingJob) return prev;
        return {
          ...prev,
          [payload.orderId]: {
            ...existingJob,
            status: payload.status,
            agentId: payload.agentId || existingJob.agentId,
          }
        };
      });
    };

    socket.on('queue_update', handleQueueUpdate);
    socket.on('order_completed', handleOrderCompleted);
    socket.on('shop_closed', handleShopClosed);
    socket.on('shop_opened', handleShopOpened);
    socket.on('notification', handleNotification);
    socket.on('print_job_update', handlePrintJobUpdate);
    socket.on('spae_job_created', (data) => {
      setPrintJobMap(prev => ({
        ...prev,
        [data.orderId]: { printerName: data.printerName, queuePosition: data.queuePosition, _id: data.printJobId }
      }));
    });

    return () => {
      socket.off('queue_update', handleQueueUpdate);
      socket.off('order_completed', handleOrderCompleted);
      socket.off('shop_closed', handleShopClosed);
      socket.off('shop_opened', handleShopOpened);
      socket.off('notification', handleNotification);
      socket.off('print_job_update', handlePrintJobUpdate);
      socket.off('spae_job_created');
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handlePrintJobUpdate = (payload) => {
      setPrintJobMap(prev => ({
        ...prev,
        [payload.orderId]: {
          ...(prev[payload.orderId] || {}),
          status: payload.status,
          _id: payload.printJobId || (prev[payload.orderId] && prev[payload.orderId]._id)
        }
      }));
    };
    socket.on('print_job_update', handlePrintJobUpdate);
    return () => socket.off('print_job_update', handlePrintJobUpdate);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleAgentUnavailable = (payload) => {
      console.warn('[StaffDashboard] Print Agent unavailable:', payload.message);
    };
    socket.on('print_agent_unavailable', handleAgentUnavailable);
    return () => socket.off('print_agent_unavailable', handleAgentUnavailable);
  }, [socket]);

  const closePanel = async () => {
    const orderId = selectedOrder?._id;

    startTransition(() => {
      setSelectedOrder(null);
      setOtp('');
      setPartialPages('');
      setShowPartialForm(false);
    });

    if (!orderId) {
      return;
    }

    try {
      await api.patch(`/orders/${orderId}/unlock`);
    } catch {
      // Ignore unlock cleanup errors during close.
    }
  };

  const handleLogout = async () => {
    if (selectedOrder?._id) {
      await api.patch(`/orders/${selectedOrder._id}/unlock`).catch(() => { });
    }

    await logout();
  };

  const openOrderPanel = async (queueOrder) => {
    if (!queueOrder?._id || isPanelLoading) {
      return false;
    }

    setMessage('');
    setError('');
    setIsPanelLoading(true);

    const previousOrderId = selectedOrder?._id;

    try {
      if (previousOrderId && previousOrderId !== queueOrder._id) {
        await api.patch(`/orders/${previousOrderId}/unlock`);
      }

      await api.patch(`/orders/${queueOrder._id}/lock`);
      const response = await api.get(`/orders/${queueOrder._id}`);

      startTransition(() => {
        setSelectedOrder(response.data?.order || queueOrder);
        setOtp('');
        setPartialPages('');
        setShowPartialForm(false);
      });
      return true;
    } catch (openError) {
      if (queueOrder?._id) {
        await api.patch(`/orders/${queueOrder._id}/unlock`).catch(() => { });
      }
      setError(openError.response?.data?.message || 'Could not open this order.');
      return false;
    } finally {
      setIsPanelLoading(false);
    }
  };

  const openCompletedOrderPanel = async (completedOrder) => {
    if (!completedOrder?._id || isPanelLoading) {
      return;
    }

    setMessage('');
    setError('');
    setIsPanelLoading(true);

    const previousOrderId = selectedOrder?._id;

    try {
      if (previousOrderId && previousOrderId !== completedOrder._id) {
        await api.patch(`/orders/${previousOrderId}/unlock`).catch(() => { });
      }

      const response = await api.get(`/orders/${completedOrder._id}`);

      startTransition(() => {
        setSelectedOrder(response.data?.order || completedOrder);
        setOtp('');
        setPartialPages('');
        setShowPartialForm(false);
      });
    } catch (openError) {
      setError(openError.response?.data?.message || 'Could not open this order.');
    } finally {
      setIsPanelLoading(false);
    }
  };

  const runOrderAction = async (actionKey, request, onSuccess) => {
    setActiveAction(actionKey);
    setMessage('');
    setError('');

    try {
      const response = await request();
      await onSuccess(response);
    } catch (actionError) {
      const nextMessage = actionError.response?.data?.message || 'Could not update this order.';
      if (nextMessage.includes('Shop is currently closed')) {
        setShopOpen(false);
      }
      setError(nextMessage);
    } finally {
      setActiveAction('');
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedOrder?._id) {
      return;
    }

    const confirmed = window.confirm(`Start processing order ${selectedOrder.tokenNumber}?`);
    if (!confirmed) {
      return;
    }

    await runOrderAction(
      'start-processing',
      () => api.post(`/orders/${selectedOrder._id}/start-processing`),
      async (response) => {
        const updatedOrder = response.data?.order || selectedOrder;
        startTransition(() => {
          setSelectedOrder(updatedOrder);
        });
        setMessage('Order moved to processing.');
        fetchPrintJobs([updatedOrder], true);
      }
    );
  };

  const handleReadyForPickup = async () => {
    if (!selectedOrder?._id) {
      return;
    }

    const confirmed = window.confirm(`Mark order ${selectedOrder.tokenNumber} as ready for pickup and send the OTP email?`);
    if (!confirmed) {
      return;
    }

    await runOrderAction(
      'ready-for-pickup',
      () => api.post(`/orders/${selectedOrder._id}/ready-for-pickup`),
      async (response) => {
        const updatedOrder = response.data?.order || selectedOrder;
        startTransition(() => {
          setSelectedOrder(updatedOrder);
          setOtp('');
          setShowPartialForm(false);
          setPartialPages('');
        });
        setMessage('Pickup OTP generated and email sent.');
        fetchPrintJobs([updatedOrder], true);
      }
    );
  };

  const handleVerifyOtp = async () => {
    if (!selectedOrder?._id) {
      return;
    }

    const otpToSubmit = otp.trim();

    if (!otpToSubmit) {
      setError('Enter the pickup OTP before completing this order.');
      return;
    }

    const confirmed = window.confirm(`Verify OTP and complete order ${selectedOrder.tokenNumber}?`);
    if (!confirmed) {
      return;
    }

    await runOrderAction(
      'verify-otp',
      () => api.post(`/orders/${selectedOrder._id}/verify-otp`, { otp: otpToSubmit }),
      async (response) => {
        startTransition(() => {
          setSelectedOrder((current) => current ? {
            ...current,
            status: 'Completed',
            lockedBy: null,
            lockedAt: null,
          } : current);
          setOtp('');
        });
        setCompletedToday((current) => current + 1);
        await refreshCompletedOrders({ silent: true });
        setMessage(response.data?.message || 'Order completed successfully.');
      }
    );
  };

  const handlePartialCompletion = async () => {
    if (!selectedOrder?._id) {
      return;
    }

    const parsedPages = Number(partialPages);
    if (!Number.isFinite(parsedPages) || parsedPages <= 0) {
      setError('Enter a valid number of completed pages.');
      return;
    }

    const confirmed = window.confirm(`Create a follow-up order after completing ${parsedPages} pages of ${selectedOrder.tokenNumber}?`);
    if (!confirmed) {
      return;
    }

    await runOrderAction(
      'partial-order',
      () => api.post(`/orders/${selectedOrder._id}/partial`, { pagesCompleted: parsedPages }),
      async (response) => {
        const updatedOrder = response.data?.order || selectedOrder;

        startTransition(() => {
          setSelectedOrder(updatedOrder);
          setPartialPages('');
          setShowPartialForm(false);
        });

        setMessage(`Partial progress saved: ${updatedOrder.partialPagesCompleted} of ${updatedOrder.pageCount} pages completed.`);
      }
    );
  };

  const handleOpenDocument = async (documentId) => {
    if (!documentId) {
      return;
    }

    setActiveDocumentId(documentId);
    setError('');

    try {
      const response = await api.get(`/documents/${documentId}/url`);
      const signedUrl = response.data?.url;
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (documentError) {
      setError(documentError.response?.data?.message || 'Could not open the document.');
    } finally {
      setActiveDocumentId('');
    }
  };

  const rawActiveQueue = queueMap[activeTab] || [];
  let filteredActiveQueue = rawActiveQueue.filter(order => {
    if (groupOrderFilter === 'Normal') return !order.isGroupOrder;
    if (groupOrderFilter === 'Group') return !!order.isGroupOrder;
    if (groupOrderFilter === 'Cash') return order.paymentMethod === 'Cash' || order.paymentStatus?.startsWith('Cash');
    return true;
  });

  // Backend sorting is authoritative. Do not override priority sort with FIFO.

  const primaryOrders = filteredActiveQueue.filter(order => computeIsPrimary(order, staffAssignment));
  const nonPrimaryOrders = filteredActiveQueue.filter(order => !computeIsPrimary(order, staffAssignment));

  const displayQueue = showMyQueueOnly
    ? primaryOrders
    : [...primaryOrders, ...nonPrimaryOrders];

  const primaryPickupPendingOrders = primaryOrders.filter(order => order.status === READY_FOR_PICKUP_STATUS);
  const nonPrimaryPickupPendingOrders = nonPrimaryOrders.filter(order => order.status === READY_FOR_PICKUP_STATUS);
  const pickupPendingOrders = showMyQueueOnly
    ? primaryPickupPendingOrders
    : [...primaryPickupPendingOrders, ...nonPrimaryPickupPendingOrders];
  const primaryWorkOrders = primaryOrders.filter(order => order.status !== READY_FOR_PICKUP_STATUS);
  const nonPrimaryWorkOrders = nonPrimaryOrders.filter(order => order.status !== READY_FOR_PICKUP_STATUS);
  const activeWorkOrders = showMyQueueOnly
    ? primaryWorkOrders
    : [...primaryWorkOrders, ...nonPrimaryWorkOrders];

  const inventoryRows = renderInventoryRows(inventorySummary);
  const ActiveTabIcon = SERVICE_ICONS[activeTab] || Layers3;

  const useCountdown = (autoProcessAt) => {
    const [secondsLeft, setSecondsLeft] = useState(() => {
      if (!autoProcessAt) return null;
      const diff = Math.floor((new Date(autoProcessAt).getTime() - Date.now()) / 1000);
      return diff > 0 ? diff : 0;
    });

    useEffect(() => {
      if (!autoProcessAt) return;
      const interval = setInterval(() => {
        const diff = Math.floor((new Date(autoProcessAt).getTime() - Date.now()) / 1000);
        setSecondsLeft(diff > 0 ? diff : 0);
      }, 1000);
      return () => clearInterval(interval);
    }, [autoProcessAt]);

    return secondsLeft;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 text-slate-900">
      {activeToast && (
        <NewOrderToast
          notification={activeToast}
          onAction={handleToastAction}
          onDismiss={() => setActiveToast(null)}
        />
      )}
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Header row ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Staff Console</p>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 text-sm leading-none text-slate-600 shadow-sm">
              Signed in as <span className="ml-1 font-semibold text-slate-900">{user?.name || user?.email || 'Staff'}</span>
            </div>
            <div className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-4 text-sm leading-none text-sky-800 shadow-sm">
              Queue: <span className="ml-1 font-semibold text-sky-950">{staffAssignment}</span>
            </div>
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center">
              <StaffNotificationBell />
            </div>
            <Button
              as={Link}
              to="/staff/reports"
              variant="outline"
              icon={ClipboardList}
              className="h-9 whitespace-nowrap !rounded-full text-sm px-4"
            >
              Staff Reports
            </Button>
            <Button
              variant="dangerOutline"
              onClick={handleLogout}
              icon={LogOut}
              className="h-9 whitespace-nowrap !rounded-full text-sm px-4"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* ── Metrics row ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Completed Today"
            value={completedToday}
            icon={Package}
            color="emerald"
          />
          <MetricCard
            label="Active Queue"
            value={displayQueue.length}
            icon={ActiveTabIcon}
            color="sky"
          />
          <MetricCard
            label="Shop Status"
            value={shopOpen ? 'Open' : 'Closed'}
            icon={shopOpen ? CheckCheck : AlertCircle}
            color={shopOpen ? 'emerald' : 'rose'}
          />
        </div>

        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 pb-0">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between pb-4">
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Queue Panel</p>
                  <div className="flex items-center">
                    {staffAssignment !== 'All' && (
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showMyQueueOnly}
                          onChange={(e) => setShowMyQueueOnly(e.target.checked)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                        />
                        <span>Show my ({staffAssignment}) queue only</span>
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Service line tabs row */}
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_TYPES.map((serviceType) => {
                      const Icon = SERVICE_ICONS[serviceType] || Layers3;
                      const isActive = activeTab === serviceType;
                      const count = (queueMap[serviceType] || []).length;

                      return (
                        <button
                          key={serviceType}
                          type="button"
                          onClick={() => setActiveTab(serviceType)}
                          className={[
                            'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors',
                            isActive
                              ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <Icon className="h-4 w-4" />
                          {serviceType}
                          {count > 0 && (
                            <span
                              className={[
                                'rounded-md px-1.5 py-0.5 text-xs font-bold',
                                isActive ? 'bg-sky-200 text-sky-800' : 'bg-slate-100 text-slate-600',
                              ].join(' ')}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Group Order filters row */}
              <div className="flex flex-wrap gap-2 pt-4">
                {[
                  { id: 'All', label: 'All Orders' },
                  { id: 'Normal', label: 'Normal Orders' },
                  { id: 'Group', label: 'Group Orders' },
                  { id: 'Cash', label: 'Cash Orders' },
                ].map((tab) => {
                  const isActive = groupOrderFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setGroupOrderFilter(tab.id)}
                      className={[
                        'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent className="bg-slate-50/50 p-6 min-h-[400px]">
              {isLoading ? (
                <div className="py-20">
                  <LoadingState message="Loading live queue..." />
                </div>
              ) : displayQueue.length === 0 ? (
                <div className="py-16">
                  <EmptyState
                    icon={CheckCheck}
                    title="Queue clear"
                    description={showMyQueueOnly ? 'You have no orders specific to your queue assignment right now.' : 'No active orders are waiting in this service line right now.'}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {pickupPendingOrders.length > 0 && (
                    <div className="border-l-4 border-emerald-500 pl-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Pickup Pending</p>
                          <h3 className="text-lg font-bold text-slate-900">Ready for OTP verification</h3>
                        </div>
                        <Badge variant="success" className="text-sm">
                          {pickupPendingOrders.length} Orders
                        </Badge>
                      </div>
                      <div className="grid gap-4">
                        {pickupPendingOrders.map((order) => (
                          <QueueCard
                            key={order._id}
                            currentUserId={user?.id || user?._id}
                            order={order}
                            queue={rawActiveQueue}
                            onSelect={openOrderPanel}
                            isPrimary={computeIsPrimary(order, staffAssignment)}
                            printJobMap={printJobMap}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {activeWorkOrders.length > 0 && (
                    <div className="grid gap-4">
                      {primaryWorkOrders.length > 0 && primaryWorkOrders.map((order) => (
                        <QueueCard
                          key={order._id}
                          currentUserId={user?.id || user?._id}
                          order={order}
                          queue={rawActiveQueue}
                          onSelect={openOrderPanel}
                          isPrimary={true}
                          printJobMap={printJobMap}
                        />
                      ))}
                      {!showMyQueueOnly && primaryWorkOrders.length > 0 && nonPrimaryWorkOrders.length > 0 && (
                        <div className="flex items-center gap-4 py-2">
                          <div className="h-[1px] flex-1 bg-slate-200" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Other Types</span>
                          <div className="h-[1px] flex-1 bg-slate-200" />
                        </div>
                      )}
                      {!showMyQueueOnly && nonPrimaryWorkOrders.map((order) => (
                        <QueueCard
                          key={order._id}
                          currentUserId={user?.id || user?._id}
                          order={order}
                          queue={rawActiveQueue}
                          onSelect={openOrderPanel}
                          isPrimary={false}
                          printJobMap={printJobMap}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 mb-1">Automation</p>
              <h3 className="text-xl font-semibold text-slate-950 mb-4">Auto Order Processing</h3>

              {autoProcessingError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {autoProcessingError}
                </div>
              )}
              {autoProcessingSuccess && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {autoProcessingSuccess}
                </div>
              )}

              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-semibold text-slate-800">Enable Auto Processing</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Orders will automatically start processing after the configured delay.</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold ${autoProcessingEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {autoProcessingEnabled ? 'On' : 'Off'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoProcessingEnabled(prev => !prev)}
                      className={[
                        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                        autoProcessingEnabled ? 'bg-emerald-500' : 'bg-slate-300',
                      ].join(' ')}
                    >
                      <span className={[
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        autoProcessingEnabled ? 'translate-x-6' : 'translate-x-1',
                      ].join(' ')} />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-2">Processing Delay</p>
                  <div className="flex gap-2">
                    {[1, 2].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setAutoProcessingDelay(mins)}
                        className={[
                          'inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition',
                          autoProcessingDelay === mins
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400',
                        ].join(' ')}
                      >
                        {mins} {mins === 1 ? 'Minute' : 'Minutes'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAutoProcessing}
                  disabled={autoProcessingLoading}
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {autoProcessingLoading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>

            <StaffPrinterPanel />

            <StaffInventoryPanel />
            <StaffComplaintsPanel
              currentUserId={user?.id || user?._id}
              currentUserRole={user?.role || 'Staff'}
            />
          </div>
        </div>

        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Completed Orders</p>
              <CardTitle>Recently finished work</CardTitle>
            </div>
            <Button
              variant="outline"
              onClick={() => refreshCompletedOrders()}
              icon={CheckCheck}
            >
              Refresh Completed
            </Button>
          </CardHeader>
          <CardContent className="bg-slate-50/50 p-6 min-h-[300px]">
            {isCompletedLoading ? (
              <div className="py-20">
                <LoadingState message="Loading completed orders..." />
              </div>
            ) : completedOrders.length === 0 ? (
              <div className="py-16">
                <EmptyState
                  icon={Package}
                  title="Nothing completed yet"
                  description="Completed work will appear here so staff can review finished jobs."
                />
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {completedOrders.map((order) => (
                  <CompletedOrderCard
                    key={order._id}
                    order={order}
                    onSelect={openCompletedOrderPanel}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedOrder || isPanelLoading ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close order detail panel"
            className="flex-1"
            onClick={closePanel}
          />

          <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Order Detail</p>
                <h2 className="text-2xl font-bold text-slate-900 leading-none">
                  {selectedOrder?.tokenNumber || 'Loading...'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="self-center inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isPanelLoading && !selectedOrder ? (
              <div className="py-24">
                <LoadingState message="Opening order details..." />
              </div>
            ) : selectedOrder ? (
              <div className="p-6 space-y-6">
                <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
                  <Badge variant={STATUS_BADGE_VARIANTS[selectedOrder.status] || 'secondary'}>
                    {formatOrderState(selectedOrder.status)}
                  </Badge>
                  <Badge variant={PAYMENT_BADGE_VARIANTS[selectedOrder.paymentStatus] || 'secondary'}>
                    {formatOrderState(selectedOrder.paymentStatus)}
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailRow label="Service Type" value={selectedOrder.serviceType} />
                  <DetailRow label="Page Count" value={selectedOrder.pageCount ?? 0} />
                  {selectedOrder.partialPagesCompleted > 0 && (
                    <>
                      <DetailRow
                        label="Progress"
                        value={`${selectedOrder.partialPagesCompleted} / ${selectedOrder.pageCount} Completed`}
                      />
                      <DetailRow
                        label="Remaining"
                        value={`${Math.max(0, (selectedOrder.pageCount || 0) - selectedOrder.partialPagesCompleted)} Pages`}
                        valueClass="text-amber-600 font-bold"
                      />
                    </>
                  )}
                  <DetailRow label="Copies" value={selectedOrder.printConfig?.copies ?? 1} />
                  <DetailRow label="Colour Mode" value={(() => { const m = selectedOrder.printConfig?.colourMode || 'Not set'; return m === 'BlackAndWhite' ? 'Black & White' : m === 'Colour' ? 'Colour' : m; })()} />
                  <DetailRow label="Sided" value={selectedOrder.printConfig?.sided || 'Not set'} />
                  <DetailRow label="Paper Size" value={selectedOrder.printConfig?.paperSize || 'Not set'} />
                  <DetailRow label="Estimated Cost" value={CURRENCY_FORMATTER.format(selectedOrder.finalCost || selectedOrder.estimatedCost || 0)} />
                  <DetailRow label="Preferred Pickup" value={selectedOrder.preferredPickupSlot || 'Not specified'} />
                </div>

                {selectedOrder.printConfig?.printInstructions && (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-yellow-800 mb-2">Print Instructions</p>
                    <p className="text-sm font-medium text-yellow-900">
                      {selectedOrder.printConfig.printInstructions}
                    </p>
                  </div>
                )}

                <Card>
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <ExternalLink className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Documents</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="grid gap-2">
                      {(selectedOrder.documentIds || []).map((document, index) => {
                        const documentId = toIdValue(document);
                        const documentLabel = document?.originalFilename || `Document ${index + 1}`;

                        return (
                          <Button
                            key={documentId || `${selectedOrder._id}-document-${index + 1}`}
                            variant="outline"
                            onClick={() => handleOpenDocument(documentId)}
                            disabled={!documentId || activeDocumentId === documentId}
                            isLoading={activeDocumentId === documentId}
                            icon={ExternalLink}
                            className="w-full justify-between font-normal"
                          >
                            <span className="truncate">{documentLabel}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-base">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {selectedOrder.status === 'In_Queue' && (
                      <Button
                        onClick={handleStartProcessing}
                        disabled={!shopOpen || activeAction === 'start-processing'}
                        isLoading={activeAction === 'start-processing'}
                        className="w-full h-12"
                      >
                        Start Processing
                      </Button>
                    )}

                    {selectedOrder.status === 'Processing' && (
                      <>
                        {(!autoProcessingEnabled ||
                          !printJobMap[selectedOrder._id] ||
                          printJobMap[selectedOrder._id].printerId === 'MANUAL' ||
                          printJobMap[selectedOrder._id].status === 'Manual Required' ||
                          printJobMap[selectedOrder._id].status === 'Printed' ||
                          printJobMap[selectedOrder._id].status === 'Inspection' ||
                          printJobMap[selectedOrder._id].status === 'Failed') ? (
                          <Button
                            onClick={handleReadyForPickup}
                            disabled={activeAction === 'ready-for-pickup'}
                            isLoading={activeAction === 'ready-for-pickup'}
                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                          >
                            Ready for Pickup
                          </Button>
                        ) : (
                          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-center text-xs font-semibold">
                            Printer is currently printing the document...
                          </div>
                        )}

                        {showPartialForm ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-4 mt-4">
                            <Input
                              label="Pages completed"
                              type="number"
                              min="1"
                              max={Math.max(1, (selectedOrder.pageCount || 1) - 1)}
                              value={partialPages}
                              onChange={(event) => setPartialPages(event.target.value)}
                              placeholder="Enter completed pages"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={handlePartialCompletion}
                                disabled={activeAction === 'partial-order'}
                                isLoading={activeAction === 'partial-order'}
                                className="flex-1 bg-amber-600 hover:bg-amber-700"
                              >
                                Save Partial
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowPartialForm(false);
                                  setPartialPages('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowPartialForm(true);
                              setError('');
                              setMessage('');
                            }}
                            className="w-full h-12 text-amber-700 border-amber-200 hover:bg-amber-50"
                          >
                            Partial Completion
                          </Button>
                        )}
                      </>
                    )}

                    {selectedOrder.status === 'ReadyForPickup' && (
                      <div className="space-y-4">
                        {selectedOrder.paymentStatus === 'Cash_Pending' && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            Cash is pending. Collect payment and verify OTP.
                          </div>
                        )}

                        <Input
                          label="Pickup OTP"
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={otp}
                          onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="Enter 4-digit OTP"
                        />

                        <Button
                          onClick={handleVerifyOtp}
                          disabled={activeAction === 'verify-otp'}
                          isLoading={activeAction === 'verify-otp'}
                          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                        >
                          {selectedOrder.paymentStatus === 'Cash_Pending'
                            ? 'Collect Cash & Complete'
                            : 'Verify & Complete'}
                        </Button>
                      </div>
                    )}

                    {!['In_Queue', 'Processing', 'ReadyForPickup'].includes(selectedOrder.status) && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 justify-center p-2">
                        <AlertCircle className="h-4 w-4" />
                        No actions available for this status.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
};

export default StaffDashboard;
