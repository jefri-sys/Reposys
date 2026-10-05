import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Palette, Check } from 'lucide-react';

const MobileAppearance = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="bg-[#F8FAFC] min-h-full px-4 py-6">
      <div className="mb-6">
        <h2 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Theme Preferences</h2>
        <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] overflow-hidden">
          
          <button 
            onClick={() => isDark && toggleTheme()}
            className="w-full flex items-center justify-between p-4 border-b border-[#E2E8F0] active:bg-slate-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-amber-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              </div>
              <span className="text-[15px] font-semibold text-[#0F172A]">Light Theme</span>
            </div>
            {!isDark && <Check size={20} className="text-[#0047AB]" />}
          </button>
          
          <button 
            onClick={() => !isDark && toggleTheme()}
            className="w-full flex items-center justify-between p-4 active:bg-slate-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-indigo-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              </div>
              <span className="text-[15px] font-semibold text-[#0F172A]">Dark Theme</span>
            </div>
            {isDark && <Check size={20} className="text-[#0047AB]" />}
          </button>

        </div>
      </div>
    </div>
  );
};

export default MobileAppearance;
