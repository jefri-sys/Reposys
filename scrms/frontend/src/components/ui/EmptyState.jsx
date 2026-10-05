import React from 'react';

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className = '' 
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center border border-slate-200 border-dashed rounded-xl bg-slate-50/50 ${className}`}>
      {Icon && (
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Icon className="h-6 w-6 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-slate-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-slate-500 max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}
