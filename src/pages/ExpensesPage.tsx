import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Download,
  Calendar,
  DollarSign,
  Tag,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { Expense, ExpenseCategory } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../lib/utils';
import { exportToExcel } from '../lib/exportUtils';

export function ExpensesPage() {
  const { expenses, addExpense, currentUser } = useERPStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');

  // Form State
  const [category, setCategory] = useState<ExpenseCategory>('Electricity & Power');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(500);
  const [payee, setPayee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    addExpense({
      category,
      description,
      amount: Number(amount),
      date,
      payee,
      payment_method: paymentMethod,
      receipt_number: receiptNumber || `REC-${Date.now().toString().slice(-5)}`,
      recorded_by: currentUser.full_name,
    });
    setIsModalOpen(false);
    setDescription('');
    setPayee('');
    setReceiptNumber('');
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.payee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = filterCat === 'all' || e.category === filterCat;
    return matchesSearch && matchesCat;
  });

  const totalExpenseSum = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Operational Expenses & Plant Outflows
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log manufacturing overheads, generator diesel, municipal water bills, machine spare parts, and payroll
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToExcel(
                expenses.map((e) => ({
                  Date: e.date,
                  Category: e.category,
                  Description: e.description,
                  Payee: e.payee,
                  Amount: e.amount,
                  PaymentMethod: e.payment_method,
                  ReceiptNumber: e.receipt_number,
                  RecordedBy: e.recorded_by,
                })),
                'H2O_Operational_Expenses'
              )
            }
          >
            <Download className="w-4 h-4 mr-1.5" /> Export (.xlsx)
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Record Expense
          </Button>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses by payee, description, or receipt #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Expense Categories</option>
            <option value="Electricity & Power">Electricity & Power</option>
            <option value="Diesel & Fuel">Diesel & Fuel</option>
            <option value="Machine Maintenance">Machine Maintenance</option>
            <option value="Water Treatment & Chemicals">Water Treatment & Chemicals</option>
            <option value="Salaries & Wages">Salaries & Wages</option>
            <option value="Packaging Supplies">Packaging Supplies</option>
            <option value="Logistics & Transport">Logistics & Transport</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expense Audit Ledger</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total Recorded OPEX: {formatCurrency(totalExpenseSum)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Payee / Vendor</th>
                  <th className="p-3">Method</th>
                  <th className="p-3 text-right">Amount ($)</th>
                  <th className="p-3 text-right pr-5">Receipt Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3.5 pl-5 font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(exp.date)}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" size="sm">
                        {exp.category}
                      </Badge>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                      {exp.description}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{exp.payee}</td>
                    <td className="p-3 text-slate-500">{exp.payment_method}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-500">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="p-3 text-right pr-5 font-mono text-slate-400">
                      {exp.receipt_number || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Record Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Operational Expense"
        description="Logs an operational outflow into the general financial ledger"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Expense Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              <option value="Electricity & Power">Electricity & Power</option>
              <option value="Diesel & Fuel">Diesel & Fuel</option>
              <option value="Machine Maintenance">Machine Maintenance</option>
              <option value="Water Treatment & Chemicals">Water Treatment & Chemicals</option>
              <option value="Salaries & Wages">Salaries & Wages</option>
              <option value="Packaging Supplies">Packaging Supplies</option>
              <option value="Logistics & Transport">Logistics & Transport</option>
              <option value="Rent & Utilities">Rent & Utilities</option>
              <option value="Other">Other Miscellaneous</option>
            </Select>

            <Input
              label="Expense Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Expense Description / Purpose"
            placeholder="e.g. 500 Liters Diesel fuel for backup plant generator"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount ($)"
              type="number"
              step="0.01"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />

            <Input
              label="Payee / Vendor"
              placeholder="e.g. Apex Energy Fuels"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Bank Transfer">Bank Transfer / ACH</option>
              <option value="Corporate Debit Card">Corporate Debit Card</option>
              <option value="Petty Cash">Petty Cash</option>
              <option value="Cheque">Corporate Cheque</option>
            </Select>

            <Input
              label="Receipt / Voucher Number"
              placeholder="e.g. REC-84920"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Expense Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
