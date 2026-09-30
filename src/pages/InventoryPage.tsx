import React, { useState, useMemo } from 'react';
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
  Calendar,
  Filter,
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
import { PeriodSearchEngine } from '../components/common/PeriodSearchEngine';
import { isDateInPeriod, getPeriodDateLabel } from '../lib/dateUtils';

export function InventoryPage({ onOpenScanner }: { onOpenScanner: () => void }) {
  const {
    finishedGoods,
    transactions,
    bottleTypes,
    productionBatches,
    sales,
    currentUser,
    addWarehouseTransaction,
  } = useERPStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<string>('All Time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [txTypeFilter, setTxTypeFilter] = useState('all');

  // Transaction Form State
  const [txType, setTxType] = useState<TransactionType>('Stock In');
  const [txSize, setTxSize] = useState<BottleSize>('500ml');
  const [txQuantity, setTxQuantity] = useState<number>(1000);
  const [fromLocation, setFromLocation] = useState('Production Line #1');
  const [toLocation, setToLocation] = useState('Warehouse Bay A - Rack 02');
  const [notes, setNotes] = useState('');

  const isPeriodActive = period !== 'All Time';

  // Filtered Finished Goods with Period-aware activity
  const filteredFinishedGoods = useMemo(() => {
    return finishedGoods
      .filter((fg) => {
        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchName = (fg.product_name || '').toLowerCase().includes(q);
          const matchSize = (fg.bottle_size || '').toLowerCase().includes(q);
          const matchLoc = (fg.location || '').toLowerCase().includes(q);
          const matchUnit = (fg.unit || '').toLowerCase().includes(q);
          if (!matchName && !matchSize && !matchLoc && !matchUnit) {
            return false;
          }
        }
        // Location filter
        if (
          locationFilter !== 'all' &&
          !fg.location.toLowerCase().includes(locationFilter.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .map((fg) => {
        if (!isPeriodActive) {
          return fg;
        }

        // Calculate period-specific metrics
        const periodBatches = productionBatches.filter(
          (b) =>
            b.bottle_size === fg.bottle_size &&
            isDateInPeriod(b.production_date || b.created_at, period, customStartDate, customEndDate)
        );
        const periodProduced = periodBatches.reduce(
          (acc, b) =>
            acc +
            (b.accepted_quantity !== undefined
              ? b.accepted_quantity
              : Math.max(
                  0,
                  b.quantity_produced - b.rejected_quantity - b.damaged_bottles
                )),
          0
        );

        const periodSales = sales
          .filter((s) =>
            isDateInPeriod(s.sale_date || s.created_at, period, customStartDate, customEndDate)
          )
          .reduce((acc, s) => {
            const item = s.items?.find((i) => i.bottle_size === fg.bottle_size);
            return acc + (item ? item.quantity : 0);
          }, 0);

        const periodTxs = transactions.filter(
          (tx) =>
            tx.product_size === fg.bottle_size &&
            isDateInPeriod(tx.created_at, period, customStartDate, customEndDate)
        );

        const periodDamaged = periodTxs
          .filter((tx) => tx.type === 'Damaged')
          .reduce((acc, tx) => acc + Number(tx.quantity || 0), 0);

        const periodReturned = periodTxs
          .filter(
            (tx) =>
              tx.type === 'Stock In' &&
              (tx.notes?.toLowerCase().includes('return') || false)
          )
          .reduce((acc, tx) => acc + Number(tx.quantity || 0), 0);

        return {
          ...fg,
          produced_stock: periodProduced,
          sold_stock: periodSales,
          damaged_stock: periodDamaged,
          returned_stock: periodReturned,
        };
      });
  }, [
    finishedGoods,
    searchTerm,
    locationFilter,
    period,
    customStartDate,
    customEndDate,
    productionBatches,
    sales,
    transactions,
    isPeriodActive,
  ]);

  // Filtered Warehouse Movement Transactions by Period, Type, Location, and Search
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Period filter
      if (
        period !== 'All Time' &&
        !isDateInPeriod(tx.created_at, period, customStartDate, customEndDate)
      ) {
        return false;
      }
      // Transaction Type filter
      if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) {
        return false;
      }
      // Location filter
      if (
        locationFilter !== 'all' &&
        !tx.from_location?.toLowerCase().includes(locationFilter.toLowerCase()) &&
        !tx.to_location?.toLowerCase().includes(locationFilter.toLowerCase())
      ) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchRef = (tx.reference_code || '').toLowerCase().includes(q);
        const matchSize = (tx.product_size || '').toLowerCase().includes(q);
        const matchType = (tx.type || '').toLowerCase().includes(q);
        const matchFrom = (tx.from_location || '').toLowerCase().includes(q);
        const matchTo = (tx.to_location || '').toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        const matchUser = (tx.created_by || '').toLowerCase().includes(q);
        if (
          !matchRef &&
          !matchSize &&
          !matchType &&
          !matchFrom &&
          !matchTo &&
          !matchNotes &&
          !matchUser
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    transactions,
    period,
    customStartDate,
    customEndDate,
    txTypeFilter,
    locationFilter,
    searchTerm,
  ]);

  const totalTxIn = useMemo(() => {
    return filteredTransactions
      .filter((tx) => tx.type === 'Stock In' || tx.type === 'Transfer')
      .reduce((acc, tx) => acc + Number(tx.quantity || 0), 0);
  }, [filteredTransactions]);

  const totalTxOut = useMemo(() => {
    return filteredTransactions
      .filter((tx) => tx.type === 'Stock Out' || tx.type === 'Damaged')
      .reduce((acc, tx) => acc + Number(tx.quantity || 0), 0);
  }, [filteredTransactions]);

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    addWarehouseTransaction({
      type: txType,
      product_size: txSize,
      quantity: Number(txQuantity),
      from_location: fromLocation,
      to_location: setToLocation ? toLocation : '',
      notes,
      created_by: currentUser.full_name,
    });
    setIsModalOpen(false);
  };

  const handleExportStock = () => {
    if (activeTab === 'inventory') {
      exportToExcel(
        filteredFinishedGoods.map((fg) => ({
          BottleSize: fg.bottle_size,
          Product:
            fg.product_name ||
            (fg.bottle_size === '500ml-sachet'
              ? 'Sachet Water 500 ml'
              : `Bottled Water ${fg.bottle_size}`),
          Unit:
            fg.unit || (fg.bottle_size === '500ml-sachet' ? 'Sachet' : 'Bottle'),
          Location: fg.location,
          Period: period,
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
        `H2O_Warehouse_Stock_${period.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`
      );
    } else {
      exportToExcel(
        filteredTransactions.map((tx) => ({
          ReferenceCode: tx.reference_code,
          Type: tx.type,
          Size: tx.product_size,
          Quantity: tx.quantity,
          FromLocation: tx.from_location || '',
          ToLocation: tx.to_location || '',
          LoggedBy: tx.created_by,
          Date: tx.created_at,
          Notes: tx.notes || '',
        })),
        `H2O_Warehouse_Transactions_${period.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`
      );
    }
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
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Finished Stock Matrix ({filteredFinishedGoods.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Movement Transactions ({filteredTransactions.length})
        </button>
      </div>

      {/* Period & Keyword Search Engine */}
      <PeriodSearchEngine
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={
          activeTab === 'inventory'
            ? 'Search inventory by product, SKU, size, location...'
            : 'Search movement transactions by code, type, size, location, operator...'
        }
        period={period}
        onPeriodChange={setPeriod}
        customStartDate={customStartDate}
        onCustomStartDateChange={setCustomStartDate}
        customEndDate={customEndDate}
        onCustomEndDateChange={setCustomEndDate}
        resultsCount={
          activeTab === 'inventory'
            ? filteredFinishedGoods.length
            : filteredTransactions.length
        }
        resultsLabel={activeTab === 'inventory' ? 'Products' : 'Transactions'}
        onReset={() => {
          setLocationFilter('all');
          setTxTypeFilter('all');
        }}
        extraFilters={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Location Filter */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="all">All Locations</option>
              <option value="Main Warehouse">Main Warehouse</option>
              <option value="Bay A">Bay A</option>
              <option value="Bay B">Bay B</option>
              <option value="Bay C">Bay C</option>
              <option value="Bay D">Bay D</option>
              <option value="Cold Depot">Cold Depot</option>
              <option value="Production Line">Production Line</option>
            </select>

            {/* Transaction Type Filter (Active on transactions tab) */}
            {activeTab === 'transactions' && (
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="all">All Transaction Types</option>
                <option value="Stock In">Stock In</option>
                <option value="Stock Out">Stock Out</option>
                <option value="Transfer">Transfer</option>
                <option value="Adjustment">Adjustment</option>
                <option value="Damaged">Damaged</option>
              </select>
            )}
          </div>
        }
      />

      {activeTab === 'inventory' ? (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Finished Goods Mathematical Stock Matrix</CardTitle>
                {isPeriodActive && (
                  <Badge variant="info" size="sm" className="font-mono text-[10px]">
                    Period: {getPeriodDateLabel(period, customStartDate, customEndDate)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isPeriodActive
                  ? 'Showing reconciled production, sales, returns, and damages recorded in the selected period.'
                  : 'Cumulative Formula: Current = (Opening + Produced + Returned) - (Sold + Damaged)'}
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-500 font-semibold shrink-0">
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
                    <th className="p-3 text-right text-indigo-500">
                      {isPeriodActive ? '+ Produced in Period' : '+ Produced'}
                    </th>
                    <th className="p-3 text-right text-emerald-500">
                      {isPeriodActive ? '- Sold in Period' : '- Sold'}
                    </th>
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
                  {filteredFinishedGoods.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400 font-sans">
                        No finished stock items matched your search query or location filters.
                      </td>
                    </tr>
                  ) : (
                    filteredFinishedGoods.map((fg) => {
                      const isLow = fg.current_stock <= fg.min_stock;
                      return (
                        <tr
                          key={fg.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-3.5 pl-5 font-sans font-bold text-slate-900 dark:text-white text-sm">
                            <div className="flex items-center gap-1.5">
                              <span>
                                {fg.product_name ||
                                  (fg.bottle_size === '500ml-sachet'
                                    ? 'Sachet Water 500 ml'
                                    : `Bottled Water ${fg.bottle_size}`)}
                              </span>
                              {fg.bottle_size === '500ml-sachet' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-500 text-white tracking-wider">
                                  SACHET
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {fg.bottle_size} • Unit:{' '}
                              {fg.unit ||
                                (fg.bottle_size === '500ml-sachet'
                                  ? 'Sachet'
                                  : 'Bottle')}
                            </span>
                          </td>
                          <td className="p-3 font-sans text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" /> {fg.location}
                          </td>
                          <td className="p-3 text-right text-slate-500">
                            {fg.opening_stock.toLocaleString()}
                          </td>
                          <td className="p-3 text-right text-indigo-600 dark:text-indigo-400 font-semibold">
                            +{fg.produced_stock.toLocaleString()}
                          </td>
                          <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Warehouse Movement & Transaction Log</CardTitle>
                <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                  {getPeriodDateLabel(period, customStartDate, customEndDate)}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Audit record of all inbound, outbound, transfers, and inventory reconciliations
              </p>
            </div>
          </CardHeader>

          {/* Period Transaction Activity KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-y border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Transactions in Period
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {filteredTransactions.length} events
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Total Inbound Qty
              </span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                +{formatNumber(totalTxIn)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Total Outbound Qty
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                -{formatNumber(totalTxOut)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Net Movement
              </span>
              <span
                className={`text-sm font-bold font-mono ${
                  totalTxIn - totalTxOut >= 0
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-rose-500'
                }`}
              >
                {totalTxIn - totalTxOut >= 0
                  ? `+${formatNumber(totalTxIn - totalTxOut)}`
                  : formatNumber(totalTxIn - totalTxOut)}
              </span>
            </div>
          </div>

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
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                        No movement transactions found for the selected period ({period}) and filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
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
                    ))
                  )}
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
