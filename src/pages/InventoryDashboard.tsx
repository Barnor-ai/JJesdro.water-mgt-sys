import React from 'react';
import {
  Package,
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  PlusCircle,
  Download,
  Barcode,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { KPITile } from '../components/ui/KPITile';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatNumber, formatCurrency, formatDate } from '../lib/utils';
import { exportToExcel } from '../lib/exportUtils';

export function InventoryDashboard({
  onNavigate,
  onOpenScanner,
}: {
  onNavigate: (page: string) => void;
  onOpenScanner: () => void;
}) {
  const { finishedGoods, rawMaterials, bottleTypes, addPurchaseOrder } = useERPStore();

  const totalFinishedStock = finishedGoods.reduce((acc, fg) => acc + fg.current_stock, 0);
  const totalAvailable = finishedGoods.reduce((acc, fg) => acc + fg.available_stock, 0);
  const lowStockFinished = finishedGoods.filter((fg) => fg.current_stock <= fg.min_stock);
  const lowStockRaw = rawMaterials.filter((rm) => rm.current_stock <= rm.reorder_level);

  const handleExportStock = () => {
    exportToExcel(
      finishedGoods.map((fg) => ({
        Size: fg.bottle_size,
        Location: fg.location,
        Opening: fg.opening_stock,
        Produced: fg.produced_stock,
        Sold: fg.sold_stock,
        Returned: fg.returned_stock,
        Damaged: fg.damaged_stock,
        CurrentStock: fg.current_stock,
        Reserved: fg.reserved_stock,
        AvailableStock: fg.available_stock,
        MinStock: fg.min_stock,
        Status: fg.current_stock <= fg.min_stock ? 'LOW STOCK' : 'HEALTHY',
      })),
      'H2O_Inventory_Health_Report'
    );
  };

  const handleAutoReorder = (rm: typeof rawMaterials[0]) => {
    addPurchaseOrder({
      po_number: `PO-AUTO-${Date.now().toString().slice(-4)}`,
      supplier_id: 'sup-1',
      supplier_name: 'PolyPlast Preforms Ltd.',
      status: 'Ordered',
      order_date: new Date().toISOString().slice(0, 10),
      expected_delivery_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      subtotal: rm.reorder_level * 2 * rm.cost_per_unit,
      tax: 0,
      total_amount: rm.reorder_level * 2 * rm.cost_per_unit,
      notes: `Automated reorder replenishment triggered from Inventory Health monitor.`,
      items: [
        {
          id: `pi-${Date.now()}`,
          purchase_id: `po-${Date.now()}`,
          raw_material_id: rm.id,
          raw_material_name: rm.name,
          quantity: rm.reorder_level * 2,
          unit_cost: rm.cost_per_unit,
          total_cost: rm.reorder_level * 2 * rm.cost_per_unit,
        },
      ],
      created_by: 'System Auto-Replenishment',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Inventory Health & Warehouse Levels
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time stock balance formula: [Opening + Produced + Returned] - [Sold + Damaged]
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onOpenScanner}>
            <Barcode className="w-4 h-4 mr-1.5 text-sky-500" /> Pallet Barcode Scanner
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportStock}>
            <Download className="w-4 h-4 mr-1.5" /> Export Stock (.xlsx)
          </Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate('inventory')}>
            <ArrowDownUp className="w-4 h-4 mr-1.5" /> Manage Transactions
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          title="Total Finished Bottles"
          value={formatNumber(totalFinishedStock)}
          subtitle={`${formatNumber(totalAvailable)} ready for dispatch`}
          icon={<Package className="w-6 h-6 text-sky-400" />}
          iconBg="bg-sky-500/10 dark:bg-sky-500/20"
        />

        <KPITile
          title="Critical Reorder Alerts"
          value={`${lowStockFinished.length + lowStockRaw.length}`}
          subtitle={`${lowStockFinished.length} finished SKUs • ${lowStockRaw.length} raw`}
          icon={<AlertTriangle className="w-6 h-6 text-amber-400" />}
          iconBg="bg-amber-500/10 dark:bg-amber-500/20"
          badge={lowStockFinished.length > 0 ? 'Requires PO' : 'Nominal'}
        />

        <KPITile
          title="Fastest Moving SKU"
          value="500ml Classic"
          subtitle="15,600 units sold this cycle"
          icon={<Sparkles className="w-6 h-6 text-emerald-400" />}
          iconBg="bg-emerald-500/10 dark:bg-emerald-500/20"
        />

        <KPITile
          title="Raw Material Catalog"
          value={`${rawMaterials.length} Items`}
          subtitle="Preforms, caps, labels, minerals"
          icon={<Layers className="w-6 h-6 text-indigo-400" />}
          iconBg="bg-indigo-500/10 dark:bg-indigo-500/20"
          onClick={() => onNavigate('suppliers')}
        />
      </div>

      {/* Finished Goods Inventory Master Table with Auto-Calculations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Finished Goods Real-Time Stock Ledger</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live mathematical ledger auto-updated on each production batch and sales invoice
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">7 Active SKUs</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">SKU / Bottle Size</th>
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
                  <th className="p-3 text-center pr-5">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {finishedGoods.map((fg) => {
                  const isLow = fg.current_stock <= fg.min_stock;
                  return (
                    <tr
                      key={fg.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors font-medium"
                    >
                      <td className="p-3.5 pl-5 font-sans font-bold text-slate-900 dark:text-white text-sm">
                        {fg.bottle_size}
                      </td>
                      <td className="p-3 font-sans text-slate-500">{fg.location}</td>
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
                          {isLow ? 'LOW STOCK' : 'HEALTHY'}
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

      {/* Raw Materials Reorder Suggestions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Raw Materials Reorder Suggestions</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supply chain inventory: preforms, tamper caps, BOPP film rolls, and dosing chemicals
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('suppliers')}>
            View Suppliers & POs →
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Raw Material</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Current Stock</th>
                  <th className="p-3 text-right">Reorder Threshold</th>
                  <th className="p-3 text-right">Unit Cost</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right pr-5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rawMaterials.map((rm) => {
                  const isBelow = rm.current_stock <= rm.reorder_level;
                  return (
                    <tr
                      key={rm.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3.5 pl-5 font-bold text-slate-800 dark:text-slate-200">
                        {rm.name}
                      </td>
                      <td className="p-3 text-slate-500">{rm.category}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        {rm.current_stock.toLocaleString()} {rm.unit}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        {rm.reorder_level.toLocaleString()} {rm.unit}
                      </td>
                      <td className="p-3 text-right font-mono">{formatCurrency(rm.cost_per_unit)}</td>
                      <td className="p-3 text-center">
                        <Badge variant={isBelow ? 'warning' : 'success'} size="sm">
                          {isBelow ? 'Reorder Needed' : 'Adequate'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right pr-5">
                        {isBelow && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleAutoReorder(rm)}
                            className="text-[11px] py-1 px-2.5"
                          >
                            + Auto Reorder PO
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
