import { useEffect, useState } from 'react';
import { Minus, Plus, Settings2, ReceiptText } from 'lucide-react';
import api from '../../services/api';

const SERVICE_TYPES = ['Printing', 'Photocopying', 'Scanning', 'Binding'];
const PAYMENT_METHODS = [
  { label: 'Online Payment', value: 'Online' },
  { label: 'Pay at Counter', value: 'Cash' },
];
const PICKUP_SLOTS = [
  { label: 'Morning (9-11am)', value: 'Morning' },
  { label: 'Afternoon (12-2pm)', value: 'Afternoon' },
  { label: 'Evening (3-5pm)', value: 'Evening' },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const getServiceTypePatch = (serviceType, currentConfig) => {
  if (serviceType === 'Binding') {
    return {
      serviceType,
      binding: currentConfig.binding && currentConfig.binding !== 'None' ? currentConfig.binding : 'Spiral',
      copies: 1,
    };
  }
  if (serviceType === 'Scanning') {
    return {
      serviceType,
      binding: 'None',
      copies: 1,
      colourMode: currentConfig.colourMode === 'Colour' ? 'Colour' : 'BlackAndWhite',
    };
  }
  if (serviceType === 'Conversion') {
    return {
      serviceType,
      binding: 'None',
      copies: 1,
      conversionType: currentConfig.conversionType || 'PDF to Word',
    };
  }
  return {
    serviceType,
    binding: serviceType === 'Photocopying' ? 'None' : currentConfig.binding,
  };
};

const MobileWizardStep2Configure = ({
  uploadedDocuments,
  orderConfig,
  onConfigChange,
  onBack,
  onNext,
  costEstimate,
  onCostEstimateChange,
  isGuestMode = false,
  paymentMethods = PAYMENT_METHODS,
  hideNavigation = false,
}) => {
  const totalPages = uploadedDocuments.reduce((sum, document) => sum + (document.pageCount || 0), 0);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!isGuestMode) {
      api.get('/wallet').then((res) => {
        if (res.data?.success) {
          setWalletBalance(res.data.balance || 0);
        }
      }).catch(() => {
        setWalletBalance(0);
      });
    }
  }, [isGuestMode]);

  useEffect(() => {
    if (!orderConfig.serviceType) {
      onCostEstimateChange(null);
      setEstimateError('');
      setIsEstimating(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsEstimating(true);
      setEstimateError('');

      try {
        const response = await api.post('/orders/estimate', {
          serviceType: orderConfig.serviceType,
          pageCount: totalPages,
          copies: orderConfig.copies,
          colourMode: orderConfig.colourMode,
          sided: orderConfig.sided,
          binding: orderConfig.binding,
          documentCount: uploadedDocuments.length,
        });

        onCostEstimateChange(response.data);
      } catch (error) {
        onCostEstimateChange(null);
        setEstimateError(error.response?.data?.message || 'Could not calculate estimate.');
      } finally {
        setIsEstimating(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    onCostEstimateChange,
    orderConfig.binding,
    orderConfig.colourMode,
    orderConfig.copies,
    orderConfig.serviceType,
    orderConfig.sided,
    totalPages,
    uploadedDocuments.length,
  ]);

  const showPrintControls = orderConfig.serviceType === 'Printing' || orderConfig.serviceType === 'Photocopying';
  const showBindingOnlyControls = orderConfig.serviceType === 'Binding';
  const showScanningControls = orderConfig.serviceType === 'Scanning';
  
  const currentPaymentMethods = isGuestMode ? paymentMethods : [
    ...paymentMethods,
    { label: `Pay via Wallet (Balance: ₹${walletBalance})`, value: 'wallet' }
  ];

  return (
    <div className="flex flex-col gap-5 w-full max-w-lg mx-auto font-['Inter'] pb-6">
      
      {/* Header Info */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,61,155,0.05)] border border-[#e2e8f0]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-['Hanken_Grotesk'] text-[22px] font-bold text-[#003d9b]">Configure Job</h2>
            <p className="mt-1.5 text-[14px] text-slate-500 leading-relaxed">
              Select your print settings. Cost updates instantly.
            </p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#e9edff] text-[#003d9b]">
            <Settings2 size={20} />
          </div>
        </div>
      </div>

      {/* Service Type Selection */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,61,155,0.05)] border border-[#e2e8f0]">
        <h3 className="text-[14px] font-bold uppercase tracking-wider text-slate-500 mb-4">Service Type</h3>
        <div className="grid grid-cols-2 gap-3">
          {SERVICE_TYPES.map((serviceType) => {
            const active = orderConfig.serviceType === serviceType;
            return (
              <button
                key={serviceType}
                className={`rounded-[16px] border p-3 text-center transition-all ${
                  active
                    ? 'border-[#003d9b] bg-[#e9edff] text-[#003d9b]'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                onClick={() => onConfigChange(getServiceTypePatch(serviceType, orderConfig))}
              >
                <span className="font-semibold text-[14px]">{serviceType}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Print Controls */}
      {showPrintControls && (
        <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,61,155,0.05)] border border-[#e2e8f0] flex flex-col gap-6">
          
          {/* Copies Counter */}
          <div>
            <h3 className="text-[14px] font-bold uppercase tracking-wider text-slate-500 mb-3">Copies</h3>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-[16px] p-2">
              <button 
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:bg-slate-100"
                onClick={() => onConfigChange({ copies: Math.max(1, orderConfig.copies - 1) })}
              >
                <Minus size={18} />
              </button>
              <span className="text-[18px] font-bold text-slate-900">{orderConfig.copies}</span>
              <button 
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:bg-slate-100"
                onClick={() => onConfigChange({ copies: Math.min(99, orderConfig.copies + 1) })}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Color Mode */}
          <div>
            <h3 className="text-[14px] font-bold uppercase tracking-wider text-slate-500 mb-3">Color Mode</h3>
            <div className="flex bg-slate-100 rounded-[16px] p-1">
              {['BlackAndWhite', 'Colour'].map((option) => (
                <button
                  key={option}
                  className={`flex-1 rounded-[12px] py-2.5 text-[14px] font-semibold transition-all ${
                    orderConfig.colourMode === option
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500'
                  }`}
                  onClick={() => onConfigChange({ colourMode: option })}
                >
                  {option === 'BlackAndWhite' ? 'Black & White' : 'Color'}
                </button>
              ))}
            </div>
          </div>

          {/* Sides */}
          <div>
            <h3 className="text-[14px] font-bold uppercase tracking-wider text-slate-500 mb-3">Sides</h3>
            <div className="flex bg-slate-100 rounded-[16px] p-1">
              {['Single', 'Double'].map((option) => (
                <button
                  key={option}
                  className={`flex-1 rounded-[12px] py-2.5 text-[14px] font-semibold transition-all ${
                    orderConfig.sided === option
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500'
                  }`}
                  onClick={() => onConfigChange({ sided: option })}
                >
                  {option === 'Single' ? 'Single-sided' : 'Double-sided'}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Size & Binding (Dropdowns for Mobile) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Paper Size</h3>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-[16px] px-4 py-3 text-[14px] font-semibold text-slate-800 outline-none focus:border-[#003d9b]"
                value={orderConfig.paperSize}
                onChange={(e) => onConfigChange({ paperSize: e.target.value })}
              >
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="Letter">Letter</option>
              </select>
            </div>
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Binding</h3>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-[16px] px-4 py-3 text-[14px] font-semibold text-slate-800 outline-none focus:border-[#003d9b]"
                value={orderConfig.binding}
                onChange={(e) => onConfigChange({ binding: e.target.value })}
              >
                <option value="None">None</option>
                <option value="Spiral">Spiral</option>
                <option value="Staple">Staple</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Binding Only Controls */}
      {showBindingOnlyControls && (
        <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,61,155,0.05)] border border-[#e2e8f0]">
          <h3 className="text-[14px] font-bold uppercase tracking-wider text-slate-500 mb-3">Binding Type</h3>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-[16px] px-4 py-3 text-[14px] font-semibold text-slate-800 outline-none focus:border-[#003d9b]"
            value={orderConfig.binding}
            onChange={(e) => onConfigChange({ binding: e.target.value })}
          >
            <option value="Spiral">Spiral</option>
            <option value="Staple">Staple</option>
          </select>
        </div>
      )}

      {/* Pickup & Payment (Mobile Cards) */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,61,155,0.05)] border border-[#e2e8f0] flex flex-col gap-6">
        <div>
          <h3 className="text-[14px] font-bold uppercase tracking-wider text-slate-500 mb-3">Pickup Slot</h3>
          <div className="flex flex-col gap-2">
            {PICKUP_SLOTS.map((slot) => (
              <label key={slot.value} className="flex items-center gap-3 p-3 rounded-[16px] border border-slate-200 active:bg-slate-50">
                <input
                  type="radio"
                  name="pickupSlot"
                  className="w-5 h-5 accent-[#003d9b]"
                  checked={orderConfig.preferredPickupSlot === slot.value}
                  onChange={() => onConfigChange({ preferredPickupSlot: slot.value })}
                />
                <span className="text-[14px] font-semibold text-slate-800">{slot.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[14px] font-bold uppercase tracking-wider text-slate-500 mb-3">Payment Method</h3>
          <div className="flex flex-col gap-2">
            {currentPaymentMethods.map((method) => (
              <label key={method.value} className="flex items-center gap-3 p-3 rounded-[16px] border border-slate-200 active:bg-slate-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  className="w-5 h-5 accent-[#003d9b]"
                  checked={orderConfig.paymentMethod === method.value}
                  onChange={() => onConfigChange({ paymentMethod: method.value })}
                />
                <span className="text-[14px] font-semibold text-slate-800">{method.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      {(showPrintControls || showBindingOnlyControls) && (
        <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,61,155,0.05)] border border-[#e2e8f0]">
          <h3 className="text-[14px] font-bold uppercase tracking-wider text-slate-500 mb-3">Instructions (Optional)</h3>
          <textarea
            className="w-full h-24 bg-slate-50 border border-slate-200 rounded-[16px] px-4 py-3 text-[14px] text-slate-800 outline-none focus:border-[#003d9b] resize-none"
            placeholder="Any specific instructions for this order?"
            value={orderConfig.printInstructions}
            onChange={(e) => onConfigChange({ printInstructions: e.target.value })}
          />
        </div>
      )}

      {/* Live Estimate Card (Fixed at bottom or just above navigation) */}
      <div className="bg-[#0f172a] rounded-[24px] p-5 shadow-lg flex flex-col gap-2 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-[#003d9b]/40 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex justify-between items-center relative z-10">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-sky-400">Live Estimate</p>
            <div className="flex items-end gap-2 mt-1">
              <h3 className="text-[28px] font-bold text-white leading-none">
                {costEstimate?.estimatedCost != null
                  ? CURRENCY_FORMATTER.format(costEstimate.estimatedCost)
                  : '₹0.00'}
              </h3>
              {isEstimating && <span className="text-[12px] text-slate-400 mb-1 animate-pulse">Updating...</span>}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ReceiptText size={24} />
          </div>
        </div>
        {estimateError && (
          <p className="text-[13px] text-rose-400 mt-2 relative z-10">{estimateError}</p>
        )}
      </div>

    </div>
  );
};

export default MobileWizardStep2Configure;
