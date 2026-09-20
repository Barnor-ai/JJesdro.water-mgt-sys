import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'secondary',
  size = 'md',
  children,
  className,
  ...props
}: BadgeProps) {
  const variants = {
    primary:
      'bg-blue-600/15 text-blue-400 border border-blue-500/30',
    secondary:
      'bg-slate-800 text-slate-300 border border-slate-700/60',
    success:
      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    warning:
      'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    danger:
      'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    info: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
    outline: 'border border-slate-700 text-slate-300 bg-transparent',
  };

  const sizes = {
    sm: 'text-[9px] font-semibold px-2 py-0.5 rounded',
    md: 'text-[11px] font-semibold px-2.5 py-0.5 rounded-md',
    lg: 'text-xs font-semibold px-3 py-1 rounded-md',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center tracking-normal font-sans',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
