import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  Sparkles,
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

export function RevenueDashboard() {
  const { sales, customers } = useERPStore();
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual'>('Monthly');

  const totalRevenue = sales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalPaid = sales.reduce((acc, s) => acc + s.amount_paid, 0);
  const totalReceivables = totalRevenue - totalPaid;
  const avgOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0;

  // Monthly Revenue Trend Data
  const monthlyData = [
    { month: 'Jan', revenue: 38500, target: 35000, margin: 42 },
    { month: 'Feb', revenue: 42300, target: 40000, margin: 44 },
    { month: 'Mar', revenue: 51200, target: 45000, margin: 46 },
    { month: 'Apr', revenue: 48900, target: 48000, margin: 45 },
    { month: 'May', revenue: 59400, target: 52000, margin: 48 },
    { month: 'Jun', revenue: 68100, target: 60000, margin: 51 },
    { month: 'Jul', revenue: 74200, target: 65000, margin: 53 },
    { month: 'Aug (MTD)', revenue: totalRevenue, target: 70000, margin: 54 },
  ];

  // Revenue by Product Size
  const productRevenueData = [
    { size: '500ml', revenue: 6720, bottles: 14000 },
    { size: '19L Dispenser', revenue: 5200, bottles: 800 },
    { size: '1.5L Family', revenue: 3978, bottles: 3460 },
    { size: '1L Hydration', revenue: 2040, bottles: 2400 },
    { size: '750ml Sport', revenue: 1680, bottles: 2100 },
    { size: '330ml Mini', revenue: 1102, bottles: 3150 },
    { size: '5L Jug', revenue: 980, bottles: 280 },
  ];

  // Revenue by Salesperson
  const salespersonData = [
    { name: 'David Chen', revenue: 14780, deals: 3, commission: 739 },
    { name: 'Sarah Miller', revenue: 12400, deals: 2, commission: 620 },
    { name: 'Direct Wholesale B2B', revenue: 18500, deals: 4, commission: 0 },
  ];

  const handleExport = () => {
    exportToExcel(
      sales.map((s) => ({
        Invoice: s.invoice_number,
        Customer: s.customer_name,
        Date: s.sale_date,
        Type: s.type,
        Total: s.total_amount,
        Paid: s.amount_paid,
        Balance: s.total_amount - s.amount_paid,
        Status: s.payment_status,
        Salesperson: s.salesperson_name,
      })),
      'H2O_Revenue_Ledger'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Revenue & Commercial Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time multi-channel revenue, margin yield, customer cohorts, and quarterly targets
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            {(['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  period === p
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" /> Export XLSX
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          title="Gross Revenue"
          value={formatCurrency(totalRevenue)}
          trend={18.4}
          trendLabel="YoY Growth"
          icon={<DollarSign className="w-6 h-6 text-sky-400" />}
          iconBg="bg-sky-500/10 dark:bg-sky-500/20"
        />

        <KPITile
          title="Collected Cash"
          value={formatCurrency(totalPaid)}
          subtitle={`${((totalPaid / (totalRevenue || 1)) * 100).toFixed(1)}% collection rate`}
          icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
          iconBg="bg-emerald-500/10 dark:bg-emerald-500/20"
        />

        <KPITile
          title="Avg Order Value (AOV)"
          value={formatCurrency(avgOrderValue)}
          trend={4.5}
          trendLabel="per commercial invoice"
          icon={<DollarSign className="w-6 h-6 text-indigo-400" />}
          iconBg="bg-indigo-500/10 dark:bg-indigo-500/20"
        />

        <KPITile
          title="Net Gross Margin"
          value="54.2%"
          trend={2.8}
          trendLabel="cost optimization"
          icon={<Sparkles className="w-6 h-6 text-purple-400" />}
          iconBg="bg-purple-500/10 dark:bg-purple-500/20"
        />
      </div>

      {/* Main Growth & Target Comparison Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Historical Revenue Velocity vs. Budget Target</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monthly billed amounts vs. annual projection milestone
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            Target Pace: +112% Met
          </span>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(val) => `$${val / 1000}k`}
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
                <Bar dataKey="target" name="Monthly Target ($)" fill="#64748b" radius={[6, 6, 0, 0]} opacity={0.6} />
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
              Contribution analysis per bottle volume
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {productRevenueData.map((item) => {
                const pct = (item.revenue / 22698) * 100;
                return (
                  <div key={item.size} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800 dark:text-slate-200">{item.size} Pure Water</span>
                      <span className="text-sky-600 dark:text-sky-400">
                        {formatCurrency(item.revenue)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-blue-600 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sales Rep Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Representative Performance</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Account executive closing metrics & incentives
            </p>
          </CardHeader>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
