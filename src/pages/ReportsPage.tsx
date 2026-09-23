import React, { useState } from 'react';
import {
  FileBarChart2,
  Download,
  Calendar,
  Filter,
  FileText,
  Table,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import {
  exportToExcel,
  exportToCSV,
  generateProductionReportPDF,
  generateSalesAuditReportPDF,
  generateExpenseReportPDF,
  generateInventoryReportPDF,
} from '../lib/exportUtils';

export function ReportsPage() {
  const { productionBatches, sales, finishedGoods, expenses, bottleTypes, machines } = useERPStore();

  const [reportType, setReportType] = useState<
    'production' | 'sales' | 'inventory' | 'expenses' | 'waste'
  >('production');
  const [dateRange, setDateRange] = useState('This Month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedSize, setSelectedSize] = useState('all');

  const isDateInRange = (dateString?: string) => {
    if (!dateString) return true;
    const d = new Date(dateString);
    const now = new Date();

    switch (dateRange) {
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
        const q = Math.floor(d.getMonth() / 3);
        return currentQ === q && d.getFullYear() === now.getFullYear();
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
        if (!customStartDate && !customEndDate) return true;
        const dTime = d.getTime();
        if (customStartDate && dTime < new Date(customStartDate).getTime()) return false;
        if (customEndDate && dTime > new Date(customEndDate).getTime() + 86400000) return false;
        return true;
      }
      default:
        return true;
    }
  };

  const filteredProductionBatches = React.useMemo(() => {
    return productionBatches.filter((b) => {
      const matchSize = selectedSize === 'all' || b.bottle_size === selectedSize;
      const matchDate = isDateInRange(b.production_date);
      return matchSize && matchDate;
    });
  }, [productionBatches, selectedSize, dateRange, customStartDate, customEndDate]);

  const filteredSales = React.useMemo(() => {
    return sales.filter((s) => isDateInRange(s.sale_date));
  }, [sales, dateRange, customStartDate, customEndDate]);

  const filteredInventory = React.useMemo(() => {
    return finishedGoods.filter((fg) => {
      return selectedSize === 'all' || fg.bottle_size === selectedSize;
    });
  }, [finishedGoods, selectedSize]);

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => isDateInRange(e.date));
  }, [expenses, dateRange, customStartDate, customEndDate]);

  const handleExportExcel = () => {
    if (reportType === 'production') {
      exportToExcel(
        filteredProductionBatches.map((b) => ({
          Batch: b.batch_number,
          Date: b.production_date,
          Shift: b.shift,
          Size: b.bottle_size,
          Machine: b.machine_used,
          Produced: b.quantity_produced,
          Accepted: b.accepted_quantity,
          Rejected: b.rejected_quantity,
          Efficiency: `${b.efficiency_percent}%`,
          Cost: b.production_cost,
        })),
        'Production_Report'
      );
    } else if (reportType === 'sales') {
      exportToExcel(
        filteredSales.map((s) => ({
          Invoice: s.invoice_number,
          Customer: s.customer_name,
          Date: s.sale_date,
          Total: s.total_amount,
          Paid: s.amount_paid,
          Status: s.payment_status,
        })),
        'Sales_Report'
      );
    } else if (reportType === 'inventory') {
      exportToExcel(
        filteredInventory.map((fg) => ({
          Size: fg.bottle_size,
          Location: fg.location,
          CurrentStock: fg.current_stock,
          AvailableStock: fg.available_stock,
          MinThreshold: fg.min_stock,
        })),
        'Inventory_Report'
      );
    } else {
      exportToExcel(
        filteredExpenses.map((e) => ({
          Date: e.date,
          Category: e.category,
          Description: e.description,
          Payee: e.payee,
          Amount: e.amount,
        })),
        'Expense_Report'
      );
    }
  };

  const handleExportCSV = () => {
    if (reportType === 'production') {
      exportToCSV(filteredProductionBatches, 'Production_Batches');
    } else if (reportType === 'sales') {
      exportToCSV(filteredSales, 'Sales_Invoices');
    } else if (reportType === 'inventory') {
      exportToCSV(filteredInventory, 'Inventory_Valuation');
    } else {
      exportToCSV(filteredExpenses, 'Expenses_Ledger');
    }
  };

  const handleExportPDF = () => {
    if (reportType === 'production' || reportType === 'waste') {
      generateProductionReportPDF(filteredProductionBatches, filteredInventory);
    } else if (reportType === 'sales') {
      generateSalesAuditReportPDF(filteredSales);
    } else if (reportType === 'inventory') {
      generateInventoryReportPDF(filteredInventory);
    } else {
      generateExpenseReportPDF(filteredExpenses);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Executive Reporting & Compliance Export
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate printable audit PDFs, formatted spreadsheets (.XLSX), and raw CSV extracts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1 text-slate-500" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-1 text-emerald-500" /> Export Excel
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportPDF}>
            <FileText className="w-4 h-4 mr-1" /> Export Audit PDF
          </Button>
        </div>
      </div>

      {/* Filter Matrix Card */}
      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Report Category"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
          >
            <option value="production">Production & Output Batch Logs</option>
            <option value="sales">Sales & Revenue Realization</option>
            <option value="inventory">Warehouse Inventory Health</option>
            <option value="expenses">Operating Expenses (OPEX)</option>
            <option value="waste">Defect & Scrap Waste Analysis</option>
          </Select>

          <div className="space-y-1">
            <Select
              label="Date Horizon"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
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
            </Select>

            {dateRange === 'Custom Date Range' && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          <Select
            label="Filter Bottle Size SKU"
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
          >
            <option value="all">All Sizes (Consolidated)</option>
            {bottleTypes.map((bt) => (
              <option key={bt.id} value={bt.size}>
                {bt.size}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Live Data Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Generated Report Preview</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filtered horizon: <span className="font-semibold text-sky-600 dark:text-sky-400">{dateRange}</span> • Ready for executive sign-off
            </p>
          </div>
          <Badge variant="secondary">Validated</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {reportType === 'production' && (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold font-sans">
                  <tr>
                    <th className="p-3 pl-5">Batch #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Shift</th>
                    <th className="p-3 text-right">Produced</th>
                    <th className="p-3 text-right text-emerald-500">Accepted</th>
                    <th className="p-3 text-right text-rose-500">Defects</th>
                    <th className="p-3 text-right text-sky-500">Efficiency</th>
                    <th className="p-3 text-right pr-5">Batch Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProductionBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 pl-5 font-bold text-sky-600 dark:text-sky-400">
                        {b.batch_number}
                      </td>
                      <td className="p-3 font-sans text-slate-500">{formatDate(b.production_date)}</td>
                      <td className="p-3 font-sans font-bold">{b.bottle_size}</td>
                      <td className="p-3 font-sans text-slate-400">{b.shift}</td>
                      <td className="p-3 text-right">{b.quantity_produced.toLocaleString()}</td>
                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        {b.accepted_quantity.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-rose-500">{b.rejected_quantity}</td>
                      <td className="p-3 text-right text-sky-600 font-bold">
                        {b.efficiency_percent}%
                      </td>
                      <td className="p-3 text-right pr-5">{formatCurrency(b.production_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'sales' && (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold font-sans">
                  <tr>
                    <th className="p-3 pl-5">Invoice #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-center pr-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 pl-5 font-bold text-sky-600 dark:text-sky-400">
                        {s.invoice_number}
                      </td>
                      <td className="p-3 font-sans font-semibold">{s.customer_name}</td>
                      <td className="p-3 font-sans text-slate-400">{formatDate(s.sale_date)}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(s.total_amount)}</td>
                      <td className="p-3 text-right text-emerald-500">
                        {formatCurrency(s.amount_paid)}
                      </td>
                      <td className="p-3 text-center pr-5 font-sans">
                        <Badge variant="success" size="sm">
                          {s.payment_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'inventory' && (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold font-sans">
                  <tr>
                    <th className="p-3 pl-5">Bottle Size</th>
                    <th className="p-3">Location</th>
                    <th className="p-3 text-right">Current Stock</th>
                    <th className="p-3 text-right">Reserved</th>
                    <th className="p-3 text-right font-bold text-sky-500">Available Stock</th>
                    <th className="p-3 text-center pr-5">Stock Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInventory.map((fg) => (
                    <tr key={fg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 pl-5 font-sans font-bold">{fg.bottle_size}</td>
                      <td className="p-3 font-sans text-slate-400">{fg.location}</td>
                      <td className="p-3 text-right font-bold">{fg.current_stock.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-400">
                        {fg.reserved_stock.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-bold text-sky-600 dark:text-sky-400">
                        {fg.available_stock.toLocaleString()}
                      </td>
                      <td className="p-3 text-center pr-5 font-sans">
                        <Badge variant="success" size="sm">
                          Healthy
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'expenses' && (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold font-sans">
                  <tr>
                    <th className="p-3 pl-5">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Payee</th>
                    <th className="p-3 text-right pr-5">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 pl-5 font-sans text-slate-400">{formatDate(e.date)}</td>
                      <td className="p-3 font-sans font-semibold text-slate-700 dark:text-slate-200">
                        {e.category}
                      </td>
                      <td className="p-3 font-sans text-slate-500">{e.description}</td>
                      <td className="p-3 font-sans text-slate-500">{e.payee}</td>
                      <td className="p-3 text-right pr-5 font-bold text-rose-500">
                        {formatCurrency(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'waste' && (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold font-sans">
                  <tr>
                    <th className="p-3 pl-5">Batch #</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Defect Quantity</th>
                    <th className="p-3 text-right">Scrap Rate</th>
                    <th className="p-3 text-right pr-5">Estimated Waste Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProductionBatches.map((b) => {
                    const scrapRate =
                      b.quantity_produced > 0
                        ? ((b.rejected_quantity / b.quantity_produced) * 100).toFixed(2)
                        : '0.00';
                    const unitCost = b.production_cost / Math.max(1, b.quantity_produced);
                    const wasteCost = b.rejected_quantity * unitCost;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 pl-5 font-bold text-sky-600 dark:text-sky-400">
                          {b.batch_number}
                        </td>
                        <td className="p-3 font-sans font-bold">{b.bottle_size}</td>
                        <td className="p-3 font-sans text-slate-500">{formatDate(b.production_date)}</td>
                        <td className="p-3 text-right text-rose-500 font-bold">
                          {b.rejected_quantity.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-500">{scrapRate}%</td>
                        <td className="p-3 text-right pr-5 font-bold text-rose-600">
                          {formatCurrency(wasteCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
