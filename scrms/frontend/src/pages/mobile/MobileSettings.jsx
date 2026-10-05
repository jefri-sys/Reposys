import React, { useState } from 'react';
import { UserRound, Shield, Smartphone, Bell, Palette, ChevronRight, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContextObject';

const MobileSettings = () => {
  const navigate = useNavigate();
  const { logout } = React.useContext(AuthContext);
  const [pushNotifications, setPushNotifications] = useState(false);

  return (
    <div className="px-4 py-6 space-y-6 bg-[#F8FAFC] min-h-full">
      {/* ACCOUNT SECTION */}
      <div>
        <h2 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 ml-1">Account</h2>
        <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E2E8F0] overflow-hidden">
          
          <button 
            onClick={() => navigate('/profile', { state: { activeTab: 'personal' } })}
            className="w-full flex items-center justify-between p-4 border-b border-[#F1F5F9] active:bg-slate-50 transition"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#FFF7ED] flex items-center justify-center">
                <UserRound size={18} className="text-[#EA580C]" strokeWidth={2.5}/>
              </div>
              <span className="text-[15px] font-semibold text-[#0F172A]">Personal Information</span>
            </div>
            <ChevronRight size={18} className="text-[#94A3B8]" />
          </button>
          
          <button 
            onClick={() => navigate('/profile', { state: { activeTab: 'security' } })}
            className="w-full flex items-center justify-between p-4 border-b border-[#F1F5F9] active:bg-slate-50 transition"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#F3E8FF] flex items-center justify-center">
                <Shield size={18} className="text-[#9333EA]" strokeWidth={2.5}/>
              </div>
              <span className="text-[15px] font-semibold text-[#0F172A]">Account Security</span>
            </div>
            <ChevronRight size={18} className="text-[#94A3B8]" />
          </button>

          <button 
            onClick={() => navigate('/profile', { state: { activeTab: 'usage' } })}
            className="w-full flex items-center justify-between p-4 active:bg-slate-50 transition"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#DBEAFE] flex items-center justify-center">
                <Smartphone size={18} className="text-[#2563EB]" strokeWidth={2.5}/>
              </div>
              <span className="text-[15px] font-semibold text-[#0F172A]">Usage Summary</span>
            </div>
            <ChevronRight size={18} className="text-[#94A3B8]" />
          </button>

        </div>
      </div>

      {/* PREFERENCES SECTION */}
      <div>
        <h2 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 ml-1">Preferences</h2>
        <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E2E8F0] overflow-hidden">
          
          <div className="w-full flex items-center justify-between p-4 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#FEF3C7] flex items-center justify-center">
                <Bell size={18} className="text-[#D97706]" strokeWidth={2.5}/>
              </div>
              <span className="text-[15px] font-semibold text-[#0F172A]">Push Notifications</span>
            </div>
            
            <button 
              onClick={() => setPushNotifications(!pushNotifications)}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out relative flex items-center ${pushNotifications ? 'bg-[#D97706]' : 'bg-[#E2E8F0]'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${pushNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          
          <button 
            onClick={() => navigate('/settings/appearance')}
            className="w-full flex items-center justify-between p-4 active:bg-slate-50 transition"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#D1FAE5] flex items-center justify-center">
                <Palette size={18} className="text-[#059669]" strokeWidth={2.5}/>
              </div>
              <span className="text-[15px] font-semibold text-[#0F172A]">Appearance</span>
            </div>
            <ChevronRight size={18} className="text-[#94A3B8]" />
          </button>

        </div>
      </div>
      
      <button 
        onClick={() => logout({ replace: true })}
        className="w-full flex items-center justify-center gap-2 py-4 bg-white text-red-500 rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E2E8F0] font-semibold text-[15px] active:bg-red-50 transition"
      >
        <LogOut size={18} strokeWidth={2.5} />
        Log Out
      </button>
      
      <div className="pb-4 pt-2 text-center text-[10px] text-[#94A3B8]">
        Reposys PWA Version 2.1.0<br/>
        © 2026 Reposys Technologies
      </div>
    </div>
  );
};

export default MobileSettings;
