import React from 'react';

export const StatCard = ({ title, value, icon: Icon, variant = 'default', className = '' }) => {
  const variants = {
    default: 'border-slate-200 bg-white text-slate-900',
    primary: 'border-sky-200 bg-sky-50 text-sky-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900',
  };

  const iconVariants = {
    default: 'text-slate-500',
    primary: 'text-sky-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
  };

  const textVariants = {
    default: 'text-slate-500',
    primary: 'text-sky-700',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-rose-700',
  };

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${variants[variant]} ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-bold uppercase tracking-wider ${textVariants[variant]}`}>
          {title}
        </h3>
        {Icon && <Icon className={`h-5 w-5 ${iconVariants[variant]}`} />}
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
};
