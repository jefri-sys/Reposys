import { startTransition, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ArrowLeft, Search, Package2, AlertCircle, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import InventoryStockEditDialog from '../../components/inventory/InventoryStockEditDialog';
import {
  INVENTORY_CATEGORIES,
  formatInventoryDateTime,
  getInventoryStatusLabel,
  getInventoryStockClass,
  getInventoryUpdaterName,
} from '../../utils/inventory';
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
  Badge,
  StatCard
} from '../../components/ui';

const STOCK_FILTER_OPTIONS = [
  { value: 'All', label: 'All Stock Levels' },
  { value: 'BelowThreshold', label: 'Below Threshold' },
  { value: 'GettingLow', label: 'Getting Low' },
  { value: 'Healthy', label: 'Healthy' },
];

const getStatusBadgeVariant = (statusLabel) => {
  if (statusLabel === 'Depleted' || statusLabel === 'Critical') return 'danger';
  if (statusLabel === 'Low Stock' || statusLabel === 'Warning') return 'warning';
  return 'success';
};

const InventoryManagement = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [stockFilter, setStockFilter] = useState('All');
  const [isSaving, setIsSaving] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [consumptionLogs, setConsumptionLogs] = useState([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const loadInventory = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.get('/inventory');
      startTransition(() => {
        setItems(Array.isArray(response.data?.items) ? response.data.items : []);
      });
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Could not load inventory items.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConsumptionLogs = async () => {
    setIsLogsLoading(true);
    try {
      const response = await api.get('/admin/activity-logs', {
        params: {
          actionType: 'INVENTORY_AUTO_DEDUCT',
          limit: 50
        }
      });
      startTransition(() => {
        setConsumptionLogs(Array.isArray(response.data?.logs) ? response.data.logs : []);
      });
    } catch (err) {
      console.error('Failed to load consumption logs:', err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
    loadConsumptionLogs();
  }, []);

  const handleUpdateStock = async (nextStock) => {
    if (!selectedItem || nextStock < 0 || isSaving) {
      return;
    }

    setIsSaving(true);
    setUpdateError('');
    setSuccessMessage('');

    try {
      const response = await api.patch(`/inventory/${selectedItem._id}/update`, {
        currentStock: nextStock,
      });
      const updatedItem = response.data?.item;

      startTransition(() => {
        setItems((currentItems) => currentItems.map((item) => (
          String(item._id) === String(updatedItem?._id) ? updatedItem : item
        )));
      });
      setSuccessMessage(`Updated ${updatedItem?.name || selectedItem.name} successfully.`);
      setSelectedItem(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (saveError) {
      setUpdateError(saveError.response?.data?.message || 'Could not update this stock item.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalItems = items.length;
  const itemsBelowThreshold = items.filter((item) => Number(item.currentStock) <= Number(item.minimumThreshold)).length;
  const itemsGettingLow = items.filter((item) => (
    Number(item.currentStock) > Number(item.minimumThreshold)
    && Number(item.currentStock) <= Number(item.minimumThreshold) * 2
  )).length;

  const filteredItems = useMemo(() => {
    const searchValue = searchInput.trim().toLowerCase();

    return items.filter((item) => {
      const currentStock = Number(item.currentStock);
      const minimumThreshold = Number(item.minimumThreshold);
      const matchesSearch = !searchValue
        || item.name?.toLowerCase().includes(searchValue)
        || item.category?.toLowerCase().includes(searchValue)
        || item.unit?.toLowerCase().includes(searchValue)
        || getInventoryUpdaterName(item).toLowerCase().includes(searchValue);
      const matchesStock = stockFilter === 'All'
        || (stockFilter === 'BelowThreshold' && currentStock <= minimumThreshold)
        || (stockFilter === 'GettingLow' && currentStock > minimumThreshold && currentStock <= minimumThreshold * 2)
        || (stockFilter === 'Healthy' && currentStock > minimumThreshold * 2);

      return matchesSearch && matchesStock;
    });
  }, [items, searchInput, stockFilter]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Inventory Management"
          description="Track paper, toner, and binding supplies, review forecast fields, and correct stock levels."
          actions={
            <Button as={Link} to="/admin" variant="outline" icon={ArrowLeft}>
              Back to Admin
            </Button>
          }
        />

        {successMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Total Tracking Items"
            value={totalItems}
            icon={Package2}
            variant="default"
          />
          <StatCard
            title="Below Minimum Threshold"
            value={itemsBelowThreshold}
            icon={AlertTriangle}
            variant="danger"
          />
          <StatCard
            title="Getting Low"
            value={itemsGettingLow}
            icon={AlertCircle}
            variant="warning"
          />
        </div>

        <Card>
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle>Inventory Explorer</CardTitle>
          </CardHeader>
          <div className="p-4 bg-slate-50/50 border-b border-slate-100">
            <div className="grid gap-4 md:grid-cols-2 lg:w-2/3">
              <Input
                icon={Search}
                placeholder="Search inventory items..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                options={STOCK_FILTER_OPTIONS}
              />
            </div>
          </div>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12">
                <LoadingState message="Loading inventory database..." />
              </div>
            ) : (
              <div className="flex flex-col">
                {INVENTORY_CATEGORIES.map((category) => {
                  const categoryItems = filteredItems.filter((item) => item.category === category);

                  if (categoryItems.length === 0 && searchInput) return null;

                  return (
                    <div key={category} className="border-b border-slate-100 last:border-0">
                      <div className="bg-slate-50/80 px-6 py-3 flex items-center gap-2 border-b border-slate-100">
                        <Package2 className="h-4 w-4 text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{category}</h3>
                        <Badge variant="secondary" className="ml-2">{categoryItems.length}</Badge>
                      </div>

                      {categoryItems.length === 0 ? (
                        <div className="px-6 py-8">
                          <EmptyState
                            title={`No ${category} items`}
                            description="No items found in this category matching your filters."
                          />
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-left text-sm">
                            <thead className="bg-white text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                              <tr>
                                <th className="px-6 py-4 whitespace-nowrap">Item Name</th>
                                <th className="px-6 py-4 whitespace-nowrap">Current Stock</th>
                                <th className="px-6 py-4 whitespace-nowrap">Min Threshold</th>
                                <th className="px-6 py-4 whitespace-nowrap">Days Left</th>
                                <th className="px-6 py-4 whitespace-nowrap">Usage Rate</th>
                                <th className="px-6 py-4 whitespace-nowrap">Last Updated</th>
                                <th className="px-6 py-4 text-center whitespace-nowrap">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {categoryItems.map((item) => {
                                const statusLabel = getInventoryStatusLabel(item);

                                return (
                                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                      <div className="font-bold text-slate-900">{item.name}</div>
                                      <div className="text-xs text-slate-500 mt-0.5">{item.unit}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900">{item.currentStock}</span>
                                        <Badge variant={getStatusBadgeVariant(statusLabel)} className="text-[10px]">
                                          {statusLabel}
                                        </Badge>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{item.minimumThreshold}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                      {item.daysOfStockRemaining !== 'N/A' ? (
                                        <span className={item.daysOfStockRemaining < 7 ? 'text-red-600 font-semibold' : ''}>
                                          {item.daysOfStockRemaining} days
                                        </span>
                                      ) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                      {item.usageRate > 0 ? `${item.usageRate}/day` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-sm text-slate-700">{formatInventoryDateTime(item.lastUpdatedAt)}</div>
                                      <div className="text-xs text-slate-500 mt-0.5">by {getInventoryUpdaterName(item)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedItem(item);
                                          setUpdateError('');
                                        }}
                                      >
                                        Edit Stock
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <CardTitle>Consumption History</CardTitle>
              <CardDescription>Recent automatic deductions from completed orders.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadConsumptionLogs}
              disabled={isLogsLoading}
              icon={RefreshCw}
              className={isLogsLoading ? 'animate-pulse' : ''}
            >
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLogsLoading && consumptionLogs.length === 0 ? (
              <div className="p-8">
                <LoadingState message="Loading history..." />
              </div>
            ) : consumptionLogs.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No deductions yet"
                  description="Automatic inventory deductions will appear here when orders are completed."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 whitespace-nowrap">Time</th>
                      <th className="px-6 py-4 whitespace-nowrap">Order Token</th>
                      <th className="px-6 py-4 whitespace-nowrap">Item</th>
                      <th className="px-6 py-4 whitespace-nowrap">Deducted</th>
                      <th className="px-6 py-4 whitespace-nowrap">Stock Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {consumptionLogs.map((log) => {
                      const m = log.metadata || {};
                      return (
                        <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                            {formatInventoryDateTime(log.timestamp)}
                          </td>
                          <td className="px-6 py-4 font-bold text-blue-600">
                            #{m.tokenNumber || 'N/A'}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {m.itemName || 'Unknown Item'}
                          </td>
                          <td className="px-6 py-4 text-red-600 font-bold">
                            -{m.quantityDeducted || 0}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-slate-500 line-through">{m.previousStock || 0}</span>
                              <ArrowLeft className="h-3 w-3 text-slate-400 rotate-180" />
                              <span className="font-bold text-slate-900">{m.newStock || 0}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <InventoryStockEditDialog
        item={selectedItem}
        isSaving={isSaving}
        error={updateError}
        onClose={() => {
          setSelectedItem(null);
          setUpdateError('');
        }}
        onConfirm={handleUpdateStock}
      />
    </div>
  );
};

export default InventoryManagement;
