import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message = "Loading...", className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-sky-600 mb-4" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}
