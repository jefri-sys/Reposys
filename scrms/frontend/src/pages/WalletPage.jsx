import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContextObject';
import { CreditCard, Plus, CheckCircle2, Wallet, ArrowRightLeft } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  LoadingState,
  EmptyState,
  PageHeader,
  Badge
} from '../components/ui';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
});

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
};

const TYPE_LABELS = {
  topup: 'Top Up',
  order_debit: 'Order Payment',
  split_debit: 'Split Sent',
  split_credit: 'Split Received',
  refund: 'Refund'
};

const getTransactionDisplay = (tx) => {
  const isPositive = ['topup', 'split_credit', 'refund'].includes(tx.type);
  const prefix = isPositive ? '+' : '−';
  const colorClass = isPositive ? 'text-emerald-600' : 'text-slate-900';
  return {
    label: TYPE_LABELS[tx.type] || tx.type,
    amount: `${prefix}${CURRENCY_FORMATTER.format(tx.amount)}`,
    colorClass
  };
};

const WalletPage = () => {
  const { user } = useContext(AuthContext);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewWallet, setIsNewWallet] = useState(false);
  const [welcomeStep, setWelcomeStep] = useState(1);

  useEffect(() => {
    let isActive = true;

    const loadWalletData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [walletRes, txRes] = await Promise.all([
          api.get('/wallet'),
          api.get('/wallet/transactions')
        ]);

        if (isActive) {
          setBalance(walletRes.data?.balance || 0);
          setTransactions(txRes.data?.transactions || []);
          setIsNewWallet(walletRes.data?.isNewWallet || false);
        }
      } catch (err) {
        if (isActive) {
          setError(err.response?.data?.message || 'Could not load wallet data.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadWalletData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (isNewWallet && welcomeStep === 1 && !isLoading) {
      const timer = setTimeout(() => {
        setWelcomeStep(2);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isNewWallet, welcomeStep, isLoading]);

  const handleCompleteOnboarding = async (callback) => {
    try {
      await api.post('/wallet/complete-onboarding');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    }
    if (callback) callback();
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader 
          title="My Wallet"
          description="Manage your balance and review your transaction history."
          actions={
            !isNewWallet && !isLoading && !error && (
              <Button as={Link} to="/wallet/topup" icon={Plus}>
                Top Up Balance
              </Button>
            )
          }
        />

        {isLoading ? (
          <div className="py-16">
            <LoadingState message="Loading wallet data..." />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        ) : isNewWallet ? (
          welcomeStep === 1 ? (
            <div className="py-16">
              <LoadingState message="Setting up your wallet..." />
            </div>
          ) : (
            <Card className="border-emerald-200 bg-emerald-50 text-center py-12 shadow-sm">
              <CardContent>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 mb-6">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-950 mb-3">Wallet Created Successfully!</h2>
                <p className="mx-auto max-w-md text-sm text-emerald-800 mb-8">
                  Your Reposys Wallet is ready. Use it to pay for orders and split bills with friends.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button as={Link} to="/wallet/topup" onClick={() => handleCompleteOnboarding()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Add Money Now
                  </Button>
                  <Button variant="outline" onClick={() => handleCompleteOnboarding(() => setIsNewWallet(false))} className="border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                    Go to Wallet
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          <>
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Current Balance</p>
                  <p className="text-5xl font-bold tracking-tight text-slate-900">
                    {CURRENCY_FORMATTER.format(balance)}
                  </p>
                </div>
                <div className="hidden sm:block opacity-20 text-blue-600">
                  <Wallet className="w-24 h-24" />
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.length === 0 ? (
                  <div className="py-12">
                    <EmptyState 
                      icon={ArrowRightLeft}
                      title="No transactions yet"
                      description="Top up your wallet to see your history here."
                    />
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map(tx => {
                            const display = getTransactionDisplay(tx);
                            return (
                              <TableRow key={tx._id}>
                                <TableCell className="font-medium text-slate-900">{display.label}</TableCell>
                                <TableCell className="text-slate-600">{tx.description}</TableCell>
                                <TableCell className="text-slate-500">{formatDate(tx.timestamp)}</TableCell>
                                <TableCell className={`text-right font-bold ${display.colorClass}`}>
                                  {display.amount}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="md:hidden flex flex-col divide-y divide-slate-100 bg-white">
                      {transactions.map(tx => {
                        const display = getTransactionDisplay(tx);
                        return (
                          <div key={tx._id} className="p-4 flex flex-col gap-2 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{display.label}</p>
                                <p className="text-xs text-slate-500 mt-1">{formatDate(tx.timestamp)}</p>
                              </div>
                              <div className={`text-sm font-bold ${display.colorClass} shrink-0`}>
                                {display.amount}
                              </div>
                            </div>
                            {tx.description && (
                              <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100 mt-1">
                                {tx.description}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default WalletPage;
