import { startTransition, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContextObject';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { Bell, Package, FileText, MapPin, Users, MessageSquare, MessageCircle, Sparkles, Wallet } from 'lucide-react';
import {
  Card,
  CardContent,
  Badge,
  LoadingState,
  EmptyState
} from '../../components/ui';

const ACTIVE_ORDER_STATUSES = ['In_Queue', 'Processing', 'ReadyForPickup'];

const formatOrderState = (value = '') => value.replace(/_/g, ' ');

const STATUS_STYLES = {
  Pending: 'warning',
  In_Queue: 'primary',
  Confirmed: 'primary',
  Processing: 'purple',
  ReadyForPickup: 'success',
  Completed: 'secondary',
  Cancelled: 'danger',
};

const formatDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

const MobileHome = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const [recentOrders, setRecentOrders] = useState([]);
  const [waitInfo, setWaitInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingFriendsCount, setPendingFriendsCount] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!user?._id) return;
    let isActive = true;
    
    const fetchPendingFriends = async () => {
      try {
        const res = await api.get('/friends/pending');
        if (isActive) {
          setPendingFriendsCount(Array.isArray(res.data) ? res.data.length : 0);
        }
      } catch (err) {
        console.error('Failed to fetch pending friends:', err);
      }
    };

    const fetchConversations = async () => {
      try {
        const res = await api.get('/messages/conversations');
        if (isActive) {
          setConversations(res.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      }
    };

    fetchPendingFriends();
    fetchConversations();
    
    return () => { isActive = false; };
  }, [user?._id]);

  useEffect(() => {
    if (!socket || !user?._id) return;
    
    socket.emit('joinUserRoom', user._id);

    const handleFriendRequest = () => {
      setPendingFriendsCount(prev => prev + 1);
    };

    const handleFriendRequestAccepted = () => {
      setPendingFriendsCount(prev => Math.max(0, prev - 1));
    };

    const handleNewMessage = (message) => {
      const currentUserId = user._id?.toString();
      const senderId = message.senderId?._id?.toString() || message.senderId?.toString();
      const isFromMe = senderId === currentUserId;
      if (isFromMe) return;

      setConversations(prev => {
        let updated = false;
        const next = prev.map(conv => {
          if (conv.partner?._id?.toString() === senderId) {
            updated = true;
            return {
              ...conv,
              unreadCount: (conv.unreadCount || 0) + 1
            };
          }
          return conv;
        });
        if (!updated) {
          next.push({
            partner: { _id: senderId },
            unreadCount: 1
          });
        }
        return next;
      });
    };

    const handleMessagesRead = (payload) => {
      const readBy = payload.readBy?.toString();
      setConversations(prev => prev.map(conv => {
        if (conv.partner?._id?.toString() === readBy) {
          return { ...conv, unreadCount: 0 };
        }
        return conv;
      }));
    };

    socket.on('friendRequest', handleFriendRequest);
    socket.on('friendRequestAccepted', handleFriendRequestAccepted);
    socket.on('newMessage', handleNewMessage);
    socket.on('messagesRead', handleMessagesRead);

    return () => {
      socket.off('friendRequest', handleFriendRequest);
      socket.off('friendRequestAccepted', handleFriendRequestAccepted);
      socket.off('newMessage', handleNewMessage);
      socket.off('messagesRead', handleMessagesRead);
    };
  }, [socket, user?._id]);

  const unreadChatCount = useMemo(() => {
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  const activeOrder = useMemo(
    () => recentOrders.find((order) => ACTIVE_ORDER_STATUSES.includes(order.status)) || null,
    [recentOrders]
  );

  useEffect(() => {
    let isActive = true;
    const loadData = async () => {
      try {
        const res = await api.get('/orders/my-orders', { params: { limit: 5 } });
        if (isActive) {
          const orders = res.data?.orders || [];
          setRecentOrders(orders);
          if (orders.length > 0) {
            try {
              localStorage.setItem('reposys_last_orders', JSON.stringify(orders));
            } catch (e) {
              console.error('Failed to cache orders', e);
            }
          }
        }
        
        try {
          const walletRes = await api.get('/wallet');
          if (isActive) {
            setWalletBalance(walletRes.data?.balance || 0);
          }
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // Ignore error for simplicity
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    loadData();
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (!activeOrder?._id || activeOrder.status === 'ReadyForPickup') {
      setWaitInfo(null);
      return;
    }
    let isActive = true;
    const loadWaitInfo = async () => {
      try {
        const response = await api.get(`/orders/${activeOrder._id}/wait`);
        if (isActive) {
          startTransition(() => {
            setWaitInfo(response.data || null);
          });
        }
      } catch {
        if (isActive) setWaitInfo(null);
      }
    };
    loadWaitInfo();
    return () => { isActive = false; };
  }, [activeOrder?._id, activeOrder?.status]);

  useEffect(() => {
    if (!socket) return;
    const handleQueueUpdate = (payload = {}) => {
      if (activeOrder?._id && payload.orderId && String(payload.orderId) !== String(activeOrder._id)) return;
      if (typeof payload.position !== 'number' && typeof payload.waitMinutes !== 'number') return;
      startTransition(() => {
        setWaitInfo(curr => ({
          position: payload.position ?? curr?.position ?? null,
          waitMinutes: payload.waitMinutes ?? curr?.waitMinutes ?? null,
        }));
      });
    };
    const handleOrderUpdate = (payload = {}) => {
      const incoming = payload.order;
      if (!incoming?._id) return;
      startTransition(() => {
        setRecentOrders(curr => {
          const deduped = [incoming, ...curr.filter(o => String(o._id) !== String(incoming._id))];
          return deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
        });
      });
    };

    socket.on('queue_update', handleQueueUpdate);
    socket.on('order_update', handleOrderUpdate);
    return () => {
      socket.off('queue_update', handleQueueUpdate);
      socket.off('order_update', handleOrderUpdate);
    };
  }, [activeOrder?._id, socket]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState message="Loading your space..." />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <div className="px-4 py-6 space-y-8">
        
        {/* 1. Greeting Header */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[13px] text-slate-500 font-medium mb-1">Good morning,</p>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-[#0F172A] leading-none tracking-tight">{user?.name?.split(' ')[0] || 'User'}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                user?.role === 'Faculty' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-sky-50 border-sky-200 text-sky-700'
              }`}>
                {user?.role || 'Student'}
              </span>
            </div>
          </div>
          {user?.role === 'Student' || user?.role === 'Faculty' ? (
            <Link to="/wallet" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm active:bg-slate-50 transition-colors">
              <span className="text-[14px] font-bold text-[#0F172A]">₹{walletBalance.toFixed(2)}</span>
            </Link>
          ) : null}
        </div>

        {/* 2. Active Order Card */}
        {activeOrder && activeOrder.status !== 'Completed' && activeOrder.status !== 'Cancelled' && (
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Active Order</h2>
            {activeOrder.status === 'ReadyForPickup' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center shadow-sm">
                <p className="text-emerald-800 font-medium mb-3">Ready for Pickup</p>
                <div className="bg-white rounded-xl py-6 shadow-inner border border-emerald-100">
                  <span className="text-4xl font-black text-emerald-600 tracking-widest">{activeOrder.pickupOtp || '---'}</span>
                </div>
                <p className="text-[11px] font-medium text-emerald-600 mt-3">Show this OTP at the counter</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="h-1.5 w-full bg-[#0047AB]"></div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest mb-1">Token Number</p>
                      <p className="text-[24px] font-black text-[#0F172A] tracking-tight">{activeOrder.tokenNumber}</p>
                    </div>
                    <Badge variant={STATUS_STYLES[activeOrder.status] || 'default'} className="uppercase tracking-wide shadow-sm text-[10px]">
                      {formatOrderState(activeOrder.status)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex-1 text-center border-r border-slate-200 last:border-r-0">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1">Queue Pos</p>
                      <p className="text-[18px] font-bold text-[#0F172A]">{waitInfo?.position ? `#${waitInfo.position}` : '--'}</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1">Est. Wait</p>
                      <p className="text-[18px] font-bold text-[#0F172A]">{waitInfo?.waitMinutes !== undefined && waitInfo.waitMinutes !== null ? `${waitInfo.waitMinutes}m` : '--'}</p>
                    </div>
                  </div>

                  <Link 
                    to={`/track?orderId=${activeOrder._id}`}
                    className="flex items-center justify-center w-full h-11 bg-slate-900 text-white rounded-xl font-bold text-[14px] active:scale-[0.98] transition-transform"
                  >
                    Track Live
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Quick Actions */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">

            <Link to="/orders/new" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0047AB]">
                <FileText size={20} />
              </div>
              <span className="font-bold text-[#0F172A] text-[14px]">New Order</span>
            </Link>
            <Link to="/orders" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Package size={20} />
              </div>
              <span className="font-bold text-[#0F172A] text-[14px]">My Orders</span>
            </Link>
            <Link to="/wallet" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Wallet size={20} />
              </div>
              <span className="font-bold text-[#0F172A] text-[14px]">Wallet</span>
            </Link>

            <Link to="/complaints" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors flex flex-col gap-3 relative">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <MessageCircle size={20} />
              </div>
              <span className="font-bold text-[#0F172A] text-[14px]">Complaints</span>
            </Link>
            <Link to="/tools" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors flex flex-col gap-3 relative">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                <Sparkles size={20} />
              </div>
              <span className="font-bold text-[#0F172A] text-[14px]">Doc Tools</span>
            </Link>
            <Link to="/chat" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors flex flex-col gap-3 relative">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <MessageSquare size={20} />
              </div>
              <span className="font-bold text-[#0F172A] text-[14px]">Chats</span>
              {unreadChatCount > 0 && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white">
                  {unreadChatCount}
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* 3. Recent Orders List */}
        <div>
          <div className="flex justify-between items-end mb-3 ml-1">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Orders</h2>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-[14px]">
                No recent orders found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOrders.map(order => (
                  <Link key={order._id} to={`/orders/${order._id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition">
                    <div>
                      <p className="font-bold text-[#0F172A] text-[15px] mb-0.5">{order.tokenNumber || '---'}</p>
                      <p className="text-[12px] text-slate-500 font-medium">{order.serviceType} • {formatDate(order.createdAt)}</p>
                    </div>
                    <Badge variant={STATUS_STYLES[order.status] || 'secondary'} className="text-[10px]">
                      {formatOrderState(order.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default MobileHome;
