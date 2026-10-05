import React from 'react';
import { Home, ClipboardList, MessageSquare, MapPin, Users, Plus, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const MobileBottomNav = ({ 
  activeTab: propActiveTab, 
  onTabChange, 
  chatUnreadCount = 0, 
  ordersActiveCount = 0 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const getInternalActiveTab = () => {
    if (path.startsWith('/dashboard')) return 'home';
    if (path.startsWith('/orders') && path !== '/orders/new') return 'orders';
    if (path.startsWith('/track')) return 'track';
    if (path.startsWith('/friends')) return 'friends';
    if (path.startsWith('/chat')) return 'chat';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/orders/new')) return 'new';
    return '';
  };

  const activeTab = propActiveTab || getInternalActiveTab();

  const handleTabChange = (tab) => {
    if (onTabChange) {
      onTabChange(tab);
    }
    
    if (tab === 'home') navigate('/dashboard');
    else if (tab === 'orders') navigate('/orders');
    else if (tab === 'new') navigate('/orders/new');
    else if (tab === 'track') navigate('/track');
    else if (tab === 'friends') navigate('/friends');
    else if (tab === 'chat') navigate('/chat');
    else if (tab === 'settings') navigate('/settings');
  };

  const renderTab = (id, IconComponent, label, badgeCount) => {
    const isActive = activeTab === id;
    const colorClass = isActive ? 'text-[#0047AB]' : 'text-[#94A3B8]';

    return (
      <button
        onClick={() => handleTabChange(id)}
        className={`relative flex flex-col items-center justify-center flex-1 h-full ${colorClass}`}
        aria-label={label}
      >
        <div className="absolute top-0 flex items-center justify-center w-full h-[6px]">
          {isActive && (
            <div className="w-[2px] h-[3px] bg-[#0047AB] rounded-full" />
          )}
        </div>
        <div className="relative mt-[8px] mb-[2px]">
          <IconComponent size={22} strokeWidth={isActive ? 2.5 : 2} />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-2 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-[4px] text-[9px] font-bold text-white">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </div>
        <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-normal'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white border-t border-[#E2E8F0]"
      style={{
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxSizing: 'content-box'
      }}
    >
      <div className="flex items-center justify-between h-[64px] px-1 relative">
        {renderTab('home', Home, 'Home', 0)}
        {renderTab('orders', ClipboardList, 'My Orders', ordersActiveCount)}
        {renderTab('track', MapPin, 'Track', 0)}

        <div className="flex-[0.8] flex justify-center items-start -mt-8 relative z-10 mx-1">
          <button 
            onClick={() => handleTabChange('new')}
            className="flex items-center justify-center w-[48px] h-[48px] bg-[#0047AB] rounded-full shadow-[0_4px_10px_rgba(0,71,171,0.3)] hover:bg-[#003B8E] active:scale-95 transition-transform"
            aria-label="New Order"
          >
            <Plus size={24} color="white" strokeWidth={2.5} />
          </button>
        </div>

        {renderTab('friends', Users, 'Friends', 0)}
        {renderTab('chat', MessageSquare, 'Chat', chatUnreadCount)}
        {renderTab('settings', Settings, 'Settings', 0)}
      </div>
    </div>
  );
};

export default MobileBottomNav;
