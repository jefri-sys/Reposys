import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const formatOrderState = (value = '') => value
  .replace(/_/g, ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .trim();

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.get(`/orders/${orderId}`);
        setOrder(response.data?.order || null);
      } catch (loadError) {
        setError(loadError.response?.data?.message || 'Could not load the order confirmation.');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-xl rounded-[32px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">Order confirmation unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error || 'The order could not be loaded.'}</p>
          <Link
            to="/orders"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            Go to My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff,_#eef4ff_52%,_#f8fafc)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl rounded-[40px] border border-slate-200 bg-white shadow-[0_30px_120px_-60px_rgba(15,23,42,0.35)]">
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(135deg,_#e0f2fe,_#ffffff_58%)] px-8 py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">Order Submitted</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            {order.tokenNumber}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Keep this token handy while the counter team reviews and approves the job.
          </p>
        </div>

        <div className="grid gap-4 px-8 py-8 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order Status</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{formatOrderState(order.status)}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Service Type</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{order.serviceType}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated Cost</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {CURRENCY_FORMATTER.format(order.finalCost || order.estimatedCost || 0)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {order.paymentMethod} / {formatOrderState(order.paymentStatus)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 px-8 pb-10">
          <Link
            to={`/orders/${orderId}`}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Track My Order
          </Link>
          <Link
            to="/orders"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            View All Orders
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
