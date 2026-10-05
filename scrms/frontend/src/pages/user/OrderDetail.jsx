import { startTransition, useEffect, useRef, useState, useContext } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { canRaiseComplaintForStatus } from '../../utils/complaints';
import { Download } from 'lucide-react';
import RatingWidget from '../../components/RatingWidget';
import { AuthContext } from '../../context/AuthContextObject';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Input,
  LoadingState,
  PageHeader
} from '../../components/ui';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const TIMELINE_STEPS = ['In_Queue', 'Processing', 'ReadyForPickup', 'Completed'];

const formatOrderState = (value = '') => value
  .replace(/_/g, ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .trim();

const formatTimestamp = (value) => (
  value ? new Date(value).toLocaleString() : 'Awaiting update'
);

const getStepEntry = (statusHistory = [], step) => (
  statusHistory.find((entry) => entry.status === step) || null
);

const getActorName = (entry) => (
  entry?.actorName || entry?.actor?.name || entry?.updatedByName || entry?.updatedBy?.name || entry?.performedByName || ''
);

const getStepState = (order, step, stepIndex) => {
  if (order.status === step) return 'current';
  const currentIndex = TIMELINE_STEPS.indexOf(order.status);
  const hasHistory = Boolean(getStepEntry(order.statusHistory, step));
  if (hasHistory || (currentIndex !== -1 && stepIndex < currentIndex)) return 'completed';
  return 'future';
};

const STEP_STYLES = {
  completed: { dot: 'border-emerald-500 bg-emerald-500', ring: 'bg-emerald-100', card: 'border-emerald-100 bg-emerald-50/50', text: 'text-emerald-700' },
  current: { dot: 'animate-pulse border-blue-500 bg-blue-500', ring: 'bg-blue-100', card: 'border-blue-200 bg-blue-50/70', text: 'text-blue-700' },
  future: { dot: 'border-slate-300 bg-white', ring: 'bg-slate-100', card: 'border-slate-200 bg-slate-50', text: 'text-slate-500' },
};

const DetailStat = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
  </div>
);

const getComparableId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
};

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const ratingRef = useRef(null);
  const { user } = useContext(AuthContext) || {};
  const [order, setOrder] = useState(null);
  const [waitInfo, setWaitInfo] = useState(null);
  const [existingRating, setExistingRating] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [showRating, setShowRating] = useState(location.state?.openRating || false);

  const [groupOrder, setGroupOrder] = useState(null);
  const [splitRequests, setSplitRequests] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [isSendingSplits, setIsSendingSplits] = useState(false);
  const [respondingToSplitId, setRespondingToSplitId] = useState('');
  const [totalRecovered, setTotalRecovered] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);

  useEffect(() => {
    if (showRating && !isLoading && ratingRef.current) {
      setTimeout(() => {
        ratingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [showRating, isLoading]);

  useEffect(() => {
    if (order?.isGroupOrder && order?.groupOrderId) {
      const loadGroupDetails = async () => {
        try {
          setGroupLoading(true);
          const res = await api.get(`/group-orders/${order.groupOrderId}/split-status`);
          setGroupOrder(res.data?.groupOrder || null);
          setSplitRequests(res.data?.splitRequests || []);
          setTotalRecovered(res.data?.totalRecovered || 0);
          setTotalRemaining(res.data?.totalRemaining || 0);
        } catch (err) {
          console.error('Failed to load group order splits:', err);
        } finally {
          setGroupLoading(false);
        }
      };
      loadGroupDetails();
    }
  }, [order?.isGroupOrder, order?.groupOrderId]);

  const handleSendSplits = async () => {
    if (!order?.groupOrderId || isSendingSplits) return;
    setIsSendingSplits(true);
    setActionMessage('');
    try {
      await api.post('/group-orders/split/send', { groupOrderId: order.groupOrderId, triggeredFrom: 'order_detail' });
      setActionMessage('Split payment requests successfully sent to all participants!');
      const res = await api.get(`/group-orders/${order.groupOrderId}/split-status`);
      setGroupOrder(res.data?.groupOrder || null);
      setSplitRequests(res.data?.splitRequests || []);
      setTotalRecovered(res.data?.totalRecovered || 0);
      setTotalRemaining(res.data?.totalRemaining || 0);
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to send split requests.');
    } finally {
      setIsSendingSplits(false);
    }
  };

  const handleRespondToSplit = async (splitRequestId, action) => {
    if (respondingToSplitId) return;
    setRespondingToSplitId(splitRequestId);
    setActionMessage('');
    try {
      await api.post('/group-orders/split/respond', { splitRequestId, action });
      setActionMessage(action === 'accepted' ? 'Split payment successful!' : 'Split request declined.');
      const statusRes = await api.get(`/group-orders/${order.groupOrderId}/split-status`);
      setGroupOrder(statusRes.data?.groupOrder || null);
      setSplitRequests(statusRes.data?.splitRequests || []);
      setTotalRecovered(statusRes.data?.totalRecovered || 0);
      setTotalRemaining(statusRes.data?.totalRemaining || 0);
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Failed to process split payment.');
    } finally {
      setRespondingToSplitId('');
    }
  };

  const renderGroupOrderPanel = () => {
    if (!order?.isGroupOrder || !order?.groupOrderId) return null;
    if (groupLoading && !groupOrder) {
      return (
        <Card className="flex items-center justify-center p-12">
          <LoadingState message="Loading group details..." />
        </Card>
      );
    }

    if (!groupOrder) return null;

    const currentUserId = user?._id?.toString();
    const isCreator = groupOrder.createdBy?.toString() === currentUserId;
    const myParticipantEntry = groupOrder.participants?.find((p) => p.userId?._id?.toString() === currentUserId);
    const mySplitRequest = splitRequests?.find((r) => r.to?.toString() === currentUserId && r.status === 'pending');

    const paidSum = groupOrder.participants?.filter((p) => p.walletStatus === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
    const progressPercent = Math.min(100, Math.round((paidSum / groupOrder.totalAmount) * 100));

    return (
      <Card className="space-y-6 p-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Group Split Payment</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Group Order Details</h2>
            </div>
            <Badge variant={groupOrder.status === 'completed' ? 'success' : 'warning'}>
              {groupOrder.status === 'completed' ? 'Fully Settled' : 'Active Split'}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {isCreator ? 'You created this group order. Track payments and request splits from participants.' : 'You are a participant in this group order. Settle your split using your wallet.'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-slate-700">Settle Progress</span>
            <span className="font-bold text-slate-900">
              {CURRENCY_FORMATTER.format(paidSum)} / {CURRENCY_FORMATTER.format(groupOrder.totalAmount)} ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-sky-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {isCreator && groupOrder.status !== 'completed' && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                {groupOrder.participants?.some(p => p.walletStatus === 'declined') ? 'Resend Split Requests' : 'Send Split Requests Now'}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {groupOrder.participants?.some(p => p.walletStatus === 'declined') ? 'Resend payment requests to participants who declined or are pending.' : 'Initiate payment requests to all selected friends.'}
              </p>
            </div>
            <Button
              onClick={handleSendSplits}
              isLoading={isSendingSplits}
            >
              {groupOrder.participants?.some(p => p.walletStatus === 'declined') ? 'Resend Splits' : 'Request Splits'}
            </Button>
          </div>
        )}

        {!isCreator && myParticipantEntry && mySplitRequest && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-900">Your Split Payment is Pending</p>
                <p className="text-xs text-blue-700 mt-1">Please pay your share to the creator.</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Amount Due</p>
                <p className="text-lg font-bold text-blue-900">{CURRENCY_FORMATTER.format(myParticipantEntry.amount)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                isLoading={respondingToSplitId === mySplitRequest._id}
                onClick={() => handleRespondToSplit(mySplitRequest._id, 'accepted')}
              >
                Accept & Pay from Wallet
              </Button>
              <Button
                variant="dangerOutline"
                disabled={respondingToSplitId === mySplitRequest._id}
                onClick={() => handleRespondToSplit(mySplitRequest._id, 'declined')}
              >
                Decline
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Participants</p>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="flex items-center justify-between p-4 bg-slate-50/50">
              <div>
                <p className="text-sm font-semibold text-slate-900">{isCreator ? 'You (Creator)' : 'Group Creator'}</p>
                <p className="text-xs text-slate-500">Organized order</p>
              </div>
              <Badge variant="primary">Host</Badge>
            </div>

            {groupOrder.participants?.map((p) => {
              if (!p.userId) return null;
              const isMe = p.userId._id?.toString() === currentUserId;
              
              let statusVariant = 'warning';
              let statusLabel = 'Pending';
              if (p.walletStatus === 'paid') { statusVariant = 'success'; statusLabel = 'Paid'; }
              else if (p.walletStatus === 'declined') { statusVariant = 'danger'; statusLabel = 'Declined'; }

              return (
                <div key={p.userId._id} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{p.userId.name} {isMe && '(You)'}</p>
                    <p className="text-xs text-slate-500">{p.userId.role}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-slate-900">{CURRENCY_FORMATTER.format(p.amount)}</p>
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                    {isCreator && p.walletStatus !== 'paid' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendSplits}
                        isLoading={isSendingSplits}
                      >
                        Resend
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  };

  const renderGroupPaymentBreakdown = () => {
    if (!order?.isGroupOrder || !order?.groupOrderId) return null;
    if (groupLoading && !groupOrder) return null;
    if (!groupOrder) return null;

    const currentUserId = user?._id?.toString();

    return (
      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Breakdown</p>
            <h3 className="text-sm font-bold text-slate-900">Participant Payments</h3>
          </div>

          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden bg-white">
            {groupOrder.participants?.map((p) => {
              if (!p.userId) return null;
              const isMe = p.userId._id?.toString() === currentUserId;

              let statusVariant = 'warning';
              let statusLabel = 'Pending';
              if (p.walletStatus === 'paid') { statusVariant = 'success'; statusLabel = 'Paid'; }
              else if (p.walletStatus === 'declined') { statusVariant = 'danger'; statusLabel = 'Declined'; }

              return (
                <div key={p.userId._id} className="flex items-center justify-between p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {p.userId.name}{isMe && <span className="ml-1 text-blue-600">(You)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{CURRENCY_FORMATTER.format(p.amount)}</p>
                  </div>
                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total Recovered</span>
              <span className="font-bold text-emerald-600">{CURRENCY_FORMATTER.format(totalRecovered)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Remaining</span>
              <span className="font-bold text-red-600">{CURRENCY_FORMATTER.format(totalRemaining)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 mt-1 flex justify-between">
              <span className="font-semibold text-slate-700">Total Order</span>
              <span className="font-bold text-slate-900">{CURRENCY_FORMATTER.format(groupOrder.totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  useEffect(() => {
    let isActive = true;

    const loadOrder = async () => {
      setIsLoading(true);
      setError('');
      setActionMessage('');

      const [orderResult, waitResult, ratingsResult] = await Promise.allSettled([
        api.get(`/orders/${orderId}`),
        api.get(`/orders/${orderId}/wait`),
        api.get('/ratings/my-ratings'),
      ]);

      if (!isActive) return;

      if (orderResult.status === 'rejected') {
        setError(orderResult.reason.response?.data?.message || 'Could not load this order.');
        setIsLoading(false);
        return;
      }

      const loadedOrder = orderResult.value.data?.order || null;
      let ratingForOrder = null;
      if (ratingsResult.status === 'fulfilled') {
        const matchingRating = ratingsResult.value.data?.ratings?.find(r => r.orderId?._id === orderId);
        if (matchingRating) {
          ratingForOrder = matchingRating;
        }
      }

      startTransition(() => {
        setOrder(loadedOrder);
        setExistingRating(ratingForOrder);
        setShowCancelForm(false);
        setCancelReason('');
        if (loadedOrder?.status === 'In_Queue' && waitResult.status === 'fulfilled') {
          setWaitInfo(waitResult.value.data || null);
        } else {
          setWaitInfo(null);
        }
      });
      setIsLoading(false);
    };

    loadOrder();
    return () => { isActive = false; };
  }, [orderId]);

  useEffect(() => {
    if (!socket || order?.status !== 'In_Queue') return undefined;

    const handleQueueUpdate = (payload = {}) => {
      if (payload.orderId && String(payload.orderId) !== String(orderId)) return;
      if (typeof payload.position !== 'number' && typeof payload.waitMinutes !== 'number') return;
      startTransition(() => {
        setWaitInfo((current) => ({
          position: payload.position ?? current?.position ?? null,
          waitMinutes: payload.waitMinutes ?? current?.waitMinutes ?? null,
        }));
      });
    };

    socket.on('queue_update', handleQueueUpdate);
    return () => socket.off('queue_update', handleQueueUpdate);
  }, [order?.status, socket]);

  useEffect(() => {
    if (!socket || !orderId) return undefined;

    const handleOrderUpdate = (payload = {}) => {
      if (String(payload.orderId || payload.order?._id || '') !== String(orderId)) return;
      const nextOrder = payload.order || null;
      if (!nextOrder) return;
      startTransition(() => {
        setOrder(nextOrder);
        if (nextOrder.status !== 'In_Queue') setWaitInfo(null);
      });
    };

    socket.on('order_update', handleOrderUpdate);
    return () => socket.off('order_update', handleOrderUpdate);
  }, [orderId, socket]);

  const handleCancelOrder = async () => {
    if (isCancelling || order?.status !== 'In_Queue') return;
    setIsCancelling(true);
    setActionMessage('');
    try {
      const response = await api.patch(`/orders/${orderId}/cancel`, { cancelReason: cancelReason.trim() });
      startTransition(() => {
        setOrder(response.data?.order || order);
        setWaitInfo(null);
        setShowCancelForm(false);
        setCancelReason('');
      });
      setActionMessage('Order cancelled successfully.');
    } catch (cancelError) {
      setActionMessage(cancelError.response?.data?.message || 'Could not cancel this order.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReorder = async () => {
    if (isReordering || order?.status !== 'Completed') return;
    setIsReordering(true);
    setActionMessage('');
    try {
      const response = await api.post(`/orders/${orderId}/reorder`);
      navigate('/orders/new', { state: { reorderDraft: response.data } });
    } catch (reorderError) {
      setActionMessage(reorderError.response?.data?.message || 'Could not prepare this reorder.');
    } finally {
      setIsReordering(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (isDownloadingReceipt || order?.status !== 'Completed') return;
    setIsDownloadingReceipt(true);
    setActionMessage('');
    try {
      const response = await api.get(`/receipt/${orderId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${order.tokenNumber}.pdf`);
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
      setActionMessage(errorMessage);
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState message="Loading order details..." />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <Card className="max-w-md w-full text-center p-8">
          <CardTitle className="text-xl text-slate-900 mb-2">Order unavailable</CardTitle>
          <CardDescription className="mb-6">{error || 'The order could not be loaded.'}</CardDescription>
          <Button as={Link} to="/orders" className="w-full">Back to My Orders</Button>
        </Card>
      </div>
    );
  }

  const sortedStatusHistory = [...(order.statusHistory || [])].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
  const currentUserId = getComparableId(user?._id || user?.id);
  const orderCreatorId = getComparableId(order.userId);
  const isCreator = orderCreatorId === currentUserId;
  const isStaffOrAdmin = user?.role === 'Staff' || user?.role === 'Admin';
  const currentParticipant = groupOrder?.participants?.find((p) => getComparableId(p.userId) === currentUserId);
  const isGroupAccessPending = !isCreator && !isStaffOrAdmin && order.isGroupOrder && order.groupOrderId && (groupLoading || !groupOrder);
  const isParticipant = !isCreator && !isStaffOrAdmin && order.isGroupOrder && Boolean(currentParticipant);
  const creatorName = order.userId?.name || groupOrder?.createdBy?.name || 'the creator';

  if (isGroupAccessPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState message="Verifying group access..." />
      </div>
    );
  }

  let statusVariant = 'warning';
  if (order.status === 'Completed' || order.status === 'ReadyForPickup') statusVariant = 'success';
  if (order.status === 'Cancelled') statusVariant = 'danger';
  if (order.status === 'In_Queue' || order.status === 'Processing') statusVariant = 'primary';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link to="/orders" className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
            &larr; Back to My Orders
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Live Order Tracking</p>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{order.tokenNumber}</h1>
              <Badge variant={statusVariant}>{formatOrderState(order.status)}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">{order.serviceType} request</p>
          </div>
        </div>

        {actionMessage && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 shadow-sm">
            {actionMessage}
          </div>
        )}

        {order.status === 'ReadyForPickup' && order.pickupOtp && !isParticipant && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Ready for Pickup</p>
            <p className="mt-1 text-sm text-emerald-600">Show this code at the counter</p>
            <div className="mt-4 flex justify-center">
              <span className="rounded-lg bg-white px-8 py-4 text-5xl font-black tracking-widest text-slate-900 shadow-sm border border-emerald-100">
                {order.pickupOtp}
              </span>
            </div>
          </div>
        )}

        {order.status === 'In_Queue' && !isParticipant && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            <Card className="border-blue-100 bg-blue-50/50">
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Queue Position</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{waitInfo?.position ?? '--'}</p>
                <p className="mt-1 text-xs text-slate-500">Updated live</p>
              </CardContent>
            </Card>
            <Card className="border-blue-100 bg-blue-50/50">
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Estimated Wait</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{waitInfo?.waitMinutes ?? '--'} min</p>
                <p className="mt-1 text-xs text-slate-500">Before processing begins</p>
              </CardContent>
            </Card>
            <Card className="hidden lg:block bg-slate-50/50 border-slate-200">
              <CardContent className="p-6 flex flex-col justify-center h-full">
                <p className="text-sm font-semibold text-slate-900 mb-1">Live Updates Active</p>
                <p className="text-xs text-slate-500">Tracking progress in real-time automatically.</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Order Progress</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {TIMELINE_STEPS.map((step, index) => {
                  const state = getStepState(order, step, index);
                  const entry = getStepEntry(sortedStatusHistory, step);
                  const actorName = getActorName(entry);
                  const styles = STEP_STYLES[state];

                  return (
                    <div key={step} className={['flex gap-4 rounded-lg border p-4 transition-colors', styles.card].join(' ')}>
                      <div className={['flex h-8 w-8 shrink-0 items-center justify-center rounded-full', styles.ring].join(' ')}>
                        <span className={['h-3 w-3 rounded-full border-2', styles.dot].join(' ')} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">{formatOrderState(step)}</h3>
                          <span className={['text-xs font-semibold uppercase tracking-wider', styles.text].join(' ')}>
                            {state === 'current' ? 'Current' : state === 'completed' ? 'Done' : 'Pending'}
                          </span>
                        </div>
                        {entry && (
                          <p className="text-xs text-slate-500 mt-1">{formatTimestamp(entry.timestamp)}</p>
                        )}
                        {actorName && (
                          <p className="mt-1 text-xs text-slate-500">Updated by {actorName}</p>
                        )}
                        {entry?.note && (
                          <p className="mt-2 text-sm text-slate-700 bg-white/50 p-2 rounded">{entry.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {!isParticipant && renderGroupOrderPanel()}

            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {order.documentIds?.map((document) => (
                  <div key={document._id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900 truncate">{document.originalFilename}</p>
                    <Badge variant="default" className="shrink-0">
                      {document.pageCount} page{document.pageCount === 1 ? '' : 's'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle>Service Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-3">
                  <DetailStat label="Service Type" value={order.serviceType} />
                  <DetailStat label="Copies" value={order.printConfig?.copies ?? 1} />
                  <DetailStat label="Colour Mode" value={order.printConfig?.colourMode || 'Not set'} />
                  <DetailStat label="Sides" value={order.printConfig?.sided || 'Not set'} />
                  <DetailStat label="Total Pages" value={order.pageCount ?? 0} />
                  {!isParticipant && (
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm mt-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estimated Cost</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">{CURRENCY_FORMATTER.format(order.finalCost || order.estimatedCost || 0)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {isParticipant && currentParticipant && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">Your Split Share</p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-slate-900">{CURRENCY_FORMATTER.format(currentParticipant.amount || 0)}</p>
                    <Badge variant={currentParticipant.walletStatus === 'paid' ? 'success' : currentParticipant.walletStatus === 'declined' ? 'danger' : 'warning'}>
                      {currentParticipant.walletStatus === 'paid' ? 'Paid ✓' : currentParticipant.walletStatus === 'declined' ? 'Declined' : 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {order.printConfig?.printInstructions && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">Instructions</p>
                  <p className="text-sm text-slate-700">{order.printConfig.printInstructions}</p>
                </CardContent>
              </Card>
            )}

            {!isParticipant && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <DetailStat label="Payment Method" value={order.paymentMethod || 'Not set'} />
                  <DetailStat label="Payment Status" value={formatOrderState(order.paymentStatus)} />
                </CardContent>
              </Card>
            )}

            {!isParticipant && renderGroupPaymentBreakdown()}

            <Card>
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {isParticipant && (
                  <p className="text-sm text-slate-600 mb-2">The order will be collected by {creatorName}.</p>
                )}

                {order.status === 'In_Queue' && !isParticipant && (
                  showCancelForm ? (
                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <Input
                        label="Cancellation Reason (Optional)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Note for the team"
                      />
                      <div className="flex gap-2">
                        <Button variant="danger" size="sm" onClick={handleCancelOrder} isLoading={isCancelling}>Confirm</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setShowCancelForm(false); setCancelReason(''); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="dangerOutline" className="w-full" onClick={() => setShowCancelForm(true)}>
                      Cancel Order
                    </Button>
                  )
                )}

                {canRaiseComplaintForStatus(order.status) && (
                  <Button variant="outline" className="w-full" as={Link} to={`/orders/${orderId}/complaint`}>
                    Raise Complaint
                  </Button>
                )}

                {order.status === 'Completed' && !isParticipant && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleDownloadReceipt}
                      isLoading={isDownloadingReceipt}
                      icon={Download}
                    >
                      Download Receipt
                    </Button>
                    <Button
                      className="w-full"
                      onClick={handleReorder}
                      isLoading={isReordering}
                    >
                      Order Again
                    </Button>
                  </>
                )}

                {order.status === 'Completed' && isParticipant && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDownloadReceipt}
                    isLoading={isDownloadingReceipt}
                    icon={Download}
                  >
                    Download Receipt
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {order.status === 'Completed' && !isParticipant && (
          <div ref={ratingRef} className="mt-8">
            <RatingWidget 
              orderId={order._id}
              tokenNumber={order.tokenNumber}
              existingRating={existingRating}
              onRated={(newRating) => setExistingRating(newRating)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
