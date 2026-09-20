import React, { useState } from 'react';
import {
  Factory,
  Plus,
  Search,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useERPStore } from '../store/useStore';
import { BottleSize, ShiftType, BatchStatus } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  generateBatchNumber,
  formatNumber,
  formatCurrency,
  formatDate,
  calculateProductionEfficiency,
  calculateWastePercentage,
} from '../lib/utils';
import { generateProductionReportPDF, exportToExcel } from '../lib/exportUtils';

export function ProductionPage() {
  const {
    productionBatches,
    finishedGoods,
    bottleTypes,
    machines,
    currentUser,
    addProductionBatch,
  } = useERPStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSize, setFilterSize] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');

  // Form State for New Batch
  const [bottleSize, setBottleSize] = useState<BottleSize>('500ml');
  const [shift, setShift] = useState<ShiftType>('Morning');
  const [machineUsed, setMachineUsed] = useState(machines[0]?.name || 'Krones Rotary Line #1');
  const [operatorName, setOperatorName] = useState(currentUser.full_name || 'Alexander Reed');
  const [quantityProduced, setQuantityProduced] = useState<number>(5000);
  const [rejectedQuantity, setRejectedQuantity] = useState<number>(45);
  const [damagedBottles, setDamagedBottles] = useState<number>(20);
  const [productionCost, setProductionCost] = useState<number>(1000);
  const [notes, setNotes] = useState('');
  const [productionDate, setProductionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Live Auto-Calculations for modal preview
  const liveAccepted = Math.max(0, quantityProduced - rejectedQuantity - damagedBottles);
  const liveEfficiency = calculateProductionEfficiency(liveAccepted, quantityProduced);
  const liveWaste = calculateWastePercentage(rejectedQuantity, damagedBottles, quantityProduced);
  const liveCostPerBottle =
    liveAccepted > 0 ? (productionCost / liveAccepted).toFixed(2) : '0.00';

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const batchNumber = generateBatchNumber(bottleSize, productionBatches.length);

    addProductionBatch({
      batch_number: batchNumber,
      production_date: productionDate,
      shift,
      machine_used: machineUsed,
      operator_name: operatorName,
      bottle_size: bottleSize,
      quantity_produced: Number(quantityProduced),
      rejected_quantity: Number(rejectedQuantity),
      damaged_bottles: Number(damagedBottles),
      production_cost: Number(productionCost),
      status: 'Completed',
      notes,
      created_by: currentUser.id,
    });

    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}

    setIsModalOpen(false);
  };

  const filteredBatches = productionBatches.filter((b) => {
    const matchesSearch =
      b.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.operator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.machine_used?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSize = filterSize === 'all' || b.bottle_size === filterSize;
    const matchesShift = filterShift === 'all' || b.shift === filterShift;
    return matchesSearch && matchesSize && matchesShift;
  });

  const handleExportExcel = () => {
    exportToExcel(
      filteredBatches.map((b) => ({
        BatchNumber: b.batch_number,
        Date: b.production_date,
        Shift: b.shift,
        BottleSize: b.bottle_size,
        Machine: b.machine_used,
        Operator: b.operator_name,
        Produced: b.quantity_produced,
        Accepted: b.accepted_quantity,
        Rejected: b.rejected_quantity,
        Damaged: b.damaged_bottles,
        EfficiencyPercent: b.efficiency_percent,
        WastePercent: b.waste_percent,
        ProductionCost: b.production_cost,
        CostPerBottle: b.cost_per_bottle,
        Status: b.status,
      })),
      'H2O_Production_Batches'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Production Management & Batch Tracking
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log manufacturing runs, auto-sync finished inventory stock, and track line efficiency
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-1.5" /> Export (.xlsx)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateProductionReportPDF(productionBatches, finishedGoods)}
          >
            <Download className="w-4 h-4 mr-1.5" /> Audit PDF
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Record New Batch
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by batch #, operator, or machine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterSize}
              onChange={(e) => setFilterSize(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Bottle Sizes</option>
              {bottleTypes.map((b) => (
                <option key={b.id} value={b.size}>
                  {b.size}
                </option>
              ))}
            </select>

            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Shifts</option>
              <option value="Morning">Morning Shift</option>
              <option value="Afternoon">Afternoon Shift</option>
              <option value="Night">Night Shift</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Production Batches Master Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Completed & Active Production Runs</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredBatches.length} batch runs
            </p>
          </div>
          <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Auto-Inventory Connected
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Batch Number</th>
                  <th className="p-3">Date / Shift</th>
                  <th className="p-3">Bottle Size</th>
                  <th className="p-3">Machine Used</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3 text-right">Produced</th>
                  <th className="p-3 text-right text-emerald-500 font-bold">Accepted</th>
                  <th className="p-3 text-right text-rose-500">Waste %</th>
                  <th className="p-3 text-right text-sky-500">Efficiency</th>
                  <th className="p-3 text-right">Cost/Bottle</th>
                  <th className="p-3 text-center pr-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {filteredBatches.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3.5 pl-5 font-bold text-sky-600 dark:text-sky-400">
                      {b.batch_number}
                    </td>
                    <td className="p-3 font-sans text-slate-600 dark:text-slate-300">
                      {formatDate(b.production_date)} • <span className="text-slate-400">{b.shift}</span>
                    </td>
                    <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">
                      {b.bottle_size}
                    </td>
                    <td className="p-3 font-sans text-slate-500 truncate max-w-[140px]">
                      {b.machine_used}
                    </td>
                    <td className="p-3 font-sans text-slate-700 dark:text-slate-300">
                      {b.operator_name}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {b.quantity_produced.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {b.accepted_quantity.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-rose-500 font-bold">
                      {b.waste_percent}%
                    </td>
                    <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-bold">
                      {b.efficiency_percent}%
                    </td>
                    <td className="p-3 text-right font-bold">${b.cost_per_bottle}</td>
                    <td className="p-3 text-center pr-5 font-sans">
                      <Badge variant="success" size="sm">
                        {b.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Record Production Batch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record New Production Batch Run"
        description="Completed batches automatically update finished goods warehouse inventory and log a stock-in event"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateBatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Bottle Size SKU"
              value={bottleSize}
              onChange={(e) => setBottleSize(e.target.value as BottleSize)}
            >
              {bottleTypes.map((bt) => (
                <option key={bt.id} value={bt.size}>
                  {bt.size} - {bt.name}
                </option>
              ))}
            </Select>

            <Select
              label="Shift"
              value={shift}
              onChange={(e) => setShift(e.target.value as ShiftType)}
            >
              <option value="Morning">Morning Shift (06:00 - 14:00)</option>
              <option value="Afternoon">Afternoon Shift (14:00 - 22:00)</option>
              <option value="Night">Night Shift (22:00 - 06:00)</option>
            </Select>

            <Select
              label="Bottling Machine Line"
              value={machineUsed}
              onChange={(e) => setMachineUsed(e.target.value)}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.status})
                </option>
              ))}
            </Select>

            <Input
              label="Lead Operator Name"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              required
            />

            <Input
              label="Production Date"
              type="date"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              required
            />

            <Input
              label="Total Units Produced (Gross)"
              type="number"
              min="1"
              value={quantityProduced}
              onChange={(e) => setQuantityProduced(Number(e.target.value))}
              required
            />

            <Input
              label="Rejected Bottles (QC Defect)"
              type="number"
              min="0"
              value={rejectedQuantity}
              onChange={(e) => setRejectedQuantity(Number(e.target.value))}
              required
            />

            <Input
              label="Damaged Bottles / Caps"
              type="number"
              min="0"
              value={damagedBottles}
              onChange={(e) => setDamagedBottles(Number(e.target.value))}
              required
            />

            <Input
              label="Total Batch Production Cost ($)"
              type="number"
              step="0.01"
              min="0"
              value={productionCost}
              onChange={(e) => setProductionCost(Number(e.target.value))}
              required
            />
          </div>

          <Input
            label="Batch Notes / Quality Control Observations"
            placeholder="e.g. Filter pressure 6.2 bar, ozone dosing nominal, seal test passed..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Real-time Calculation Summary Preview Card */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2">
            <p className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
              ⚡ Real-Time Auto-Calculations
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Accepted Units:</span>
                <p className="text-base font-bold text-emerald-400">
                  {liveAccepted.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Plant Efficiency:</span>
                <p className="text-base font-bold text-sky-400">{liveEfficiency}%</p>
              </div>
              <div>
                <span className="text-slate-400">Scrap / Waste %:</span>
                <p className="text-base font-bold text-rose-400">{liveWaste}%</p>
              </div>
              <div>
                <span className="text-slate-400">Cost per Bottle:</span>
                <p className="text-base font-bold text-amber-400">${liveCostPerBottle}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Batch & Sync Inventory
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
