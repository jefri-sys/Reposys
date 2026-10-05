import React, { useEffect, useState } from 'react';
import MobileTopBar from './MobileTopBar';
import MobileBottomNav from './MobileBottomNav';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { Reposys_NOTIFICATIONS_CHANGED_EVENT } from '../../utils/notifications';
import { AuthContext } from '../../context/AuthContextObject';

const MobileLayout = ({
  title: propTitle, 
  showBack: propShowBack, 
  onBack, 
  hideBottomNav: propHideBottomNav, 
  notificationCount, 
  children 
}) => {
  const location = useLocation();
  const socket = useSocket();
  const { user } = React.useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const path = location.pathname;
  
  let internalTitle = 'Reposys';
  if (path.startsWith('/dashboard')) internalTitle = 'Home';
  else if (path.startsWith('/orders')) internalTitle = 'My Orders';
  else if (path.startsWith('/wallet')) internalTitle = 'Wallet';
  else if (path.startsWith('/profile')) internalTitle = 'Profile';
  else if (path.startsWith('/notifications')) internalTitle = 'Notifications';
  else if (path.startsWith('/complaints')) internalTitle = 'Complaints';
  else if (path.startsWith('/tools')) internalTitle = 'Document Tools';
  else if (path.startsWith('/friends')) internalTitle = 'Friends';
  else if (path.startsWith('/chat')) internalTitle = 'Chat';
  else if (path.startsWith('/split-requests')) internalTitle = 'Split Requests';
  else if (path === '/settings/appearance') internalTitle = 'Appearance';
  else if (path.startsWith('/settings')) internalTitle = 'Settings';
  
  const internalShowBack = path !== '/dashboard' && path !== '/orders' && path !== '/wallet' && path !== '/profile';

  const title = propTitle !== undefined ? propTitle : internalTitle;
  const showBack = propShowBack !== undefined ? propShowBack : internalShowBack;
  const hideBottomNav = propHideBottomNav !== undefined ? propHideBottomNav : path.startsWith('/orders/new');

  const loadNotificationSummary = async () => {
    try {
      const response = await api.get('/notifications');
      setUnreadCount(Number(response.data?.unreadCount) || 0);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    loadNotificationSummary();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const handleNotification = () => {
      setUnreadCount((c) => c + 1);
    };
    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket]);

  useEffect(() => {
    const handler = () => {
      loadNotificationSummary();
    };
    window.addEventListener(Reposys_NOTIFICATIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(Reposys_NOTIFICATIONS_CHANGED_EVENT, handler);
  }, []);

  const loadChatSummary = async () => {
    try {
      const response = await api.get('/messages/conversations');
      const count = (response.data || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setUnreadChatCount(count);
    } catch {
      setUnreadChatCount(0);
    }
  };

  useEffect(() => {
    if (user?._id) {
      loadChatSummary();
    }
  }, [user?._id]);

  useEffect(() => {
    if (!socket || !user?._id) return undefined;

    const handleNewMessage = (message) => {
      const senderId = message.senderId?._id?.toString() || message.senderId?.toString();
      if (senderId !== user._id.toString()) {
        loadChatSummary();
      }
    };

    const handleMessagesRead = () => {
      loadChatSummary();
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messagesRead', handleMessagesRead);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messagesRead', handleMessagesRead);
    };
  }, [socket, user?._id]);

  const displayNotificationCount = notificationCount !== undefined ? notificationCount : unreadCount;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
      <MobileTopBar 
        title={title} 
        showBack={showBack}
        onBack={onBack}
        notificationCount={displayNotificationCount}
      />
      
      <main 
        className="flex-1 w-full overflow-y-auto overflow-x-hidden"
        style={{
          paddingTop: 'calc(56px + env(safe-area-inset-top))',
          paddingBottom: hideBottomNav ? 'env(safe-area-inset-bottom)' : 'calc(64px + env(safe-area-inset-bottom))'
        }}
      >
        {children}
      </main>

      {!hideBottomNav && (
        <MobileBottomNav 
          chatUnreadCount={unreadChatCount} 
          ordersActiveCount={0} 
        />
      )}
    </div>
  );
};

export default MobileLayout;
