import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`px-6 py-5 border-b border-slate-100 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-lg font-semibold text-slate-900 ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-sm text-slate-500 mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', noPadding = false, ...props }) {
  return (
    <div className={`${noPadding ? '' : 'p-6'} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center ${className}`} {...props}>
      {children}
    </div>
  );
}
