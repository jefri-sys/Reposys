import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, Input } from '../ui';

const InventoryStockEditDialog = ({
  item,
  isSaving = false,
  error = '',
  onClose,
  onConfirm,
}) => {
  const [currentStock, setCurrentStock] = useState('');

  useEffect(() => {
    setCurrentStock(item ? String(item.currentStock ?? 0) : '');
  }, [item?._id, item?.currentStock]);

  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 sm:p-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close stock editor"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Update Inventory</p>
        <h2 className="text-2xl font-bold text-slate-900">{item.name}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Current stock is tracked in <span className="font-semibold">{item.unit}</span>. Enter the new stock level and confirm the update.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-6">
          <Input
            label="Current Stock"
            type="number"
            min="0"
            value={currentStock}
            onChange={(event) => setCurrentStock(event.target.value)}
            placeholder={`Enter amount in ${item.unit}`}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Threshold</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{item.minimumThreshold} {item.unit}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Category</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{item.category}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            disabled={isSaving || currentStock === ''}
            isLoading={isSaving}
            onClick={() => onConfirm?.(Number(currentStock))}
          >
            Confirm Update
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InventoryStockEditDialog;
