import React from 'react';

export function StatusIndicator({ status, label, className = '' }) {
  const statusConfig = {
    online: "bg-emerald-500",
    offline: "bg-slate-300",
    busy: "bg-red-500",
    away: "bg-amber-500",
    active: "bg-sky-500"
  };

  const bgColor = statusConfig[status] || statusConfig.offline;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        {(status === 'online' || status === 'active') && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bgColor}`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${bgColor}`}></span>
      </span>
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
    </div>
  );
}
