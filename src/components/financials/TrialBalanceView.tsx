import React from 'react';
import {
  Scale,
  ShieldCheck,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../lib/utils';
import { exportToExcel, generateFinancialReportPDF } from '../../lib/exportUtils';
import { FinancialDatePeriod } from './financialUtils';

interface TrialBalanceViewProps {
  datePeriod: FinancialDatePeriod;
}

export function TrialBalanceView({ datePeriod }: TrialBalanceViewProps) {
  const { chartOfAccounts = [] } = useERPStore();

  // Compute Debit vs Credit balance for each account based on normal balance
  const rows = chartOfAccounts.map((a) => {
    const isDebitNormal =
      a.normal_balance === 'Debit' ||
      a.category === 'Asset' ||
      a.category === 'Cost of Sales' ||
      a.category === 'Operating Expense';

    const debit = isDebitNormal ? a.current_balance : 0;
    const credit = !isDebitNormal ? a.current_balance : 0;

    return {
      id: a.id,
      code: a.code,
      name: a.name,
      category: a.category,
      sub_category: a.sub_category,
      debit,
      credit,
    };
  });

  const totalDebits = rows.reduce((acc, r) => acc + r.debit, 0);
  const totalCredits = rows.reduce((acc, r) => acc + r.credit, 0);
  const diff = Math.abs(totalDebits - totalCredits);
  const isBalanced = diff < 1;

  const handleExport = () => {
    const data = rows.map((r) => ({
      'Account Code': r.code,
      'Account Name': r.name,
      Category: r.category,
      'Debit Balance': r.debit > 0 ? r.debit : 0,
      'Credit Balance': r.credit > 0 ? r.credit : 0,
    }));
    data.push({
      'Account Code': 'TOTAL',
      'Account Name': 'Trial Balance Summary',
      Category: 'Grand Total' as any,
      'Debit Balance': totalDebits,
      'Credit Balance': totalCredits,
    });
    exportToExcel(data, `Trial_Balance_${datePeriod.replace(/\s+/g, '_')}`);
  };

  const handleExportPDF = () => {
    generateFinancialReportPDF('TRIAL BALANCE AUDIT', datePeriod, [
      {
        title: 'Adjusted Ledger Account Balances',
        rows: rows.map((r) => ({
          label: `${r.code} - ${r.name}`,
          amount: r.debit > 0 ? r.debit : r.credit,
        })),
        totalLabel: 'Total Debits & Credits',
        totalAmount: totalDebits,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Equilibrium Verification Card */}
      <div
        className={`flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border text-xs ${
          isBalanced
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-amber-500/10 border-amber-500/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isBalanced ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
            }`}
          >
            {isBalanced ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">
              {isBalanced ? 'Trial Balance Verified & In Mathematical Equilibrium' : 'Imbalance Detected'}
            </h4>
            <p className="text-slate-500 dark:text-slate-400">
              Total Debits ({formatCurrency(totalDebits)}) = Total Credits ({formatCurrency(totalCredits)})
            </p>
          </div>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center gap-2">
          <Badge variant={isBalanced ? 'success' : 'danger'}>
            {isBalanced ? 'Verified Balanced' : `Variance: ${formatCurrency(diff)}`}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export Excel
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportPDF}>
            <FileText className="w-3.5 h-3.5 mr-1" /> Export Statement PDF
          </Button>
        </div>
      </div>

      {/* Trial Balance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Adjusted Trial Balance</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete general ledger closing balances for active accounting cycle: <span className="font-semibold">{datePeriod}</span>
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500">
                <tr>
                  <th className="p-3.5 pl-6">Code</th>
                  <th className="p-3">Account Title</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3 text-right">Debit Balance</th>
                  <th className="p-3 text-right pr-6">Credit Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3 pl-6 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {r.code}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {r.name}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {r.category}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      {r.debit > 0 ? formatCurrency(r.debit) : '—'}
                    </td>
                    <td className="p-3 text-right pr-6 font-mono font-semibold text-slate-900 dark:text-white">
                      {r.credit > 0 ? formatCurrency(r.credit) : '—'}
                    </td>
                  </tr>
                ))}

                {/* Grand Total Row */}
                <tr className="bg-slate-100 dark:bg-slate-800/80 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="p-3.5 pl-6" colSpan={3}>
                    GRAND TOTAL BALANCES
                  </td>
                  <td className="p-3.5 text-right font-mono text-sky-600 dark:text-sky-400 text-sm">
                    {formatCurrency(totalDebits)}
                  </td>
                  <td className="p-3.5 text-right pr-6 font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(totalCredits)}
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
