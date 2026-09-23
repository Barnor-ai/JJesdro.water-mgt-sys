import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Download,
  Calendar,
  Filter,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../lib/utils';
import { exportToExcel } from '../../lib/exportUtils';
import { FinancialDatePeriod, isDateInFinancialPeriod } from './financialUtils';

interface GeneralLedgerViewProps {
  datePeriod: FinancialDatePeriod;
}

export function GeneralLedgerView({ datePeriod }: GeneralLedgerViewProps) {
  const { chartOfAccounts = [], sales = [], expenses = [], purchases = [], journalEntries = [] } =
    useERPStore();

  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Generate synthetic and real ledger entries from confirmed store events
  const ledgerEntries = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      account_code: string;
      account_name: string;
      reference: string;
      description: string;
      debit: number;
      credit: number;
    }> = [];

    // From Sales: Debit 1020/1030 (Bank/AR), Credit 4010 (Revenue)
    sales.forEach((s) => {
      const isPaid = s.payment_status === 'Paid';
      list.push({
        id: `gl-sale-dr-${s.id}`,
        date: s.sale_date || new Date().toISOString().slice(0, 10),
        account_code: isPaid ? '1020' : '1030',
        account_name: isPaid ? 'Commercial Operating Bank Account' : 'Accounts Receivable (Debtors)',
        reference: s.invoice_number,
        description: `Customer Sale - ${s.customer_name}`,
        debit: s.total_amount,
        credit: 0,
      });
      list.push({
        id: `gl-sale-cr-${s.id}`,
        date: s.sale_date || new Date().toISOString().slice(0, 10),
        account_code: '4010',
        account_name: 'Packaged Water Sales Revenue',
        reference: s.invoice_number,
        description: `Revenue recognized from ${s.invoice_number}`,
        debit: 0,
        credit: s.total_amount,
      });
    });

    // From Expenses: Debit 6000s (OPEX), Credit 1020 (Bank)
    expenses.forEach((e) => {
      list.push({
        id: `gl-exp-dr-${e.id}`,
        date: e.date || (e as any).expense_date || new Date().toISOString().slice(0, 10),
        account_code: '6010',
        account_name: `Operating Expense - ${e.category}`,
        reference: e.receipt_number || `EXP-${e.id.slice(-4)}`,
        description: `${e.category}: ${e.description || e.payee}`,
        debit: e.amount,
        credit: 0,
      });
      list.push({
        id: `gl-exp-cr-${e.id}`,
        date: e.date || (e as any).expense_date || new Date().toISOString().slice(0, 10),
        account_code: '1020',
        account_name: 'Commercial Operating Bank Account',
        reference: e.receipt_number || `EXP-${e.id.slice(-4)}`,
        description: `Payment for ${e.category} - ${e.payee}`,
        debit: 0,
        credit: e.amount,
      });
    });

    // From POs (Purchases): Debit 1040 (Raw Materials), Credit 2010 (Accounts Payable)
    purchases.forEach((p) => {
      list.push({
        id: `gl-po-dr-${p.id}`,
        date: p.order_date || new Date().toISOString().slice(0, 10),
        account_code: '1040',
        account_name: 'Raw Materials & Preforms Inventory',
        reference: p.po_number,
        description: `PO for raw materials from ${p.supplier_name}`,
        debit: p.total_amount,
        credit: 0,
      });
      list.push({
        id: `gl-po-cr-${p.id}`,
        date: p.order_date || new Date().toISOString().slice(0, 10),
        account_code: '2010',
        account_name: 'Accounts Payable (Suppliers & Vendors)',
        reference: p.po_number,
        description: `Trade payable for ${p.po_number}`,
        debit: 0,
        credit: p.total_amount,
      });
    });

    // From Manual Journal Entries
    journalEntries.forEach((je) => {
      je.lines.forEach((line, idx) => {
        list.push({
          id: `gl-je-${je.id}-${idx}`,
          date: je.date,
          account_code: line.account_code,
          account_name: line.account_name,
          reference: je.entry_number,
          description: line.description || je.description,
          debit: line.debit,
          credit: line.credit,
        });
      });
    });

    // Sort descending by date
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [sales, expenses, purchases, journalEntries]);

  // Filter ledger entries
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((e) => {
      const matchAccount =
        selectedAccountCode === 'all' || e.account_code === selectedAccountCode;
      const matchSearch =
        !searchTerm ||
        e.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.account_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPeriod = isDateInFinancialPeriod(e.date, datePeriod);
      return matchAccount && matchSearch && matchPeriod;
    });
  }, [ledgerEntries, selectedAccountCode, searchTerm, datePeriod]);

  const totalDebits = filteredEntries.reduce((acc, e) => acc + e.debit, 0);
  const totalCredits = filteredEntries.reduce((acc, e) => acc + e.credit, 0);

  const handleExport = () => {
    const data = filteredEntries.map((e) => ({
      Date: e.date,
      Reference: e.reference,
      'Account Code': e.account_code,
      'Account Name': e.account_name,
      Description: e.description,
      Debit: e.debit,
      Credit: e.credit,
    }));
    exportToExcel(data, `General_Ledger_${datePeriod.replace(/\s+/g, '_')}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Ledger Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Filtered Transactions</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {filteredEntries.length} lines
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">For horizon: {datePeriod}</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Total Period Debits</span>
          <p className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
            {formatCurrency(totalDebits)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Asset & Expense increments</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500">Total Period Credits</span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {formatCurrency(totalCredits)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Revenue & Liability increments</span>
        </Card>
      </div>

      {/* Main Ledger Table */}
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>General Ledger Registry (Detailed Audited Postings)</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audited posting records showing exact debits and credits by account
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1.5" /> Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference, description, account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <select
                value={selectedAccountCode}
                onChange={(e) => setSelectedAccountCode(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="all">All Accounts Consolidated</option>
                {chartOfAccounts.map((a) => (
                  <option key={a.id} value={a.code}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500">
                <tr>
                  <th className="p-3.5 pl-6">Date</th>
                  <th className="p-3">Reference #</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Debit</th>
                  <th className="p-3 text-right pr-6">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3 pl-6 text-slate-500 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="p-3 font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                      {e.reference}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      <span className="font-mono text-slate-400 mr-1.5">{e.account_code}</span>
                      {e.account_name}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {e.description}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-sky-600 dark:text-sky-400">
                      {e.debit > 0 ? formatCurrency(e.debit) : '—'}
                    </td>
                    <td className="p-3 text-right pr-6 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {e.credit > 0 ? formatCurrency(e.credit) : '—'}
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No general ledger records found for this criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
