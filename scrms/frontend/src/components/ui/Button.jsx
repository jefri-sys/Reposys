import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  icon: Icon,
  className = '',
  disabled,
  as: Component = 'button',
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg active:scale-[0.98]";
  
  const variants = {
    primary: "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500 border border-transparent shadow-sm",
    secondary: "bg-slate-800 text-white hover:bg-slate-900 focus-visible:ring-slate-900 border border-transparent shadow-sm",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-slate-200 shadow-sm",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-200 border border-transparent",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 border border-transparent shadow-sm",
    dangerOutline: "border border-red-200 bg-white text-red-600 hover:bg-red-50 focus-visible:ring-red-200 shadow-sm"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base"
  };

  return (
    <Component 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={Component === 'button' ? (disabled || isLoading) : undefined}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!isLoading && Icon && <Icon className="mr-2 h-4 w-4" />}
      {children}
    </Component>
  );
}
