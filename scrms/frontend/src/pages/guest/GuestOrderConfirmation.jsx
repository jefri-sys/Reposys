import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Download, Loader2, Copy } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const GUEST_SESSION_STORAGE_KEY = 'reposysGuestSession';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const formatOrderState = (value = '') => value
  .replace(/_/g, ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .trim();

const GuestOrderConfirmation = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  
  const [endingSession, setEndingSession] = useState(false);
  const [order, setOrder] = useState(location.state?.order || null);
  const [isLoading, setIsLoading] = useState(!order);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(location.state?.qrCodeDataUrl || '');

  const handleCopyId = async () => {
    try {
      if (order?._id || orderId) {
        await navigator.clipboard.writeText(order?._id || orderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    let isActive = true;
    
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/orders/${orderId}`);
        if (isActive) {
          setOrder(response.data?.order);
          if (response.data?.qrCodeDataUrl) {
            setQrCodeDataUrl(response.data.qrCodeDataUrl);
          }
          setError('');
        }
      } catch (err) {
        if (isActive) {
          setError(err.response?.data?.message || 'Failed to load order. Missing permissions or session ended.');
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    if (!order || order._id !== orderId) {
      fetchOrder();
    } else {
      setIsLoading(false);
    }

    return () => { isActive = false; };
  }, [orderId, order]);

  useEffect(() => {
    if (!socket || !order?._id) return;
    
    const handleUpdate = (payload) => {
      if (payload.orderId === order._id || payload.order?._id === order._id) {
        setOrder(payload.order);
      }
    };
    
    socket.on('order_update', handleUpdate);
    return () => {
      socket.off('order_update', handleUpdate);
    };
  }, [socket, order?._id]);

  const endGuestSession = async () => {
    setEndingSession(true);

    try {
      await api.post('/guest/end-session');
    } catch {
      // The local kiosk state should still be cleared if the cookie already expired.
    } finally {
      window.sessionStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
      navigate('/', { replace: true });
    }
  };

  const handleCancelOrder = async () => {
    if (!order?._id) return;
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setIsCancelling(true);
    setError('');

    try {
      const response = await api.patch(`/orders/${order._id}/cancel`, { cancelReason: 'Cancelled by guest.' });
      setOrder(response.data?.order || order);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel the order.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!order?._id) return;

    setIsDownloading(true);
    setError('');

    try {
      const response = await api.get(`/orders/${order._id}/receipt`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${order.tokenNumber || order._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      let errorMessage = 'Could not download the receipt. Please try again.';
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
      setError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f8fbff,_#eef4ff_52%,_#f8fafc)] text-sky-700">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  const isCancellable = order && order.status === 'In_Queue';
  const isCompleted = order && order.status === 'Completed';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff,_#eef4ff_52%,_#f8fafc)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl rounded-[40px] border border-slate-200 bg-white shadow-[0_30px_120px_-60px_rgba(15,23,42,0.35)]">
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(135deg,_#ecfdf5,_#ffffff_58%)] px-8 py-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-9 w-9" strokeWidth={2.2} />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700">Guest Active Tracker</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            {order?.tokenNumber || 'Order tracked'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Keep this token handy. Watch this page for live updates and pay at the counter when ready.
          </p>
          
          {qrCodeDataUrl && (
            <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm inline-block mx-auto border border-emerald-100">
              <img src={qrCodeDataUrl} alt="Order QR Code" className="w-48 h-48 mx-auto" />
              <p className="mt-4 text-sm font-semibold text-slate-700">Scan this QR code with your phone to track your order</p>
              
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">Or save your Order ID:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm font-mono text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    {order?._id || orderId}
                  </code>
                  <button
                    onClick={handleCopyId}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                    title="Copy Order ID"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copied && <p className="mt-1 text-xs font-semibold text-emerald-600">Copied!</p>}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-8 mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 px-8 py-8 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order Reference</p>
            <p className="mt-2 break-all text-lg font-semibold text-slate-950">{order?._id || orderId}</p>
          </div>
          <div className={['rounded-3xl border p-5', order?.status === 'Cancelled' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'].join(' ')}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order Status</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{formatOrderState(order?.status || 'Unknown')}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Service Type</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{order?.serviceType || 'Guest order'}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated Cost</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {order ? CURRENCY_FORMATTER.format(order.finalCost || order.estimatedCost || 0) : 'Available at counter'}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {order ? `${order.paymentMethod} / ${formatOrderState(order.paymentStatus)}` : 'Pay at Counter'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 px-8 pb-10">
          <Link
            to="/guest"
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Create Another Guest Order
          </Link>

          {isCancellable && (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCancelling}
              type="button"
              onClick={handleCancelOrder}
            >
              <XCircle className="h-4 w-4" />
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}

          {isCompleted && (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDownloading}
              type="button"
              onClick={handleDownloadReceipt}
            >
              <Download className="h-4 w-4" />
              {isDownloading ? 'Downloading...' : 'Download Receipt'}
            </button>
          )}

          <button
            className="inline-flex items-center justify-center rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={endingSession}
            type="button"
            onClick={endGuestSession}
          >
            {endingSession ? 'Ending...' : 'End Guest Session'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestOrderConfirmation;
