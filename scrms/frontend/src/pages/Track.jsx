import { useEffect, useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContextObject';

const Track = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();
  
  const socket = useSocket();
  const { user } = useContext(AuthContext);
  
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [error, setError] = useState(false);
  const [inputId, setInputId] = useState('');

  const fetchOrder = async () => {
    if (orderId) {
      setIsLoading(true);
      setError(false);
      try {
        const response = await api.get(`/orders/track/${orderId}`);
        setOrder(response.data?.order);
      } catch (err) {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    } else {
      // If no orderId in URL, try to auto-fetch an active order if logged in
      if (user) {
        setIsAutoFetching(true);
        try {
          const response = await api.get('/orders/my-orders');
          const orders = response.data?.orders || [];
          const activeStatuses = ['Pending', 'In_Queue', 'Processing', 'ReadyForPickup'];
          const activeOrder = orders.find(o => activeStatuses.includes(o.status));
          
          if (activeOrder) {
            // Found one, safely redirect to it
            navigate(`/track?orderId=${activeOrder._id}`, { replace: true });
            return;
          } else if (orders.length > 0) {
            // If no active orders, redirect to the most recent completed/cancelled order
            navigate(`/track?orderId=${orders[0]._id}`, { replace: true });
            return;
          }
        } catch (err) {
          console.error('Failed to fetch active orders for tracking', err);
        } finally {
          setIsAutoFetching(false);
        }
      }
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId, user]);

  useEffect(() => {
    if (!socket || !orderId) return;

    socket.emit('join_order_room', orderId);

    const handleUpdate = (payload) => {
      fetchOrder();
    };

    socket.on('order_status_update', handleUpdate);

    return () => {
      socket.off('order_status_update', handleUpdate);
    };
  }, [socket, orderId]);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (inputId.trim()) {
      navigate(`/track?orderId=${inputId.trim()}`);
      setInputId('');
    }
  };

  const handleBack = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  if (isAutoFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-gray-400 font-medium animate-pulse">Checking for active orders...</p>
        </div>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 text-white relative">
        <button 
          onClick={handleBack}
          className="absolute top-6 left-6 p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center shadow-lg"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>

        <div className="w-full max-w-sm text-center">
          {user && !isAutoFetching ? (
            <div className="mb-8">
              <p className="text-gray-400 text-sm font-medium">No active orders found.</p>
            </div>
          ) : null}
          <h1 className="text-3xl font-bold text-white mb-6">Track Your Order</h1>
          <form onSubmit={handleTrackSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Enter your Order ID"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/50"
              disabled={isLoading}
            >
              {isLoading ? 'Checking...' : 'Track Order'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 text-white relative">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 text-white relative">
        <button 
          onClick={handleBack}
          className="absolute top-6 left-6 p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center shadow-lg"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>

        <div className="text-center w-full max-w-sm">
          <p className="text-xl font-semibold text-rose-400">Order not found or has expired.</p>
          <p className="mt-2 text-sm text-gray-400 mb-8">Please check the link and try again.</p>
          
          <form onSubmit={handleTrackSubmit} className="flex gap-2 w-full mt-4">
            <input
              type="text"
              placeholder="Enter Order ID"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-semibold rounded-xl transition-all shadow-lg text-sm border border-gray-700"
            >
              Track
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isLive = ['In_Queue', 'Processing'].includes(order.status);
  const isReady = order.status === 'ReadyForPickup';
  const isComplete = order.status === 'Completed';

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-gray-700 text-white';
      case 'In_Queue': return 'bg-blue-500 text-white';
      case 'Processing': return 'bg-yellow-500 text-gray-900';
      case 'ReadyForPickup': return 'bg-green-500 text-white';
      case 'Completed': return 'bg-gray-500 text-white';
      case 'Cancelled': return 'bg-rose-500 text-white';
      default: return 'bg-gray-700 text-gray-200';
    }
  };

  const formatStatus = (status) => status.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 relative">
      <button 
        onClick={handleBack}
        className="absolute top-6 left-6 p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center shadow-lg"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-gray-300" />
      </button>

      {/* Token Number Section */}
      <div className="text-center w-full max-w-sm mb-8 mt-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-2">Token Number</p>
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-tight break-all">{order.tokenNumber}</h1>
      </div>

      {/* Status Badge */}
      <div className="mb-8">
        <span className={`px-6 py-2.5 rounded-full text-lg font-bold shadow-lg ${getStatusColor(order.status)}`}>
          {formatStatus(order.status)}
        </span>
      </div>

      {/* Queue Info */}
      {isLive && (
        <div className="w-full max-w-sm bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-700 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-700 pb-4">
            <span className="text-gray-400">Queue Position</span>
            <span className="text-2xl font-bold text-white">{order.queuePosition || '--'}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-gray-400">Estimated Wait</span>
            <span className="text-2xl font-bold text-white">{order.estimatedWait !== null ? `${order.estimatedWait} min` : '--'}</span>
          </div>
        </div>
      )}

      {/* OTP Display for ReadyForPickup */}
      {isReady && order.pickupOtp && (
        <div className="w-full max-w-sm bg-green-900/30 border border-green-500/50 rounded-3xl p-8 text-center shadow-2xl animate-pulse">
          <p className="text-green-400 font-semibold mb-4 text-lg">Show this to counter staff</p>
          <div className="bg-gray-900 rounded-2xl py-6 tracking-[0.25em] shadow-inner">
            <span className="text-6xl font-black text-white">{order.pickupOtp}</span>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {order.status === 'Completed' && (
        <div className="text-center mt-4">
          <p className="text-2xl font-bold text-gray-300">Order Complete</p>
          <p className="text-gray-500 mt-2">Thank you for using Reposys.</p>
        </div>
      )}
      {order.status === 'Cancelled' && (
        <div className="text-center mt-4">
          <p className="text-2xl font-bold text-rose-400">Order Cancelled</p>
          <p className="text-gray-500 mt-2">This order has been cancelled.</p>
        </div>
      )}
      {order.status === 'Pending' && (
        <div className="text-center mt-4">
          <p className="text-2xl font-bold text-gray-300">Order Pending</p>
          <p className="text-gray-500 mt-2">Waiting for staff to start processing.</p>
        </div>
      )}

      {/* Track Another Order */}
      <div className="w-full max-w-sm mt-12 pt-8 border-t border-gray-800">
        <p className="text-sm font-medium text-gray-400 mb-4 text-center">Track another order</p>
        <form onSubmit={handleTrackSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Order ID"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            required
          />
          <button
            type="submit"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-semibold rounded-xl transition-all shadow-lg text-sm border border-gray-700"
          >
            Track
          </button>
        </form>
      </div>
    </div>
  );
};

export default Track;
