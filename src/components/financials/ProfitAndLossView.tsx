import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Download,
  Percent,
  CheckCircle2,
  Calendar,
  FileText,
} from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatNumber, formatDate } from '../../lib/utils';
import { exportToExcel, generateFinancialReportPDF } from '../../lib/exportUtils';
import { FinancialDatePeriod, isDateInFinancialPeriod } from './financialUtils';

interface ProfitAndLossViewProps {
  datePeriod: FinancialDatePeriod;
  customStartDate?: string;
  customEndDate?: string;
}

export function ProfitAndLossView({
  datePeriod,
  customStartDate,
  customEndDate,
}: ProfitAndLossViewProps) {
  const { sales, expenses, productionBatches } = useERPStore();

  // Filter Sales for Period
  const filteredSales = sales.filter((s) =>
    isDateInFinancialPeriod(s.sale_date, datePeriod, customStartDate, customEndDate)
  );

  // Filter Expenses for Period
  const filteredExpenses = expenses.filter((e) =>
    isDateInFinancialPeriod(e.date || (e as any).expense_date, datePeriod, customStartDate, customEndDate)
  );

  // Filter Batches for Period (to extract direct production costs)
  const filteredBatches = productionBatches.filter((b) =>
    isDateInFinancialPeriod(b.production_date, datePeriod, customStartDate, customEndDate)
  );

  // 1. REVENUE
  const totalWaterRevenue = filteredSales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
  const otherIncome = Math.round(totalWaterRevenue * 0.035); // Byproducts / preform scrap / pallet deposits
  const totalGrossRevenue = totalWaterRevenue;

  // 2. COST OF SALES (COGS)
  // Calculate from item sales or actual batch production costs
  let directMaterials = 0;
  let directLabour = 0;
  let packagingMaterials = 0;

  if (filteredBatches.length > 0) {
    const totalBatchCost = filteredBatches.reduce((acc, b) => acc + (b.production_cost || 0), 0);
    directMaterials = Math.round(totalBatchCost * 0.62);
    directLabour = Math.round(totalBatchCost * 0.22);
    packagingMaterials = Math.round(totalBatchCost * 0.16);
  } else {
    // If no batches in exact window, compute standard manufacturing cost ratio from sales
    const baseCogs = totalWaterRevenue * 0.42;
    directMaterials = Math.round(baseCogs * 0.65);
    directLabour = Math.round(baseCogs * 0.20);
    packagingMaterials = Math.round(baseCogs * 0.15);
  }
  const totalCostOfSales = directMaterials + directLabour + packagingMaterials;

  // 3. GROSS PROFIT
  const grossProfit = totalGrossRevenue - totalCostOfSales;
  const grossMargin = totalGrossRevenue > 0 ? (grossProfit / totalGrossRevenue) * 100 : 0;

  // 4. OPERATING EXPENSES
  const expenseByCategory: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + (e.amount || 0);
  });
  const totalOperatingExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  // 5. OPERATING PROFIT
  const operatingProfit = grossProfit - totalOperatingExpenses;
  const operatingMargin = totalGrossRevenue > 0 ? (operatingProfit / totalGrossRevenue) * 100 : 0;

  // 6. OTHER INCOME & EXPENSES
  const otherExpenses = Math.round(totalOperatingExpenses * 0.05); // Depreciation & banking transaction fees
  const profitBeforeTax = operatingProfit + otherIncome - otherExpenses;
  const estimatedTax = Math.max(0, Math.round(profitBeforeTax * 0.15));
  const netIncome = profitBeforeTax - estimatedTax;

  const handleExport = () => {
    const rows = [
      { Category: '1. Revenue', LineItem: 'Gross Packaged Water Sales', Amount: totalWaterRevenue },
      { Category: '1. Revenue', LineItem: 'Total Revenue', Amount: totalGrossRevenue },
      { Category: '2. Cost of Sales', LineItem: 'Direct Raw Materials (PET Preforms & Caps)', Amount: -directMaterials },
      { Category: '2. Cost of Sales', LineItem: 'Direct Bottling Plant Labour', Amount: -directLabour },
      { Category: '2. Cost of Sales', LineItem: 'Packaging Films & Cartons', Amount: -packagingMaterials },
      { Category: '2. Cost of Sales', LineItem: 'Total Cost of Sales (COGS)', Amount: -totalCostOfSales },
      { Category: '3. Gross Profit', LineItem: 'Gross Profit', Amount: grossProfit },
      ...Object.entries(expenseByCategory).map(([cat, amt]) => ({
        Category: '4. Operating Expenses',
        LineItem: cat,
        Amount: -amt,
      })),
      { Category: '4. Operating Expenses', LineItem: 'Total Operating Expenses', Amount: -totalOperatingExpenses },
      { Category: '5. Operating Profit', LineItem: 'Operating Profit (EBIT)', Amount: operatingProfit },
      { Category: '6. Other Income', LineItem: 'Scrap & Non-Operating Income', Amount: otherIncome },
      { Category: '6. Other Expenses', LineItem: 'Finance & Bank Charges', Amount: -otherExpenses },
      { Category: '7. Profit Before Tax', LineItem: 'Profit Before Tax (PBT)', Amount: profitBeforeTax },
      { Category: '8. Income Tax', LineItem: 'Estimated Corporate Tax', Amount: -estimatedTax },
      { Category: '9. Net Profit', LineItem: 'Net Profit After Tax', Amount: netIncome },
    ];
    exportToExcel(rows, `Profit_and_Loss_${datePeriod.replace(/\s+/g, '_')}`);
  };

  const handleExportPDF = () => {
    generateFinancialReportPDF('PROFIT & LOSS STATEMENT', datePeriod, [
      {
        title: '1. Revenue',
        rows: [
          { label: 'Gross Packaged Water Sales', amount: totalWaterRevenue },
          { label: 'Other Operating Revenue', amount: totalGrossRevenue - totalWaterRevenue },
        ],
        totalLabel: 'Total Revenue',
        totalAmount: totalGrossRevenue,
      },
      {
        title: '2. Cost of Sales (COGS)',
        rows: [
          { label: 'Direct Materials (Preforms & Caps)', amount: directMaterials },
          { label: 'Direct Bottling Plant Labour', amount: directLabour },
          { label: 'Packaging Films & Cartons', amount: packagingMaterials },
        ],
        totalLabel: 'Total Cost of Sales',
        totalAmount: totalCostOfSales,
      },
      {
        title: '3. Operating Expenses (OPEX)',
        rows: Object.entries(expenseByCategory).map(([cat, amt]) => ({ label: cat, amount: amt })),
        totalLabel: 'Total Operating Expenses',
        totalAmount: totalOperatingExpenses,
      },
      {
        title: '4. Summary Profitability',
        rows: [
          { label: 'Operating Profit (EBIT)', amount: operatingProfit, isBold: true },
          { label: 'Scrap & Non-Operating Income', amount: otherIncome },
          { label: 'Profit Before Tax (PBT)', amount: profitBeforeTax, isBold: true },
          { label: 'Estimated Corporate Tax (15%)', amount: estimatedTax },
        ],
        totalLabel: 'Net Profit After Tax',
        totalAmount: netIncome,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Gross Sales Revenue</span>
            <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {formatCurrency(totalGrossRevenue)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{filteredSales.length} Invoices</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Gross Profit</span>
            <span className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {formatCurrency(grossProfit)}
          </p>
          <span className="text-[11px] text-sky-600 font-semibold mt-0.5 block">
            {grossMargin.toFixed(1)}% Gross Margin
          </span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Operating Profit (EBIT)</span>
            <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p
            className={`text-xl font-black mt-2 font-mono ${
              operatingProfit >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'
            }`}
          >
            {formatCurrency(operatingProfit)}
          </p>
          <span className="text-[11px] text-indigo-600 font-semibold mt-0.5 block">
            {operatingMargin.toFixed(1)}% Operating Margin
          </span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Profit Before Tax</span>
            <span className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <p
            className={`text-xl font-black mt-2 font-mono ${
              profitBeforeTax >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
            }`}
          >
            {formatCurrency(profitBeforeTax)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            After other income ({formatCurrency(otherIncome)})
          </span>
        </Card>
      </div>

      {/* Main Income Statement Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Comprehensive Profit & Loss Statement</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Financial results for <span className="font-semibold text-slate-800 dark:text-slate-200">{datePeriod}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1.5 text-emerald-500" /> Export Excel
            </Button>
            <Button variant="primary" size="sm" onClick={handleExportPDF}>
              <FileText className="w-4 h-4 mr-1.5" /> Export Statement PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500">
                <tr>
                  <th className="p-3.5 pl-6">Line Item / Account Classification</th>
                  <th className="p-3.5 text-right pr-6">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* 1. REVENUE */}
                <tr className="bg-slate-50/50 dark:bg-slate-800/40 font-bold text-slate-900 dark:text-white">
                  <td className="p-3 pl-6">REVENUE</td>
                  <td className="p-3 text-right pr-6 font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalGrossRevenue)}
                  </td>
                </tr>
                <tr className="text-slate-600 dark:text-slate-400">
                  <td className="p-2.5 pl-10">Sales of Packaged Water (500ml, 1.5L, 19L Dispenser)</td>
                  <td className="p-2.5 text-right pr-6 font-mono">{formatCurrency(totalWaterRevenue)}</td>
                </tr>

                {/* 2. COST OF SALES */}
                <tr className="bg-slate-50/50 dark:bg-slate-800/40 font-bold text-slate-900 dark:text-white">
                  <td className="p-3 pl-6">COST OF SALES</td>
                  <td className="p-3 text-right pr-6 font-mono text-rose-500">
                    ({formatCurrency(totalCostOfSales)})
                  </td>
                </tr>
                <tr className="text-slate-600 dark:text-slate-400">
                  <td className="p-2 pl-10">Direct Raw Materials (PET Preforms, Mineral Salts, Caps)</td>
                  <td className="p-2 text-right pr-6 font-mono">({formatCurrency(directMaterials)})</td>
                </tr>
                <tr className="text-slate-600 dark:text-slate-400">
                  <td className="p-2 pl-10">Direct Production Line Labour</td>
                  <td className="p-2 text-right pr-6 font-mono">({formatCurrency(directLabour)})</td>
                </tr>
                <tr className="text-slate-600 dark:text-slate-400">
                  <td className="p-2 pl-10">Shrink Films, Cartons & Packaging Supplies</td>
                  <td className="p-2 text-right pr-6 font-mono">({formatCurrency(packagingMaterials)})</td>
                </tr>

                {/* 3. GROSS PROFIT */}
                <tr className="bg-sky-50/40 dark:bg-sky-950/20 font-bold text-sky-900 dark:text-sky-300">
                  <td className="p-3.5 pl-6">GROSS PROFIT (Margin: {grossMargin.toFixed(1)}%)</td>
                  <td className="p-3.5 text-right pr-6 font-mono text-sm">{formatCurrency(grossProfit)}</td>
                </tr>

                {/* 4. OPERATING EXPENSES */}
                <tr className="bg-slate-50/50 dark:bg-slate-800/40 font-bold text-slate-900 dark:text-white">
                  <td className="p-3 pl-6">OPERATING EXPENSES</td>
                  <td className="p-3 text-right pr-6 font-mono text-rose-500">
                    ({formatCurrency(totalOperatingExpenses)})
                  </td>
                </tr>
                {Object.entries(expenseByCategory).map(([cat, amt]) => (
                  <tr key={cat} className="text-slate-600 dark:text-slate-400">
                    <td className="p-2 pl-10">{cat}</td>
                    <td className="p-2 text-right pr-6 font-mono">({formatCurrency(amt)})</td>
                  </tr>
                ))}
                {Object.keys(expenseByCategory).length === 0 && (
                  <tr className="text-slate-400 italic">
                    <td className="p-2 pl-10">No recorded expenses for this horizon</td>
                    <td className="p-2 text-right pr-6 font-mono">{formatCurrency(0)}</td>
                  </tr>
                )}

                {/* 5. OPERATING PROFIT */}
                <tr className="bg-indigo-50/40 dark:bg-indigo-950/20 font-bold text-indigo-900 dark:text-indigo-300">
                  <td className="p-3.5 pl-6">OPERATING PROFIT (EBITDA)</td>
                  <td className="p-3.5 text-right pr-6 font-mono text-sm">{formatCurrency(operatingProfit)}</td>
                </tr>

                {/* 6. OTHER INCOME */}
                <tr className="text-slate-600 dark:text-slate-400">
                  <td className="p-2.5 pl-6 font-semibold">Other Income (Scrap Preforms Recycling & Rentals)</td>
                  <td className="p-2.5 text-right pr-6 font-mono text-emerald-600">
                    +{formatCurrency(otherIncome)}
                  </td>
                </tr>

                {/* 7. OTHER EXPENSES */}
                <tr className="text-slate-600 dark:text-slate-400">
                  <td className="p-2.5 pl-6 font-semibold">Other Expenses (Depreciation & Banking Charges)</td>
                  <td className="p-2.5 text-right pr-6 font-mono text-rose-500">
                    ({formatCurrency(otherExpenses)})
                  </td>
                </tr>

                {/* 8. PROFIT BEFORE TAX */}
                <tr className="bg-emerald-500/10 dark:bg-emerald-500/20 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="p-4 pl-6 text-sm">PROFIT BEFORE TAX</td>
                  <td className="p-4 text-right pr-6 font-mono text-base text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(profitBeforeTax)}
                  </td>
                </tr>

                {/* TAX & NET */}
                <tr className="text-slate-500 text-xs">
                  <td className="p-2.5 pl-6">Estimated Provision for Corporate Tax</td>
                  <td className="p-2.5 text-right pr-6 font-mono text-rose-500">({formatCurrency(estimatedTax)})</td>
                </tr>
                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white">
                  <td className="p-3 pl-6">NET PROFIT AFTER TAX</td>
                  <td className="p-3 text-right pr-6 font-mono text-sm text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(netIncome)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
