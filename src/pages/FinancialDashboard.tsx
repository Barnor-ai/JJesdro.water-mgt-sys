import React from 'react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  CreditCard,
  PieChart as PieIcon,
  Download,
  Receipt,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useERPStore } from '../store/useStore';
import { KPITile } from '../components/ui/KPITile';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import { exportToExcel } from '../lib/exportUtils';

export function FinancialDashboard() {
  const { sales, expenses, finishedGoods, rawMaterials, bottleTypes, purchases } = useERPStore();

  // Financial Calculations
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalPaidRevenue = sales.reduce((acc, s) => acc + s.amount_paid, 0);
  const totalReceivables = totalSalesRevenue - totalPaidRevenue;

  // COGS Calculation based on sold items
  let totalCOGS = 0;
  sales.forEach((s) => {
    s.items.forEach((item) => {
      totalCOGS += item.quantity * item.unit_cost;
    });
  });
  if (totalCOGS === 0) totalCOGS = totalSalesRevenue * 0.38; // standard fallback

  const grossProfit = totalSalesRevenue - totalCOGS;
  const grossMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  const totalOperatingExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netOperatingProfit = grossProfit - totalOperatingExpenses;
  const netMargin = totalSalesRevenue > 0 ? (netOperatingProfit / totalSalesRevenue) * 100 : 0;

  // Inventory Valuation (Finished goods + Raw materials)
  const finishedGoodsValue = finishedGoods.reduce((acc, fg) => {
    const bt = bottleTypes.find((b) => b.size === fg.bottle_size);
    const unitCost = bt?.cost || 0.25;
    return acc + fg.current_stock * unitCost;
  }, 0);

  const rawMaterialsValue = rawMaterials.reduce(
    (acc, rm) => acc + rm.current_stock * rm.cost_per_unit,
    0
  );
  const totalInventoryValuation = finishedGoodsValue + rawMaterialsValue;

  // Payables
  const totalPayables = purchases
    .filter((p) => p.status === 'Ordered')
    .reduce((acc, p) => acc + p.total_amount, 0);

  // Expense Categories Data
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });
  const expensePieData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name,
    value,
  }));
  const EXP_COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb923c', '#4ade80'];

  const handleExportPL = () => {
    const plData = [
      { Metric: 'Gross Sales Revenue', Amount: totalSalesRevenue },
      { Metric: 'Cost of Goods Sold (COGS)', Amount: -totalCOGS },
      { Metric: 'Gross Profit', Amount: grossProfit },
      { Metric: 'Operating Expenses', Amount: -totalOperatingExpenses },
      { Metric: 'Net Operating Profit (EBITDA)', Amount: netOperatingProfit },
      { Metric: 'Finished Goods Inventory Value', Amount: finishedGoodsValue },
      { Metric: 'Raw Materials Inventory Value', Amount: rawMaterialsValue },
      { Metric: 'Total Inventory Valuation', Amount: totalInventoryValuation },
      { Metric: 'Accounts Receivable (Debtors)', Amount: totalReceivables },
      { Metric: 'Accounts Payable (Suppliers)', Amount: totalPayables },
    ];
    exportToExcel(plData, 'H2O_Profit_and_Loss_Statement');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Financial Dashboard & P&L Statement
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time balance sheet, gross margin yield, operating expenses, and asset valuation
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportPL}>
          <Download className="w-4 h-4 mr-1.5" /> Export P&L (.xlsx)
        </Button>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          title="Gross Profit"
          value={formatCurrency(grossProfit)}
          subtitle={`${grossMargin.toFixed(1)}% gross margin`}
          trend={12.4}
          icon={<DollarSign className="w-6 h-6 text-emerald-400" />}
          iconBg="bg-emerald-500/10 dark:bg-emerald-500/20"
        />

        <KPITile
          title="Net Operating Profit"
          value={formatCurrency(netOperatingProfit)}
          subtitle={`${netMargin.toFixed(1)}% net margin`}
          trend={8.9}
          icon={<TrendingUp className="w-6 h-6 text-sky-400" />}
          iconBg="bg-sky-500/10 dark:bg-sky-500/20"
        />

        <KPITile
          title="Inventory Valuation"
          value={formatCurrency(totalInventoryValuation)}
          subtitle={`FG: ${formatCurrency(finishedGoodsValue)} | Raw: ${formatCurrency(rawMaterialsValue)}`}
          icon={<Layers className="w-6 h-6 text-indigo-400" />}
          iconBg="bg-indigo-500/10 dark:bg-indigo-500/20"
        />

        <KPITile
          title="Net Working Capital"
          value={formatCurrency(totalReceivables + totalInventoryValuation - totalPayables)}
          subtitle={`AR: ${formatCurrency(totalReceivables)} | AP: ${formatCurrency(totalPayables)}`}
          icon={<CreditCard className="w-6 h-6 text-purple-400" />}
          iconBg="bg-purple-500/10 dark:bg-purple-500/20"
        />
      </div>

      {/* P&L Statement Detailed Table & Expense Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* P&L Statement Table (2 Cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income Statement (Profit & Loss)</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Current fiscal month operating financial performance
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Revenue */}
                <tr className="bg-slate-50/70 dark:bg-slate-800/50 font-bold">
                  <td className="p-3.5 pl-5 text-slate-900 dark:text-white">
                    1. Gross Sales Revenue
                  </td>
                  <td className="p-3.5 text-right pr-5 text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {formatCurrency(totalSalesRevenue)}
                  </td>
                </tr>

                {/* COGS */}
                <tr>
                  <td className="p-3 pl-8 text-slate-600 dark:text-slate-300">
                    Less: Cost of Goods Sold (Water filtration, PET preforms, caps, labels)
                  </td>
                  <td className="p-3 text-right pr-5 text-rose-500 font-mono">
                    ({formatCurrency(totalCOGS)})
                  </td>
                </tr>

                {/* Gross Profit */}
                <tr className="bg-sky-50/50 dark:bg-sky-950/20 font-bold">
                  <td className="p-3.5 pl-5 text-sky-700 dark:text-sky-300">
                    2. Gross Profit
                  </td>
                  <td className="p-3.5 text-right pr-5 text-sky-600 dark:text-sky-400 font-mono text-sm">
                    {formatCurrency(grossProfit)} ({grossMargin.toFixed(1)}%)
                  </td>
                </tr>

                {/* Operating Expenses list */}
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="p-2.5 pl-8 text-slate-500 dark:text-slate-400">
                      Less: {exp.category} ({exp.payee})
                    </td>
                    <td className="p-2.5 text-right pr-5 text-slate-500 font-mono">
                      ({formatCurrency(exp.amount)})
                    </td>
                  </tr>
                ))}

                {/* Total Operating Expenses */}
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-semibold">
                  <td className="p-3 pl-5 text-slate-700 dark:text-slate-300">
                    Total Operating Expenses (OPEX)
                  </td>
                  <td className="p-3 text-right pr-5 text-rose-500 font-mono">
                    ({formatCurrency(totalOperatingExpenses)})
                  </td>
                </tr>

                {/* Net Operating Profit */}
                <tr className="bg-emerald-500/10 font-black text-sm">
                  <td className="p-4 pl-5 text-slate-900 dark:text-white">
                    3. Net Operating Profit (EBITDA)
                  </td>
                  <td className="p-4 text-right pr-5 text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(netOperatingProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Expense Category Breakdown Chart (1 Col) */}
        <Card>
          <CardHeader>
            <CardTitle>OPEX Distribution</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Breakdown by plant expense category
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expensePieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={EXP_COLORS[index % EXP_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: number) => [formatCurrency(val), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-3">
              {expensePieData.map((exp, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: EXP_COLORS[idx % EXP_COLORS.length] }}
                    />
                    <span className="text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                      {exp.name}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(exp.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
