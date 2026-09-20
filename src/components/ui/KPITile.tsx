import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KPITileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // e.g. +12.5 or -3.2%
  trendLabel?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  badge?: string;
  className?: string;
  onClick?: () => void;
}

export function KPITile({
  title,
  value,
  subtitle,
  trend,
  trendLabel = 'vs yesterday',
  icon,
  iconBg,
  badge,
  className,
  onClick,
}: KPITileProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700/80 flex flex-col justify-between min-h-[110px] shadow-xs',
        onClick ? 'cursor-pointer' : '',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
          {title}
        </p>
        {icon && (
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/80 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-105',
              iconBg
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {value}
        </h3>

        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium">
          {trend !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                isPositive && 'text-emerald-600 dark:text-emerald-400',
                isNegative && 'text-rose-600 dark:text-rose-400',
                !isPositive && !isNegative && 'text-slate-500 dark:text-slate-400'
              )}
            >
              {isPositive && <TrendingUp className="h-2.5 w-2.5" />}
              {isNegative && <TrendingDown className="h-2.5 w-2.5" />}
              {!isPositive && !isNegative && <Minus className="h-2.5 w-2.5" />}
              {isPositive ? `+${trend}%` : `${trend}%`}
            </span>
          )}

          {trendLabel && trend !== undefined && (
            <span className="text-slate-500 dark:text-slate-400">{trendLabel}</span>
          )}

          {subtitle && trend === undefined && (
            <span className="text-blue-600 dark:text-blue-400 truncate">{subtitle}</span>
          )}

          {badge && (
            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
