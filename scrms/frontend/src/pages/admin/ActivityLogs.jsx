import React, { startTransition, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ArrowLeft, Search, AlertCircle, History, Shield, Info, Activity } from 'lucide-react';
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
const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE_STAFF', label: 'Create Staff' },
  { value: 'UPDATE_PRICING', label: 'Update Pricing' },
  { value: 'QUEUE_REORDER', label: 'Queue Reorder' },
  { value: 'TOGGLE_USER_ACTIVE', label: 'Toggle User Active' },
  { value: 'SET_LIMIT_OVERRIDE', label: 'Set Limit Override' },
  { value: 'user_management', label: 'User Management' },
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

const formatActionType = (value = '') => value
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const getVisiblePages = (currentPage, totalPages) => {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
};

const ActivityLogs = () => {
  const { logout } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionType, setActionType] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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

    const loadLogs = async () => {
      setLoading(true);

      try {
        const response = await api.get('/admin/activity-logs', {
          params: {
            page,
            limit: PAGE_SIZE,
            actionType: actionType || undefined,
            search: debouncedSearch || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        });

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setLogs(Array.isArray(response.data?.logs) ? response.data.logs : []);
          setTotal(response.data?.total || 0);
          setTotalPages(response.data?.totalPages || 1);
        });
        setError('');
      } catch (loadError) {
        if (isActive) {
          console.error('Failed to load activity logs', loadError);
          setError('Could not load activity logs.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadLogs();

    return () => {
      isActive = false;
    };
  }, [actionType, debouncedSearch, endDate, page, startDate]);

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
    setPage(1);
  };

  const handleActionTypeChange = (event) => {
    setActionType(event.target.value);
    setPage(1);
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
    setPage(1);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
    setPage(1);
  };

  const getActionIcon = (type) => {
    if (type?.includes('UPDATE') || type?.includes('EDIT')) return <Activity className="h-4 w-4 text-blue-500" />;
    if (type?.includes('CREATE') || type?.includes('ADD')) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (type?.includes('DELETE') || type?.includes('REMOVE')) return <AlertCircle className="h-4 w-4 text-rose-500" />;
    return <Info className="h-4 w-4 text-slate-500" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="Activity Logs"
          description="Track admin actions, search descriptions, and filter the audit trail by action type or date."
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
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-slate-400" />
                System Audit Trail
              </CardTitle>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 w-full lg:w-auto">
                <Input
                  icon={Search}
                  placeholder="Search descriptions..."
                  value={searchInput}
                  onChange={handleSearchChange}
                />
                <Select
                  value={actionType}
                  onChange={handleActionTypeChange}
                  options={ACTION_OPTIONS}
                />
                <Input
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  label="Start Date"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  label="End Date"
                />
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
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Action</th>
                    <th className="px-6 py-4 bg-white">Description</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-10">
                        <LoadingState message="Loading audit logs..." />
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10">
                        <EmptyState 
                          title="No logs found"
                          description="No activity logs matched the current filters."
                          icon={History}
                        />
                      </td>
                    </tr>
                  ) : logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap font-medium">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="flex w-max items-center gap-1.5 font-mono">
                          {getActionIcon(log.actionType)}
                          {formatActionType(log.actionType)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {log.description || <span className="italic text-slate-400">No description provided</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                            {log.performedBy?.name ? log.performedBy.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{log.performedBy?.name || 'System'}</div>
                            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500">
                              <Shield className="h-3 w-3" />
                              {log.performedBy?.role || 'AUTO'}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
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

export default ActivityLogs;
