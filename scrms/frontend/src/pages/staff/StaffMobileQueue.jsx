import { startTransition, useContext, useEffect, useState, useMemo } from 'react';
import { X, Lock, ClipboardList, ExternalLink, ShieldAlert, FileText, CheckCircle2, LogOut } from 'lucide-react';
import { AuthContext } from '../../context/AuthContextObject';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import {
  Badge,
  Button,
  Input,
  LoadingState,
  EmptyState
} from '../../components/ui';

const SERVICE_TYPES = ['All', 'Printing', 'Photocopying', 'Scanning', 'Binding'];

const EMPTY_QUEUE_MAP = {
  Printing: [],
  Photocopying: [],
  Scanning: [],
  Binding: [],
};

const ROLE_BADGE_VARIANTS = {
  Faculty: 'primary',
  Student: 'success',
  Guest: 'warning',
  Staff: 'secondary',
  Admin: 'danger',
};

const STATUS_BADGE_VARIANTS = {
  In_Queue: 'primary',
  Processing: 'indigo',
  ReadyForPickup: 'success',
  Completed: 'success',
  Partial: 'warning',
};

const formatOrderState = (value = '') => value
  .replace(/_/g, ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .trim();

const getUserName = (order) => order.userId?.name || order.guestEmail || 'Guest user';
const getUserRole = (order) => order.userId?.role || order.userRole || (order.isGuest ? 'Guest' : 'User');
const toIdValue = (value) => (typeof value === 'object' && value !== null ? value._id || value.id || '' : value || '');

const StaffMobileQueue = () => {
  const { user, logout } = useContext(AuthContext);
  const socket = useSocket();
  const [queueMap, setQueueMap] = useState(EMPTY_QUEUE_MAP);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPrintJob, setSelectedPrintJob] = useState(null);
  const [autoProcessingEnabled, setAutoProcessingEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [partialPages, setPartialPages] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [sheetError, setSheetError] = useState('');
  
  // Load initial queues
  useEffect(() => {
    let isActive = true;
    const loadQueues = async () => {
      try {
        const response = await api.get('/queue');
        if (isActive) {
          const payload = response.data || {};
          startTransition(() => {
            setQueueMap({
              Printing: Array.isArray(payload.Printing) ? payload.Printing : [],
              Photocopying: Array.isArray(payload.Photocopying) ? payload.Photocopying : [],
              Scanning: Array.isArray(payload.Scanning) ? payload.Scanning : [],
              Binding: Array.isArray(payload.Binding) ? payload.Binding : [],
            });
          });
        }
      } catch (err) {
        // Handle error quietly
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    loadQueues();
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    const loadAutoProcessingConfig = async () => {
      try {
        const response = await api.get('/spae/auto-processing');
        if (response.data?.success) {
          setAutoProcessingEnabled(response.data.spae.autoProcessingEnabled ?? false);
        }
      } catch (err) {
        console.error('Failed to load auto-processing config:', err);
      }
    };
    loadAutoProcessingConfig();
  }, []);

  // Socket updates
  useEffect(() => {
    if (!socket) return;
    const handleQueueUpdate = (payload = {}) => {
      const resolvedServiceType = payload.serviceType || payload.queue?.[0]?.serviceType;
      if (!resolvedServiceType || !['Printing', 'Photocopying', 'Scanning', 'Binding'].includes(resolvedServiceType)) {
        return;
      }
      startTransition(() => {
        setQueueMap((current) => ({
          ...current,
          [resolvedServiceType]: Array.isArray(payload.queue) ? payload.queue : [],
        }));
      });
    };
    socket.on('queue_update', handleQueueUpdate);
    return () => {
      socket.off('queue_update', handleQueueUpdate);
    };
  }, [socket]);

  // Socket updates for print jobs in mobile
  useEffect(() => {
    if (!socket || !selectedOrder) return undefined;
    const handlePrintJobUpdate = (payload) => {
      if (payload.orderId === selectedOrder._id) {
        setSelectedPrintJob(prev => ({
          ...(prev || {}),
          status: payload.status,
          _id: payload.printJobId || (prev && prev._id)
        }));
      }
    };
    const handleSpaeJobCreated = (data) => {
      if (data.orderId === selectedOrder._id) {
        setSelectedPrintJob({
          printerName: data.printerName,
          queuePosition: data.queuePosition,
          _id: data.printJobId
        });
      }
    };
    socket.on('print_job_update', handlePrintJobUpdate);
    socket.on('spae_job_created', handleSpaeJobCreated);
    return () => {
      socket.off('print_job_update', handlePrintJobUpdate);
      socket.off('spae_job_created', handleSpaeJobCreated);
    };
  }, [socket, selectedOrder]);

  // Derived visible queue
  const visibleQueue = useMemo(() => {
    if (activeTab === 'All') {
      const allOrders = Object.values(queueMap).flat();
      return allOrders.sort((a, b) => {
        const scoreA = Number.isFinite(a.priorityScore) ? a.priorityScore : 200;
        const scoreB = Number.isFinite(b.priorityScore) ? b.priorityScore : 200;
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }
    return queueMap[activeTab] || [];
  }, [queueMap, activeTab]);

  const handleCardTap = async (order) => {
    setSheetError('');
    setOtp('');
    setPartialPages('');
    setSelectedOrder(order);
    setSelectedPrintJob(null);
    setIsSheetOpen(true);
    setSheetLoading(true);

    try {
      await api.patch(`/orders/${order._id}/lock`);
      const [orderRes, printJobRes] = await Promise.allSettled([
        api.get(`/orders/${order._id}`),
        api.get(`/automation/printjobs/${order._id}`)
      ]);
      
      if (orderRes.status === 'fulfilled') {
        setSelectedOrder(orderRes.value.data?.order || order);
      }
      if (printJobRes.status === 'fulfilled' && printJobRes.value?.data?.job) {
        setSelectedPrintJob(printJobRes.value.data.job);
      }
    } catch (err) {
      setSheetError(err.response?.data?.message || 'Could not lock order.');
    } finally {
      setSheetLoading(false);
    }
  };

  const closeSheet = async () => {
    const orderId = selectedOrder?._id;
    setIsSheetOpen(false);
    setSelectedOrder(null);
    setSheetError('');

    if (orderId) {
      try {
        await api.patch(`/orders/${orderId}/unlock`);
      } catch (err) {
        // Ignore unlock errors
      }
    }
  };

  const handleAction = async (actionFn) => {
    setActionLoading(true);
    setSheetError('');
    try {
      await actionFn();
      closeSheet();
    } catch (err) {
      setSheetError(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const startProcessing = () => handleAction(() => api.post(`/orders/${selectedOrder._id}/start-processing`));
  const readyForPickup = () => handleAction(() => api.post(`/orders/${selectedOrder._id}/ready-for-pickup`));
  
  const partialCompletion = () => {
    const parsed = Number(partialPages);
    if (!parsed || parsed <= 0) {
      setSheetError('Enter valid completed pages');
      return;
    }
    handleAction(() => api.post(`/orders/${selectedOrder._id}/partial`, { pagesCompleted: parsed }));
  };
  
  const verifyOtp = () => {
    if (!otp) {
      setSheetError('Enter OTP');
      return;
    }
    handleAction(() => api.post(`/orders/${selectedOrder._id}/verify-otp`, { otp }));
  };

  const openDocument = async (docId) => {
    try {
      const response = await api.get(`/documents/${docId}/url`);
      if (response.data?.url) {
        window.open(response.data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setSheetError('Could not open document.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState message="Loading mobile queue..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Queue</h1>
          <button
            onClick={() => logout()}
            className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar px-4 pb-3 space-x-2">
          {SERVICE_TYPES.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === tab 
                  ? 'bg-sky-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Queue List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
        {visibleQueue.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              icon={CheckCircle2}
              title="Queue clear"
              description="No orders waiting in this service line."
            />
          </div>
        ) : (
          visibleQueue.map(order => {
            const role = getUserRole(order);
            const isLocked = Boolean(order.lockedBy && String(toIdValue(order.lockedBy)) !== String(user?._id));
            
            return (
              <button
                key={order._id}
                onClick={() => handleCardTap(order)}
                className="w-full text-left bg-white rounded-2xl p-5 shadow-sm border border-slate-200 active:scale-[0.98] transition-all relative overflow-hidden"
              >
                {order.status === 'ReadyForPickup' && <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>}
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{order.tokenNumber}</h3>
                  </div>
                  {isLocked && (
                    <Badge variant="danger" icon={Lock} className="text-[10px]">
                      Locked
                    </Badge>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{getUserName(order)}</span>
                    <Badge variant={ROLE_BADGE_VARIANTS[role] || 'secondary'} className="text-[10px]">
                      {role}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {order.serviceType} • {order.pageCount || 0} pgs
                  </div>
                </div>

                <div className="mt-5 flex justify-between items-end">
                  <div className="flex gap-2">
                    {order.paymentStatus === 'Cash_Pending' && (
                      <Badge variant="warning" className="text-[10px]">
                        CASH PENDING
                      </Badge>
                    )}
                  </div>
                  <Badge variant={STATUS_BADGE_VARIANTS[order.status] || 'secondary'} className="text-[10px]">
                    {formatOrderState(order.status)}
                  </Badge>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* 3. Bottom Sheet Overlay */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-full relative">
            <button 
              onClick={closeSheet}
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {sheetLoading || !selectedOrder ? (
              <div className="p-12">
                <LoadingState message="Loading order details..." />
              </div>
            ) : (
              <div className="p-6 pb-safe">
                <div className="mb-6 pr-10">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{getUserName(selectedOrder)}</p>
                  <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">{selectedOrder.tokenNumber}</h2>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={STATUS_BADGE_VARIANTS[selectedOrder.status] || 'secondary'} className="text-[10px]">
                      {formatOrderState(selectedOrder.status)}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedOrder.serviceType}
                    </Badge>
                  </div>
                </div>

                {sheetError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    {sheetError}
                  </div>
                )}

                {selectedOrder.printConfig?.printInstructions && (
                  <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-xl shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-yellow-800 mb-2 flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4" />
                      Print Instructions
                    </p>
                    <p className="text-sm font-medium text-yellow-900 whitespace-pre-wrap">{selectedOrder.printConfig.printInstructions}</p>
                  </div>
                )}

                <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Configuration</p>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                    {selectedOrder.printConfig && Object.entries(selectedOrder.printConfig).map(([key, value]) => {
                      if (key === 'printInstructions') return null;
                      if (typeof value === 'boolean') value = value ? 'Yes' : 'No';
                      return (
                        <div key={key}>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">{String(value)}</p>
                        </div>
                      );
                    })}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pages</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{selectedOrder.pageCount || 0}</p>
                    </div>
                  </div>
                </div>

                {selectedOrder.documentIds?.length > 0 && (
                  <div className="mb-8 space-y-2">
                    {selectedOrder.documentIds.map(doc => {
                      const docId = typeof doc === 'object' ? doc._id : doc;
                      const docName = typeof doc === 'object' ? doc.originalName : 'Document';
                      return (
                        <Button
                          key={docId}
                          variant="outline"
                          onClick={() => openDocument(docId)}
                          className="w-full justify-between h-12"
                          icon={ExternalLink}
                        >
                          <span className="truncate max-w-[200px]">{docName}</span>
                        </Button>
                      )
                    })}
                  </div>
                )}

                <div className="space-y-4">
                  {selectedOrder.status === 'In_Queue' && (
                    <Button
                      onClick={startProcessing}
                      disabled={actionLoading}
                      isLoading={actionLoading}
                      className="w-full h-14 text-lg"
                    >
                      Start Processing
                    </Button>
                  )}
                  {selectedOrder.status === 'Processing' && (
                    <>
                      {(!autoProcessingEnabled ||
                        !selectedPrintJob || 
                        selectedPrintJob.printerId === 'MANUAL' || 
                        selectedPrintJob.status === 'Manual Required' || 
                        selectedPrintJob.status === 'Printed' || 
                        selectedPrintJob.status === 'Inspection' || 
                        selectedPrintJob.status === 'Failed') ? (
                        <Button
                          onClick={readyForPickup}
                          disabled={actionLoading}
                          isLoading={actionLoading}
                          className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                          icon={!actionLoading ? CheckCircle2 : undefined}
                        >
                          {actionLoading ? 'Preparing...' : 'Ready for Pickup'}
                        </Button>
                      ) : (
                        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-center text-sm font-semibold">
                          Printer is currently printing the document...
                        </div>
                      )}
                      
                      <div className="pt-4 border-t border-slate-100 mt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Partial Progress</p>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={partialPages}
                            onChange={(e) => setPartialPages(e.target.value)}
                            placeholder="Pages done"
                            className="flex-1"
                          />
                          <Button
                            onClick={partialCompletion}
                            disabled={actionLoading || !partialPages}
                            isLoading={actionLoading && !otp} // hack to show spinner on right button
                            className="bg-slate-800 hover:bg-slate-900"
                          >
                            Save Partial
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedOrder.status === 'ReadyForPickup' && (
                    <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 text-center">Verify Pickup OTP</p>
                      <Input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 4-digit OTP"
                        className="mb-4 text-center text-xl tracking-[0.2em] font-bold h-14"
                        maxLength={4}
                      />
                      <Button
                        onClick={verifyOtp}
                        disabled={actionLoading || !otp}
                        isLoading={actionLoading}
                        className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                      >
                        Verify & Complete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMobileQueue;
