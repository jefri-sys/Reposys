import React, { useEffect, useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Check, Search, Hourglass, PackageCheck, AlertTriangle, Printer, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContextObject';

const MobileTrack = () => {
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
        console.error('Failed to fetch order details:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (user) {
        setIsAutoFetching(true);
        try {
          const response = await api.get('/orders/my-orders');
          const orders = response.data?.orders || [];
          const activeStatuses = ['Pending', 'In_Queue', 'Processing', 'ReadyForPickup'];
          const activeOrder = orders.find(o => activeStatuses.includes(o.status));
          
          if (activeOrder) {
            navigate(`/track?orderId=${activeOrder._id}`, { replace: true });
            return;
          } else if (orders.length > 0) {
            navigate(`/track?orderId=${orders[0]._id}`, { replace: true });
            return;
          } else {
             setError(true);
          }
        } catch (err) {
          console.error('Failed to fetch active orders for tracking', err);
          setError(true);
        } finally {
          setIsAutoFetching(false);
        }
      } else {
         setError(true);
      }
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchOrder();
  }, [orderId, user]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!socket || !orderId) return;
    socket.emit('join_order_room', orderId);
    const handleUpdate = () => fetchOrder();
    socket.on('order_status_update', handleUpdate);
    return () => socket.off('order_status_update', handleUpdate);
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

  // ─── Shared UI Wrappers ──────────────────────────────────────────────────
  const MobileHeader = () => (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#faf9ff]/80 backdrop-blur-md border-b border-[#c3c6d6]/30 shadow-sm flex justify-between items-center px-4 h-16">
      <button 
        onClick={handleBack} 
        className="w-10 h-10 flex items-center justify-center rounded-full text-[#003d9b] active:scale-95 transition-transform hover:bg-[#0052cc]/10"
      >
         <ArrowLeft className="w-6 h-6" />
      </button>
      <h1 className="font-['Hanken_Grotesk'] text-[24px] font-bold text-[#003d9b]">Track Order</h1>
      <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#003d9b] active:scale-95 transition-transform hover:bg-[#0052cc]/10">
      </button>
    </header>
  );

  const TrackAnotherForm = () => (
    <section className="bg-[#f1f3ff] rounded-2xl p-6 border border-[#c3c6d6]/20 flex flex-col gap-4 shadow-sm mb-4">
      <div>
        <h3 className="font-['Hanken_Grotesk'] text-[24px] font-bold text-[#051a3e]">Track another?</h3>
        <p className="font-['Inter'] text-[14px] text-[#434654] mt-1">Enter a unique Order ID to update the tracker.</p>
      </div>
      <form onSubmit={handleTrackSubmit} className="flex flex-col gap-3">
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737685] group-focus-within:text-[#003d9b] transition-colors">
            <Search className="w-5 h-5" />
          </span>
          <input 
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-[#c3c6d6] bg-white focus:border-[#003d9b] focus:ring-1 focus:ring-[#003d9b] transition-all outline-none font-['JetBrains_Mono'] text-[14px] uppercase tracking-wider" 
            placeholder="ENTER ORDER ID" 
            type="text"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
          />
        </div>
        <button 
          type="submit"
          className="w-full bg-[#003d9b] text-white py-4 rounded-xl font-['Hanken_Grotesk'] text-[16px] font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Track Order
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </section>
  );

  // ─── Loading / AutoFetching State ───────────────────────────────────────
  if (isAutoFetching || isLoading) {
    return (
      <div className="min-h-screen bg-[#faf9ff] flex flex-col font-['Inter']">
        <MobileHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <Loader2 className="w-12 h-12 animate-spin text-[#003d9b] mb-4" />
          <p className="text-[#434654] font-medium animate-pulse">
            {isAutoFetching ? 'Checking active orders...' : 'Loading order details...'}
          </p>
        </div>
        <div className="px-4 pb-20">
          <TrackAnotherForm />
        </div>
      </div>
    );
  }

  // ─── Error / Not Found State ────────────────────────────────────────────
  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#faf9ff] flex flex-col font-['Inter']">
        <MobileHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center mt-16">
           <AlertTriangle className="w-16 h-16 text-[#ba1a1a] mb-6 opacity-80" />
           <p className="text-[20px] font-semibold text-[#ba1a1a] font-['Hanken_Grotesk']">Order not found</p>
           <p className="mt-2 text-[14px] text-[#737685] max-w-[250px]">The tracking link might have expired or the order ID is invalid.</p>
        </div>
        <div className="px-4 pb-20 mt-8">
          <TrackAnotherForm />
        </div>
      </div>
    );
  }

  // ─── Success State Logic ────────────────────────────────────────────────
  const isLive = ['In_Queue', 'Processing'].includes(order.status);
  const isReady = order.status === 'ReadyForPickup';
  const isComplete = order.status === 'Completed';
  const isCancelled = order.status === 'Cancelled';
  const isPending = order.status === 'Pending';

  // Determine active step index (0: Received, 1: Processing, 2: Ready)
  let activeStep = 0;
  if (['In_Queue', 'Processing'].includes(order.status)) activeStep = 1;
  if (['ReadyForPickup', 'Completed'].includes(order.status)) activeStep = 2;

  const TimelineNode = ({ active, past, icon: Icon, title, subtitle, isLast }) => (
    <div className="flex gap-6 relative min-h-[80px]">
      {!isLast && (
        <div 
          className="absolute left-[23px] top-12 bottom-0 w-[2px]"
          style={{
            backgroundImage: past ? 'none' : 'linear-gradient(to bottom, #c3c6d6 50%, rgba(255, 255, 255, 0) 0%)',
            backgroundColor: past ? '#003d9b' : 'transparent',
            backgroundPosition: 'right',
            backgroundSize: '2px 10px',
            backgroundRepeat: 'repeat-y'
          }}
        ></div>
      )}
      <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 ${
        active 
          ? 'bg-[#e9edff] text-[#003d9b] border-[#003d9b]/20 shadow-[0_4px_12px_rgba(0,61,155,0.15)]' 
          : past 
            ? 'bg-[#003d9b] text-white border-[#003d9b] shadow-lg' 
            : 'bg-[#f1f3ff] text-[#737685] border-transparent'
      }`}>
        {active ? (
          <div className="relative flex items-center justify-center w-full h-full">
            <Icon className="w-5 h-5 text-[#003d9b]" />
            <div className="absolute inset-0 rounded-full border-[2px] border-[#003d9b] animate-ping opacity-50"></div>
          </div>
        ) : Icon ? (
          <Icon className="w-5 h-5" />
        ) : null}
      </div>
      
      <div className="flex flex-col pt-1 pb-10 flex-1">
        <h4 className={`font-['Hanken_Grotesk'] text-[16px] font-bold ${
          active ? 'text-[#003d9b]' : past ? 'text-[#051a3e]' : 'text-[#737685]'
        }`}>{title}</h4>
        <p className={`font-['Inter'] text-[14px] mt-1 ${
          active ? 'text-[#434654]' : 'text-[#737685]'
        }`}>{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#faf9ff] text-[#051a3e] font-['Inter'] pb-20">
      <MobileHeader />

      <main className="pt-20 px-4 flex flex-col gap-6 max-w-lg mx-auto">
        
        {/* Status Hero Card */}
        <div className={`rounded-2xl p-6 text-white shadow-[0_4px_20px_rgba(9,30,66,0.08)] relative overflow-hidden flex flex-col gap-2 ${isCancelled ? 'bg-[#ba1a1a]' : isComplete ? 'bg-[#004b59]' : 'bg-[#003d9b]'}`}>
           <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
           <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
           
           <div className="relative z-10 flex justify-between items-start">
             <div>
               <p className="font-['JetBrains_Mono'] text-[11px] text-white/80 uppercase tracking-wider">Order ID</p>
               <h2 className="font-['Hanken_Grotesk'] text-[24px] font-bold text-white break-all leading-tight mt-1 max-w-[200px]">
                  #{order.tokenNumber}
               </h2>
             </div>
             <div className="bg-white/20 text-white px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md">
                <span className={`w-2 h-2 rounded-full ${isCancelled || isComplete ? 'bg-white' : 'bg-white animate-pulse'}`}></span>
                <span className="font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-wider">
                  {order.status.replace(/_/g, ' ')}
                </span>
             </div>
           </div>
           
           <div className="h-px w-full bg-white/20 my-2 relative z-10"></div>
           
           <div className="relative z-10 flex items-center gap-2 text-white/90">
             {isReady || isComplete ? <PackageCheck className="w-5 h-5" /> : 
              isCancelled ? <AlertTriangle className="w-5 h-5" /> : 
              <Printer className="w-5 h-5" />}
             <p className="font-['Inter'] text-[13px] font-medium">
                {isComplete ? 'Order has been collected' : 
                 isReady ? 'Your order is ready at the counter' : 
                 isLive ? 'We are preparing your documents' : 
                 isCancelled ? 'This order was cancelled' :
                 'Your order is pending'}
             </p>
           </div>
        </div>

        {/* Queue Metrics Row */}
        {isLive && (
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#c3c6d6]/30 flex flex-col justify-center">
              <span className="font-['JetBrains_Mono'] text-[11px] text-[#737685] font-bold uppercase tracking-wider mb-2">Queue Pos</span>
              <div className="flex flex-col">
                 <span className="font-['Hanken_Grotesk'] text-[24px] font-bold text-[#051a3e] leading-none">
                   #{order.queuePosition || '--'}
                 </span>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#c3c6d6]/30 flex flex-col justify-center">
              <span className="font-['JetBrains_Mono'] text-[11px] text-[#737685] font-bold uppercase tracking-wider mb-2">Est. Wait</span>
              <div className="flex flex-col">
                 <span className="font-['Hanken_Grotesk'] text-[24px] font-bold text-[#0052cc] leading-none">
                   {order.estimatedWait !== null ? `~${order.estimatedWait}m` : '--'}
                 </span>
              </div>
            </div>
          </div>
        )}

        {/* OTP Display if ready */}
        {isReady && order.pickupOtp && (
          <div className="bg-[#0052cc]/10 border border-[#0052cc]/20 rounded-2xl p-5 flex items-center justify-between mt-1">
             <div>
               <p className="font-['JetBrains_Mono'] text-[12px] text-[#003d9b] font-bold uppercase tracking-wider">Pickup Code</p>
               <p className="text-[13px] text-[#051a3e] font-medium mt-1">Show at counter</p>
             </div>
             <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-[#0052cc]/20">
                <span className="font-['JetBrains_Mono'] text-[28px] font-bold text-[#003d9b] tracking-widest">{order.pickupOtp}</span>
             </div>
          </div>
        )}

        {/* Order Journey Stepper */}
        {(!isCancelled && !isComplete) && (
          <section className="flex flex-col gap-6 px-2 mt-2">
            <h3 className="font-['Hanken_Grotesk'] text-[16px] text-[#434654] font-bold uppercase tracking-widest">Order Journey</h3>
            <div className="flex flex-col">
              <TimelineNode 
                active={activeStep === 0 && !isPending} 
                past={activeStep > 0} 
                icon={Check} 
                title="Order Received" 
                subtitle={activeStep > 0 ? 'Verified and confirmed' : 'Waiting in queue'} 
                isLast={false} 
              />
              <TimelineNode 
                active={activeStep === 1} 
                past={activeStep > 1} 
                icon={Hourglass} 
                title="Processing" 
                subtitle={activeStep === 1 ? <span className="font-medium text-[#0052cc]">Currently printing</span> : activeStep > 1 ? 'Completed' : 'Pending'} 
                isLast={false} 
              />
              <TimelineNode 
                active={activeStep === 2} 
                past={false} 
                icon={PackageCheck} 
                title="Ready for Pickup" 
                subtitle={activeStep === 2 ? <span className="font-medium italic">Waiting for you at counter</span> : <span className="italic">Waiting for completion</span>} 
                isLast={true} 
              />
            </div>
          </section>
        )}

        {/* Informational Text */}
        <div className="flex items-center justify-center gap-2 opacity-60 mt-2 mb-4">
          <span className="font-['Inter'] text-[12px] text-[#434654] text-center max-w-[250px]">
            {isComplete ? 'This order has been completed and collected.' : isCancelled ? 'This order was cancelled by staff or expired.' : 'Your order updates in real-time. Keep this page open.'}
          </span>
        </div>

        {/* Inline Search Bar */}
        <TrackAnotherForm />

      </main>
    </div>
  );
};

export default MobileTrack;
