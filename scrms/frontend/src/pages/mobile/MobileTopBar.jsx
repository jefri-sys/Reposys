import React, { useContext } from 'react';
import { ChevronLeft, Bell, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContextObject';

const MobileTopBar = ({ title = 'Reposys', showBack = false, onBack, notificationCount = 0, rightAction }) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 bg-white border-b border-[#E2E8F0] shadow-sm"
      style={{ 
        height: '56px',
        paddingTop: 'env(safe-area-inset-top)',
        boxSizing: 'content-box'
      }}
    >
      <div className="flex items-center flex-1">
        {showBack ? (
          <button 
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft size={24} className="text-[#0F172A]" />
          </button>
        ) : (
          <div className="w-8 h-8 rounded bg-[#0047AB] flex items-center justify-center text-white font-bold text-lg leading-none shadow-sm mr-2">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
          </div>
        )}
        <h1 className={`text-[17px] font-semibold text-[#0F172A] ${showBack ? 'ml-1' : 'ml-1'}`}>
          {title}
        </h1>
      </div>
      
      <div className="flex items-center gap-1">
        {rightAction}
        {!rightAction && (
          <>
            <button 
              onClick={() => navigate('/wallet')}
              className="p-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
              aria-label="Wallet"
            >
              <WalletCards size={22} className="text-[#64748B]" />
            </button>
            <button 
              onClick={() => navigate('/notifications')}
              className="relative p-2 -mr-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={22} className="text-[#64748B]" />
              {notificationCount > 0 && (
                <span className="absolute top-[6px] right-[6px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-[4px] text-[10px] font-bold text-white ring-2 ring-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MobileTopBar;
