import React from 'react';
import { FileText, Download, CheckCircle2, Circle } from 'lucide-react';

const MobileOrderDetail = ({ order, onCancel, onReorder, onDownloadReceipt }) => {
  if (!order) return null;

  const getStatusIndex = (status) => {
    switch (status) {
      case 'In Queue': return 0;
      case 'Processing': return 1;
      case 'ReadyForPickup': return 2;
      case 'Completed': return 3;
      default: return 0;
    }
  };

  const currentIndex = getStatusIndex(order.status);
  const isCancelled = order.status === 'Cancelled';
  const isActive = !isCancelled && order.status !== 'Completed';

  const steps = [
    { id: 'In Queue', label: 'In Queue', date: order.createdAt },
    { id: 'Processing', label: 'Processing', date: order.processingAt },
    { id: 'ReadyForPickup', label: 'Ready for Pickup', date: order.readyAt },
    { id: 'Completed', label: 'Completed', date: order.completedAt }
  ];

  const renderBadge = () => {
    let colorClass = 'bg-slate-100 text-slate-700';
    let label = order.status;

    if (order.status === 'In Queue') colorClass = 'bg-blue-100 text-blue-700';
    if (order.status === 'Processing') colorClass = 'bg-amber-100 text-amber-700';
    if (order.status === 'ReadyForPickup') {
      colorClass = 'bg-green-100 text-green-700';
      label = 'Ready';
    }
    if (order.status === 'Cancelled') colorClass = 'bg-red-100 text-red-700';

    return (
      <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${colorClass}`}>
        {label}
      </div>
    );
  };

  return (
    <div className="w-full min-h-full bg-[#F8FAFC] pb-24 flex flex-col">
      {/* 1. HERO SECTION */}
      <div className="flex flex-col items-center justify-center pt-8 pb-6 px-4 bg-white border-b border-slate-100">
        <h1 className="text-[32px] font-bold text-[#0047AB] tracking-tight leading-none mb-4">
          {order.tokenNumber}
        </h1>
        {renderBadge()}
        <p className="text-[14px] text-[#64748B] mt-3 font-medium">
          {order.serviceType}
        </p>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* 5. OTP PICKUP SECTION */}
        {order.status === 'ReadyForPickup' && (
          <div className="bg-green-50 rounded-2xl p-5 border-2 border-green-500 shadow-sm flex flex-col items-center text-center">
            <span className="text-[13px] font-bold text-green-700 uppercase tracking-widest mb-2">Your pickup OTP</span>
            <div className="text-[40px] font-mono font-bold text-[#16A34A] tracking-[0.25em] leading-none pl-3 mb-2">
              {order.otp || '0000'}
            </div>
            <p className="text-[13px] font-medium text-green-800">
              Show this to the staff at counter
            </p>
          </div>
        )}

        {/* 2. PROGRESS TIMELINE */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
            <h2 className="text-[16px] font-bold text-[#0F172A] mb-4">Order Status</h2>
            <div className="relative pl-2">
              {steps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isLast = index === steps.length - 1;

                return (
                  <div key={step.id} className="relative flex items-start mb-6 last:mb-0">
                    {/* Vertical Line */}
                    {!isLast && (
                      <div 
                        className={`absolute left-[9px] top-6 bottom-[-24px] w-[2px] ${isCompleted ? 'bg-[#0047AB]' : 'bg-slate-200'}`}
                      />
                    )}

                    {/* Circle Indicator */}
                    <div className="relative z-10 bg-white mr-4 mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 size={20} className="text-[#0047AB]" fill="currentColor" stroke="white" />
                      ) : isCurrent ? (
                        <div className="relative flex items-center justify-center w-5 h-5">
                          <span className="absolute inline-flex w-full h-full rounded-full bg-[#0047AB] opacity-30 animate-ping"></span>
                          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[#0047AB]"></span>
                          <div className="absolute w-5 h-5 border-2 border-[#0047AB] rounded-full"></div>
                        </div>
                      ) : (
                        <Circle size={20} className="text-slate-300" strokeWidth={2.5} />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 pb-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[14px] ${isCurrent || isCompleted ? 'font-bold text-[#0F172A]' : 'font-medium text-[#94A3B8]'}`}>
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-blue-50 text-[#0047AB] text-[10px] font-bold uppercase rounded-md tracking-wide">
                            In Progress
                          </span>
                        )}
                      </div>
                      {step.date && (isCompleted || isCurrent) && (
                        <p className="text-[11px] text-[#94A3B8] mt-1 font-medium">
                          {new Date(step.date).toLocaleString(undefined, { 
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. ORDER DETAILS CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-[14px] font-bold text-[#0F172A]">Order Details</h2>
            {order.status === 'Completed' && (
              <button 
                onClick={onDownloadReceipt}
                className="flex items-center text-[12px] font-bold text-[#0047AB]"
              >
                <Download size={14} className="mr-1" /> Receipt
              </button>
            )}
          </div>
          <div className="p-4 flex flex-col">
            {[
              { label: 'Pages', value: order.pageCount || '-' },
              { label: 'Copies', value: order.copies || 1 },
              { label: 'Color Mode', value: order.colorMode || 'B&W' },
              { label: 'Paper Size', value: order.paperSize || 'A4' },
              { label: 'Binding', value: order.binding || 'None' },
              { label: 'Payment Method', value: order.paymentMethod || 'Wallet' },
              { label: 'Amount', value: `₹${order.totalAmount || 0}` }
            ].map((detail, idx, arr) => (
              <div key={detail.label}>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[12px] text-[#94A3B8] uppercase font-bold tracking-wider">{detail.label}</span>
                  <span className="text-[14px] font-bold text-[#0F172A]">{detail.value}</span>
                </div>
                {idx < arr.length - 1 && <div className="h-px bg-slate-100 w-full" />}
              </div>
            ))}
          </div>
        </div>

        {/* 4. DOCUMENTS SECTION */}
        {order.documents && order.documents.length > 0 && (
          <div className="mb-4">
            <h2 className="text-[14px] font-bold text-[#0F172A] mb-3 px-1">Uploaded Documents</h2>
            <div className="space-y-3">
              {order.documents.map((doc, idx) => (
                <div key={idx} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3 shrink-0">
                    <FileText size={20} className="text-[#0047AB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0F172A] truncate">
                      {doc.fileName || doc.name || `Document_${idx + 1}.pdf`}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      {doc.pages ? `${doc.pages} pages` : 'PDF Document'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. ACTION BUTTONS (Fixed Bottom Bar) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        {isActive && onCancel && (
          <button 
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl border border-red-200 text-red-600 text-[14px] font-bold active:bg-red-50 transition-colors"
          >
            Cancel Order
          </button>
        )}
        <button 
          onClick={onReorder}
          className="flex-1 h-12 rounded-xl bg-[#0047AB] text-white text-[14px] font-bold shadow-[0_4px_14px_rgba(0,71,171,0.3)] active:scale-[0.98] transition-transform"
        >
          Reorder
        </button>
      </div>
    </div>
  );
};

export default MobileOrderDetail;
