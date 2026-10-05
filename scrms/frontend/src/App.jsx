import { useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthContext } from './context/AuthContextObject';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import ChatbotWidget from './components/ChatbotWidget';
import Navbar from './components/Navbar';
import { usePush } from './hooks/usePush';
import { useWindowWidth } from './hooks/useWindowWidth';
import MobileLayout from './pages/mobile/MobileLayout';
import api from './services/api';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import GuestKiosk from './pages/guest/GuestKiosk';
import GuestOrderConfirmation from './pages/guest/GuestOrderConfirmation';
import AdminDashboard from './pages/admin/AdminDashboard';
import ActivityLogs from './pages/admin/ActivityLogs';
import AutomationLogs from './pages/admin/AutomationLogs';
import Analytics from './pages/admin/Analytics';
import PublicOrderTrack from './pages/PublicOrderTrack';
import Track from './pages/Track';
import AdminComplaints from './pages/admin/Complaints';
import InventoryManagement from './pages/admin/InventoryManagement';
import TransactionHistory from './pages/admin/TransactionHistory';
import UserManagement from './pages/admin/UserManagement';
import Home from './pages/Home';
import About from './pages/About';
import PrivacyProtocol from './pages/PrivacyProtocol';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import TechnicalHelp from './pages/TechnicalHelp';
import ContactUs from './pages/ContactUs';
import Inquiries from './pages/admin/Inquiries';
import UserComplaints from './pages/user/Complaints';
import Dashboard from './pages/user/Dashboard';
import OrderWizard from './pages/user/OrderWizard';
import MobileOrderWizard from './pages/mobile/MobileOrderWizard';
import OrderConfirmation from './pages/user/OrderConfirmation';
import MyOrders from './pages/user/MyOrders';
import MobileMyOrders from './pages/mobile/MobileMyOrders';
import OrderDetail from './pages/user/OrderDetail';
import RaiseComplaint from './pages/user/RaiseComplaint';
import DocumentTools from './pages/user/DocumentTools';
import NotificationsPage from './pages/user/NotificationsPage';
import Profile from './pages/user/Profile';
import MobileProfile from './pages/mobile/MobileProfile';
import MobileAppearance from './pages/mobile/MobileAppearance';
import WalletPage from './pages/WalletPage';
import MobileWallet from './pages/mobile/MobileWallet';
import WalletTopup from './pages/WalletTopup';
import Settings from './pages/user/Settings';
import MobileSettings from './pages/mobile/MobileSettings';
import FriendsPage from './pages/FriendsPage';
import MobileFriendsPage from './pages/mobile/MobileFriendsPage';
import MobileTrack from './pages/mobile/MobileTrack';
import MobileNotifications from './pages/mobile/MobileNotifications';
import ChatPage from './pages/ChatPage';
import MobileChatPage from './pages/mobile/MobileChatPage';
import SplitRequestsPage from './pages/user/SplitRequestsPage';
import SplitPayPage from './pages/SplitPayPage';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffMobileQueue from './pages/staff/StaffMobileQueue';
import StaffReports from './pages/staff/StaffReports';
import StaffNotificationsPage from './pages/staff/NotificationsPage';
import AdminStaffReports from './pages/admin/StaffReports';
import AdminNotificationsPage from './pages/admin/NotificationsPage';

const RootRedirect = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role === 'Student' || user.role === 'Faculty') return <Navigate to="/dashboard" replace />;
  if (user.role === 'Staff') return <Navigate to="/staff" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin" replace />;

  return <Navigate to="/login" replace />;
};

const AppShell = () => {
  const { user, loading } = useContext(AuthContext);
  const socket = useSocket();
  const location = useLocation();
  const [shopClosed, setShopClosed] = useState(false);
  const width = useWindowWidth();

  usePush();

  const publicPaths = new Set([
    '/',
    '/login',
    '/register',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
    '/guest',
    '/contact',
    '/about',
    '/privacy',
    '/terms',
    '/cookies',
    '/help',
    '/track',
  ]);
  const isPublicPath = publicPaths.has(location.pathname) || location.pathname.startsWith('/guest/');
  const isUserRole = user?.role === 'Student' || user?.role === 'Faculty';
  const showAuthenticatedChrome = Boolean(user) && !isPublicPath;
  const showUserNavbar = Boolean(showAuthenticatedChrome && isUserRole);
  const showGlobalShopClosedBanner = Boolean(user) && shopClosed && location.pathname !== '/dashboard';

  useEffect(() => {
    if (loading) {
      return undefined;
    }

    let isActive = true;

    const loadShopStatus = async () => {
      try {
        const response = await api.get('/config/shop-status');

        if (isActive) {
          setShopClosed(response.data?.isOpen === false);
        }
      } catch {
        if (isActive) {
          setShopClosed(false);
        }
      }
    };

    loadShopStatus();

    return () => {
      isActive = false;
    };
  }, [loading, user?._id]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleShopClosed = () => {
      setShopClosed(true);
    };

    const handleShopOpened = () => {
      setShopClosed(false);
    };

    socket.on('shop_closed', handleShopClosed);
    socket.on('shop_opened', handleShopOpened);

    return () => {
      socket.off('shop_closed', handleShopClosed);
      socket.off('shop_opened', handleShopOpened);
    };
  }, [socket]);

  const content = (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/orders/new"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              {width < 768 ? <MobileOrderWizard /> : <OrderWizard />}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/orders/confirmation/:orderId"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              <OrderConfirmation />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/orders"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              {width < 768 ? <MobileMyOrders /> : <MyOrders />}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/orders/:orderId"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              <OrderDetail />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/orders/:orderId/complaint"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              <RaiseComplaint />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/complaints"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              <UserComplaints />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/tools"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              <DocumentTools />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/notifications"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              {width < 768 ? (
                <MobileLayout>
                  <MobileNotifications />
                </MobileLayout>
              ) : (
                <NotificationsPage />
              )}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              {width < 768 ? <MobileProfile /> : <Profile />}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/wallet"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              {width < 768 ? <MobileWallet /> : <WalletPage />}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/wallet/topup"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              <WalletTopup />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/settings"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              {width < 768 ? <MobileSettings /> : <Settings />}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/settings/appearance"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              {width < 768 ? <MobileAppearance /> : <Navigate to="/settings" replace />}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/wallet/split-pay"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              <SplitPayPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/friends"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              {width < 768 ? <MobileFriendsPage /> : <FriendsPage />}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/chat"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              {width < 768 ? <MobileChatPage /> : <ChatPage />}
            </ProtectedRoute>
          )}
        />
        <Route
          path="/split-requests"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              <SplitRequestsPage />
            </ProtectedRoute>
          )}
        />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/guest" element={<GuestKiosk />} />
        <Route path="/guest/confirmation/:orderId" element={<GuestOrderConfirmation />} />
        <Route path="/guest/track/:orderId" element={<PublicOrderTrack />} />
        <Route path="/track" element={width < 768 ? <MobileTrack /> : <Track />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<PrivacyProtocol />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="/help" element={<TechnicalHelp />} />

        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute allowedRoles={['Student', 'Faculty']}>
              <Dashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/staff"
          element={(
            <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
              <StaffDashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/staff/queue"
          element={(
            <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
              <StaffMobileQueue />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/staff/reports"
          element={(
            <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
              <StaffReports />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/staff/notifications"
          element={(
            <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
              <StaffNotificationsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/users"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <UserManagement />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/analytics"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <Analytics />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/transactions"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <TransactionHistory />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/activity-logs"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <ActivityLogs />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/automation-logs"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <AutomationLogs />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/complaints"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminComplaints />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/inventory"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <InventoryManagement />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/staff-reports"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminStaffReports />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/notifications"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminNotificationsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/inquiries"
          element={(
            <ProtectedRoute allowedRoles={['Admin']}>
              <Inquiries />
            </ProtectedRoute>
          )}
        />
      </Routes>
      {showAuthenticatedChrome && isUserRole && location.pathname !== '/chat' && location.pathname !== '/chats' && !location.pathname.startsWith('/orders/new') ? <ChatbotWidget /> : null}
    </>
  );

  return (
    <>
      {showGlobalShopClosedBanner ? (
        <div className="sticky top-0 z-50 w-full border-b border-rose-200 bg-rose-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm">
          The reprography centre is currently closed.
        </div>
      ) : null}
      {showUserNavbar ? (
        width < 768 ? (
          <MobileLayout>{content}</MobileLayout>
        ) : (
          <>
            <Navbar />
            {content}
          </>
        )
      ) : (
        content
      )}
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <AppShell />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
