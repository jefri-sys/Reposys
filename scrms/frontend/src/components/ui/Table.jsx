import React from 'react';

export function Table({ children, className = '', ...props }) {
  return (
    <div className="w-full overflow-x-auto border border-slate-200 rounded-lg bg-white">
      <table className={`w-full text-sm text-left ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '', ...props }) {
  return (
    <thead className={`bg-slate-50 text-slate-500 text-xs uppercase font-medium border-b border-slate-200 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '', ...props }) {
  return (
    <tbody className={`divide-y divide-slate-100 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', onClick, ...props }) {
  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <tr 
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-white hover:bg-slate-50/80 transition-colors focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 ${onClick ? 'cursor-pointer' : ''} ${className}`} 
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }) {
  return (
    <th className={`px-6 py-3 whitespace-nowrap tracking-wider ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={`px-6 py-4 text-slate-700 ${className}`} {...props}>
      {children}
    </td>
  );
}
