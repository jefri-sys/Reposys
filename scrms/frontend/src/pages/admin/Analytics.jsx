import React, { startTransition, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { LogOut, ArrowLeft, Download, FileText, Search, AlertCircle, Star } from 'lucide-react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContextObject';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Select,
  PageHeader,
  LoadingState,
  EmptyState,
  Badge
} from '../../components/ui';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

const TAB_CONFIGS = [
  { key: 'daily-orders', label: 'Daily Orders' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'service-breakdown', label: 'Service Breakdown' },
  { key: 'peak-hours', label: 'Peak Hours' },
  { key: 'staff-performance', label: 'Staff Performance' },
  { key: 'payment-breakdown', label: 'Payment Breakdown' },
  { key: 'ratings', label: 'Ratings' },
];

const SERVICE_TYPES = ['Printing', 'Photocopying', 'Scanning', 'Binding'];
const SERVICE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316'];
const PAYMENT_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#94a3b8'];

const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
  };
};

const buildQueryParams = (startDate, endDate) => new URLSearchParams({
  startDate: `${startDate}T00:00:00.000`,
  endDate: `${endDate}T23:59:59.999`,
}).toString();

const parseFilename = (headerValue, fallback) => {
  const match = headerValue?.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
};

const formatCellValue = (value) => {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : value.toFixed(2);
  }

  return value ?? '-';
};

const toServiceBreakdownRows = (data = {}) => SERVICE_TYPES.map((serviceType) => ({
  serviceType,
  count: data[serviceType] || 0,
}));

const toPaymentBreakdownRows = (data = {}) => [
  { method: 'Online', status: 'Paid', count: data?.online?.paid || 0 },
  { method: 'Online', status: 'Failed', count: data?.online?.failed || 0 },
  { method: 'Online', status: 'Refunded', count: data?.online?.refunded || 0 },
  { method: 'Cash', status: 'Paid', count: data?.cash?.paid || 0 },
  { method: 'Cash', status: 'Pending', count: data?.cash?.pending || 0 },
  { method: 'Wallet', status: 'Paid', count: data?.wallet?.paid || 0 },
  { method: 'Wallet', status: 'Refunded', count: data?.wallet?.refunded || 0 },
];

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        usePointStyle: true,
        padding: 20,
        font: {
          family: "'Inter', sans-serif",
          size: 13,
        }
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleFont: { family: "'Inter', sans-serif", size: 14 },
      bodyFont: { family: "'Inter', sans-serif", size: 13 },
      padding: 12,
      cornerRadius: 8,
    }
  },
};

const buildTabContent = (tabKey, rawData) => {
  switch (tabKey) {
    case 'daily-orders': {
      const rows = Array.isArray(rawData) ? rawData : [];
      return {
        chart: (
          <Bar
            options={{
              ...CHART_OPTIONS,
              scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true, border: { dash: [4, 4] } },
              },
            }}
            data={{
              labels: rows.map((row) => row.date),
              datasets: SERVICE_TYPES.map((serviceType, index) => ({
                label: serviceType,
                data: rows.map((row) => row[serviceType] || 0),
                backgroundColor: SERVICE_COLORS[index],
                borderRadius: 4,
              })),
            }}
          />
        ),
        headers: ['date', ...SERVICE_TYPES, 'total'],
        rows,
      };
    }
    case 'revenue': {
      const rows = Array.isArray(rawData) ? rawData : [];
      return {
        chart: (
          <Line
            options={{
              ...CHART_OPTIONS,
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, border: { dash: [4, 4] } },
              },
            }}
            data={{
              labels: rows.map((row) => row.date),
              datasets: [{
                label: 'Revenue (₹)',
                data: rows.map((row) => row.revenue),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                borderWidth: 2,
              }],
            }}
          />
        ),
        headers: ['date', 'revenue'],
        rows,
      };
    }
    case 'service-breakdown': {
      const rows = toServiceBreakdownRows(rawData);
      return {
        chart: (
          <Doughnut
            options={{...CHART_OPTIONS, cutout: '65%'}}
            data={{
              labels: rows.map((row) => row.serviceType),
              datasets: [{
                label: 'Orders',
                data: rows.map((row) => row.count),
                backgroundColor: SERVICE_COLORS,
                borderWidth: 0,
              }],
            }}
          />
        ),
        headers: ['serviceType', 'count'],
        rows,
      };
    }
    case 'peak-hours': {
      const rows = Array.isArray(rawData) ? rawData : [];
      return {
        chart: (
          <Bar
            options={{
              ...CHART_OPTIONS,
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, border: { dash: [4, 4] } },
              },
            }}
            data={{
              labels: rows.map((row) => `${String(row.hour).padStart(2, '0')}:00`),
              datasets: [{
                label: 'Orders',
                data: rows.map((row) => row.count),
                backgroundColor: '#10b981',
                borderRadius: 4,
              }],
            }}
          />
        ),
        headers: ['hour', 'count'],
        rows: rows.map((row) => ({
          hour: `${String(row.hour).padStart(2, '0')}:00`,
          count: row.count,
        })),
      };
    }
    case 'staff-performance': {
      const rows = Array.isArray(rawData) ? rawData : [];
      return {
        chart: (
          <Bar
            options={{
              ...CHART_OPTIONS,
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, border: { dash: [4, 4] } },
              },
              indexAxis: 'y',
            }}
            data={{
              labels: rows.map((row) => row.staffName),
              datasets: [{
                label: 'Average Minutes per Order',
                data: rows.map((row) => row.avgMinutes),
                backgroundColor: '#8b5cf6',
                borderRadius: 4,
              }],
            }}
          />
        ),
        headers: ['staffName', 'orderCount', 'avgMinutes'],
        rows,
      };
    }
    case 'payment-breakdown': {
      const rows = toPaymentBreakdownRows(rawData);
      return {
        chart: (
          <Doughnut
            options={{...CHART_OPTIONS, cutout: '65%'}}
            data={{
              labels: rows.map((row) => `${row.method} ${row.status}`),
              datasets: [{
                label: 'Payments',
                data: rows.map((row) => row.count),
                backgroundColor: PAYMENT_COLORS,
                borderWidth: 0,
              }],
            }}
          />
        ),
        headers: ['method', 'status', 'count'],
        rows,
      };
    }
    default:
      return { chart: null, headers: [], rows: [] };
  }
};

const DataTable = ({ headers, rows }) => {
  const [searchInput, setSearchInput] = useState('');
  const filteredRows = useMemo(() => {
    const searchValue = searchInput.trim().toLowerCase();

    if (!searchValue) {
      return rows;
    }

    return rows.filter((row) => (
      headers.some((header) => String(row[header] ?? '').toLowerCase().includes(searchValue))
    ));
  }, [headers, rows, searchInput]);

  return (
    <Card className="mt-6 flex flex-col h-[500px]">
      <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>Data Table</CardTitle>
          <div className="w-full md:w-80">
            <Input
              icon={Search}
              placeholder="Search table values..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white sticky top-0 z-10 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-sm">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-6 py-4 bg-white whitespace-nowrap">
                    {header.replace(/([A-Z])/g, ' $1').trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(headers.length, 1)} className="p-10">
                    <EmptyState 
                      title="No data found"
                      description="No data matched the current table search."
                      icon={Search}
                    />
                  </td>
                </tr>
              ) : filteredRows.map((row, rowIndex) => (
                <tr key={`${headers[0]}-${rowIndex}`} className="hover:bg-slate-50 transition-colors">
                  {headers.map((header) => (
                    <td key={`${header}-${rowIndex}`} className="px-6 py-4 text-slate-700">
                      {formatCellValue(row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const Analytics = () => {
  const { logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('daily-orders');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [reportData, setReportData] = useState([]);
  const [ratingsSearchInput, setRatingsSearchInput] = useState('');
  const [ratingsServiceFilter, setRatingsServiceFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingFormat, setDownloadingFormat] = useState('');

  useEffect(() => {
    let isCancelled = false;

    const fetchReport = async () => {
      setLoading(true);
      setError('');

      try {
        let response;
        if (activeTab === 'ratings') {
          response = await api.get('/admin/ratings/summary');
        } else {
          const query = buildQueryParams(dateRange.startDate, dateRange.endDate);
          response = await api.get(`/admin/reports/${activeTab}?${query}`);
        }

        if (!isCancelled) {
          startTransition(() => {
            setReportData(response.data);
          });
        }
      } catch (fetchError) {
        if (!isCancelled) {
          console.error('Failed to fetch analytics report', fetchError);
          setError('Could not load analytics data for this report.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, dateRange.endDate, dateRange.startDate]);

  const handleDateChange = (event) => {
    const { name, value } = event.target;
    setDateRange((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleExport = async (format) => {
    setDownloadingFormat(format);

    try {
      const query = buildQueryParams(dateRange.startDate, dateRange.endDate);
      const response = await api.get(`/admin/reports/export?type=${activeTab}&format=${format}&${query}`, {
        responseType: 'blob',
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = parseFilename(
        response.headers['content-disposition'],
        `reposys-${activeTab}.${format === 'pdf' ? 'pdf' : 'csv'}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      console.error('Failed to export report', downloadError);
      setError('Could not export the selected report.');
    } finally {
      setDownloadingFormat('');
    }
  };

  const { chart, headers, rows } = buildTabContent(activeTab, reportData);
  const flaggedRatings = useMemo(
    () => (Array.isArray(reportData?.flaggedRatings) ? reportData.flaggedRatings : []),
    [reportData]
  );
  const flaggedRatingServices = useMemo(() => {
    const services = ['All'];
    flaggedRatings.forEach(rating => {
      if (rating.orderId?.serviceType && !services.includes(rating.orderId.serviceType)) {
        services.push(rating.orderId.serviceType);
      }
    });
    return services;
  }, [flaggedRatings]);
  
  const filteredFlaggedRatings = useMemo(() => {
    const searchValue = ratingsSearchInput.trim().toLowerCase();

    return flaggedRatings.filter((rating) => {
      const matchesService = ratingsServiceFilter === 'All' || rating.orderId?.serviceType === ratingsServiceFilter;
      const matchesSearch = !searchValue
        || [
          rating.orderId?.tokenNumber,
          rating.userId?.name,
          rating.userId?.email,
          rating.orderId?.serviceType,
          rating.stars,
          rating.comment,
        ].some((value) => String(value || '').toLowerCase().includes(searchValue));

      return matchesService && matchesSearch;
    });
  }, [flaggedRatings, ratingsSearchInput, ratingsServiceFilter]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader 
          title="Admin Reports"
          description="Track order volume, revenue cadence, peak production windows, and payment trends."
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

        <Card>
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <CardTitle>Date Range</CardTitle>
                <CardDescription>All charts and exports refresh when the range changes.</CardDescription>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="date"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                  label="Start Date"
                />
                <Input
                  type="date"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                  label="End Date"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {TAB_CONFIGS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-600 ring-offset-2'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <Card className="min-h-[400px] flex items-center justify-center">
            <LoadingState message="Loading report data..." />
          </Card>
        ) : activeTab === 'ratings' ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Overall Rating</p>
                  <div className="flex items-center gap-3 mt-3">
                    <p className="text-4xl font-bold text-slate-900">{reportData?.overall?.averageStars?.toFixed(1) || '0.0'}</p>
                    <Star className="h-8 w-8 text-amber-400 fill-amber-400" />
                  </div>
                  <p className="mt-2 text-sm text-slate-600 font-medium">Across {reportData?.overall?.totalRatings || 0} total ratings.</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Flagged Issues</p>
                  <p className="mt-3 text-4xl font-bold text-slate-900">{reportData?.flaggedRatings?.length || 0}</p>
                  <p className="mt-2 text-sm text-slate-600 font-medium">Ratings below 3 stars.</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Average Rating by Service</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <Bar
                    options={{ ...CHART_OPTIONS, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 5, border: { dash: [4, 4] } } } }}
                    data={{
                      labels: reportData?.serviceAverages?.map(s => s._id) || [],
                      datasets: [{
                        label: 'Avg Stars',
                        data: reportData?.serviceAverages?.map(s => s.averageStars) || [],
                        backgroundColor: '#3b82f6',
                        borderRadius: 4,
                      }],
                    }}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rating Trend (30 Days)</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <Line
                    options={{ ...CHART_OPTIONS, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 5, border: { dash: [4, 4] } } } }}
                    data={{
                      labels: reportData?.trendData?.map(t => t._id) || [],
                      datasets: [{
                        label: 'Avg Stars',
                        data: reportData?.trendData?.map(t => t.averageStars) || [],
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: '#f59e0b',
                      }],
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="flex flex-col h-[600px]">
              <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <CardTitle>Flagged Ratings (Needs Attention)</CardTitle>
                  <div className="grid gap-3 sm:grid-cols-2 w-full md:w-auto">
                    <Input
                      icon={Search}
                      placeholder="Search token, user, comment..."
                      value={ratingsSearchInput}
                      onChange={(e) => setRatingsSearchInput(e.target.value)}
                    />
                    <Select
                      value={ratingsServiceFilter}
                      onChange={(e) => setRatingsServiceFilter(e.target.value)}
                      options={flaggedRatingServices.map(s => ({ value: s, label: s === 'All' ? 'All services' : s }))}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-white sticky top-0 z-10 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 shadow-sm">
                      <tr>
                        <th className="px-6 py-4 whitespace-nowrap bg-white">Order Token</th>
                        <th className="px-6 py-4 whitespace-nowrap bg-white">User</th>
                        <th className="px-6 py-4 whitespace-nowrap bg-white">Service</th>
                        <th className="px-6 py-4 whitespace-nowrap bg-white">Stars</th>
                        <th className="px-6 py-4 bg-white">Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFlaggedRatings.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-10">
                            <EmptyState 
                              title="No flagged ratings"
                              description="No flagged ratings matched the current filters."
                            />
                          </td>
                        </tr>
                      ) : (
                        filteredFlaggedRatings.map(r => (
                          <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">{r.orderId?.tokenNumber}</td>
                            <td className="px-6 py-4 text-slate-700">
                              <div className="font-medium text-slate-900">{r.userId?.name}</div>
                              <div className="text-xs text-slate-500">{r.userId?.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary">{r.orderId?.serviceType}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                {r.stars} <Star className="h-3.5 w-3.5 fill-red-600" />
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 italic">"{r.comment || 'No comment provided'}"</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="border-b border-slate-100 pb-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      {TAB_CONFIGS.find((tab) => tab.key === activeTab)?.label}
                    </CardTitle>
                    <CardDescription>Export the current date range as CSV or PDF.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleExport('csv')}
                      disabled={Boolean(downloadingFormat)}
                      isLoading={downloadingFormat === 'csv'}
                      icon={FileText}
                    >
                      Download CSV
                    </Button>
                    <Button
                      onClick={() => handleExport('pdf')}
                      disabled={Boolean(downloadingFormat)}
                      isLoading={downloadingFormat === 'pdf'}
                      icon={Download}
                    >
                      Download PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[400px]">
                  {chart}
                </div>
              </CardContent>
            </Card>
            <DataTable headers={headers} rows={rows} />
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
