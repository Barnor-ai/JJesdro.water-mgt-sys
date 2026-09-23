import React, { useState, useMemo } from 'react';
import {
  ListTree,
  Plus,
  Search,
  Download,
  Filter,
  Layers,
  BookOpen,
  DollarSign,
} from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { ChartOfAccount } from '../../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatCurrency, formatNumber } from '../../lib/utils';
import { exportToExcel } from '../../lib/exportUtils';

export function ChartOfAccountsView() {
  const { chartOfAccounts = [] } = useERPStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Account Form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ChartOfAccount['category']>('Operating Expense');
  const [subCategory, setSubCategory] = useState('');
  const [normalBalance, setNormalBalance] = useState<'Debit' | 'Credit'>('Debit');
  const [initialBalance, setInitialBalance] = useState<number>(0);

  const filteredAccounts = useMemo(() => {
    return chartOfAccounts.filter((a) => {
      const matchSearch =
        !search ||
        a.code.toLowerCase().includes(search.toLowerCase()) ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.sub_category?.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'all' || a.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [chartOfAccounts, search, selectedCategory]);

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const newAccount: ChartOfAccount = {
      id: `coa-${Date.now()}`,
      code,
      name,
      category,
      sub_category: subCategory || undefined,
      normal_balance: normalBalance,
      current_balance: Number(initialBalance) || 0,
      is_system: false,
    };
    chartOfAccounts.push(newAccount);
    setIsModalOpen(false);
    setCode('');
    setName('');
    setSubCategory('');
    setInitialBalance(0);
  };

  const handleCategoryChange = (cat: ChartOfAccount['category']) => {
    setCategory(cat);
    if (cat === 'Asset' || cat === 'Cost of Sales' || cat === 'Operating Expense') {
      setNormalBalance('Debit');
    } else {
      setNormalBalance('Credit');
    }
  };

  const handleExport = () => {
    const data = filteredAccounts.map((a) => ({
      'Account Code': a.code,
      'Account Name': a.name,
      Category: a.category,
      'Sub Category': a.sub_category || '',
      'Normal Balance': a.normal_balance,
      'Current Balance': a.current_balance,
      Type: a.is_system ? 'Standard System Account' : 'Custom User Account',
    }));
    exportToExcel(data, 'Chart_of_Accounts');
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards by Category */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(['Asset', 'Liability', 'Equity', 'Revenue', 'Cost of Sales', 'Operating Expense'] as const).map(
          (cat) => {
            const count = chartOfAccounts.filter((a) => a.category === cat).length;
            const total = chartOfAccounts
              .filter((a) => a.category === cat)
              .reduce((acc, a) => acc + (a.current_balance || 0), 0);

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedCategory === cat
                    ? 'border-sky-500 bg-sky-500/10 dark:bg-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-slate-500 block truncate">
                  {cat}
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white mt-1 block font-mono truncate">
                  {formatCurrency(total)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{count} Accounts</span>
              </button>
            );
          }
        )}
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Chart of Accounts (COA)</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official double-entry general ledger numbering and balance categorization
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-1.5" /> Export Excel
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Account
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by code (e.g. 1010) or account title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="all">All Classifications ({chartOfAccounts.length})</option>
                <option value="Asset">Assets (1000s)</option>
                <option value="Liability">Liabilities (2000s)</option>
                <option value="Equity">Equity (3000s)</option>
                <option value="Revenue">Revenue (4000s)</option>
                <option value="Cost of Sales">Cost of Sales (5000s)</option>
                <option value="Operating Expense">Operating Expenses (6000s)</option>
              </select>
            </div>
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
                  <th className="p-3">Sub-Category</th>
                  <th className="p-3 text-center">Normal Balance</th>
                  <th className="p-3 text-right pr-6">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAccounts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 pl-6 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {a.code}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {a.name}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {a.category}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{a.sub_category || '—'}</td>
                    <td className="p-3 text-center font-mono">
                      <Badge variant={a.normal_balance === 'Debit' ? 'outline' : 'secondary'} size="sm">
                        {a.normal_balance}
                      </Badge>
                    </td>
                    <td className="p-3 text-right pr-6 font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(a.current_balance)}
                    </td>
                  </tr>
                ))}
                {filteredAccounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No accounts found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Account Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add General Ledger Account"
        description="Configure new chart of accounts entry with double-entry classification"
      >
        <form onSubmit={handleAddAccount} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Account Code (e.g. 6050)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 6050"
              required
            />
            <Select
              label="Classification"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as any)}
            >
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Revenue">Revenue</option>
              <option value="Cost of Sales">Cost of Sales</option>
              <option value="Operating Expense">Operating Expense</option>
            </Select>
          </div>

          <Input
            label="Account Title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Laboratory Water Quality Testing"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sub-Category"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="e.g. Compliance & Testing"
            />
            <Select
              label="Normal Balance"
              value={normalBalance}
              onChange={(e) => setNormalBalance(e.target.value as any)}
            >
              <option value="Debit">Debit</option>
              <option value="Credit">Credit</option>
            </Select>
          </div>

          <Input
            label="Opening / Current Balance"
            type="number"
            step="0.01"
            value={initialBalance}
            onChange={(e) => setInitialBalance(Number(e.target.value))}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
