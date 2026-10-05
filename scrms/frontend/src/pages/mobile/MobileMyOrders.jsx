import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, FileText, Printer, PackageSearch } from 'lucide-react';
import api from '../../services/api';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const STATUS_FILTERS = ['All', 'Pending', 'In_Queue', 'Processing', 'ReadyForPickup', 'Completed', 'Cancelled'];

const getStatusStyles = (status) => {
  switch (status) {
    case 'Processing':
      return {
        bg: 'bg-[#0052cc]',
        text: 'text-[#c4d2ff]',
        icon: <span className="w-1.5 h-1.5 bg-[#c4d2ff] rounded-full animate-pulse" />,
        label: 'Processing'
      };
    case 'ReadyForPickup':
      return {
        bg: 'bg-[#006477]',
        text: 'text-[#76e2ff]',
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        label: 'Ready'
      };
    case 'Completed':
      return {
        bg: 'bg-[#e1e8ff]',
        text: 'text-[#434654]',
        icon: null,
        label: 'Completed'
      };
    case 'Cancelled':
      return {
        bg: 'bg-[#ffdad6]',
        text: 'text-[#93000a]',
        icon: null,
        label: 'Cancelled'
      };
    case 'Pending':
    case 'In_Queue':
      return {
        bg: 'bg-[#e9edff]',
        text: 'text-[#003d9b]',
        icon: <Clock className="w-3.5 h-3.5" />,
        label: status === 'In_Queue' ? 'In Queue' : 'Pending'
      };
    default:
      return {
        bg: 'bg-[#e1e8ff]',
        text: 'text-[#434654]',
        icon: null,
        label: status
      };
  }
};

const getServiceIcon = (type) => {
  if (type === 'Printing' || type === 'Photocopying') return <Printer className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
};

const MobileMyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get('/orders/my-orders');
        setOrders(Array.isArray(response.data?.orders) ? response.data.orders : []);
      } catch (loadError) {
        setError(loadError.response?.data?.message || 'Could not load your orders.');
      } finally {
        setIsLoading(false);
      }
    };
    loadOrders();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = !debouncedSearch || order.tokenNumber?.toLowerCase().includes(debouncedSearch) || order.serviceType?.toLowerCase().includes(debouncedSearch);
      const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [debouncedSearch, orders, statusFilter]);

  const handleDownloadReceipt = async (event, orderId, tokenNumber) => {
    event.stopPropagation();
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
      console.error(err);
    }
  };

  return (
    <div className="min-h-full bg-[#faf9ff] pb-8 pt-4 px-4 space-y-6 text-[#051a3e] font-['Inter']">
      <section className="flex gap-2 items-center">
        <div className="relative flex-grow group">
          <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737685] group-focus-within:text-[#003d9b] transition-colors w-5 h-5" />
          <input 
            className="w-full pl-10 pr-4 py-3 bg-[#f1f3ff] border-none rounded-xl text-[14px] leading-5 focus:ring-2 focus:ring-[#003d9b]/20 transition-all placeholder:text-[#737685]/60 outline-none" 
            placeholder="Search order ID..." 
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </section>

      <section className="overflow-x-auto -mx-4 px-4 py-2 flex gap-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {STATUS_FILTERS.map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`whitespace-nowrap px-5 py-2 rounded-full font-['Hanken_Grotesk'] text-[14px] font-semibold leading-5 shadow-sm transition-all active:scale-95 border ${
              statusFilter === status 
                ? 'bg-[#003d9b] text-[#ffffff] border-[#003d9b] shadow-md shadow-[#003d9b]/20' 
                : 'bg-[#e1e8ff] text-[#434654] border-transparent hover:bg-[#dae2ff]'
            }`}
          >
            {status === 'All' ? 'All' : status.replace(/_/g, ' ')}
          </button>
        ))}
      </section>

      <section className="space-y-4">
        {isLoading && <p className="text-center text-[#737685] py-10">Loading orders...</p>}
        {error && <p className="text-center text-[#ba1a1a] py-10">{error}</p>}
        {!isLoading && !error && filteredOrders.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <PackageSearch className="w-12 h-12 text-[#c3c6d6] mx-auto" />
            <p className="text-[#434654]">No matching orders found.</p>
          </div>
        )}
        
        {filteredOrders.map(order => {
          const style = getStatusStyles(order.status);
          const isCompleted = order.status === 'Completed';
          const isCancelled = order.status === 'Cancelled';
          
          return (
            <div 
              key={order._id}
              onClick={() => navigate(`/orders/${order._id}`)}
              className={`bg-[#ffffff] p-6 rounded-xl border border-[#c3c6d6]/30 shadow-[0px_4px_20px_rgba(9,30,66,0.08)] active:scale-[0.98] transition-all cursor-pointer flex flex-col gap-4 ${
                isCompleted ? 'opacity-90' : ''
              } ${isCancelled ? 'opacity-75 grayscale' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="font-['JetBrains_Mono'] text-[12px] font-medium tracking-widest text-[#737685] uppercase">Order ID</span>
                  <h3 className={`font-['Hanken_Grotesk'] text-[24px] font-bold leading-tight ${isCompleted || isCancelled ? 'text-[#434654]' : 'text-[#003d9b]'}`}>
                    {order.tokenNumber}
                  </h3>
                </div>
                <span className={`px-3 py-1 rounded-full flex items-center gap-1.5 font-['JetBrains_Mono'] text-[12px] font-bold ${style.bg} ${style.text}`}>
                  {style.icon}
                  {style.label}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="text-[#737685] w-[18px] h-[18px]" />
                <span className="text-[14px] text-[#434654]">{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              
              <div className={`p-3 rounded-lg flex items-center justify-between ${isCompleted || isCancelled ? 'bg-[#f1f3ff]/50' : 'bg-[#f1f3ff]'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${isCompleted ? 'bg-[#737685]/10 text-[#737685]' : isCancelled ? 'bg-[#ffdad6]/20 text-[#ba1a1a]' : 'bg-[#9f8eff]/20 text-[#5e4db9]'}`}>
                    {getServiceIcon(order.serviceType)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-['Hanken_Grotesk'] text-[14px] font-semibold text-[#051a3e]">{order.serviceType}</span>
                    <span className="font-['JetBrains_Mono'] text-[12px] text-[#737685]">
                      {order.documentIds?.length || 0} file(s)
                    </span>
                  </div>
                </div>
                <span className={`font-['Hanken_Grotesk'] text-[24px] font-bold shrink-0 ${isCompleted || isCancelled ? 'text-[#737685]' : 'text-[#051a3e]'}`}>
                  {CURRENCY_FORMATTER.format(order.finalCost || order.estimatedCost || 0)}
                </span>
              </div>
              
              {order.status === 'ReadyForPickup' ? (
                <button 
                  className="w-full bg-[#003d9b] text-[#ffffff] py-3 rounded-lg font-['Hanken_Grotesk'] text-[14px] font-semibold shadow-lg shadow-[#003d9b]/20 active:scale-[0.97] transition-all mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/orders/${order._id}`);
                  }}
                >
                  Show QR Code for Pickup
                </button>
              ) : isCompleted ? (
                <div className="flex justify-between items-center mt-1">
                  <button 
                    onClick={(e) => handleDownloadReceipt(e, order._id, order.tokenNumber)}
                    className="text-[#003d9b] font-['Hanken_Grotesk'] text-[14px] font-semibold flex items-center gap-1 hover:underline"
                  >
                    Download Receipt
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center mt-1">
                  <button className="text-[#003d9b] font-['Hanken_Grotesk'] text-[14px] font-semibold flex items-center gap-1 hover:underline">
                    View Details
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default MobileMyOrders;
