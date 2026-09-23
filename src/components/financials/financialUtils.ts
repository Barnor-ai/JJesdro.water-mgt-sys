export type FinancialDatePeriod =
  | 'Today'
  | 'This Week'
  | 'This Month'
  | 'This Quarter'
  | 'This Year'
  | 'Previous Month'
  | 'Previous Quarter'
  | 'Previous Year'
  | 'Custom Date Range'
  | 'All Time';

export function isDateInFinancialPeriod(
  dateStr?: string,
  period: FinancialDatePeriod = 'This Month',
  customStart?: string,
  customEnd?: string
): boolean {
  if (!dateStr) return true;
  if (period === 'All Time') return true;

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  const now = new Date();

  switch (period) {
    case 'Today':
      return d.toDateString() === now.toDateString();

    case 'This Week': {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek;
    }

    case 'This Month':
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

    case 'This Quarter': {
      const currentQ = Math.floor(now.getMonth() / 3);
      const targetQ = Math.floor(d.getMonth() / 3);
      return currentQ === targetQ && d.getFullYear() === now.getFullYear();
    }

    case 'This Year':
      return d.getFullYear() === now.getFullYear();

    case 'Previous Month': {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
    }

    case 'Previous Quarter': {
      const prevQDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const prevQ = Math.floor(prevQDate.getMonth() / 3);
      return Math.floor(d.getMonth() / 3) === prevQ && d.getFullYear() === prevQDate.getFullYear();
    }

    case 'Previous Year':
      return d.getFullYear() === now.getFullYear() - 1;

    case 'Custom Date Range': {
      if (!customStart && !customEnd) return true;
      const t = d.getTime();
      if (customStart && t < new Date(customStart).getTime()) return false;
      if (customEnd && t > new Date(customEnd).getTime() + 86400000) return false;
      return true;
    }

    default:
      return true;
  }
}
