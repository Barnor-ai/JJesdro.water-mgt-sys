/**
 * Date and Period filtering utilities for Inventory, Stock Summary, and Financials
 */
import { formatDate } from './utils';

export type PeriodOption =
  | 'All Time'
  | 'Today'
  | 'This Week'
  | 'This Month'
  | 'This Quarter'
  | 'This Year'
  | 'Previous Month'
  | 'Previous Quarter'
  | 'Previous Year'
  | 'Custom Date Range';

export const PERIOD_OPTIONS: PeriodOption[] = [
  'All Time',
  'Today',
  'This Week',
  'This Month',
  'This Quarter',
  'This Year',
  'Previous Month',
  'Previous Quarter',
  'Previous Year',
  'Custom Date Range',
];

/**
 * Checks if a date matches a search query representing a period (month, year, quarter, YYYY-MM, etc.)
 */
export function isDateMatchingPeriodQuery(dateStr?: string, query?: string): boolean {
  if (!query || !query.trim()) return true;
  if (!dateStr) return false;

  const q = query.trim().toLowerCase();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  // Direct date substring check (e.g. "2026-08", "2026", "2026-08-22", "08-22")
  if (dateStr.toLowerCase().includes(q)) return true;

  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const m = d.getMonth();
  const monthName = months[m];
  const shortMonthName = shortMonths[m];
  const yearStr = d.getFullYear().toString();
  const quarterNum = Math.floor(m / 3) + 1;

  // Match month name e.g. "august", "aug", "sep", "september 2026"
  if (monthName.includes(q) || shortMonthName.includes(q)) return true;
  if (`${monthName} ${yearStr}`.includes(q) || `${shortMonthName} ${yearStr}`.includes(q)) return true;

  // Match quarter: e.g. "q3", "q3 2026", "quarter 3"
  if (
    q === `q${quarterNum}` ||
    q === `q${quarterNum} ${yearStr}` ||
    q === `quarter ${quarterNum}` ||
    q === `quarter${quarterNum}`
  ) {
    return true;
  }

  // Match year: e.g. "2026"
  if (yearStr === q) return true;

  return false;
}

/**
 * Checks if a given ISO date or date string falls within the selected period.
 */
export function isDateInPeriod(
  dateStr?: string,
  period: string = 'All Time',
  customStart?: string,
  customEnd?: string
): boolean {
  if (!dateStr) return false;
  if (!period || period === 'All Time') return true;

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();

  // Normalize today's date boundaries
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const normalized = period.toLowerCase();

  switch (normalized) {
    case 'today':
    case 'daily':
    case 'day': {
      const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return dDay === startOfToday.getTime();
    }
    case 'this week':
    case 'weekly':
    case 'week': {
      const dayOfWeek = now.getDay(); // 0 is Sunday
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
      return d >= startOfWeek && d <= endOfToday;
    }
    case 'this month':
    case 'monthly':
    case 'month': {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    case 'this quarter':
    case 'quarterly':
    case 'quarter': {
      const currentQ = Math.floor(now.getMonth() / 3);
      const targetQ = Math.floor(d.getMonth() / 3);
      return d.getFullYear() === now.getFullYear() && currentQ === targetQ;
    }
    case 'this year':
    case 'annual':
    case 'yearly':
    case 'year': {
      return d.getFullYear() === now.getFullYear();
    }
    case 'previous month': {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === prevMonth.getFullYear() && d.getMonth() === prevMonth.getMonth();
    }
    case 'previous quarter': {
      const prevQDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const prevQ = Math.floor(prevQDate.getMonth() / 3);
      return d.getFullYear() === prevQDate.getFullYear() && Math.floor(d.getMonth() / 3) === prevQ;
    }
    case 'previous year': {
      return d.getFullYear() === now.getFullYear() - 1;
    }
    case 'custom date range':
    case 'custom': {
      if (!customStart && !customEnd) return true;
      const t = d.getTime();
      if (customStart) {
        const startMs = new Date(customStart + 'T00:00:00').getTime();
        if (t < startMs) return false;
      }
      if (customEnd) {
        const endMs = new Date(customEnd + 'T23:59:59.999').getTime();
        if (t > endMs) return false;
      }
      return true;
    }
    default:
      return true;
  }
}

/**
 * Returns human-readable date bounds for the selected period
 */
export function getPeriodDateLabel(period: string, customStart?: string, customEnd?: string): string {
  const now = new Date();
  const normalized = (period || 'All Time').toLowerCase();
  switch (normalized) {
    case 'today':
    case 'daily':
    case 'day':
      return `Day (${formatDate(now.toISOString())})`;
    case 'this week':
    case 'weekly':
    case 'week': {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      return `Weekly (${formatDate(startOfWeek.toISOString())} – ${formatDate(now.toISOString())})`;
    }
    case 'this month':
    case 'monthly':
    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `Monthly (${formatDate(startOfMonth.toISOString())} – ${formatDate(endOfMonth.toISOString())})`;
    }
    case 'this quarter':
    case 'quarterly':
    case 'quarter': {
      const currentQ = Math.floor(now.getMonth() / 3);
      const startQ = new Date(now.getFullYear(), currentQ * 3, 1);
      const endQ = new Date(now.getFullYear(), (currentQ + 1) * 3, 0);
      return `Quarterly Q${currentQ + 1} (${formatDate(startQ.toISOString())} – ${formatDate(endQ.toISOString())})`;
    }
    case 'this year':
    case 'annual':
    case 'yearly':
    case 'year':
      return `Annual (Full Year ${now.getFullYear()})`;
    case 'previous month': {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return `Previous Month (${formatDate(prevMonth.toISOString())} – ${formatDate(endPrevMonth.toISOString())})`;
    }
    case 'previous quarter': {
      const prevQDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const prevQ = Math.floor(prevQDate.getMonth() / 3);
      const startQ = new Date(now.getFullYear(), prevQ * 3, 1);
      const endQ = new Date(now.getFullYear(), (prevQ + 1) * 3, 0);
      return `Previous Quarter Q${prevQ + 1} (${formatDate(startQ.toISOString())} – ${formatDate(endQ.toISOString())})`;
    }
    case 'previous year':
      return `Previous Year (Full Year ${now.getFullYear() - 1})`;
    case 'custom date range':
    case 'custom':
      if (customStart && customEnd) {
        return `Custom Period (${formatDate(customStart)} – ${formatDate(customEnd)})`;
      } else if (customStart) {
        return `Custom Period (From ${formatDate(customStart)})`;
      } else if (customEnd) {
        return `Custom Period (Until ${formatDate(customEnd)})`;
      }
      return 'Custom Period Range';
    case 'all time':
    default:
      return 'All-Time Cumulative';
  }
}
