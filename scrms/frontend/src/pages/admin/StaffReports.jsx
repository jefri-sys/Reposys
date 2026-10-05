import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, ClipboardList, Clock3, Search, AlertTriangle, X } from 'lucide-react';
import api from '../../services/api';
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
  Badge,
  StatCard
} from '../../components/ui';

const AdminStaffReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Resolution Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [searchInput, statusFilter, urgencyFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      let query = '?limit=100';
      if (statusFilter) query += `&status=${statusFilter}`;
      if (urgencyFilter) query += `&urgency=${urgencyFilter}`;
      if (searchInput.trim()) query += `&search=${encodeURIComponent(searchInput.trim())}`;

      const response = await api.get(`/staff-reports${query}`);
      setReports(response.data.reports || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff reports.');
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = reports.filter(r => r.status === 'Pending').length;
  const acknowledgedCount = reports.filter(r => r.status === 'Acknowledged').length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;

  const handleAcknowledge = async (id) => {
    try {
      setError('');
      setMessage('');
      await api.patch(`/admin/staff-reports/${id}/acknowledge`);
      setMessage('Report acknowledged successfully.');
      fetchReports();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to acknowledge report.');
    }
  };

  const handleOpenResolveModal = (id) => {
    setSelectedReportId(id);
    setResolutionNote('');
    setShowModal(true);
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    try {
      setResolving(true);
      setError('');
      setMessage('');
      await api.patch(`/admin/staff-reports/${selectedReportId}/resolve`, { resolutionNote });
      setMessage('Report resolved successfully.');
      setShowModal(false);
      fetchReports();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve report.');
    } finally {
      setResolving(false);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Acknowledged': return 'primary';
      case 'Resolved': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="Staff Reports Console"
          description="Review, acknowledge, and resolve staff-reported issues from shop operations."
          actions={
            <Button as={Link} to="/admin" variant="outline" icon={ArrowLeft}>
              Back to Admin
            </Button>
          }
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {message}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard 
            title="Pending Reports" 
            value={pendingCount} 
            icon={Clock3} 
            variant="warning"
          />
          <StatCard 
            title="Acknowledged" 
            value={acknowledgedCount} 
            icon={ClipboardList} 
            variant="primary" 
          />
          <StatCard 
            title="Resolved" 
            value={resolvedCount} 
            icon={CheckCircle2} 
            variant="success" 
          />
        </div>

        <Card className="flex flex-col min-h-[600px] shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-5 bg-slate-50/50">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Reports Explorer</CardTitle>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 w-full lg:w-auto">
                <div className="w-full sm:min-w-[240px]">
                  <Input
                    icon={Search}
                    placeholder="Search ref, category, note..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <div className="w-full sm:min-w-[160px]">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Acknowledged', label: 'Acknowledged' },
                      { value: 'Resolved', label: 'Resolved' }
                    ]}
                  />
                </div>
                <div className="w-full sm:min-w-[160px]">
                  <Select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    options={[
                      { value: '', label: 'All Urgencies' },
                      { value: 'Normal', label: 'Normal' },
                      { value: 'Urgent', label: 'Urgent' }
                    ]}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white sticky top-0 z-10 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-sm">
                  <tr>
                    <th className="whitespace-nowrap px-6 py-4 bg-white">Report Ref</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Raised By</th>
                    <th className="px-6 py-4 bg-white">Category / Item</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-white">Status & Urgency</th>
                    <th className="whitespace-nowrap px-6 py-4 bg-white">Dates</th>
                    <th className="px-6 py-4 bg-white">Resolution Note</th>
                    <th className="px-6 py-4 text-right bg-white whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-10">
                        <LoadingState message="Loading reports..." />
                      </td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10">
                        <EmptyState 
                          title="No reports found"
                          description="No staff reports matched the current filters."
                          icon={ClipboardList}
                        />
                      </td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr 
                        key={report._id} 
                        className={`transition hover:bg-slate-50 ${report.urgency === 'Urgent' ? 'bg-rose-50/30' : ''}`}
                      >
                        <td className="px-6 py-4 font-bold text-slate-900">{report.reportRef}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{report.raisedBy?.name || 'Unknown Staff'}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{report.category.replace(/_/g, ' ')}</p>
                          {report.specificItem && <p className="text-xs font-medium text-slate-500 mt-0.5">{report.specificItem}</p>}
                          <p className="mt-2 text-xs text-slate-600 break-words max-w-xs">{report.description}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-2">
                            <Badge variant={getStatusBadgeVariant(report.status)}>
                              {report.status}
                            </Badge>
                            {report.urgency === 'Urgent' && (
                              <Badge variant="danger" className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Urgent
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-xs space-y-1.5 text-slate-500">
                          <p><span className="font-semibold text-slate-700">Raised:</span> {new Date(report.createdAt).toLocaleDateString()}</p>
                          {report.acknowledgedAt && <p><span className="font-semibold text-slate-700">Ack'd:</span> {new Date(report.acknowledgedAt).toLocaleDateString()}</p>}
                          {report.resolvedAt && <p><span className="font-semibold text-slate-700">Resolved:</span> {new Date(report.resolvedAt).toLocaleDateString()}</p>}
                        </td>
                        <td className="px-6 py-4 text-xs italic text-slate-600 max-w-xs break-words">
                          {report.resolutionNote || '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-2">
                            {(report.status === 'Pending' || report.status === 'Acknowledged') && (
                              <Button
                                size="sm"
                                variant={report.status === 'Acknowledged' ? 'outline' : 'primary'}
                                onClick={() => handleAcknowledge(report._id)}
                                disabled={report.status === 'Acknowledged'}
                              >
                                {report.status === 'Acknowledged' ? 'Ack\'d' : 'Acknowledge'}
                              </Button>
                            )}
                            {report.status === 'Acknowledged' && (
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => handleOpenResolveModal(report._id)}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolve Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Resolve Report</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleResolve} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Resolution Note (Optional)</label>
                <textarea
                  rows={4}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Details about how this was resolved..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus-visible:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  disabled={resolving}
                  isLoading={resolving}
                  icon={CheckCircle2}
                >
                  Confirm Resolve
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffReports;
