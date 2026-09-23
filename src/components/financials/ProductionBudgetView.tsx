import React, { useState } from 'react';
import {
  Calculator,
  Plus,
  Trash2,
  Edit2,
  Download,
  Package,
  Layers,
  TrendingUp,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { ProductionBudget, BottleSize } from '../../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { formatCurrency, formatNumber } from '../../lib/utils';
import { exportToExcel } from '../../lib/exportUtils';

export function ProductionBudgetView() {
  const {
    productionBudgets = [],
    bottleTypes = [],
    addProductionBudget,
    updateProductionBudget,
    deleteProductionBudget,
  } = useERPStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<ProductionBudget | null>(null);
  const [editingBudget, setEditingBudget] = useState<ProductionBudget | null>(null);

  // Form State matching requirement:
  // * Product
  // * Period
  // * Planned production quantity
  // * Expected selling price
  // * Material cost
  const [selectedSize, setSelectedSize] = useState<BottleSize>('500ml');
  const [period, setPeriod] = useState('2026-09');
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [plannedQty, setPlannedQty] = useState<number>(100000);
  const [expectedPrice, setExpectedPrice] = useState<number>(0.35);
  const [materialCostPerUnit, setMaterialCostPerUnit] = useState<number>(0.045);
  const [labourCost, setLabourCost] = useState<number>(3000);
  const [packagingCost, setPackagingCost] = useState<number>(2500);
  const [overheadCost, setOverheadCost] = useState<number>(1800);
  const [notes, setNotes] = useState('');

  // Calculations
  const totalMaterialCost = plannedQty * materialCostPerUnit;
  const totalProductionCost = totalMaterialCost + labourCost + packagingCost + overheadCost;
  const unitProductionCost = plannedQty > 0 ? totalProductionCost / plannedQty : 0;
  const projectedRevenue = plannedQty * expectedPrice;
  const projectedGrossProfit = projectedRevenue - totalProductionCost;

  const handleOpenAdd = () => {
    setEditingBudget(null);
    setSelectedSize('500ml');
    setPeriod('2026-09');
    setPlannedQty(100000);
    setExpectedPrice(0.35);
    setMaterialCostPerUnit(0.045);
    setLabourCost(3000);
    setPackagingCost(2500);
    setOverheadCost(1800);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: ProductionBudget) => {
    setEditingBudget(b);
    setSelectedSize(b.bottle_size);
    setPeriod(b.period);
    setPeriodType(b.period_type);
    setPlannedQty(b.budgeted_production_quantity);
    setExpectedPrice(b.expected_selling_price || (b.budgeted_revenue / Math.max(1, b.budgeted_production_quantity)));
    setMaterialCostPerUnit(
      b.material_cost || (b.budgeted_production_cost * 0.6 / Math.max(1, b.budgeted_production_quantity))
    );
    setLabourCost(b.budgeted_labour_cost || 0);
    setPackagingCost(b.budgeted_packaging_cost || 0);
    setOverheadCost(b.budgeted_overhead || 0);
    setNotes(b.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productName = `${selectedSize} Bottled Water`;

    if (editingBudget) {
      updateProductionBudget(editingBudget.id, {
        product_name: productName,
        bottle_size: selectedSize,
        period,
        period_type: periodType,
        budgeted_production_quantity: Number(plannedQty),
        expected_selling_price: Number(expectedPrice),
        material_cost: Number(materialCostPerUnit),
        budgeted_raw_material_consumption: Math.round(plannedQty * 1.01),
        budgeted_labour_cost: Number(labourCost),
        budgeted_packaging_cost: Number(packagingCost),
        budgeted_overhead: Number(overheadCost),
        budgeted_production_cost: Number(totalProductionCost),
        budgeted_sales_quantity: Math.round(plannedQty * 0.98),
        budgeted_revenue: Number(projectedRevenue),
        notes,
      });
    } else {
      addProductionBudget({
        product_name: productName,
        bottle_size: selectedSize,
        period,
        period_type: periodType,
        budgeted_production_quantity: Number(plannedQty),
        expected_selling_price: Number(expectedPrice),
        material_cost: Number(materialCostPerUnit),
        budgeted_raw_material_consumption: Math.round(plannedQty * 1.01),
        budgeted_labour_cost: Number(labourCost),
        budgeted_packaging_cost: Number(packagingCost),
        budgeted_overhead: Number(overheadCost),
        budgeted_production_cost: Number(totalProductionCost),
        budgeted_sales_quantity: Math.round(plannedQty * 0.98),
        budgeted_revenue: Number(projectedRevenue),
        notes,
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (budgetToDelete) {
      deleteProductionBudget(budgetToDelete.id);
      setBudgetToDelete(null);
    }
  };

  const totalBudgetedUnits = productionBudgets.reduce(
    (acc, b) => acc + (b.budgeted_production_quantity || 0),
    0
  );
  const totalBudgetedCost = productionBudgets.reduce(
    (acc, b) => acc + (b.budgeted_production_cost || 0),
    0
  );
  const totalBudgetedRevenue = productionBudgets.reduce(
    (acc, b) => acc + (b.budgeted_revenue || 0),
    0
  );

  const handleExport = () => {
    const data = productionBudgets.map((b) => ({
      Product: b.product_name,
      Size: b.bottle_size,
      Period: b.period,
      'Planned Quantity': b.budgeted_production_quantity,
      'Expected Selling Price': b.expected_selling_price || 0,
      'Material Cost Unit': b.material_cost || 0,
      'Budgeted Cost': b.budgeted_production_cost,
      'Budgeted Revenue': b.budgeted_revenue,
      Notes: b.notes || '',
    }));
    exportToExcel(data, 'Production_Budgets');
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Planned Output Target</span>
            <span className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {formatNumber(totalBudgetedUnits)} units
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Across {productionBudgets.length} SKU budgets
          </span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Projected Manufacturing Cost</span>
            <span className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {formatCurrency(totalBudgetedCost)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Direct materials, line labour & overhead
          </span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Budgeted Revenue Potential</span>
            <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {formatCurrency(totalBudgetedRevenue)}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">
            Projected Profit: {formatCurrency(totalBudgetedRevenue - totalBudgetedCost)}
          </span>
        </Card>
      </div>

      {/* Main Budget Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Production Budgets & Output Planning</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Target volumes, planned selling prices, and projected unit cost schedules
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1.5" /> Export Excel
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Production Budget
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500">
                <tr>
                  <th className="p-3.5 pl-6">Product / SKU</th>
                  <th className="p-3">Period</th>
                  <th className="p-3 text-right">Planned Qty</th>
                  <th className="p-3 text-right">Exp. Price</th>
                  <th className="p-3 text-right">Unit Cost</th>
                  <th className="p-3 text-right">Budgeted Cost</th>
                  <th className="p-3 text-right">Projected Revenue</th>
                  <th className="p-3 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productionBudgets.map((b) => {
                  const expPrice =
                    b.expected_selling_price ||
                    (b.budgeted_production_quantity > 0
                      ? b.budgeted_revenue / b.budgeted_production_quantity
                      : 0.35);
                  const unitCost =
                    b.budgeted_production_quantity > 0
                      ? b.budgeted_production_cost / b.budgeted_production_quantity
                      : 0.15;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 pl-6 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-sky-500" />
                          <span>{b.product_name}</span>
                          <Badge variant="outline">{b.bottle_size}</Badge>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-medium text-slate-600 dark:text-slate-300">
                        {b.period}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {formatNumber(b.budgeted_production_quantity)}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(expPrice)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        {formatCurrency(unitCost)}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-500 font-semibold">
                        {formatCurrency(b.budgeted_production_cost)}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatCurrency(b.budgeted_revenue)}
                      </td>
                      <td className="p-3 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Budget"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setBudgetToDelete(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Budget"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {productionBudgets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No production budgets created yet. Click "Create Production Budget" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(budgetToDelete)}
        onClose={() => setBudgetToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Production Budget"
        message={`Are you sure you want to delete the production budget for "${budgetToDelete?.product_name}" (${budgetToDelete?.period})?`}
        confirmText="Delete Budget"
        variant="danger"
      />

      {/* Create / Edit Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBudget ? 'Edit Production Budget' : 'Create Production Budget'}
        description="Configure target production quantity, selling price, and manufacturing cost breakdown"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Product / Bottle SKU"
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value as BottleSize)}
              required
            >
              {bottleTypes.map((bt) => (
                <option key={bt.id} value={bt.size}>
                  {bt.size} Bottled Water
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Period (e.g. 2026-09)"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="YYYY-MM"
                required
              />
              <Select
                label="Period Horizon"
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as any)}
              >
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Annual</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Planned Output Quantity (Units)"
              type="number"
              min="1"
              value={plannedQty}
              onChange={(e) => setPlannedQty(Number(e.target.value))}
              required
            />

            <Input
              label="Expected Selling Price / Unit"
              type="number"
              step="0.01"
              min="0.01"
              value={expectedPrice}
              onChange={(e) => setExpectedPrice(Number(e.target.value))}
              required
            />

            <Input
              label="Raw Material Cost / Unit"
              type="number"
              step="0.001"
              min="0"
              value={materialCostPerUnit}
              onChange={(e) => setMaterialCostPerUnit(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Direct Labour Cost"
              type="number"
              min="0"
              value={labourCost}
              onChange={(e) => setLabourCost(Number(e.target.value))}
            />
            <Input
              label="Packaging Supplies Cost"
              type="number"
              min="0"
              value={packagingCost}
              onChange={(e) => setPackagingCost(Number(e.target.value))}
            />
            <Input
              label="Manufacturing Overhead"
              type="number"
              min="0"
              value={overheadCost}
              onChange={(e) => setOverheadCost(Number(e.target.value))}
            />
          </div>

          {/* Financial Projection Summary */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Material Cost:</span>
              <span className="font-mono font-semibold">{formatCurrency(totalMaterialCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Budgeted Production Cost:</span>
              <span className="font-mono font-semibold text-rose-500">{formatCurrency(totalProductionCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unit Cost of Production:</span>
              <span className="font-mono font-semibold">{formatCurrency(unitProductionCost)}/unit</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5 font-bold">
              <span className="text-slate-900 dark:text-white">Projected Gross Margin:</span>
              <span className="font-mono text-emerald-600">
                {formatCurrency(projectedGrossProfit)} ({projectedRevenue > 0 ? ((projectedGrossProfit / projectedRevenue) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>

          <Input
            label="Notes & Assumptions"
            placeholder="e.g. Standard line efficiency assumption of 96%..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingBudget ? 'Save Changes' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
