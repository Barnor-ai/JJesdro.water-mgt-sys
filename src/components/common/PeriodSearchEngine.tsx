import React from 'react';
import {
  Search,
  Calendar,
  X,
  Filter,
  RotateCcw,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { PERIOD_OPTIONS, PeriodOption, getPeriodDateLabel } from '../../lib/dateUtils';
import { Badge } from '../ui/Badge';

export interface PeriodSearchEngineProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  period: string;
  onPeriodChange: (period: string) => void;
  customStartDate?: string;
  onCustomStartDateChange?: (date: string) => void;
  customEndDate?: string;
  onCustomEndDateChange?: (date: string) => void;
  resultsCount?: number;
  resultsLabel?: string;
  extraFilters?: React.ReactNode;
  onReset?: () => void;
  className?: string;
  showQuickPresets?: boolean;
}

export function PeriodSearchEngine({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search by keyword, product, SKU, reference...',
  period,
  onPeriodChange,
  customStartDate = '',
  onCustomStartDateChange,
  customEndDate = '',
  onCustomEndDateChange,
  resultsCount,
  resultsLabel = 'items',
  extraFilters,
  onReset,
  className = '',
  showQuickPresets = true,
}: PeriodSearchEngineProps) {
  const isCustom = period === 'Custom Date Range';
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    period !== 'All Time' ||
    Boolean(customStartDate) ||
    Boolean(customEndDate);

  const quickPresets: { id: PeriodOption; label: string }[] = [
    { id: 'All Time', label: 'All Time' },
    { id: 'Today', label: 'Day' },
    { id: 'This Week', label: 'Weekly' },
    { id: 'This Month', label: 'Monthly' },
    { id: 'This Quarter', label: 'Quarterly' },
    { id: 'This Year', label: 'Annual' },
    { id: 'Custom Date Range', label: 'Custom Range' },
  ];

  const handleReset = () => {
    onSearchChange('');
    onPeriodChange('All Time');
    if (onCustomStartDateChange) onCustomStartDateChange('');
    if (onCustomEndDateChange) onCustomEndDateChange('');
    if (onReset) onReset();
  };

  const periodLabel = getPeriodDateLabel(period, customStartDate, customEndDate);

  return (
    <div
      className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 transition-all ${className}`}
    >
      {/* Top Search & Primary Period Dropdown Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Keyword Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Period Selector & Extra Filters */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Period Dropdown */}
          <div className="relative min-w-[190px] flex-1 sm:flex-none">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all appearance-none cursor-pointer"
            >
              <option value="All Time">📅 All Time (Cumulative)</option>
              <option value="Today">📅 Day (Today)</option>
              <option value="This Week">📅 Weekly (This Week)</option>
              <option value="This Month">📅 Monthly (This Month)</option>
              <option value="Previous Month">📅 Previous Month</option>
              <option value="This Quarter">📅 Quarterly (This Quarter)</option>
              <option value="Previous Quarter">📅 Previous Quarter</option>
              <option value="This Year">📅 Annual (This Year)</option>
              <option value="Previous Year">📅 Previous Year</option>
              <option value="Custom Date Range">📅 Custom Date Range (Search Period)</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Slot for Category / Warehouse / Transaction Type filters */}
          {extraFilters}

          {/* Reset button when filters are active */}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0"
              title="Reset all period and search filters"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Range Pickers (Visible when 'Custom Date Range' is selected) */}
      {isCustom && (
        <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 flex flex-wrap items-center gap-3 animate-fadeIn text-xs">
          <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300 font-bold shrink-0">
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            <span>Custom Period Range:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px]">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange && onCustomStartDateChange(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px]">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomEndDateChange && onCustomEndDateChange(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Presets Pills & Active Period Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        {/* Quick Clickable Period Pills */}
        {showQuickPresets && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-2.5 h-2.5" /> Quick Periods:
            </span>
            {quickPresets.map((preset) => {
              const active = period === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => onPeriodChange(preset.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-sky-500 text-white shadow-xs font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Active Period & Count Summary */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono ml-auto">
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-sans font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <strong className="text-slate-900 dark:text-white">{periodLabel}</strong>
          </span>
          {resultsCount !== undefined && (
            <Badge variant="outline" size="sm" className="font-mono text-[10px]">
              {resultsCount} {resultsLabel}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
