import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Download,
  Printer,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Warehouse,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  Calendar,
  RefreshCw,
  Info,
  MapPin,
  ChevronRight,
  Droplet,
  ExternalLink,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { useERPStore } from '../store/useStore';
import { BottleSize, UserRole } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  calculateStockSummaries,
  calculateProductMovementLedger,
  ProductStockSummaryItem,
  StockMovementLedgerItem,
} from '../lib/stockService';
import { formatNumber, formatCurrency, formatDate } from '../lib/utils';
import { exportToExcel } from '../lib/exportUtils';

export function StockSummaryPage() {
  const {
    finishedGoods,
    bottleTypes,
    productionBatches,
    sales,
    transactions,
    currentOrganization,
    currentUser,
    isOnline,
    supabaseLastSyncTime,
  } = useERPStore();

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Bottled Water' | 'Sachet Water'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductStockSummaryItem | null>(null);

  // Unified multi-tenant stock calculations (reconciles 100% with inventory and sales)
  const { items, totals } = useMemo(() => {
    return calculateStockSummaries({
      finishedGoods,
      bottleTypes,
      productionBatches,
      sales,
      transactions,
      currentOrganizationId: currentOrganization?.id,
      filterCategory: categoryFilter,
      filterWarehouse: warehouseFilter,
      searchTerm,
    });
  }, [
    finishedGoods,
    bottleTypes,
    productionBatches,
    sales,
    transactions,
    currentOrganization?.id,
    categoryFilter,
    warehouseFilter,
    searchTerm,
  ]);

  // Movement Ledger for selected product drill-down
  const selectedLedger = useMemo(() => {
    if (!selectedProduct) return [];
    return calculateProductMovementLedger(selectedProduct.size, {
      finishedGoods,
      productionBatches,
      sales,
      transactions,
      currentOrganizationId: currentOrganization?.id,
    });
  }, [
    selectedProduct,
    finishedGoods,
    productionBatches,
    sales,
    transactions,
    currentOrganization?.id,
  ]);

  // Real-time stock chart data directly derived from active filtered items (Requirement 2, 4, 7, 8)
  const chartData = useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      productName: item.productName,
      size: item.size,
      category: item.category,
      unit: item.unit,
      packaging: item.packaging,
      availableStock: item.availableStock,
      currentStock: item.currentStock,
      minStock: item.minStock,
      status: item.status,
      location: item.location,
      rawItem: item,
    }));
  }, [items]);

  const chartHeight = useMemo(() => {
    return Math.max(340, chartData.length * 48 + 40);
  }, [chartData.length]);

  const getBarColor = (entry: {
    status: string;
    category: string;
    availableStock: number;
    minStock: number;
  }) => {
    if (entry.availableStock === 0 || entry.status === 'OUT_OF_STOCK') {
      return '#f43f5e'; // Rose-500: Out of stock indicator
    }
    if (entry.status === 'LOW_STOCK' || (entry.minStock > 0 && entry.availableStock <= entry.minStock)) {
      return '#f59e0b'; // Amber-500: Low stock indicator
    }
    if (entry.category === 'Sachet Water') {
      return '#06b6d4'; // Cyan-500: Sachet Water distinct line
    }
    return '#0284c7'; // Sky-600: Bottled Water
  };

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value, index } = props;
    const entry = chartData[index];
    if (!entry) return null;
    const unitStr = entry.unit ? ` ${entry.unit.toLowerCase()}${entry.availableStock !== 1 ? 's' : ''}` : '';
    const labelText = `${formatNumber(value)}${unitStr}`;

    return (
      <text
        x={x + width + 8}
        y={y + (height ? height / 2 : 12) + 4}
        fill="#475569"
        fontSize={11}
        fontWeight={700}
        fontFamily="monospace"
        textAnchor="start"
        className="fill-slate-600 dark:fill-slate-300"
      >
        {labelText}
      </text>
    );
  };

  const StockBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as {
        productName: string;
        category: string;
        packaging: string;
        unit: string;
        availableStock: number;
        minStock: number;
        status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'HEALTHY';
        location: string;
      };
      if (!data) return null;
      const isSachet = data.category === 'Sachet Water';
      const unitLabel = `${data.unit}${data.availableStock !== 1 ? 's' : ''}`;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-2xl text-white text-xs z-50 pointer-events-none min-w-[230px]">
          <div className="flex items-center gap-1.5 mb-1">
            {isSachet ? (
              <Package className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Droplet className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className="font-bold text-slate-100 text-sm">{data.productName}</span>
          </div>
          <div className="text-[11px] text-slate-400 mb-2">
            {data.category} • {data.packaging}
          </div>
          <div className="space-y-1.5 border-t border-slate-800 pt-2 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Available Stock:</span>
              <span className="font-black text-sky-400 text-sm">
                {formatNumber(data.availableStock)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Unit:</span>
              <span className="font-medium text-slate-200">{unitLabel}</span>
            </div>
            {data.minStock > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">Min. Stock Level:</span>
                <span className="text-slate-300">{formatNumber(data.minStock)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-slate-800/80 font-sans">
              <span className="text-slate-400">Inventory Status:</span>
              <span
                className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${
                  data.status === 'OUT_OF_STOCK'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : data.status === 'LOW_STOCK'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {data.status === 'OUT_OF_STOCK'
                  ? 'Out of Stock'
                  : data.status === 'LOW_STOCK'
                  ? 'Low Stock'
                  : 'Healthy'}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400 italic font-sans flex items-center justify-between">
            <span>Audit drill-down:</span>
            <span className="text-sky-400 font-semibold">Click to view ledger</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleExportStockSummary = () => {
    exportToExcel(
      items.map((it) => ({
        Product: it.productName,
        Category: it.category,
        Size: it.size,
        Packaging: it.packaging,
        Unit: it.unit,
        WarehouseLocation: it.location,
        OpeningStock: it.openingStock,
        Production: it.producedStock,
        StockReceived: it.stockReceived,
        TransfersIn: it.stockTransfersIn,
        SalesDispatched: it.soldStock,
        TransfersOut: it.stockTransfersOut,
        Adjustments: it.adjustments,
        DamagedLoss: it.damagedStock,
        CurrentStock: it.currentStock,
        ReservedStock: it.reservedStock,
        AvailableQuantity: it.availableStock,
        Status: it.statusLabel,
        UnitSellingPrice: it.sellingPrice,
        WholesaleValue: it.totalWholesaleValuation,
      })),
      `H2O_Stock_Summary_${new Date().toISOString().slice(0, 10)}`
    );
  };

  const handleExportLedger = (product: ProductStockSummaryItem, ledger: StockMovementLedgerItem[]) => {
    exportToExcel(
      ledger.map((row) => ({
        Date: row.date,
        TransactionType: row.transactionType,
        ReferenceCode: row.reference,
        Source: row.fromLocation,
        Destination: row.toLocation,
        QuantityIn: row.quantityIn || 0,
        QuantityOut: row.quantityOut || 0,
        StockBalance: row.balance,
        Operator: row.operator || '',
        Notes: row.notes || '',
      })),
      `H2O_Ledger_${product.size}_${new Date().toISOString().slice(0, 10)}`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Offline Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Boxes className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Stock Summary & Inventory Position
            </h2>
            <Badge variant="outline" size="sm" className="font-mono text-[10px]">
              {currentOrganization?.name || 'H2O Workspace'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daily management overview of total available finished goods stock across Bottled Water and Sachet Water.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {!isOnline && (
            <Badge variant="warning" size="sm" className="flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Offline Cached Mode
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print Summary
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportStockSummary} className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export (.xlsx)
          </Button>
        </div>
      </div>

      {/* 6 Executive Management Summary KPI Cards (Requirement 10) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Products
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {totals.totalProducts}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Bottled & Sachet lines</span>
        </div>

        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 shadow-sm">
          <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
            Total Stock Quantity
          </span>
          <span className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 block">
            {formatNumber(totals.totalStockQuantity)}
          </span>
          <span className="text-[10px] text-sky-600/70 dark:text-sky-400/70 mt-1 block">Combined available units</span>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
            Bottled Water Stock
          </span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
            {formatNumber(totals.totalBottledWaterStock)}
          </span>
          <span className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 mt-1 block">PET bottles & 19L jars</span>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/40 shadow-sm">
          <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider block">
            Sachet Water Stock
          </span>
          <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1 block">
            {formatNumber(totals.totalSachetWaterStock)}
          </span>
          <span className="text-[10px] text-cyan-600/70 dark:text-cyan-400/70 mt-1 block">500 ml sachets ready</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
            Low Stock Items
          </span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
            {totals.lowStockItemsCount}
          </span>
          <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-1 block">At or below reorder level</span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 shadow-sm">
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
            Out of Stock Items
          </span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
            {totals.outOfStockItemsCount}
          </span>
          <span className="text-[10px] text-rose-600/70 dark:text-rose-400/70 mt-1 block">0 units available</span>
        </div>
      </div>

      {/* Filter & Search Bar (Requirements 11 & 12) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Categories ({finishedGoods.length})
            </button>
            <button
              onClick={() => setCategoryFilter('Bottled Water')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === 'Bottled Water'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Droplet className="w-3 h-3 text-indigo-500" />
              Bottled Water
            </button>
            <button
              onClick={() => setCategoryFilter('Sachet Water')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === 'Sachet Water'
                  ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3 h-3 text-cyan-500" />
              Sachet Water 500 ml
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Warehouse / Location Filter */}
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Warehouses & Locations</option>
              <option value="Main Warehouse">Main Bottling Plant Warehouse</option>
              <option value="Depot">Plant Cold Depot Warehouse</option>
              <option value="Bay A">Bay A (330ml & 500ml)</option>
              <option value="Bay B">Bay B (750ml & 1L)</option>
              <option value="Bay C">Bay C (1.5L, 5L & Sachet)</option>
              <option value="Bay D">Bay D (19L Dispenser Station)</option>
            </select>

            {/* Instant Search Box (Requirement 12) */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search product, SKU, size..."
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Stock Summary Matrix Table (Requirements 8, 9 & 13) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Finished Goods Available Stock Matrix</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formula: Available = (Opening + Produced + Received + Transfer In) - (Sold + Transfer Out + Damaged) - Reserved
            </p>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync: <span className="font-mono text-slate-600 dark:text-slate-300">{supabaseLastSyncTime}</span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold font-sans">
                <tr>
                  <th className="p-3 pl-5">Product & SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Packaging / Unit</th>
                  <th className="p-3">Primary Location</th>
                  <th className="p-3 text-right font-mono">Opening</th>
                  <th className="p-3 text-right font-mono text-indigo-600 dark:text-indigo-400">+ Produced</th>
                  <th className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">- Sold</th>
                  <th className="p-3 text-right font-mono text-rose-500">- Damaged</th>
                  <th className="p-3 text-right font-mono text-slate-400">Reserved</th>
                  <th className="p-3 text-right font-mono font-black text-sm bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                    = Available Stock
                  </th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right pr-5">Drill-Down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400">
                      No water products matched your search or category filters.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isSachet = item.size === '500ml-sachet';
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedProduct(item)}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                          isSachet ? 'bg-cyan-50/30 dark:bg-cyan-950/10' : ''
                        }`}
                      >
                        {/* Product & SKU */}
                        <td className="p-3 pl-5 font-medium">
                          <div className="flex items-center gap-2">
                            {isSachet ? (
                              <span className="p-1 rounded-md bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 shrink-0">
                                <Package className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="p-1 rounded-md bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 shrink-0">
                                <Droplet className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {item.productName}
                                {isSachet && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-500 text-white tracking-wider">
                                    NEW LINE
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-slate-400">{item.size}</span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-3">
                          <Badge variant={isSachet ? 'info' : 'outline'} size="sm">
                            {item.category}
                          </Badge>
                        </td>

                        {/* Packaging / Unit (Requirement 5) */}
                        <td className="p-3">
                          <div className="text-slate-700 dark:text-slate-300 font-medium">
                            {item.packaging}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Unit: <strong className="text-slate-600 dark:text-slate-300">{item.unit}</strong>
                          </span>
                        </td>

                        {/* Warehouse Location */}
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{item.location}</span>
                          </div>
                          {item.warehouseBreakdown.length > 1 && (
                            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium block">
                              +{item.warehouseBreakdown.length} warehouses
                            </span>
                          )}
                        </td>

                        {/* Inventory Numbers */}
                        <td className="p-3 text-right font-mono text-slate-500">
                          {formatNumber(item.openingStock)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          +{formatNumber(item.producedStock)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          -{formatNumber(item.soldStock)}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-500">
                          -{formatNumber(item.damagedStock)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400">
                          {formatNumber(item.reservedStock)}
                        </td>

                        {/* Total Available (Main highlight) */}
                        <td className="p-3 text-right font-mono font-black text-sm bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                          {formatNumber(item.availableStock)} {item.unit}s
                        </td>

                        {/* Health Status */}
                        <td className="p-3 text-center">
                          {item.status === 'OUT_OF_STOCK' ? (
                            <Badge variant="danger" size="sm" className="font-bold">
                              OUT OF STOCK
                            </Badge>
                          ) : item.status === 'LOW_STOCK' ? (
                            <Badge variant="warning" size="sm" className="font-bold">
                              LOW STOCK
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm" className="font-bold">
                              HEALTHY
                            </Badge>
                          )}
                        </td>

                        {/* Action Drill Down Button */}
                        <td className="p-3 text-right pr-5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(item);
                            }}
                            className="p-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View Ledger
                          </Button>
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

      {/* Warehouse Multi-Location Breakdown Table (Requirement 13) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-sky-500" />
              <CardTitle>Warehouse Multi-Location Stock Distribution</CardTitle>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reconciles plant floor staging, cold depots, and regional distribution branches without double-counting.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {items.map((it) => (
                <div key={it.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{it.productName}</span>
                    <span className="text-[11px] text-slate-400">
                      {it.location} • {it.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-slate-900 dark:text-white block">
                      {formatNumber(it.availableStock)} {it.unit}s
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      Valuation: {formatCurrency(it.totalWholesaleValuation)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Professional Stock by Product Horizontal Bar Chart (Requirement 2-11) */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-500" />
                  <CardTitle>Stock by Product</CardTitle>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Current available stock across all products
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                  Sachet Water
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" />
                  Bottled Water
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  Low Stock
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  Out of Stock
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            {chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-medium text-slate-600 dark:text-slate-300">No stock data available</p>
                <p className="text-slate-400">Try changing your search term or category filters.</p>
              </div>
            ) : (
              <div className="w-full" style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 10, right: 110, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" opacity={0.2} />
                    <XAxis
                      type="number"
                      tickFormatter={(val) => formatNumber(val)}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      stroke="#94a3b8"
                    />
                    <YAxis
                      type="category"
                      dataKey="productName"
                      width={145}
                      tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                      stroke="#94a3b8"
                    />
                    <Tooltip content={<StockBarTooltip />} />
                    <Bar
                      dataKey="availableStock"
                      radius={[0, 6, 6, 0]}
                      label={renderCustomBarLabel}
                      cursor="pointer"
                      onClick={(state: any) => {
                        if (state && state.rawItem) {
                          setSelectedProduct(state.rawItem);
                        }
                      }}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.id} fill={getBarColor(entry)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Movement Details Drill-Down Modal (Requirement 14) */}
      <Modal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct ? `Stock Movement Audit Ledger: ${selectedProduct.productName}` : 'Product Ledger'}
        description={
          selectedProduct
            ? `Traceable historical movement transactions and current balance calculation for ${selectedProduct.size} (${selectedProduct.category}).`
            : ''
        }
        maxWidth="4xl"
      >
        {selectedProduct && (
          <div className="space-y-4 text-xs">
            {/* Summary Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Product Category</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedProduct.category}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Packaging / Unit</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedProduct.packaging} ({selectedProduct.unit})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Reconciled Available</span>
                <span className="font-mono font-black text-sky-600 dark:text-sky-400 text-sm">
                  {formatNumber(selectedProduct.availableStock)} {selectedProduct.unit}s
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Inventory Health</span>
                <span
                  className={`font-bold inline-block mt-0.5 ${
                    selectedProduct.status === 'OUT_OF_STOCK'
                      ? 'text-rose-500'
                      : selectedProduct.status === 'LOW_STOCK'
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {selectedProduct.statusLabel}
                </span>
              </div>
            </div>

            {/* Drill-down Table (Date | Transaction | Reference | In | Out | Balance) */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase sticky top-0 z-10 font-sans">
                    <tr>
                      <th className="p-3 pl-4">Date</th>
                      <th className="p-3">Transaction</th>
                      <th className="p-3">Reference Code</th>
                      <th className="p-3 text-right font-mono text-indigo-600 dark:text-indigo-400">Qty In</th>
                      <th className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">Qty Out</th>
                      <th className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white bg-slate-200/50 dark:bg-slate-700/50">
                        Running Balance
                      </th>
                      <th className="p-3 pr-4">Details / Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {selectedLedger.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          No stock movement events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      selectedLedger.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 pl-4 text-slate-500 whitespace-nowrap font-sans">{formatDate(row.date)}</td>
                          <td className="p-3 font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.transactionType === 'Production'
                                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                                  : row.transactionType === 'Sale'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                                  : row.transactionType === 'Damaged'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {row.transactionType}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{row.reference}</td>
                          <td className="p-3 text-right text-indigo-600 dark:text-indigo-400">
                            {row.quantityIn > 0 ? `+${formatNumber(row.quantityIn)}` : '-'}
                          </td>
                          <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">
                            {row.quantityOut > 0 ? `-${formatNumber(row.quantityOut)}` : '-'}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                            {formatNumber(row.balance)}
                          </td>
                          <td className="p-3 pr-4 font-sans text-slate-500 text-[11px] truncate max-w-[200px]" title={row.notes}>
                            {row.notes || row.toLocation}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Movement transactions reconcile 1:1 with Finished Goods Inventory.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportLedger(selectedProduct, selectedLedger)}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Export Product Ledger
                </Button>
                <Button variant="primary" size="sm" onClick={() => setSelectedProduct(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
