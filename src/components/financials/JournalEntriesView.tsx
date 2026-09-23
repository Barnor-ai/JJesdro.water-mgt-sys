import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
} from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { JournalEntry, JournalEntryLine } from '../../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatCurrency, formatDate } from '../../lib/utils';
import { exportToExcel } from '../../lib/exportUtils';
import { FinancialDatePeriod, isDateInFinancialPeriod } from './financialUtils';

interface JournalEntriesViewProps {
  datePeriod: FinancialDatePeriod;
}

export function JournalEntriesView({ datePeriod }: JournalEntriesViewProps) {
  const { journalEntries = [], chartOfAccounts = [], addJournalEntry, currentUser } = useERPStore();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalEntryLine[]>([
    {
      account_code: chartOfAccounts[0]?.code || '1010',
      account_name: chartOfAccounts[0]?.name || 'Cash on Hand',
      debit: 500,
      credit: 0,
      description: '',
    },
    {
      account_code: chartOfAccounts[1]?.code || '4010',
      account_name: chartOfAccounts[1]?.name || 'Packaged Water Sales Revenue',
      debit: 0,
      credit: 500,
      description: '',
    },
  ]);

  const totalDebits = lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const totalCredits = lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001 && totalDebits > 0;

  const handleAddLine = () => {
    const defaultAcc = chartOfAccounts[0];
    setLines([
      ...lines,
      {
        account_code: defaultAcc?.code || '1010',
        account_name: defaultAcc?.name || 'Cash',
        debit: 0,
        credit: 0,
        description: '',
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: keyof JournalEntryLine, val: any) => {
    const updated = [...lines];
    if (field === 'account_code') {
      const found = chartOfAccounts.find((a) => a.code === val);
      updated[idx].account_code = val;
      if (found) updated[idx].account_name = found.name;
    } else {
      (updated[idx] as any)[field] = val;
    }
    setLines(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;

    addJournalEntry({
      entry_number: `JE-${Date.now().toString().slice(-6)}`,
      date,
      reference,
      description,
      lines: lines.map((l) => ({
        ...l,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
      total_amount: totalDebits,
      status: 'Posted',
      created_by: currentUser.full_name,
    });

    setIsModalOpen(false);
    setDescription('');
    setReference('');
  };

  const filteredEntries = journalEntries.filter((je) =>
    isDateInFinancialPeriod(je.date, datePeriod)
  );

  const handleExport = () => {
    const rows: any[] = [];
    filteredEntries.forEach((je) => {
      je.lines.forEach((l) => {
        rows.push({
          'Entry #': je.entry_number,
          Date: je.date,
          Reference: je.reference || '',
          Memo: je.description,
          'Account Code': l.account_code,
          'Account Name': l.account_name,
          Debit: l.debit,
          Credit: l.credit,
          Status: je.status,
          Author: je.created_by,
        });
      });
    });
    exportToExcel(rows, `Journal_Entries_${datePeriod.replace(/\s+/g, '_')}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Double-Entry General Journal Entries</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Balanced audit journal vouchers with verified debit-credit equilibrium
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1.5" /> Export Excel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Post Journal Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEntries.map((je) => (
              <div key={je.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">
                      {je.entry_number}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {je.description}
                    </span>
                    {je.reference && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Ref: {je.reference}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-slate-400">{formatDate(je.date)}</span>
                    <Badge variant="success" size="sm">
                      {je.status}
                    </Badge>
                  </div>
                </div>

                {/* Sub-table for Lines */}
                <div className="rounded-lg border border-slate-200/70 dark:border-slate-800 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="p-2 pl-3">Account</th>
                        <th className="p-2">Line Memo</th>
                        <th className="p-2 text-right">Debit</th>
                        <th className="p-2 text-right pr-3">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {je.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="p-2 pl-3 font-semibold text-slate-800 dark:text-slate-200">
                            <span className="font-mono text-slate-400 mr-1.5">{line.account_code}</span>
                            {line.account_name}
                          </td>
                          <td className="p-2 text-slate-500">{line.description || '—'}</td>
                          <td className="p-2 text-right font-mono font-semibold text-sky-600">
                            {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                          </td>
                          <td className="p-2 text-right pr-3 font-mono font-semibold text-emerald-600">
                            {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {filteredEntries.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No journal entries posted for {datePeriod}.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Post Journal Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Post General Journal Voucher"
        description="Record manual double-entry accounting adjustments and accruals"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Transaction Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              label="Reference / Source Voucher"
              placeholder="e.g. ADJ-001 or BANK-REC"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <Input
            label="General Description / Memo"
            placeholder="e.g. Month-end depreciation adjustment on reverse osmosis plant..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* Lines Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Journal Lines (Debits & Credits)
              </label>
              <Button variant="ghost" size="sm" type="button" onClick={handleAddLine}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {lines.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex-1 min-w-0">
                    <select
                      value={l.account_code}
                      onChange={(e) => handleLineChange(idx, 'account_code', e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    >
                      {chartOfAccounts.map((a) => (
                        <option key={a.id} value={a.code}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Debit"
                      value={l.debit || ''}
                      onChange={(e) => handleLineChange(idx, 'debit', Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-right"
                    />
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Credit"
                      value={l.credit || ''}
                      onChange={(e) => handleLineChange(idx, 'credit', Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-right"
                    />
                  </div>

                  {lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Balancing Verification Bar */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                isBalanced
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600'
              }`}
            >
              <span>Total Debits: {formatCurrency(totalDebits)}</span>
              <span>Total Credits: {formatCurrency(totalCredits)}</span>
              <span className="font-sans font-bold">
                {isBalanced ? '✓ Balanced' : `Diff: ${formatCurrency(Math.abs(totalDebits - totalCredits))}`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!isBalanced}>
              Post Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
