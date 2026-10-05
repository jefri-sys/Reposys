import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent, Badge, LoadingState } from '../../components/ui';
import { Printer } from 'lucide-react';

const StaffPrinterPanel = () => {
  const [printers, setPrinters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrinters = async () => {
    try {
      const response = await api.get('/printers');
      if (response.data && response.data.success) {
        setPrinters(response.data.printers || response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load printers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  const togglePrinterActive = async (printer) => {
    try {
      await api.patch(`/printers/${printer._id}`, { isActive: !printer.isActive });
      setPrinters(prev => prev.map(p => p._id === printer._id ? { ...p, isActive: !p.isActive } : p));
    } catch (err) {
      console.error('Failed to toggle printer:', err);
    }
  };

  if (isLoading) return <div className="py-4"><LoadingState message="Loading printers..." /></div>;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm mt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 mb-1">Hardware</p>
      <h3 className="text-xl font-semibold text-slate-950 mb-4">Printer Selection</h3>
      <p className="text-sm text-slate-500 mb-4">Toggle which printers should be used by the automation engine for your shift.</p>
      
      <div className="space-y-3">
        {printers.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No printers configured by admin.</p>
        ) : (
          printers.map(printer => (
            <div key={printer._id} className="flex items-center justify-between p-3 border rounded-xl border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-700">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{printer.friendlyName}</p>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">{printer.windowsPrinterName}</span>
                    {printer.isOnline ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Online" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title="Offline" />
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => togglePrinterActive(printer)}
                className={[
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                  printer.isActive ? 'bg-emerald-500' : 'bg-slate-300',
                ].join(' ')}
              >
                <span className={[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  printer.isActive ? 'translate-x-6' : 'translate-x-1',
                ].join(' ')} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StaffPrinterPanel;
