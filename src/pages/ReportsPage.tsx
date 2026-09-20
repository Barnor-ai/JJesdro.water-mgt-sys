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
import { exportToExcel, exportToCSV, generateProductionReportPDF } from '../lib/exportUtils';

export function ReportsPage() {
  const { productionBatches, sales, finishedGoods, expenses, bottleTypes, machines } = useERPStore();

  const [reportType, setReportType] = useState<
    'production' | 'sales' | 'inventory' | 'expenses' | 'waste'
  >('production');
  const [dateRange, setDateRange] = useState('This Month');
  const [selectedSize, setSelectedSize] = useState('all');

  const handleExportExcel = () => {
    if (reportType === 'production') {
      exportToExcel(
        productionBatches.map((b) => ({
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
        'H2O_Production_Report'
      );
    } else if (reportType === 'sales') {
      exportToExcel(
        sales.map((s) => ({
          Invoice: s.invoice_number,
          Customer: s.customer_name,
          Date: s.sale_date,
          Total: s.total_amount,
          Paid: s.amount_paid,
          Status: s.payment_status,
        })),
        'H2O_Sales_Report'
      );
    } else if (reportType === 'inventory') {
      exportToExcel(
        finishedGoods.map((fg) => ({
          Size: fg.bottle_size,
          Location: fg.location,
          CurrentStock: fg.current_stock,
          AvailableStock: fg.available_stock,
          MinThreshold: fg.min_stock,
        })),
        'H2O_Inventory_Report'
      );
    } else {
      exportToExcel(
        expenses.map((e) => ({
          Date: e.date,
          Category: e.category,
          Description: e.description,
          Payee: e.payee,
          Amount: e.amount,
        })),
        'H2O_Expense_Report'
      );
    }
  };

  const handleExportCSV = () => {
    if (reportType === 'production') {
      exportToCSV(productionBatches, 'H2O_Production_Batches');
    } else if (reportType === 'sales') {
      exportToCSV(sales, 'H2O_Sales_Invoices');
    } else {
      exportToCSV(expenses, 'H2O_Expenses');
    }
  };

  const handleExportPDF = () => {
    generateProductionReportPDF(productionBatches, finishedGoods);
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

          <Select
            label="Date Horizon"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="Today">Today's Realtime Cycle</option>
            <option value="This Week">Current Week</option>
            <option value="This Month">Current Fiscal Month</option>
            <option value="This Quarter">Current Quarter (Q3)</option>
            <option value="Year to Date">Year to Date (YTD 2026)</option>
          </Select>

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
              Ready for executive presentation and plant audit sign-off
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
                  {productionBatches.map((b) => (
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
                    <th className="p-3 text-right">Total ($)</th>
                    <th className="p-3 text-right">Paid ($)</th>
                    <th className="p-3 text-center pr-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sales.map((s) => (
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
                  {finishedGoods.map((fg) => (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
