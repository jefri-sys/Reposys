import React from 'react';
import { Check, Loader2 } from 'lucide-react';

const MobileOrderWizardShell = ({ 
  currentStep = 1, 
  onBack, 
  onNext, 
  nextLabel = 'Continue', 
  isNextLoading = false, 
  isNextDisabled = false,
  children
}) => {
  const steps = [
    { id: 1, label: 'Upload' },
    { id: 2, label: 'Configure' },
    { id: 3, label: 'Payment' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* 1. TOP PROGRESS BAR */}
      <div className="sticky top-0 z-40 bg-white pt-5 pb-3 border-b border-[#E2E8F0] shadow-sm">
        <div className="flex items-start justify-between max-w-[320px] mx-auto px-4 relative">
          
          {/* Connecting Lines */}
          <div className="absolute top-[14px] left-[15%] right-[15%] h-[2px] bg-slate-200 -z-10" />
          
          <div className="absolute top-[14px] left-[15%] h-[2px] bg-[#0047AB] -z-10 transition-all duration-300" style={{
            width: currentStep === 1 ? '0%' : currentStep === 2 ? '35%' : '70%'
          }} />

          {/* Steps */}
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex flex-col items-center relative bg-white px-2">
                <div 
                  className={`
                    flex items-center justify-center rounded-full transition-all duration-300
                    ${isActive ? 'w-[32px] h-[32px] bg-[#0047AB] text-white shadow-md' : ''}
                    ${isCompleted ? 'w-[28px] h-[28px] bg-[#0047AB] text-white mt-[2px]' : ''}
                    ${!isActive && !isCompleted ? 'w-[28px] h-[28px] bg-slate-100 text-slate-400 mt-[2px] border border-slate-200' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check size={16} strokeWidth={3} />
                  ) : (
                    <span className={`font-bold ${isActive ? 'text-[14px]' : 'text-[12px]'}`}>
                      {step.id}
                    </span>
                  )}
                </div>
                <span 
                  className={`
                    mt-2 text-[11px] font-bold uppercase tracking-wider
                    ${isActive ? 'text-[#0047AB]' : isCompleted ? 'text-[#0F172A]' : 'text-slate-400'}
                  `}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. STEP CONTENT AREA */}
      <div className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))] px-4 pt-4">
        {children}
      </div>

      {/* 3. BOTTOM ACTION BAR */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E2E8F0] px-4 py-4 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3 w-full">
          {(currentStep === 2 || currentStep === 3) && currentStep !== 3 && (
            <button
              onClick={onBack}
              disabled={isNextLoading}
              className="w-[35%] max-w-[120px] h-12 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-[15px] active:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          )}
          
          <button
            onClick={onNext}
            disabled={isNextDisabled || isNextLoading}
            className={`
              flex-1 h-12 rounded-xl bg-[#0047AB] text-white font-bold text-[15px] shadow-[0_4px_14px_rgba(0,71,171,0.3)] active:scale-[0.98] transition-transform flex items-center justify-center
              disabled:opacity-60 disabled:active:scale-100 disabled:shadow-none
              ${currentStep === 3 ? 'w-full max-w-none' : ''}
            `}
          >
            {isNextLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              currentStep === 3 ? 'Place Order' : nextLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileOrderWizardShell;
