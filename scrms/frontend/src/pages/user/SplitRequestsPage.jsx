import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, AlertCircle, CheckCircle, Ban, RefreshCw, Wallet, User, FileText } from 'lucide-react';
import { AuthContext } from '../../context/AuthContextObject';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  LoadingState,
  EmptyState,
  PageHeader,
  Badge
} from '../../components/ui';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
});

const SplitRequestsPage = () => {
  const { user } = useContext(AuthContext) || {};
  const socket = useSocket();

  const [splitRequests, setSplitRequests] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [inlineErrors, setInlineErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [pendingRes, walletRes] = await Promise.all([
        api.get('/group-orders/split/pending'),
        api.get('/wallet'),
      ]);
      setSplitRequests(pendingRes.data || []);
      setWalletBalance(walletRes.data?.balance || 0);
    } catch (err) {
      console.error('Failed to load pending split requests:', err);
      setError(
        err.response?.data?.message || 'Could not load your split payment requests. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Socket.io integration
  useEffect(() => {
    if (!socket || !user?._id) return undefined;

    // Join user's personal room
    socket.emit('joinUserRoom', `user:${user._id}`);

    const handleSplitRequestSent = (newRequest) => {
      if (!newRequest) return;
      
      setSplitRequests((prev) => {
        // Prevent duplicate appending
        const alreadyExists = prev.some((r) => String(r._id) === String(newRequest._id));
        if (alreadyExists) return prev;
        return [newRequest, ...prev];
      });
    };

    socket.on('splitRequestSent', handleSplitRequestSent);

    return () => {
      socket.off('splitRequestSent', handleSplitRequestSent);
    };
  }, [socket, user?._id]);

  const handleRespond = async (splitRequestId, action, amount) => {
    if (processingId) return;
    setProcessingId(splitRequestId);
    
    // Clear previous inline errors
    setInlineErrors((prev) => ({ ...prev, [splitRequestId]: '' }));
    setSuccessMessage('');

    try {
      await api.post('/group-orders/split/respond', {
        splitRequestId,
        action,
      });

      if (action === 'accepted') {
        setSuccessMessage('Payment sent successfully!');
        setWalletBalance((prev) => prev - amount);
      } else {
        setSuccessMessage('Split request declined.');
      }

      // Remove card from local list
      setSplitRequests((prev) => prev.filter((r) => r._id !== splitRequestId));
      
      // Clear success toast after a delay
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(`Failed to respond to split request ${splitRequestId} with action ${action}:`, err);
      const errMsg = err.response?.data?.message || '';
      
      if (action === 'accepted' && errMsg.toLowerCase().includes('balance')) {
        setInlineErrors((prev) => ({
          ...prev,
          [splitRequestId]: 'Insufficient balance — please top up',
        }));
      } else {
        setInlineErrors((prev) => ({
          ...prev,
          [splitRequestId]: 'Something went wrong. Please try again.',
        }));
      }
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 flex items-center justify-center">
        <LoadingState message="Loading split requests..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 flex items-center justify-center">
        <Card className="max-w-md w-full text-center py-8">
          <CardContent>
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Oops! Something went wrong</h2>
            <p className="text-sm text-slate-600 mb-6">{error}</p>
            <Button onClick={loadData} icon={RefreshCw}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader 
          title="Split Requests"
          description="Review and settle split payment requests from your friends for reprography orders."
        />

        {successMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2 text-sm font-medium text-emerald-700 shadow-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="h-5 w-5" />
            {successMessage}
          </div>
        )}

        {splitRequests.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              icon={CheckCircle}
              title="No pending split requests"
              description="You are all caught up! No one has requested payments from you."
            />
          </div>
        ) : (
          <div className="space-y-6">
            {splitRequests.map((request) => {
              const reqId = request._id;
              const isBusy = processingId === reqId;
              const hasSufficient = walletBalance >= request.amount;
              const inlineErr = inlineErrors[reqId];

              // Parse nested order fields gracefully
              const orderId = request.groupOrderId?.orderId || {};
              const docName = orderId.documentName || 'Document';
              const pCount = orderId.pageCount || 0;
              const colorOpt = orderId.colorOption || 'BlackAndWhite';
              const isDouble = orderId.doubleSided === true;
              const fCost = orderId.finalCost || 0;

              return (
                <Card key={reqId} className="overflow-hidden transition-all hover:shadow-md border-slate-200">
                  <CardContent className="p-0">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Request from</p>
                        <p className="text-lg font-bold text-slate-900">{request.from?.name || 'Friend'}</p>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <p className="text-sm font-semibold text-slate-900">{docName}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="outline">{pCount} page{pCount === 1 ? '' : 's'}</Badge>
                          <Badge variant="outline">{colorOpt === 'Colour' ? 'Colour' : 'B&W'}</Badge>
                          <Badge variant="outline">{isDouble ? 'Double sided' : 'Single sided'}</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
                          <p className="text-xs font-semibold text-blue-600/70 uppercase tracking-wider mb-1">Your Share</p>
                          <p className="text-2xl font-bold text-blue-700">{CURRENCY_FORMATTER.format(request.amount)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Order Total</p>
                          <p className="text-lg font-bold text-slate-700">{CURRENCY_FORMATTER.format(fCost)}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-t border-slate-100">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Wallet Balance</p>
                          <div className="flex items-center gap-2">
                            <p className={`text-base font-bold ${hasSufficient ? 'text-emerald-600' : 'text-red-600'}`}>
                              {CURRENCY_FORMATTER.format(walletBalance)}
                            </p>
                            {hasSufficient ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        
                        {!hasSufficient && (
                          <Button 
                            as={Link} 
                            to="/wallet/topup" 
                            variant="dangerOutline" 
                            size="sm" 
                            icon={Wallet}
                          >
                            Top Up Wallet
                          </Button>
                        )}
                      </div>

                      {inlineErr && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-2 text-sm text-red-700">
                          <Ban className="w-4 h-4 shrink-0" />
                          <span>{inlineErr}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                          onClick={() => handleRespond(reqId, 'accepted', request.amount)}
                          disabled={isBusy || !hasSufficient}
                          isLoading={isBusy && processingId === reqId}
                          className="flex-1"
                        >
                          {`Accept & Pay ${CURRENCY_FORMATTER.format(request.amount)}`}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => handleRespond(reqId, 'declined', request.amount)}
                          disabled={isBusy}
                          className="sm:w-auto"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitRequestsPage;
