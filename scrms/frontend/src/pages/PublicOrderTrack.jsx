import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, Copy, Check } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

const STATUS_COLORS = {
  Pending: 'bg-slate-100 text-slate-700 border-slate-200',
  In_Queue: 'bg-blue-100 text-blue-700 border-blue-200',
  Processing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ReadyForPickup: 'bg-green-100 text-green-700 border-green-200',
  Completed: 'bg-gray-100 text-gray-700 border-gray-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
  Expired: 'bg-red-100 text-red-700 border-red-200',
  Uncollected: 'bg-orange-100 text-orange-700 border-orange-200',
};

const formatOrderState = (value = '') => value
  .replace(/_/g, ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .trim();

const PublicOrderTrack = () => {
  const { orderId } = useParams();
  const socket = useSocket();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/track/${orderId}`, {
        // Strip auth context if possible, but our api interceptor might add credentials. Unauthenticated backend allows tracking.
      });
      setOrder(response.data?.order);
      setError(false);
    } catch (err) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (!socket || !orderId) return;

    // Use unauthenticated socket logic if possible or listen to events
    const handleUpdate = (payload) => {
      // Re-fetch since event sends status updates
      fetchOrder();
    };

    // The backend uses emit('order_status_update', {status, updatedAt})
    socket.on('order_status_update', handleUpdate);

    return () => {
      socket.off('order_status_update', handleUpdate);
    };
  }, [socket, orderId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-xl font-semibold text-slate-800">Order not found. Please check the Order ID.</p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 shadow-sm"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const isLive = ['In_Queue', 'Processing'].includes(order.status);
  const isReady = order.status === 'ReadyForPickup';
  const isComplete = order.status === 'Completed';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 text-slate-900">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-900/5">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-10 text-center sm:px-10 sm:py-12">
          {isReady && (
            <div className="mb-6 mx-auto w-max rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700 ring-1 ring-green-600/20">
              Your order is ready for pickup at the counter!
            </div>
          )}
          {isComplete && (
            <div className="mb-6 mx-auto w-max rounded-full bg-gray-100 px-4 py-1.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-600/20">
              Order collected. Thank you!
            </div>
          )}
          {isLive && (
            <div className="mb-6 mx-auto w-max rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-600/20 animate-pulse">
              Keep this page open for live updates
            </div>
          )}
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Token Number</p>
          <p className="mt-2 text-6xl font-black text-slate-900">{order.tokenNumber}</p>
          
          <div className="mt-4 flex flex-col items-center justify-center gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Order ID</p>
            <div className="flex items-center gap-2 rounded-lg bg-slate-100/50 px-3 py-1.5 border border-slate-200/60">
              <p className="text-sm font-mono text-slate-700">{order._id || orderId}</p>
              <button 
                onClick={() => handleCopyId(order._id || orderId)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                title="Copy Order ID"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLORS[order.status] || STATUS_COLORS.Pending}`}>
              {formatOrderState(order.status)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {order.serviceType}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {order.paymentMethod} Payment
            </span>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-10">
          <h3 className="text-lg font-semibold text-slate-900">Status History</h3>
          <div className="mt-6 flow-root">
            <ul className="-mb-8">
              {order.statusHistory.map((entry, idx) => (
                <li key={idx}>
                  <div className="relative pb-8">
                    {idx !== order.statusHistory.length - 1 ? (
                      <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white ${idx === order.statusHistory.length - 1 ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}>
                          <div className="h-2.5 w-2.5 rounded-full fill-current" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className={`text-sm ${idx === order.statusHistory.length - 1 ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                            {formatOrderState(entry.status)}
                          </p>
                          {entry.note && (
                            <p className="mt-0.5 text-xs text-slate-500">{entry.note}</p>
                          )}
                        </div>
                        <div className="whitespace-nowrap text-right text-xs text-slate-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-12 text-center border-t border-slate-100 pt-8">
            <Link
              to="/"
              className="inline-flex rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicOrderTrack;
