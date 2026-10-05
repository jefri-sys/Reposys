import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { CreditCard, Wallet, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
  LoadingState,
  PageHeader
} from '../components/ui';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const SplitPayPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const splitContext = location.state || (
    searchParams.get('splitRequestId') ? {
      splitRequestId: searchParams.get('splitRequestId'),
      groupOrderId: searchParams.get('groupOrderId'),
      amount: parseFloat(searchParams.get('amount')),
      groupChatId: searchParams.get('groupChatId')
    } : null
  );

  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [pageError, setPageError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Extract split payload from context
  const { splitRequestId, groupOrderId, amount, orderId, groupChatId } = splitContext || {};

  useEffect(() => {
    // If state is invalid or missing splitRequestId, redirect to /wallet
    if (!splitContext || !splitRequestId) {
      navigate('/wallet', { replace: true });
      return;
    }

    const fetchWallet = async () => {
      try {
        setLoadingBalance(true);
        setPageError('');
        const res = await api.get('/wallet');
        setWalletBalance(res.data?.balance ?? 0);
      } catch (err) {
        setPageError(err.response?.data?.message || 'Failed to fetch wallet balance.');
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchWallet();
  }, [splitContext, splitRequestId, navigate]);

  const handleConfirmPayment = async () => {
    if (confirmingPayment) return;
    setConfirmingPayment(true);
    setPageError('');

    try {
      await api.post('/group-orders/split/respond', {
        splitRequestId,
        action: 'accepted'
      });

      setSuccessMessage(`Payment successful! ₹${Number(amount).toFixed(2)} sent.`);
      
      setTimeout(() => {
        navigate('/chat', { state: { openGroupId: groupChatId } });
      }, 1500);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Split payment failed. Please try again.');
      setConfirmingPayment(false);
    }
  };

  if (!splitContext || !splitRequestId) {
    return null;
  }

  const hasSufficientBalance = walletBalance !== null && walletBalance >= amount;
  const shortfall = amount - (walletBalance || 0);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6">
        
        <Link 
          to="/chat" 
          state={{ openGroupId: groupChatId }}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Reposys Payments</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Split Payment</h1>
        </div>

        {successMessage ? (
          <Card className="border-emerald-200 bg-emerald-50 text-center py-8 shadow-md">
            <CardContent className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-emerald-950">Payment Complete</h2>
              <p className="text-sm text-emerald-800">{successMessage}</p>
              <p className="text-xs text-emerald-600 italic">Returning you to the group chat...</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-0 ring-1 ring-slate-200">
            <CardContent className="p-8 space-y-6">
              <div className="border-b border-slate-100 pb-6 space-y-1 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Group Order Reference</p>
                <p className="text-sm font-bold text-slate-900">
                  #{typeof orderId === 'object' && orderId !== null ? (orderId.tokenNumber || orderId._id) : (orderId || groupOrderId)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-2xl p-6 text-center">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Amount Due</p>
                <p className="text-4xl font-black text-blue-900">
                  {CURRENCY_FORMATTER.format(amount)}
                </p>
              </div>

              {pageError && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <span>{pageError}</span>
                </div>
              )}

              {loadingBalance ? (
                <div className="py-8">
                  <LoadingState message="Checking wallet balance..." />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex justify-between items-center bg-slate-50 px-5 py-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-200/50 rounded-lg text-slate-600">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Wallet Balance</span>
                    </div>
                    <span className={`font-bold ${hasSufficientBalance ? 'text-slate-900' : 'text-red-600'}`}>
                      {CURRENCY_FORMATTER.format(walletBalance)}
                    </span>
                  </div>

                  {hasSufficientBalance ? (
                    <div className="space-y-3 pt-2">
                      <Button
                        onClick={handleConfirmPayment}
                        disabled={confirmingPayment}
                        isLoading={confirmingPayment}
                        className="w-full h-14 text-base bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Confirm Payment — {CURRENCY_FORMATTER.format(amount)}
                      </Button>
                      <div className="text-center space-y-1">
                        <p className="text-xs text-slate-500">
                          ₹{Number(amount).toFixed(2)} will be deducted from your wallet
                        </p>
                        <p className="text-[11px] font-semibold text-emerald-600">
                          Remaining balance: {CURRENCY_FORMATTER.format(walletBalance - amount)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                        <p className="text-sm font-bold text-amber-900 mb-1">Insufficient Balance</p>
                        <p className="text-xs text-amber-700">
                          You need {CURRENCY_FORMATTER.format(shortfall)} more to pay this split.
                        </p>
                      </div>

                      <Button
                        as={Link}
                        to="/wallet/topup"
                        className="w-full h-12"
                        icon={CreditCard}
                      >
                        Top Up Wallet
                      </Button>

                      <Button
                        disabled
                        variant="outline"
                        className="w-full h-12"
                      >
                        Confirm Payment
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SplitPayPage;
