import React, { startTransition, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ArrowLeft, Search, AlertCircle, History, Zap, Settings, Activity, Trash2, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContextObject';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Select,
  PageHeader,
  LoadingState,
  EmptyState,
  Badge
} from '../../components/ui';

const PAGE_SIZE = 20;
const RESULT_OPTIONS = [
  { value: '', label: 'All Results' },
  { value: 'Success', label: 'Success' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Skipped', label: 'Skipped' },
  { value: 'QueueFull', label: 'QueueFull' },
  { value: 'AwaitingCash', label: 'AwaitingCash' },
];

const EVENT_OPTIONS = [
  { value: '', label: 'All Events' },
  { value: 'PAYMENT_VERIFIED', label: 'PAYMENT_VERIFIED' },
  { value: 'CASH_CONFIRMED', label: 'CASH_CONFIRMED' },
  { value: 'ORDER_CANCELLED', label: 'ORDER_CANCELLED' },
  { value: 'PRINT_JOB_CREATED', label: 'PRINT_JOB_CREATED' },
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

const getVisiblePages = (currentPage, totalPages) => {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from({ length: Math.max(0, end - adjustedStart + 1) }, (_, index) => adjustedStart + index);
};

const getResultBadgeVariant = (result) => {
  switch (result) {
    case 'Success': return 'success';
    case 'Failed': return 'danger';
    case 'Skipped': return 'secondary';
    case 'QueueFull': return 'warning';
    case 'AwaitingCash': return 'warning';
    default: return 'secondary';
  }
};

const AutomationLogs = () => {
  const { logout } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [resultFilter, setResultFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);

  const loadLogs = async () => {
    setLoading(true);

    try {
      const response = await api.get('/automation/logs', {
        params: {
          page,
          limit: PAGE_SIZE,
          result: resultFilter || undefined,
          event: eventFilter || undefined,
        },
      });

      startTransition(() => {
        setLogs(Array.isArray(response.data?.logs) ? response.data.logs : []);
        setTotal(response.data?.total || 0);
        setTotalPages(response.data?.totalPages || 1);
      });
      setError('');
    } catch (loadError) {
      console.error('Failed to load automation logs', loadError);
      setError('Could not load automation logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllLogs = async () => {
    setIsDeleting(true);
    try {
      await api.delete('/automation/logs');
      setSuccessMsg('SPAE audit logs cleared successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setDeleteConfirm(false);
      
      // Reset to page 1 and refresh
      if (page === 1) {
        loadLogs();
      } else {
        setPage(1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clear logs.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [resultFilter, eventFilter, page]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="Automation Logs"
          description="Track SPAE events, monitor printer assignments, and audit background print jobs."
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
        
        {successMsg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2 shadow-sm animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMsg}
          </div>
        )}

        <Card className="flex flex-col h-[800px] shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-5 bg-slate-50/50">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-400" />
                SPAE Engine Audit
              </CardTitle>
              <div className="flex flex-col lg:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="grid gap-3 sm:grid-cols-2 w-full lg:w-auto">
                  <Select
                    value={eventFilter}
                    onChange={(e) => { setEventFilter(e.target.value); setPage(1); }}
                    options={EVENT_OPTIONS}
                  />
                  <Select
                    value={resultFilter}
                    onChange={(e) => { setResultFilter(e.target.value); setPage(1); }}
                    options={RESULT_OPTIONS}
                  />
                </div>
                <Button 
                  variant="dangerOutline" 
                  icon={Trash2} 
                  onClick={() => setDeleteConfirm(true)}
                  className="w-full lg:w-auto whitespace-nowrap"
                  disabled={loading || logs.length === 0}
                >
                  Clear All Logs
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 text-sm text-slate-500 bg-white">
            <span className="font-medium text-slate-700">Showing {logs.length} of {total} log entries</span>
            <span>Page {page} of {totalPages}</span>
          </div>

          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white sticky top-0 z-10 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Timestamp</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Order Token</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Event</th>
                    <th className="px-6 py-4 bg-white">Action</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Result</th>
                    <th className="px-6 py-4 bg-white">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-10">
                        <LoadingState message="Loading automation logs..." />
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10">
                        <EmptyState 
                          title="No automation logs yet."
                          description="The SPAE engine hasn't processed any events matching the filters."
                          icon={Zap}
                        />
                      </td>
                    </tr>
                  ) : logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap font-medium">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-bold whitespace-nowrap">
                        {log.orderId?.tokenNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {log.event}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {log.action}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getResultBadgeVariant(log.result)} className="whitespace-nowrap">
                          {log.result}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            {Object.entries(log.metadata).map(([k, v]) => (
                              <div key={k}><span className="font-semibold text-slate-600">{k}:</span> {String(v)}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Clear SPAE Audit Logs?</h3>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-700 space-y-1">
              <p className="font-semibold">This will permanently delete ALL SPAE audit records.</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs mt-1">
                <li>This action cannot be undone.</li>
                <li>Future print jobs will continue generating new logs.</li>
              </ul>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAllLogs}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete All Logs'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationLogs;
