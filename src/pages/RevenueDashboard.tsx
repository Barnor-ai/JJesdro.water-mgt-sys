import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  Sparkles,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useERPStore } from '../store/useStore';
import { KPITile } from '../components/ui/KPITile';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import { exportToExcel } from '../lib/exportUtils';
import { PeriodSearchEngine } from '../components/common/PeriodSearchEngine';
import { isDateInPeriod, isDateMatchingPeriodQuery, getPeriodDateLabel } from '../lib/dateUtils';

export function RevenueDashboard() {
  const { sales, customers } = useERPStore();
  const [period, setPeriod] = useState<string>('All Time');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Filter sales dynamically based on selected period, custom date range, and period search query
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const dateVal = s.sale_date || s.created_at;
      if (!isDateInPeriod(dateVal, period, customStartDate, customEndDate)) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesPeriod = isDateMatchingPeriodQuery(dateVal, searchTerm);
        const matchesInvoice = (s.invoice_number || '').toLowerCase().includes(q);
        const matchesCustomer = (s.customer_name || '').toLowerCase().includes(q);
        const matchesRep = (s.salesperson_name || '').toLowerCase().includes(q);
        const matchesType = (s.type || '').toLowerCase().includes(q);
        const matchesPayment = (s.payment_status || '').toLowerCase().includes(q);
        const matchesItems = s.items?.some((i) =>
          (i.bottle_size || '').toLowerCase().includes(q)
        );
        if (
          !matchesPeriod &&
          !matchesInvoice &&
          !matchesCustomer &&
          !matchesRep &&
          !matchesType &&
          !matchesPayment &&
          !matchesItems
        ) {
          return false;
        }
      }

      return true;
    });
  }, [sales, period, customStartDate, customEndDate, searchTerm]);

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalPaid = filteredSales.reduce((acc, s) => acc + (s.amount_paid || s.paid_amount || 0), 0);
  const totalReceivables = Math.max(0, totalRevenue - totalPaid);
  const avgOrderValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  const collectionRate = totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : '100.0';

  // Dynamic Revenue Velocity Chart Data (monthly or daily depending on active period)
  const velocityChartData = useMemo(() => {
    const norm = (period || '').toLowerCase();
    const isDailyOrWeekly =
      norm === 'today' ||
      norm === 'daily' ||
      norm === 'day' ||
      norm === 'this week' ||
      norm === 'weekly' ||
      norm === 'week';

    if (isDailyOrWeekly) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const byDay: Record<string, { month: string; revenue: number; target: number }> = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = `${days[d.getDay()]} (${d.getDate()})`;
        byDay[key] = { month: label, revenue: 0, target: 8000 };
      }

      filteredSales.forEach((s) => {
        const dateStr = (s.sale_date || s.created_at || '').slice(0, 10);
        if (byDay[dateStr]) {
          byDay[dateStr].revenue += s.total_amount;
        } else if (dateStr) {
          byDay[dateStr] = { month: dateStr, revenue: s.total_amount, target: 8000 };
        }
      });

      return Object.values(byDay);
    }

    // Default 12-month comparison
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTargets = [35000, 40000, 45000, 48000, 52000, 60000, 65000, 70000, 75000, 80000, 85000, 90000];
    const revByMonth: Record<number, number> = {};

    filteredSales.forEach((s) => {
      const d = new Date(s.sale_date || s.created_at || '');
      if (!isNaN(d.getTime())) {
        const m = d.getMonth();
        revByMonth[m] = (revByMonth[m] || 0) + s.total_amount;
      }
    });

    return monthNames.map((month, idx) => ({
      month,
      revenue: revByMonth[idx] || 0,
      target: monthlyTargets[idx],
    }));
  }, [filteredSales, period]);

  // Revenue by Product Size
  const productRevenueData = useMemo(() => {
    const map: Record<string, { revenue: number; bottles: number }> = {};

    filteredSales.forEach((s) => {
      s.items?.forEach((item) => {
        const size = item.bottle_size || 'Standard';
        if (!map[size]) {
          map[size] = { revenue: 0, bottles: 0 };
        }
        map[size].revenue += item.total_price || item.quantity * item.unit_price;
        map[size].bottles += item.quantity;
      });
    });

    const entries = Object.entries(map).map(([size, data]) => ({
      size,
      revenue: data.revenue,
      bottles: data.bottles,
    }));

    if (entries.length > 0) {
      return entries.sort((a, b) => b.revenue - a.revenue);
    }

    return [
      { size: '500ml', revenue: 0, bottles: 0 },
      { size: '19L Dispenser', revenue: 0, bottles: 0 },
      { size: '1.5L Family', revenue: 0, bottles: 0 },
      { size: '1L Hydration', revenue: 0, bottles: 0 },
      { size: '750ml Sport', revenue: 0, bottles: 0 },
      { size: '330ml Mini', revenue: 0, bottles: 0 },
      { size: '5L Jug', revenue: 0, bottles: 0 },
    ];
  }, [filteredSales]);

  // Total product revenue for percentage calculation
  const totalProductRev = productRevenueData.reduce((acc, p) => acc + p.revenue, 0) || totalRevenue || 1;

  // Revenue by Salesperson
  const salespersonData = useMemo(() => {
    const map: Record<string, { revenue: number; deals: number; commission: number }> = {};

    filteredSales.forEach((s) => {
      const name = s.salesperson_name || 'Direct Wholesale B2B';
      if (!map[name]) {
        map[name] = { revenue: 0, deals: 0, commission: 0 };
      }
      map[name].revenue += s.total_amount;
      map[name].deals += 1;
      map[name].commission += s.salesperson_name ? s.total_amount * 0.05 : 0;
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        deals: data.deals,
        commission: Math.round(data.commission),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const handleExport = () => {
    exportToExcel(
      filteredSales.map((s) => ({
        Invoice: s.invoice_number,
        Customer: s.customer_name || 'N/A',
        Date: s.sale_date,
        Type: s.type,
        Total: s.total_amount,
        Paid: s.amount_paid || s.paid_amount || 0,
        Balance: s.total_amount - (s.amount_paid || s.paid_amount || 0),
        Status: s.payment_status,
        Salesperson: s.salesperson_name || 'Direct Wholesale',
      })),
      `H2O_Revenue_Ledger_${period.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`
    );
  };

  const periodLabel = getPeriodDateLabel(period, customStartDate, customEndDate);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Revenue & Commercial Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time multi-channel revenue, period velocity, product yield, and sales accountability
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" /> Export XLSX
          </Button>
        </div>
      </div>

      {/* Period Search Engine: Day, Weekly, Months, Quarterly, Annual, Custom Date Range & Period Search */}
      <PeriodSearchEngine
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search revenue by period (e.g. 2026-08, Sep, Q3, 2026), date, invoice, customer, rep..."
        period={period}
        onPeriodChange={setPeriod}
        customStartDate={customStartDate}
        onCustomStartDateChange={setCustomStartDate}
        customEndDate={customEndDate}
        onCustomEndDateChange={setCustomEndDate}
        resultsCount={filteredSales.length}
        resultsLabel="Invoices"
        onReset={() => {
          setSearchTerm('');
          setPeriod('All Time');
          setCustomStartDate('');
          setCustomEndDate('');
        }}
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          title="Period Gross Revenue"
          value={formatCurrency(totalRevenue)}
          subtitle={`Across ${filteredSales.length} orders in ${periodLabel}`}
          trend={18.4}
          trendLabel="Period Growth"
          icon={<DollarSign className="w-6 h-6 text-sky-400" />}
          iconBg="bg-sky-500/10 dark:bg-sky-500/20"
        />

        <KPITile
          title="Collected Cash"
          value={formatCurrency(totalPaid)}
          subtitle={`${collectionRate}% collection rate`}
          icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
          iconBg="bg-emerald-500/10 dark:bg-emerald-500/20"
        />

        <KPITile
          title="Outstanding Receivables"
          value={formatCurrency(totalReceivables)}
          subtitle="Pending customer settlement"
          trend={-2.1}
          trendLabel="overdue collection"
          icon={<Receipt className="w-6 h-6 text-amber-400" />}
          iconBg="bg-amber-500/10 dark:bg-amber-500/20"
        />

        <KPITile
          title="Avg Order Value (AOV)"
          value={formatCurrency(avgOrderValue)}
          trend={4.5}
          trendLabel="per commercial invoice"
          icon={<Sparkles className="w-6 h-6 text-indigo-400" />}
          iconBg="bg-indigo-500/10 dark:bg-indigo-500/20"
        />
      </div>

      {/* Main Growth & Target Comparison Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue Velocity vs. Budget Target ({periodLabel})</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actual billed amounts compared to milestone targets for the filtered period
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            {filteredSales.length} Invoices Active
          </span>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(val) => `$${val >= 1000 ? `${val / 1000}k` : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: number) => [`$${val.toLocaleString()}`, '']}
                />
                <Legend />
                <Bar dataKey="revenue" name="Actual Revenue ($)" fill="#0284c7" radius={[6, 6, 0, 0]} />
                <Bar dataKey="target" name="Budget Target ($)" fill="#64748b" radius={[6, 6, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by Product & Sales Reps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Product SKU */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Bottle Size SKU</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Volume and revenue contribution in {periodLabel}
            </p>
          </CardHeader>
          <CardContent>
            {productRevenueData.every((item) => item.revenue === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                No bottle sales recorded for this period
              </div>
            ) : (
              <div className="space-y-4">
                {productRevenueData.map((item) => {
                  const pct = totalProductRev > 0 ? (item.revenue / totalProductRev) * 100 : 0;
                  return (
                    <div key={item.size} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800 dark:text-slate-200">
                          {item.size} ({item.bottles.toLocaleString()} units)
                        </span>
                        <span className="text-sky-600 dark:text-sky-400">
                          {formatCurrency(item.revenue)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sky-500 to-blue-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(item.revenue > 0 ? 3 : 0, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Rep Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Representative Performance</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deals closed and commission earned in {periodLabel}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {salespersonData.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No salesperson transactions found for this period
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3 pl-5">Rep Name</th>
                    <th className="p-3">Deals</th>
                    <th className="p-3 text-right">Revenue Closed</th>
                    <th className="p-3 text-right pr-5">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {salespersonData.map((rep, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 pl-5 font-bold text-slate-800 dark:text-slate-200">
                        {rep.name}
                      </td>
                      <td className="p-3 text-slate-500">{rep.deals} orders</td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(rep.revenue)}
                      </td>
                      <td className="p-3 text-right pr-5 font-mono text-slate-500">
                        {formatCurrency(rep.commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
