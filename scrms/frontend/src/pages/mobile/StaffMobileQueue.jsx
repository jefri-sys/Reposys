import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Clock, Lock, CheckCircle2, AlertCircle, Play, X, FileText, CheckSquare, BarChart3, ListTodo } from 'lucide-react';

const StaffMobileQueue = ({ 
  queue = [], 
  activeServiceFilter: propActiveFilter = 'All', 
  onStatusUpdate, 
  onVerifyOtp, 
  shopOpen: initialShopOpen = true 
}) => {
  const [shopOpen, setShopOpen] = useState(initialShopOpen);
  const [activeFilter, setActiveFilter] = useState(propActiveFilter);
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedOtpOrder, setSelectedOtpOrder] = useState(null);
  const [otpValue, setOtpValue] = useState(['', '', '', '']);

  const filters = [
    { name: 'All', count: queue.length },
    { name: 'Printing', count: queue.filter(q => q.serviceType === 'Printing').length },
    { name: 'Photocopying', count: queue.filter(q => q.serviceType === 'Photocopying').length },
    { name: 'Scanning', count: queue.filter(q => q.serviceType === 'Scanning').length },
    { name: 'Binding', count: queue.filter(q => q.serviceType === 'Binding').length }
  ];

  const filteredQueue = activeFilter === 'All' 
    ? queue 
    : queue.filter(q => q.serviceType === activeFilter);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1]; // only 1 char
    if (!/^\d*$/.test(value)) return; // only numbers

    const newOtp = [...otpValue];
    newOtp[index] = value;
    setOtpValue(newOtp);

    // auto focus next
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpVerify = () => {
    if (otpValue.join('').length === 4 && selectedOtpOrder) {
      onVerifyOtp && onVerifyOtp(selectedOtpOrder.id, otpValue.join(''));
      setSelectedOtpOrder(null);
      setOtpValue(['', '', '', '']);
    }
  };

  return (
    <div className="w-full min-h-full bg-[#F8FAFC] pb-[80px] flex flex-col relative overflow-x-hidden">
      
      {/* 1. TOP AREA */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm pt-4 pb-3">
        <div className="px-4 flex justify-between items-end mb-4">
          <div>
            <button 
              onClick={() => setShopOpen(!shopOpen)}
              className={`flex items-center px-3 py-1.5 rounded-full border text-[13px] font-bold transition-colors active:scale-95 ${
                shopOpen 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${shopOpen ? 'bg-green-500' : 'bg-red-500'}`} />
              {shopOpen ? 'Shop Open' : 'Shop Closed'}
            </button>
            <p className="text-[13px] font-medium text-slate-500 mt-2">
              <span className="font-bold text-[#0F172A]">{queue.length}</span> orders in queue
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
            S1
          </div>
        </div>

        {/* Service Type Tabs */}
        <div className="flex px-4 overflow-x-auto gap-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {filters.map(filter => (
            <button
              key={filter.name}
              onClick={() => setActiveFilter(filter.name)}
              className={`flex items-center whitespace-nowrap px-4 py-2 rounded-full border text-[13px] font-bold transition-colors active:scale-95 shrink-0 ${
                activeFilter === filter.name
                  ? 'bg-[#0F172A] border-[#0F172A] text-white'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              {filter.name}
              {filter.count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${
                  activeFilter === filter.name ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                }`}>
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
      </div>

      {/* 2. QUEUE LIST */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {filteredQueue.length > 0 ? (
          filteredQueue.map((order) => {
            const isLocked = order.lockedBy && order.lockedBy !== 'me';
            
            return (
              <div 
                key={order.id} 
                className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden ${
                  isLocked ? 'opacity-70' : ''
                }`}
              >
                {/* Locked Overlay */}
                {isLocked && (
                  <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center text-center">
                    <div className="bg-white px-4 py-2 rounded-full shadow-sm flex items-center border border-slate-200">
                      <Lock size={14} className="text-slate-400 mr-2" />
                      <span className="text-[13px] font-bold text-slate-600">Locked by {order.lockedBy}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <span className="text-[18px] font-bold text-[#0047AB] tracking-tight">{order.tokenNumber}</span>
                    {order.priority === 'Faculty' && (
                      <div className="ml-2 bg-purple-50 text-purple-600 p-1 rounded-md">
                        <Crown size={14} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center text-slate-500">
                    <Clock size={12} className="mr-1" />
                    <span className="text-[12px] font-medium">{order.waitTime || '10m wait'}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-[14px] font-bold text-[#0F172A]">{order.customerName}</h3>
                  <div className="flex items-center mt-1 text-[13px] text-slate-500 font-medium">
                    <span className="text-slate-700">{order.serviceType}</span>
                    <span className="mx-2 text-slate-300">•</span>
                    <span>{order.pageCount || '-'} pages</span>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {order.paymentStatus || 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="pt-3 border-t border-slate-50 flex gap-2 relative z-10">
                  {order.status === 'In Queue' && (
                    <button 
                      onClick={() => onStatusUpdate && onStatusUpdate(order.id, 'Processing')}
                      className="flex-1 h-10 rounded-xl bg-[#0047AB] text-white text-[13px] font-bold active:scale-[0.98] transition-transform flex items-center justify-center shadow-sm"
                    >
                      <Play size={16} className="mr-1.5" fill="currentColor" /> Lock & Start
                    </button>
                  )}
                  {order.status === 'Processing' && (
                    <>
                      <button 
                        onClick={() => onStatusUpdate && onStatusUpdate(order.id, 'Partial')}
                        className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-700 text-[13px] font-bold active:bg-slate-50 transition-colors flex items-center justify-center"
                      >
                        Partial
                      </button>
                      <button 
                        onClick={() => onStatusUpdate && onStatusUpdate(order.id, 'ReadyForPickup')}
                        className="flex-[2] h-10 rounded-xl bg-green-600 text-white text-[13px] font-bold active:scale-[0.98] transition-transform flex items-center justify-center shadow-sm"
                      >
                        <CheckCircle2 size={16} className="mr-1.5" /> Mark Ready
                      </button>
                    </>
                  )}
                  {order.status === 'ReadyForPickup' && (
                    <button 
                      onClick={() => setSelectedOtpOrder(order)}
                      className="flex-1 h-10 rounded-xl bg-green-600 text-white text-[13px] font-bold active:scale-[0.98] transition-transform flex items-center justify-center shadow-sm"
                    >
                      Verify OTP
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-slate-300" />
            </div>
            <h3 className="text-[16px] font-bold text-[#0F172A] mb-1">Queue is empty</h3>
            <p className="text-[13px] text-slate-500">There are no orders matching this filter right now.</p>
          </div>
        )}
      </div>

      {/* 3. OTP VERIFICATION BOTTOM SHEET */}
      <AnimatePresence>
        {selectedOtpOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedOtpOrder(null);
                setOtpValue(['', '', '', '']);
              }}
              className="fixed inset-0 bg-slate-900/40 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 shadow-xl"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[18px] font-bold text-[#0F172A]">Verify Pickup</h3>
                  <p className="text-[13px] text-slate-500 mt-1">
                    Token <span className="font-bold text-[#0047AB]">{selectedOtpOrder.tokenNumber}</span> • {selectedOtpOrder.customerName}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedOtpOrder(null);
                    setOtpValue(['', '', '', '']);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200"
                >
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              <div className="flex justify-between gap-3 mb-8">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    id={`otp-input-${index}`}
                    type="number"
                    pattern="\d*"
                    maxLength={1}
                    value={otpValue[index]}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
                        const prevInput = document.getElementById(`otp-input-${index - 1}`);
                        if (prevInput) prevInput.focus();
                      }
                    }}
                    className="w-full aspect-square text-center text-[28px] font-bold font-mono text-[#0F172A] bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-[#0047AB] focus:bg-blue-50/50 transition-colors"
                  />
                ))}
              </div>

              <button 
                onClick={handleOtpVerify}
                disabled={otpValue.join('').length !== 4}
                className="w-full h-14 rounded-xl bg-green-600 text-white text-[16px] font-bold active:scale-[0.98] transition-transform shadow-[0_4px_14px_rgba(22,163,74,0.3)] disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none"
              >
                Verify & Complete Order
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. STAFF BOTTOM NAV */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex"
        style={{ height: '64px', paddingBottom: 'env(safe-area-inset-bottom)', boxSizing: 'content-box' }}
      >
        {[
          { id: 'queue', icon: ListTodo, label: 'Queue' },
          { id: 'completed', icon: CheckSquare, label: 'Completed' },
          { id: 'complaints', icon: AlertCircle, label: 'Issues' },
          { id: 'reports', icon: BarChart3, label: 'Reports' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center relative ${
                isActive ? 'text-[#0047AB]' : 'text-slate-400'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 w-[40%] h-[3px] bg-[#0047AB] rounded-b-full" />
              )}
              <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StaffMobileQueue;
