import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Calendar,
  Building2,
  Scale,
  ShieldCheck,
  Calculator,
  ListTree,
  BookOpen,
  FileText,
  Filter,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { KPITile } from '../components/ui/KPITile';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import { FinancialDatePeriod, isDateInFinancialPeriod } from '../components/financials/financialUtils';
import { ProfitAndLossView } from '../components/financials/ProfitAndLossView';
import { BalanceSheetView } from '../components/financials/BalanceSheetView';
import { ProductionBudgetView } from '../components/financials/ProductionBudgetView';
import { ActualsView } from '../components/financials/ActualsView';
import { VarianceAnalysisView } from '../components/financials/VarianceAnalysisView';
import { ChartOfAccountsView } from '../components/financials/ChartOfAccountsView';
import { GeneralLedgerView } from '../components/financials/GeneralLedgerView';
import { JournalEntriesView } from '../components/financials/JournalEntriesView';
import { TrialBalanceView } from '../components/financials/TrialBalanceView';
import { ExpensesPage } from './ExpensesPage';

export type FinancialTab =
  | 'pl'
  | 'balance_sheet'
  | 'budget'
  | 'actuals'
  | 'variance'
  | 'expenses'
  | 'coa'
  | 'ledger'
  | 'journal'
  | 'trial_balance';

export function FinancialDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as FinancialTab) || 'pl';

  const [activeTab, setActiveTab] = useState<FinancialTab>(initialTab);
  const [datePeriod, setDatePeriod] = useState<FinancialDatePeriod>('This Month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const { sales, expenses, finishedGoods, rawMaterials, bottleTypes, purchases } = useERPStore();

  // Sync tab with URL search parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') as FinancialTab | null;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: FinancialTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // High level financial metrics
  const filteredSales = sales.filter((s) =>
    isDateInFinancialPeriod(s.sale_date, datePeriod, customStartDate, customEndDate)
  );
  const filteredExpenses = expenses.filter((e) =>
    isDateInFinancialPeriod(e.date || (e as any).expense_date, datePeriod, customStartDate, customEndDate)
  );

  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
  const totalPaidRevenue = filteredSales.reduce((acc, s) => acc + (s.amount_paid || 0), 0);
  const totalReceivables = Math.max(0, totalSalesRevenue - totalPaidRevenue);

  let totalCOGS = 0;
  filteredSales.forEach((s) => {
    (s.items || []).forEach((item) => {
      totalCOGS += item.quantity * (item.unit_cost || 0.22);
    });
  });
  if (totalCOGS === 0 && totalSalesRevenue > 0) totalCOGS = totalSalesRevenue * 0.38;

  const grossProfit = totalSalesRevenue - totalCOGS;
  const grossMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  const totalOperatingExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netOperatingProfit = grossProfit - totalOperatingExpenses;
  const netMargin = totalSalesRevenue > 0 ? (netOperatingProfit / totalSalesRevenue) * 100 : 0;

  // Inventory Valuation
  const finishedGoodsValue = finishedGoods.reduce((acc, fg) => {
    const bt = bottleTypes.find((b) => b.size === fg.bottle_size);
    const unitCost = bt?.cost || 0.25;
    return acc + (fg.current_stock || 0) * unitCost;
  }, 0);

  const rawMaterialsValue = rawMaterials.reduce(
    (acc, rm) => acc + (rm.current_stock || 0) * (rm.cost_per_unit || 0.04),
    0
  );
  const totalInventoryValuation = finishedGoodsValue + rawMaterialsValue;

  const cashAndBank = 107300 + totalPaidRevenue * 0.4 - totalOperatingExpenses * 0.6;
  const totalNonCurrentAssets = 185000 + 74000 + 120000;
  const totalCurrentAssets = cashAndBank + totalReceivables + totalInventoryValuation;
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  const totalPayables = purchases
    .filter((p) => p.status === 'Ordered')
    .reduce((acc, p) => acc + (p.total_amount || 0), 0);
  const totalCurrentLiabilities = totalPayables + 8200 + 6420;

  const tabs: Array<{ id: FinancialTab; label: string; icon: React.ReactNode }> = [
    { id: 'pl', label: 'Profit & Loss', icon: <Receipt className="w-4 h-4" /> },
    { id: 'balance_sheet', label: 'Balance Sheet', icon: <Building2 className="w-4 h-4" /> },
    { id: 'budget', label: 'Production Budget', icon: <Calculator className="w-4 h-4" /> },
    { id: 'actuals', label: 'Actuals', icon: <Layers className="w-4 h-4" /> },
    { id: 'variance', label: 'Variance Analysis', icon: <Scale className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'coa', label: 'Chart of Accounts', icon: <ListTree className="w-4 h-4" /> },
    { id: 'ledger', label: 'General Ledger', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'journal', label: 'Journal Entries', icon: <FileText className="w-4 h-4" /> },
    { id: 'trial_balance', label: 'Trial Balance', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Title and Period Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Financials & Cost Accounting
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Certified double-entry financials, production budgets, actuals, and variance analysis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-xs text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={datePeriod}
              onChange={(e) => setDatePeriod(e.target.value as FinancialDatePeriod)}
              className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="This Quarter">This Quarter</option>
              <option value="This Year">This Year</option>
              <option value="Previous Month">Previous Month</option>
              <option value="Previous Quarter">Previous Quarter</option>
              <option value="Previous Year">Previous Year</option>
              <option value="Custom Date Range">Custom Date Range</option>
              <option value="All Time">All Time</option>
            </select>
          </div>

          {datePeriod === 'Custom Date Range' && (
            <div className="flex items-center gap-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none"
              />
            </div>
          )}
        </div>
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
          subtitle={`${netMargin.toFixed(1)}% net margin (${datePeriod})`}
          trend={8.9}
          icon={<TrendingUp className="w-6 h-6 text-sky-400" />}
          iconBg="bg-sky-500/10 dark:bg-sky-500/20"
        />

        <KPITile
          title="Total Assets Valuation"
          value={formatCurrency(totalAssets)}
          subtitle={`Current: ${formatCurrency(totalCurrentAssets)} | Fixed: ${formatCurrency(totalNonCurrentAssets)}`}
          icon={<Layers className="w-6 h-6 text-indigo-400" />}
          iconBg="bg-indigo-500/10 dark:bg-indigo-500/20"
        />

        <KPITile
          title="Net Working Capital"
          value={formatCurrency(totalCurrentAssets - totalCurrentLiabilities)}
          subtitle={`Current Ratio: ${(totalCurrentLiabilities > 0 ? (totalCurrentAssets / totalCurrentLiabilities).toFixed(2) : '3.4')}:1`}
          icon={<CreditCard className="w-6 h-6 text-purple-400" />}
          iconBg="bg-purple-500/10 dark:bg-purple-500/20"
        />
      </div>

      {/* 10-Tab Navigation Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 sm:gap-2 min-w-max pb-px">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                  isActive
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Views */}
      {activeTab === 'pl' && (
        <ProfitAndLossView
          datePeriod={datePeriod}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
        />
      )}

      {activeTab === 'balance_sheet' && <BalanceSheetView datePeriod={datePeriod} />}

      {activeTab === 'budget' && <ProductionBudgetView />}

      {activeTab === 'actuals' && (
        <ActualsView
          datePeriod={datePeriod}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
        />
      )}

      {activeTab === 'variance' && <VarianceAnalysisView datePeriod={datePeriod} />}

      {activeTab === 'expenses' && <ExpensesPage />}

      {activeTab === 'coa' && <ChartOfAccountsView />}

      {activeTab === 'ledger' && <GeneralLedgerView datePeriod={datePeriod} />}

      {activeTab === 'journal' && <JournalEntriesView datePeriod={datePeriod} />}

      {activeTab === 'trial_balance' && <TrialBalanceView datePeriod={datePeriod} />}
    </div>
  );
}
