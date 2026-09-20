import React, { useState, useEffect } from 'react';
import { Search, X, Package, FileText, Users, Factory, ArrowRight } from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../lib/utils';

export function GlobalSearchModal({
  isOpen,
  onClose,
  onNavigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}) {
  const { sales, productionBatches, finishedGoods, customers, machines } = useERPStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const term = searchTerm.toLowerCase().trim();

  const filteredSales = term
    ? sales.filter(
        (s) =>
          s.invoice_number?.toLowerCase().includes(term) ||
          s.customer_name?.toLowerCase().includes(term) ||
          s.payment_status?.toLowerCase().includes(term)
      )
    : [];

  const filteredBatches = term
    ? productionBatches.filter(
        (b) =>
          b.batch_number?.toLowerCase().includes(term) ||
          b.bottle_size?.toLowerCase().includes(term) ||
          b.operator_name?.toLowerCase().includes(term)
      )
    : [];

  const filteredCustomers = term
    ? customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.phone?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term)
      )
    : [];

  const filteredInventory = term
    ? finishedGoods.filter((fg) => fg.bottle_size?.toLowerCase().includes(term))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 z-10 animate-in fade-in zoom-in-95">
        {/* Search Input Box */}
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search batches, invoices, customers, inventory, machines... (esc to close)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-4 text-sm bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!searchTerm && (
            <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              Type anything to search the whole H2O ERP system...
              <div className="mt-3 flex justify-center gap-2">
                <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
                  INV-2026
                </span>
                <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
                  BATCH-500ML
                </span>
                <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
                  Metro Supermarket
                </span>
              </div>
            </div>
          )}

          {/* Sales Invoices Matches */}
          {filteredSales.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-sky-500" /> Sales & Invoices ({filteredSales.length})
              </p>
              <div className="space-y-1.5">
                {filteredSales.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      onNavigate('sales');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-sm text-sky-600 dark:text-sky-400">
                        {s.invoice_number}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        {s.customer_name} • {formatCurrency(s.total_amount)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(s.sale_date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Production Batches Matches */}
          {filteredBatches.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Factory className="h-3.5 w-3.5 text-indigo-500" /> Production Batches ({filteredBatches.length})
              </p>
              <div className="space-y-1.5">
                {filteredBatches.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      onNavigate('production');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-sm text-indigo-600 dark:text-indigo-400">
                        {b.batch_number}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        {b.bottle_size} • {b.accepted_quantity.toLocaleString()} units ({b.efficiency_percent}% eff)
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(b.production_date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers Matches */}
          {filteredCustomers.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-500" /> Customers & Accounts ({filteredCustomers.length})
              </p>
              <div className="space-y-1.5">
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onNavigate('customers');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                        {c.name}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        {c.type} • Bal: {formatCurrency(c.outstanding_balance)}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Matches */}
          {filteredInventory.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-amber-500" /> Finished Goods Inventory ({filteredInventory.length})
              </p>
              <div className="space-y-1.5">
                {filteredInventory.map((i) => (
                  <div
                    key={i.id}
                    onClick={() => {
                      onNavigate('inventory');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        Water Size: {i.bottle_size}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        Current: {i.current_stock.toLocaleString()} • Loc: {i.location}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-sky-500">{i.available_stock.toLocaleString()} available</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchTerm &&
            filteredSales.length === 0 &&
            filteredBatches.length === 0 &&
            filteredCustomers.length === 0 &&
            filteredInventory.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                No matching records found for "{searchTerm}"
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
