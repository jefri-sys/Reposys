import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Send, ClipboardList } from 'lucide-react';
import api from '../../services/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Select,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  PageHeader,
  LoadingState,
  EmptyState
} from '../../components/ui';

const STATUS_BADGE_VARIANTS = {
  Pending: 'warning',
  Acknowledged: 'primary',
  Resolved: 'success'
};

const StaffReports = () => {
  const [reports, setReports] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form State
  const [category, setCategory] = useState('');
  const [specificItem, setSpecificItem] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Normal');
  const [linkedInventoryItemId, setLinkedInventoryItemId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchInventory();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (urgencyFilter) params.set('urgency', urgencyFilter);
      if (searchInput.trim()) params.set('search', searchInput.trim());
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/staff-reports${query}`);
      setReports(response.data.reports || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setInventory(response.data.inventory || []);
    } catch (err) {
      console.error('Failed to load inventory for dropdown', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [searchInput, statusFilter, urgencyFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    if (!category || !description) {
      setError('Category and Description are required.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        category,
        specificItem,
        description,
        urgency,
      };
      if (linkedInventoryItemId) {
        payload.linkedInventoryItemId = linkedInventoryItemId;
      }

      const response = await api.post('/staff-reports', payload);
      setMessage(`Report successfully submitted. Ref: ${response.data.reportRef}`);
      setCategory('');
      setSpecificItem('');
      setDescription('');
      setUrgency('Normal');
      setLinkedInventoryItemId('');
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader 
          title="Staff Reports"
          description="Raise issues and track their resolution status."
          actions={
            <Button as={Link} to="/staff" variant="outline" icon={ArrowLeft}>
              Back to Dashboard
            </Button>
          }
        />

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
            {message}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Raise New Report</CardTitle>
            <CardDescription>Submit a new issue report for administration.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Select
                  label="Category *"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: '', label: 'Select Category' },
                    { value: 'Low_Stock', label: 'Low Stock' },
                    { value: 'Low_Ink', label: 'Low Ink' },
                    { value: 'Equipment_Fault', label: 'Equipment Fault' },
                    { value: 'Maintenance_Required', label: 'Maintenance Required' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Severity / Urgency</label>
                  <div className="flex h-[42px] overflow-hidden rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setUrgency('Normal')}
                      className={`flex-1 text-sm font-semibold transition-colors ${urgency === 'Normal' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgency('Urgent')}
                      className={`flex-1 text-sm font-semibold transition-colors ${urgency === 'Urgent' ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      Urgent
                    </button>
                  </div>
                </div>

                <Input
                  label="Specific Item (Optional)"
                  type="text"
                  value={specificItem}
                  onChange={(e) => setSpecificItem(e.target.value)}
                  placeholder="e.g. Printer A, Main door"
                />

                <Select
                  label="Link Inventory Item (Optional)"
                  value={linkedInventoryItemId}
                  onChange={(e) => setLinkedInventoryItemId(e.target.value)}
                  options={[
                    { value: '', label: '-- No linked item --' },
                    ...inventory.map(item => ({
                      value: item._id,
                      label: `${item.name} (${item.currentStock} ${item.unit} left)`
                    }))
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description * <span className="float-right font-normal text-xs text-slate-500">{description.length}/500</span>
                </label>
                <textarea
                  required
                  maxLength={500}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed description of the issue..."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  isLoading={submitting}
                  icon={!submitting ? Send : undefined}
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>My Reports</CardTitle>
                <CardDescription>Track the status of your submitted reports.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Search ref, category, note..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full sm:w-64"
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Acknowledged', label: 'Acknowledged' },
                    { value: 'Resolved', label: 'Resolved' },
                  ]}
                  className="w-full sm:w-40"
                />
                <Select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Urgencies' },
                    { value: 'Normal', label: 'Normal' },
                    { value: 'Urgent', label: 'Urgent' },
                  ]}
                  className="w-full sm:w-40"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12">
                <LoadingState message="Loading reports..." />
              </div>
            ) : reports.length === 0 ? (
              <div className="py-12">
                <EmptyState 
                  icon={ClipboardList}
                  title="No reports found"
                  description="You haven't submitted any reports matching the filters."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Ref</TableHead>
                      <TableHead>Category / Item</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Raised</TableHead>
                      <TableHead>Resolution Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report._id}>
                        <TableCell className="font-semibold text-slate-900">{report.reportRef}</TableCell>
                        <TableCell>
                          <p className="font-medium text-slate-900">{report.category.replace(/_/g, ' ')}</p>
                          {report.specificItem && <p className="text-xs text-slate-500 mt-0.5">{report.specificItem}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.urgency === 'Urgent' ? 'danger' : 'secondary'}>
                            {report.urgency}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE_VARIANTS[report.status] || 'secondary'}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-slate-600 text-sm" title={report.resolutionNote}>
                          {report.resolutionNote || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffReports;
