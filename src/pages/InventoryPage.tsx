import React, { useState } from 'react';
import {
  Package,
  ArrowDownUp,
  Plus,
  Search,
  Download,
  Barcode,
  ArrowRight,
  Sparkles,
  Layers,
  MapPin,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { BottleSize, TransactionType } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatNumber, formatDate, formatDateTime } from '../lib/utils';
import { exportToExcel } from '../lib/exportUtils';

export function InventoryPage({ onOpenScanner }: { onOpenScanner: () => void }) {
  const {
    finishedGoods,
    transactions,
    bottleTypes,
    currentUser,
    addWarehouseTransaction,
  } = useERPStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');

  // Transaction Form State
  const [txType, setTxType] = useState<TransactionType>('Stock In');
  const [txSize, setTxSize] = useState<BottleSize>('500ml');
  const [txQuantity, setTxQuantity] = useState<number>(1000);
  const [fromLocation, setFromLocation] = useState('Production Line #1');
  const [toLocation, setToLocation] = useState('Warehouse Bay A - Rack 02');
  const [notes, setNotes] = useState('');

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    addWarehouseTransaction({
      type: txType,
      product_size: txSize,
      quantity: Number(txQuantity),
      from_location: fromLocation,
      to_location: toLocation,
      notes,
      created_by: currentUser.full_name,
    });
    setIsModalOpen(false);
  };

  const handleExportStock = () => {
    exportToExcel(
      finishedGoods.map((fg) => ({
        BottleSize: fg.bottle_size,
        Location: fg.location,
        Opening: fg.opening_stock,
        Produced: fg.produced_stock,
        Sold: fg.sold_stock,
        Returned: fg.returned_stock,
        Damaged: fg.damaged_stock,
        CurrentStock: fg.current_stock,
        Reserved: fg.reserved_stock,
        Available: fg.available_stock,
        MinStock: fg.min_stock,
        MaxStock: fg.max_stock,
      })),
      'H2O_Warehouse_Stock_Master'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Warehouse Logistics & Inventory Control
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time multi-location warehouse transactions, stock adjustments, and barcode verification
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onOpenScanner}>
            <Barcode className="w-4 h-4 mr-1.5 text-sky-500" /> Barcode Scanner
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportStock}>
            <Download className="w-4 h-4 mr-1.5" /> Export Stock (.xlsx)
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Log Transaction
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 w-fit border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'inventory'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Finished Stock Matrix ({finishedGoods.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'transactions'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Movement Transactions ({transactions.length})
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Finished Goods Mathematical Stock Matrix</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formula: Current = (Opening + Produced + Returned) - (Sold + Damaged)
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-500 font-semibold">
              ● Active Live Recalculation
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold font-sans">
                  <tr>
                    <th className="p-3.5 pl-5">SKU / Size</th>
                    <th className="p-3">Location</th>
                    <th className="p-3 text-right">Opening</th>
                    <th className="p-3 text-right text-indigo-500">+ Produced</th>
                    <th className="p-3 text-right text-emerald-500">- Sold</th>
                    <th className="p-3 text-right text-blue-500">+ Return</th>
                    <th className="p-3 text-right text-rose-500">- Damaged</th>
                    <th className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      = Current Stock
                    </th>
                    <th className="p-3 text-right">Reserved</th>
                    <th className="p-3 text-right text-sky-500 font-bold">Available</th>
                    <th className="p-3 text-center pr-5 font-sans">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {finishedGoods.map((fg) => {
                    const isLow = fg.current_stock <= fg.min_stock;
                    return (
                      <tr
                        key={fg.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3.5 pl-5 font-sans font-bold text-slate-900 dark:text-white text-sm">
                          {fg.bottle_size}
                        </td>
                        <td className="p-3 font-sans text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" /> {fg.location}
                        </td>
                        <td className="p-3 text-right text-slate-500">
                          {fg.opening_stock.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-indigo-600 dark:text-indigo-400">
                          +{fg.produced_stock.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">
                          -{fg.sold_stock.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-blue-600 dark:text-blue-400">
                          +{fg.returned_stock.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-rose-500">
                          -{fg.damaged_stock.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-black text-sm text-slate-900 dark:text-white bg-sky-500/5">
                          {fg.current_stock.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-slate-400">
                          {fg.reserved_stock.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-bold text-sky-600 dark:text-sky-400">
                          {fg.available_stock.toLocaleString()}
                        </td>
                        <td className="p-3 text-center pr-5 font-sans">
                          <Badge variant={isLow ? 'danger' : 'success'} size="sm">
                            {isLow ? 'REORDER' : 'HEALTHY'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Warehouse Movement & Transaction Log</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audit record of all inbound, outbound, transfers, and inventory reconciliations
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5 pl-5">Reference Code</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Size</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3">From Location</th>
                    <th className="p-3">To Location</th>
                    <th className="p-3">Logged By</th>
                    <th className="p-3 text-right pr-5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3.5 pl-5 font-mono font-bold text-sky-600 dark:text-sky-400">
                        {tx.reference_code}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            tx.type === 'Stock In'
                              ? 'success'
                              : tx.type === 'Stock Out'
                              ? 'info'
                              : tx.type === 'Damaged'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {tx.product_size}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {tx.quantity.toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-500 truncate max-w-[140px]">
                        {tx.from_location || '-'}
                      </td>
                      <td className="p-3 text-slate-500 truncate max-w-[140px]">
                        {tx.to_location || '-'}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {tx.created_by}
                      </td>
                      <td className="p-3 text-right pr-5 text-slate-400 font-mono">
                        {formatDateTime(tx.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Warehouse Stock Transaction"
        description="Records inbound, outbound, relocation, damage or stock count audit"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTransaction} className="space-y-4">
          <Select
            label="Transaction Type"
            value={txType}
            onChange={(e) => setTxType(e.target.value as TransactionType)}
          >
            <option value="Stock In">Stock In (Inbound)</option>
            <option value="Stock Out">Stock Out (Outbound Dispatch)</option>
            <option value="Transfer">Internal Transfer / Bay Relocation</option>
            <option value="Adjustment">Variance Adjustment</option>
            <option value="Return">Customer Return</option>
            <option value="Damaged">Warehouse Damaged / Expired</option>
            <option value="Stock Count">Physical Stock Count Reconciliation</option>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Bottle Size SKU"
              value={txSize}
              onChange={(e) => setTxSize(e.target.value as BottleSize)}
            >
              {bottleTypes.map((b) => (
                <option key={b.id} value={b.size}>
                  {b.size} - {b.name}
                </option>
              ))}
            </Select>

            <Input
              label="Quantity (Units)"
              type="number"
              min="1"
              value={txQuantity}
              onChange={(e) => setTxQuantity(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From Location"
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              placeholder="e.g. Production Line / Bay A"
            />
            <Input
              label="To Location"
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              placeholder="e.g. Dispatch Dock / Bay B"
            />
          </div>

          <Input
            label="Transaction Notes / Reason"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Relocated for priority truck loading..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Apply & Update Inventory
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
