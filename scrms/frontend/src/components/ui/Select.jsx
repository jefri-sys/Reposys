import React, { forwardRef } from 'react';

export const Select = forwardRef(({ 
  label, 
  error, 
  options = [], 
  className = '', 
  children,
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`
          w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 
          focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20 focus-visible:border-sky-500
          disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 transition-colors shadow-sm
          ${error ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20' : 'border-slate-200'}
          ${className}
        `}
        aria-invalid={!!error}
        {...props}
      >
        {children ? children : options.map((option, idx) => (
          <option key={idx} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-sm text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
});
Select.displayName = 'Select';
