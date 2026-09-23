import React, { useState } from 'react';
import {
  DollarSign,
  Factory,
  Package,
  ShoppingCart,
  PlusCircle,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Cpu,
  Droplet,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useERPStore } from '../store/useStore';
import { KPITile } from '../components/ui/KPITile';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';

export function DashboardOverview({ onNavigate }: { onNavigate: (page: string) => void }) {
  const {
    sales,
    productionBatches,
    finishedGoods,
    rawMaterials,
    machines,
    expenses,
  } = useERPStore();

  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  // Calculations
  const totalRevenue = sales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalProducedUnits = productionBatches.reduce((acc, b) => acc + b.accepted_quantity, 0);
  const totalProducedRaw = productionBatches.reduce((acc, b) => acc + b.quantity_produced, 0);
  const plantEfficiency =
    totalProducedRaw > 0 ? (totalProducedUnits / totalProducedRaw) * 100 : 97.4;
  const wastePercent = (100 - plantEfficiency).toFixed(2);
  const activeBatchesCount = productionBatches.filter((b) => b.status !== 'Cancelled').length;

  const lowStockItems = finishedGoods.filter((fg) => fg.current_stock <= fg.min_stock);

  // Chart Data
  const weeklyData = [
    { name: 'Mon', output: 42000, target: 45000, rate: 80 },
    { name: 'Tue', output: 58000, target: 50000, rate: 88 },
    { name: 'Wed', output: 61000, target: 55000, rate: 92 },
    { name: 'Thu', output: 54000, target: 55000, rate: 85 },
    { name: 'Fri', output: 78000, target: 70000, rate: 96 },
    { name: 'Sat', output: 64000, target: 60000, rate: 90 },
    { name: 'Sun', output: 48000, target: 45000, rate: 82 },
  ];

  const monthlyData = [
    { name: 'Week 1', output: 280000, target: 260000, rate: 88 },
    { name: 'Week 2', output: 310000, target: 300000, rate: 91 },
    { name: 'Week 3', output: 345000, target: 320000, rate: 95 },
    { name: 'Week 4', output: 320000, target: 310000, rate: 93 },
  ];

  const chartData = timeRange === 'week' ? weeklyData : monthlyData;

  return (
    <div className="space-y-4">
      {/* Bento Header Bar / Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            Operations & Manufacturing Overview
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <p className="text-xs text-slate-400">
            Real-time status across bottling machinery, inventory levels, and commercial dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('sales')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-blue-400" /> New Sale / POS
          </button>
          <button
            onClick={() => onNavigate('production')}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Log Production Batch
          </button>
        </div>
      </div>

      {/* Bento Top 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Today / MTD */}
        <div
          onClick={() => onNavigate('revenue-dash')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
        >
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            Revenue (MTD)
          </p>
          <div className="mt-3">
            <h3 className="text-2xl font-semibold text-white tracking-tight">
              {formatCurrency(totalRevenue)}
            </h3>
            <p className="text-emerald-400 text-[10px] font-medium mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +14.8% vs last month
            </p>
          </div>
        </div>

        {/* Production Volume */}
        <div
          onClick={() => onNavigate('production-dash')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
        >
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            Production Volume
          </p>
          <div className="mt-3">
            <h3 className="text-2xl font-semibold text-white tracking-tight">
              {formatNumber(totalProducedUnits)}{' '}
              <span className="text-xs text-slate-400 font-normal">units</span>
            </h3>
            <p className="text-blue-400 text-[10px] font-medium mt-0.5">
              500ml Bottling Line active
            </p>
          </div>
        </div>

        {/* Waste Ratio */}
        <div
          onClick={() => onNavigate('production')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
        >
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            Waste Ratio
          </p>
          <div className="mt-3">
            <h3 className="text-2xl font-semibold text-white tracking-tight">
              {wastePercent}%
            </h3>
            <p className="text-emerald-400 text-[10px] font-medium mt-0.5">
              {plantEfficiency.toFixed(1)}% Line Efficiency
            </p>
          </div>
        </div>

        {/* Active Batches */}
        <div
          onClick={() => onNavigate('production')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
        >
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            Active Batches
          </p>
          <div className="mt-3 flex items-end justify-between">
            <h3 className="text-2xl font-semibold text-white tracking-tight">
              {activeBatchesCount}
            </h3>
            <div className="flex h-5 gap-1 items-end mb-1">
              <div className="w-1.5 h-2.5 bg-blue-500 rounded-full" />
              <div className="w-1.5 h-4.5 bg-blue-500 rounded-full" />
              <div className="w-1.5 h-3 bg-blue-500 rounded-full" />
              <div className="w-1.5 h-5 bg-blue-400 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Bento Middle Grid: Trend Chart (col-span-3) + Low Stock Alerts (col-span-1) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Production Efficiency Trend */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5 relative flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-semibold text-sm text-white">Production Efficiency & Target Output</h4>
              <p className="text-xs text-slate-400">Manufactured bottles per day vs planned capacity</p>
            </div>
            <div className="flex gap-1.5 text-[10px]">
              <button
                onClick={() => setTimeRange('week')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  timeRange === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  timeRange === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Month
              </button>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.6} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: '#27272a',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="output"
                  name="Bottles Output"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOutput)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts Bento Card */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-white">Low Stock Alerts</h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                {lowStockItems.length} Warnings
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Alert items */}
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-rose-400">500ml Screw Caps</p>
                  <span className="text-[10px] text-slate-400">4,200 left</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div className="w-[15%] h-full bg-rose-500 rounded-full" />
                </div>
              </div>

              <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-yellow-400">Preforms 1.5L PET</p>
                  <span className="text-[10px] text-slate-400">12.5k left</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div className="w-[28%] h-full bg-yellow-500 rounded-full" />
                </div>
              </div>

              <div className="p-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-300">Shrink Film Rolls</p>
                  <span className="text-[10px] text-slate-400">65% capacity</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div className="w-[65%] h-full bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('inventory')}
            className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-medium transition-colors cursor-pointer text-center"
          >
            View Full Inventory
          </button>
        </div>
      </div>

      {/* Bento Bottom Grid: Recent Production Batches (2 cols) + Machine Status (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Recent Production Batches */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-white">Recent Production Batches</h4>
            <button
              onClick={() => onNavigate('production')}
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-slate-500 text-left border-b border-slate-800">
                  <th className="pb-2 font-medium">Batch #</th>
                  <th className="pb-2 font-medium">Size</th>
                  <th className="pb-2 font-medium">Operator</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 divide-y divide-slate-800/60">
                {productionBatches.slice(0, 4).map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 font-mono text-blue-400 font-medium">
                      {batch.batch_number}
                    </td>
                    <td className="py-2.5 font-semibold text-white">{batch.bottle_size}</td>
                    <td className="py-2.5 text-slate-400">{batch.operator_name}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                          batch.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Machine Status & Factory Load Bento */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-white mb-3">Bottling Machine Line</h4>
            <div className="space-y-2.5">
              {machines.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-300 font-medium truncate max-w-[120px]">
                    {m.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 font-mono">{m.efficiency}%</span>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        m.status === 'Operational'
                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                          : m.status === 'Maintenance'
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center sm:border-l border-slate-800 pt-2 sm:pt-0">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="transparent"
                  className="text-slate-800"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray="213.6"
                  strokeDashoffset="47"
                  className="text-blue-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-sm font-bold text-white">78%</span>
                <span className="text-[8px] text-emerald-400 font-medium">Nominal</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-wider font-bold">
              Factory Load
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
