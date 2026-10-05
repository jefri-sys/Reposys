import { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContextObject';
import { ArrowLeft, CreditCard, Wallet } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  PageHeader
} from '../components/ui';

const WalletTopup = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [amount, setAmount] = useState(location.state?.initialAmount || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setSuccess('');
    const numericAmount = Number(amount);

    if (!Number.isInteger(numericAmount) || numericAmount < 10) {
      setError('Please enter a valid integer amount of at least ₹10.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create topup order
      const orderRes = await api.post('/wallet/topup/create-order', { amount: numericAmount });
      const { razorpayOrderId, currency, keyId } = orderRes.data;

      // Step 2: Open Razorpay checkout
      const options = {
        key: keyId,
        amount: numericAmount * 100,
        currency,
        name: 'Reposys — Saintgits College',
        description: 'Wallet Top Up',
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            // Step 3: Verify payment
            const verifyRes = await api.post('/wallet/topup/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              setSuccess('Wallet topped up successfully! Redirecting...');
              setTimeout(() => {
                navigate('/wallet');
              }, 1500);
            } else {
              setError('Payment could not be verified.');
              setIsSubmitting(false);
            }
          } catch (verifyError) {
            setError(verifyError.response?.data?.message || 'Payment could not be verified.');
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email
        },
        theme: { color: '#2563eb' },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            setError('Payment cancelled.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError('Payment failed: ' + response.error.description);
        setIsSubmitting(false);
      });
      rzp.open();

    } catch (err) {
      setError(err.response?.data?.message || 'Could not initiate payment. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-md space-y-6">
        <Link 
          to="/wallet" 
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Wallet
        </Link>
        
        <Card className="border-0 shadow-xl shadow-slate-200/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-blue-100 text-blue-700 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl">Top Up Wallet</CardTitle>
            <CardDescription>Enter the amount to add to your balance.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Input
                  label="Amount (₹)"
                  type="number"
                  min="10"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="text-lg"
                  autoFocus
                />
                <p className="text-xs text-slate-500">Minimum amount is ₹10.</p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isSubmitting || success}
                isLoading={isSubmitting}
                icon={!isSubmitting ? CreditCard : undefined}
              >
                {isSubmitting ? 'Processing...' : 'Proceed to Pay'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WalletTopup;
