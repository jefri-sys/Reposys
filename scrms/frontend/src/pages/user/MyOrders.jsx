import { useEffect, useMemo, useState } from 'react';
import { Download, Users, PackageSearch } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  Select,
  EmptyState,
  LoadingState,
  PageHeader
} from '../../components/ui';

const PAGE_SIZE = 10;

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const STATUS_STYLES = {
  Pending: 'warning',
  In_Queue: 'primary',
  Confirmed: 'primary',
  Processing: 'purple',
  ReadyForPickup: 'success',
  Completed: 'success',
  Cancelled: 'danger',
};

const STATUS_FILTERS = ['All', 'Pending', 'In_Queue', 'Processing', 'ReadyForPickup', 'Completed', 'Cancelled'];
const SERVICE_FILTERS = ['All', 'Printing', 'Photocopying', 'Scanning', 'Binding', 'Conversion'];

const formatOrderState = (value = '') => value.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();

const getSplitStatusMeta = (status) => {
  if (status === 'paid') return { label: 'Paid', variant: 'success' };
  if (status === 'declined') return { label: 'Declined', variant: 'danger' };
  return { label: 'Pending', variant: 'warning' };
};

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState('');
  const [downloadingReceiptId, setDownloadingReceiptId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [expandedCancelOrderId, setExpandedCancelOrderId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get('/orders/my-orders');
        setOrders(Array.isArray(response.data?.orders) ? response.data.orders : []);
      } catch (loadError) {
        setError(loadError.response?.data?.message || 'Could not load your orders.');
      } finally {
        setIsLoading(false);
      }
    };
    loadOrders();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, endDate, serviceTypeFilter, startDate, statusFilter]);

  const filteredOrders = useMemo(() => {
    const startBoundary = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const endBoundary = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

    return orders.filter((order) => {
      const matchesSearch = !debouncedSearch || order.tokenNumber?.toLowerCase().includes(debouncedSearch) || order.serviceType?.toLowerCase().includes(debouncedSearch);
      const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
      const matchesServiceType = serviceTypeFilter === 'All' || order.serviceType === serviceTypeFilter;
      const createdAt = order.createdAt ? new Date(order.createdAt) : null;
      const matchesStartDate = !startBoundary || (createdAt && createdAt >= startBoundary);
      const matchesEndDate = !endBoundary || (createdAt && createdAt <= endBoundary);

      return matchesSearch && matchesStatus && matchesServiceType && matchesStartDate && matchesEndDate;
    });
  }, [debouncedSearch, endDate, orders, serviceTypeFilter, startDate, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCancelOrder = async (event, orderId) => {
    event.stopPropagation();
    if (cancellingOrderId) return;
    setCancellingOrderId(orderId);
    setActionMessage('');
    try {
      const response = await api.patch(`/orders/${orderId}/cancel`, { cancelReason: cancelReason.trim() });
      const updatedOrder = response.data?.order;
      setOrders((current) => current.map((order) => order._id === orderId ? { ...order, ...updatedOrder } : order));
      setExpandedCancelOrderId('');
      setCancelReason('');
      setActionMessage('Order cancelled successfully.');
    } catch (cancelError) {
      setActionMessage(cancelError.response?.data?.message || 'Could not cancel this order.');
    } finally {
      setCancellingOrderId('');
    }
  };

  const handleDownloadReceipt = async (event, orderId, tokenNumber) => {
    event.stopPropagation();
    if (downloadingReceiptId) return;
    setDownloadingReceiptId(orderId);
    setActionMessage('');
    try {
      const response = await api.get(`/orders/${orderId}/receipt`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${tokenNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let errorMessage = 'Could not download the receipt.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch (e) {
          // ignore
        }
      } else {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setActionMessage(errorMessage);
    } finally {
      setDownloadingReceiptId('');
    }
  };

  const hasOrders = orders.length > 0;
  const hasFilteredResults = filteredOrders.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader 
          title="My Orders"
          description="Search your history, filter by status or service type, and reopen any order when you need the details."
          actions={
            <Button as={Link} to="/orders/new">Place Another Order</Button>
          }
        />

        {isLoading ? (
          <LoadingState message="Loading your orders..." />
        ) : null}

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 shadow-sm">
            {actionMessage}
          </div>
        ) : null}

        {!isLoading && !error && !hasOrders ? (
          <EmptyState 
            icon={PackageSearch} 
            title="No orders yet" 
            description="Your order history will appear here after you complete the wizard." 
            action={<Button as={Link} to="/orders/new">Start Your First Order</Button>}
          />
        ) : null}

        {!isLoading && !error && hasOrders ? (
          <>
            <Card className="mb-6">
              <CardContent className="p-4 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <Input
                    label="Search"
                    placeholder="Token or service"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={STATUS_FILTERS.map(o => ({ value: o, label: o === 'All' ? 'All statuses' : formatOrderState(o) }))}
                  />
                  <Select
                    label="Service Type"
                    value={serviceTypeFilter}
                    onChange={(e) => setServiceTypeFilter(e.target.value)}
                    options={SERVICE_FILTERS.map(o => ({ value: o, label: o === 'All' ? 'All services' : o }))}
                  />
                  <Input
                    type="date"
                    label="Start Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <Input
                    type="date"
                    label="End Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {!hasFilteredResults ? (
              <EmptyState 
                icon={PackageSearch} 
                title="No matching orders" 
                description="Try adjusting the filters or clearing the search to see more of your order history." 
              />
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  {paginatedOrders.map((order) => {
                    const isParticipantOrder = order.orderAccessRole === 'participant';
                    const splitStatus = getSplitStatusMeta(order.participantSplit?.walletStatus);

                    return (
                      <Card
                        key={order._id}
                        className="transition-all duration-200 hover:shadow-md hover:border-slate-300 flex flex-col h-full"
                      >
                        <CardContent className="p-0 flex flex-col flex-1">
                          <button
                            className="w-full text-left p-6 sm:p-8 outline-none flex-1"
                            type="button"
                            onClick={() => navigate(`/orders/${order._id}`)}
                          >
                            <div className="flex items-start justify-between gap-4 mb-1">
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Token Number</p>
                                {order.isGroupOrder ? (
                                  <Badge variant="primary" className="!text-[10px]">
                                    <Users className="h-3 w-3 mr-1" />
                                    {isParticipantOrder ? 'Group Participant' : 'Group Order'}
                                  </Badge>
                                ) : null}
                              </div>
                              <Badge variant={STATUS_STYLES[order.status] || 'default'}>
                                {formatOrderState(order.status)}
                              </Badge>
                            </div>
                            <div className="mb-6">
                              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{order.tokenNumber}</h2>
                              {isParticipantOrder ? (
                                <p className="mt-1 text-xs font-medium text-slate-500">Created by {order.groupCreatorName || 'the creator'}</p>
                              ) : null}
                            </div>
                            
                            <div className="grid gap-4 sm:grid-cols-3">
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Service</p>
                                <p className="mt-1.5 text-sm font-semibold text-slate-900">{order.serviceType}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                  {isParticipantOrder ? 'Your Share' : (order.finalCost ? 'Final Cost' : 'Estimated Cost')}
                                </p>
                                <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                  {CURRENCY_FORMATTER.format(
                                    isParticipantOrder ? order.participantSplit?.amount || 0 : order.finalCost || order.estimatedCost || 0
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                  {isParticipantOrder ? 'Split Status' : 'Created'}
                                </p>
                                {isParticipantOrder ? (
                                  <Badge variant={splitStatus.variant} className="mt-1.5">
                                    {splitStatus.label}
                                  </Badge>
                                ) : (
                                  <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>

                          {isParticipantOrder && (
                            <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0">
                              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Document Details</p>
                                <div className="space-y-2">
                                  {order.documentIds?.map((doc) => (
                                    <div key={doc._id} className="flex items-center justify-between gap-3 text-sm">
                                      <span className="min-w-0 truncate font-semibold text-slate-900">{doc.originalFilename}</span>
                                      <span className="shrink-0 text-slate-500 font-medium">{doc.pageCount} page{doc.pageCount === 1 ? '' : 's'}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-4 flex gap-2">
                                  <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">{order.printConfig?.colourMode || 'Not set'}</span>
                                  <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">{order.printConfig?.sided || 'Not set'}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 mt-auto flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                            {!isParticipantOrder && order.status === 'Completed' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                icon={Download}
                                isLoading={downloadingReceiptId === order._id}
                                onClick={(event) => handleDownloadReceipt(event, order._id, order.tokenNumber)}
                              >
                                Download Receipt
                              </Button>
                            ) : null}

                            {!isParticipantOrder && ['Pending', 'In_Queue'].includes(order.status) ? (
                              <>
                                {expandedCancelOrderId === order._id ? (
                                  <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <Input
                                      label="Cancellation Reason (Optional)"
                                      placeholder="Share a note with the counter team"
                                      value={cancelReason}
                                      onChange={(e) => setCancelReason(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        variant="danger"
                                        size="sm"
                                        isLoading={cancellingOrderId === order._id}
                                        onClick={(event) => handleCancelOrder(event, order._id)}
                                      >
                                        Confirm
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setExpandedCancelOrderId('');
                                          setCancelReason('');
                                          setActionMessage('');
                                        }}
                                      >
                                        Close
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex border-t border-slate-100 pt-4">
                                    <Button
                                      variant="dangerOutline"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setExpandedCancelOrderId(order._id);
                                        setCancelReason('');
                                        setActionMessage('');
                                      }}
                                    >
                                      Cancel Order
                                    </Button>
                                  </div>
                                )}
                              </>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    Showing {paginatedOrders.length} of {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium text-slate-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default MyOrders;
