import { startTransition, useEffect, useState } from 'react';
import { PackageSearch, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import InventoryStockEditDialog from './InventoryStockEditDialog';
import {
  formatInventoryDateTime,
  getInventoryStatusLabel,
  mergeInventorySummaryItems,
} from '../../utils/inventory';
import { Card, CardHeader, CardTitle, CardContent, Badge, LoadingState, EmptyState } from '../ui';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// Reimplement getting class for badge since getInventoryStockClass returned specific tailwind classes
const getInventoryBadgeVariant = (item) => {
  if (item.currentStock === 0) return 'danger';
  if (item.currentStock < item.minimumThreshold) return 'danger';
  if (item.currentStock <= item.minimumThreshold * 1.5) return 'warning';
  return 'success';
};

const StaffInventoryPanel = () => {
  const socket = useSocket();
  const [itemsBelowThreshold, setItemsBelowThreshold] = useState([]);
  const [itemsGettingLow, setItemsGettingLow] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const loadInventorySummary = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await api.get('/inventory/summary');
      startTransition(() => {
        setItemsBelowThreshold(Array.isArray(response.data?.itemsBelowThreshold) ? response.data.itemsBelowThreshold : []);
        setItemsGettingLow(Array.isArray(response.data?.itemsGettingLow) ? response.data.itemsGettingLow : []);
      });
      setError('');
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Could not load inventory alerts.');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadInventorySummary();

    const intervalId = window.setInterval(() => {
      loadInventorySummary({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleInventoryAlert = () => {
      loadInventorySummary({ silent: true });
    };

    socket.on('inventory_alert', handleInventoryAlert);

    return () => {
      socket.off('inventory_alert', handleInventoryAlert);
    };
  }, [socket]);

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

      setSuccessMessage(`Updated ${updatedItem?.name || selectedItem.name} successfully.`);
      setSelectedItem(null);
      await loadInventorySummary({ silent: true });
      
      // Auto dismiss success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (saveError) {
      setUpdateError(saveError.response?.data?.message || 'Could not update this stock item.');
    } finally {
      setIsSaving(false);
    }
  };

  const visibleItems = mergeInventorySummaryItems(itemsBelowThreshold, itemsGettingLow);

  return (
    <>
      <Card className="border-0 shadow-sm overflow-hidden bg-white/60 backdrop-blur-md">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Inventory Quick View</p>
              <CardTitle className="text-xl">Supplies Snapshot</CardTitle>
            </div>
            {visibleItems.length > 0 && (
              <Badge variant="warning" className="text-sm px-2">
                {visibleItems.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {successMessage && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-8">
              <LoadingState message="Loading inventory alerts..." />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="py-6">
              <EmptyState 
                icon={PackageSearch} 
                title="All Stocked" 
                description="No paper, toner, or binding item is currently near its alert threshold." 
              />
            </div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => {
                    setSelectedItem(item);
                    setUpdateError('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-amber-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.currentStock} {item.unit} <span className="text-slate-400 mx-1">/</span> threshold {item.minimumThreshold}
                      </p>
                    </div>
                    <Badge variant={getInventoryBadgeVariant(item)}>
                      {getInventoryStatusLabel(item)}
                    </Badge>
                  </div>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Last updated {formatInventoryDateTime(item.lastUpdatedAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
    </>
  );
};

export default StaffInventoryPanel;
