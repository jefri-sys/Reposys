import React, { startTransition, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ArrowLeft, Search, Filter, AlertCircle, ChevronDown, ChevronRight, Download, FileText } from 'lucide-react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContextObject';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Select,
  PageHeader,
  LoadingState,
  EmptyState,
  Badge
} from '../../components/ui';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Created', label: 'Pending' },
  { value: 'Refunded', label: 'Refunded' },
];

const METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'Online', label: 'Online' },
  { value: 'Cash', label: 'Cash' },
  { value: 'wallet', label: 'Wallet' },
];

const formatDateTime = (value) => {
  const parsedDate = value ? new Date(value) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return 'Not available';
  }

  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatCurrency = (value) => `₹${Number(value || 0).toFixed(2)}`;

const getVisiblePages = (currentPage, totalPages) => {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
};

const STATUS_BADGES = {
  Created: 'warning',
  Paid: 'success',
  Failed: 'danger',
  Refunded: 'secondary',
};

const METHOD_BADGES = {
  Online: 'primary',
  Cash: 'violet',
  wallet: 'success',
};

const getPaymentStatus = (payment) => payment?.displayStatus || payment?.status || 'Unknown';

const GroupPaymentBreakdown = ({ orderId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;
    const fetchBreakdown = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/admin/group-orders/${orderId}/breakdown`);
        if (isActive) {
          setData(response.data);
        }
      } catch (err) {
        if (isActive) {
          setError(err.response?.data?.message || 'Failed to load group payment breakdown.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    if (orderId) {
      fetchBreakdown();
    }
    return () => {
      isActive = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="mt-6 border-t border-slate-200 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Group Payment Breakdown</p>
        <div className="flex items-center gap-3 py-4 justify-center bg-slate-50 rounded-lg">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          <span className="text-sm font-medium text-slate-600">Loading breakdown data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 border-t border-slate-200 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Group Payment Breakdown</p>
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2 border border-red-100">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      </div>
    );
  }

  if (!data || !data.participants) return null;

  const totalRecovered = data.participants
    .filter(p => p.walletStatus === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const remaining = data.participants
    .filter(p => p.walletStatus === 'pending' || p.walletStatus === 'declined')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'declined': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <div className="mt-6 border-t border-slate-200 pt-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Group Payment Breakdown</p>
      
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 flex items-center justify-between">
          <span className="text-sm font-medium text-emerald-800">Total Recovered</span>
          <span className="text-lg font-bold text-emerald-700">₹{totalRecovered.toFixed(2)}</span>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 flex items-center justify-between">
          <span className="text-sm font-medium text-amber-800">Remaining Balance</span>
          <span className="text-lg font-bold text-amber-700">₹{remaining.toFixed(2)}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Participant Name</th>
              <th className="px-4 py-3">Share Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.participants.map((p, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-900">{p.userId?.name || 'Unknown Participant'}</td>
                <td className="px-4 py-3 text-slate-700 font-medium">₹{Number(p.amount || 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusBadgeVariant(p.walletStatus)} className="text-[10px]">
                    {p.walletStatus}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TransactionHistory = () => {
  const { logout } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    let isActive = true;

    const loadTransactions = async () => {
      setLoading(true);

      try {
        const response = await api.get('/admin/transactions', {
          params: {
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
            method: methodFilter || undefined,
          },
        });

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setPayments(Array.isArray(response.data?.payments) ? response.data.payments : []);
          setTotal(response.data?.total || 0);
          setTotalPages(response.data?.totalPages || 1);
        });
        setError('');
      } catch (loadError) {
        if (isActive) {
          console.error('Failed to load transaction history', loadError);
          setError('Could not load transaction history.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadTransactions();

    return () => {
      isActive = false;
    };
  }, [debouncedSearch, methodFilter, page, statusFilter]);

  const toggleExpanded = (paymentId) => {
    setExpandedRows((current) => ({
      ...current,
      [paymentId]: !current[paymentId],
    }));
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
    setPage(1);
  };

  const handleMethodChange = (event) => {
    setMethodFilter(event.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="Transaction History"
          description="Review payment records, filter by payment method or status, and inspect linked orders."
          actions={
            <div className="flex items-center gap-3">
              <Button as={Link} to="/admin" variant="outline" icon={ArrowLeft}>
                Back to Admin
              </Button>
              <Button variant="dangerOutline" onClick={logout} icon={LogOut}>
                Logout
              </Button>
            </div>
          }
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <Card className="flex flex-col h-[800px] shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-5 bg-slate-50/50">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Transactions Explorer</CardTitle>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 w-full lg:w-auto">
                <div className="w-full sm:min-w-[240px]">
                  <Input
                    icon={Search}
                    placeholder="Search tokens, users, amounts..."
                    value={searchInput}
                    onChange={handleSearchChange}
                  />
                </div>
                <div className="w-full sm:min-w-[160px]">
                  <Select
                    value={statusFilter}
                    onChange={handleStatusChange}
                    options={STATUS_OPTIONS}
                  />
                </div>
                <div className="w-full sm:min-w-[160px]">
                  <Select
                    value={methodFilter}
                    onChange={handleMethodChange}
                    options={METHOD_OPTIONS}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 text-sm text-slate-500 bg-white">
            <span className="font-medium text-slate-700">Showing {payments.length} of {total} payments</span>
            <span>Page {page} of {totalPages}</span>
          </div>

          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white sticky top-0 z-10 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap bg-white w-10"></th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Date</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Order Details</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Customer</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Amount</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Method</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-10">
                        <LoadingState message="Loading transactions..." />
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10">
                        <EmptyState 
                          title="No transactions found"
                          description="No transactions matched the current filters."
                          icon={Search}
                        />
                      </td>
                    </tr>
                  ) : payments.map((payment) => (
                    <React.Fragment key={payment._id}>
                      <tr
                        className={`cursor-pointer transition-colors ${expandedRows[payment._id] ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}
                        onClick={() => toggleExpanded(payment._id)}
                      >
                        <td className="px-6 py-4 text-slate-400">
                          {expandedRows[payment._id] ? (
                            <ChevronDown className="h-5 w-5 text-blue-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap font-medium">{formatDateTime(payment.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{payment.orderId?.tokenNumber || 'Unknown'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{payment.orderId?.serviceType || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{payment.userId?.name || 'Unknown user'}</div>
                          <div className="text-xs text-slate-500">{payment.userId?.email || 'No email available'}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(payment.amount)}</td>
                        <td className="px-6 py-4">
                          <Badge variant={METHOD_BADGES[payment.method] || 'secondary'}>
                            {payment.method === 'wallet' ? 'Wallet' : (payment.method || 'Unknown')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={STATUS_BADGES[getPaymentStatus(payment)] || 'secondary'}>
                            {getPaymentStatus(payment)}
                          </Badge>
                        </td>
                      </tr>
                      {expandedRows[payment._id] && (
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td colSpan={7} className="px-0 py-0">
                            <div className="p-6 ml-16 border-l-2 border-blue-200 my-2">
                              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" /> Transaction Details
                              </h4>
                              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order Status</p>
                                  <p className="mt-1 font-medium text-slate-900">{payment.orderId?.status || 'Unknown'}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estimated Cost</p>
                                  <p className="mt-1 font-medium text-slate-900">{formatCurrency(payment.orderId?.estimatedCost)}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">User Role</p>
                                  <p className="mt-1 font-medium text-slate-900">{payment.userId?.role || 'Unknown'}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Payment References</p>
                                  <p className="mt-1 font-mono text-xs text-slate-700 break-all bg-slate-100 p-1.5 rounded inline-block">
                                    {payment.razorpayPaymentId || payment.razorpayOrderId || 'Not available'}
                                  </p>
                                </div>
                              </div>
                              {payment.orderId?.isGroupOrder && (
                                <GroupPaymentBreakdown orderId={payment.orderId?._id || payment.orderId} />
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="border-t border-slate-200 bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
              <div className="text-sm font-medium text-slate-500">
                Page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{totalPages}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1 || loading}
                >
                  Previous
                </Button>

                <div className="hidden sm:flex gap-1">
                  {visiblePages.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      disabled={loading}
                      className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${
                        pageNumber === page
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionHistory;
