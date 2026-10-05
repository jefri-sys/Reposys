import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContextObject';

const SocketContext = createContext(null);
const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
const isVercelApp = window.location.hostname.endsWith('.vercel.app');
const SOCKET_URL = configuredSocketUrl && !configuredSocketUrl.includes('onrender.com')
  ? configuredSocketUrl
  : (isVercelApp ? '/' : 'https://scrms-ready.onrender.com');

export const SocketProvider = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const [socket] = useState(() => io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: false,
    transports: ['polling', 'websocket'],
  }));

  useEffect(() => {
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    if (loading) {
      return;
    }

    let shouldConnect = false;
    let trackOrderId = null;

    if (user) {
      shouldConnect = true;
    } else if (location.pathname.startsWith('/track/')) {
      shouldConnect = true;
      trackOrderId = location.pathname.split('/track/')[1];
    }

    if (shouldConnect) {
      if (trackOrderId) {
        socket.io.opts.query = { trackOrderId };
      } else {
        socket.io.opts.query = {};
      }

      const token = localStorage.getItem('token');
      const currentToken = socket.auth?.token;

      if (token !== currentToken || !socket.connected) {
        socket.auth = token ? { token } : {};
        if (socket.connected) {
          socket.disconnect();
        }
        socket.connect();
      }
    } else {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  }, [loading, socket, user, location.pathname]);

  // Handle app resuming from background (PWA suspension)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (socket.disconnected) {
          socket.connect();
        } else {
          // Force a hard reconnect if the connection went stale
          socket.disconnect();
          setTimeout(() => socket.connect(), 50);
        }
        
        // Dispatch a custom event so pages can refetch their data
        window.dispatchEvent(new Event('app_resumed'));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
