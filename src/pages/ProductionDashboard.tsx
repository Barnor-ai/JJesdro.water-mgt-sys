import React, { useState, useMemo } from 'react';
import {
  Factory,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  Cpu,
  Clock,
  UserCheck,
  Download,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useERPStore } from '../store/useStore';
import { KPITile } from '../components/ui/KPITile';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatNumber, formatCurrency, formatDate } from '../lib/utils';
import { generateProductionReportPDF } from '../lib/exportUtils';
import { PeriodSearchEngine } from '../components/common/PeriodSearchEngine';
import { isDateInPeriod, isDateMatchingPeriodQuery, getPeriodDateLabel } from '../lib/dateUtils';

export function ProductionDashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { productionBatches, finishedGoods, machines } = useERPStore();
  const [period, setPeriod] = useState<string>('All Time');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Filter batches dynamically based on selected period, custom date range, and period search query
  const filteredBatches = useMemo(() => {
    return productionBatches.filter((b) => {
      const dateVal = b.production_date || b.created_at;
      if (!isDateInPeriod(dateVal, period, customStartDate, customEndDate)) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesPeriod = isDateMatchingPeriodQuery(dateVal, searchTerm);
        const matchesBatch = (b.batch_number || '').toLowerCase().includes(q);
        const matchesOperator = (b.operator_name || '').toLowerCase().includes(q);
        const matchesMachine = (b.machine_used || '').toLowerCase().includes(q);
        const matchesShift = (b.shift || '').toLowerCase().includes(q);
        const matchesSize = (b.bottle_size || '').toLowerCase().includes(q);
        const matchesNotes = (b.notes || '').toLowerCase().includes(q);
        if (
          !matchesPeriod &&
          !matchesBatch &&
          !matchesOperator &&
          !matchesMachine &&
          !matchesShift &&
          !matchesSize &&
          !matchesNotes
        ) {
          return false;
        }
      }

      return true;
    });
  }, [productionBatches, period, customStartDate, customEndDate, searchTerm]);

  const totalProduced = filteredBatches.reduce((acc, b) => acc + b.quantity_produced, 0);
  const totalAccepted = filteredBatches.reduce(
    (acc, b) =>
      acc +
      (b.accepted_quantity !== undefined
        ? b.accepted_quantity
        : Math.max(0, b.quantity_produced - b.rejected_quantity - b.damaged_bottles)),
    0
  );
  const totalRejected = filteredBatches.reduce(
    (acc, b) => acc + ((b.rejected_quantity || 0) + (b.damaged_bottles || 0)),
    0
  );
  const avgEfficiency =
    totalProduced > 0 ? ((totalAccepted / totalProduced) * 100).toFixed(2) : '0.00';
  const avgWaste =
    totalProduced > 0 ? ((totalRejected / totalProduced) * 100).toFixed(2) : '0.00';

  // Output by Shift Data calculated dynamically from filtered batches
  const shiftOutputData = useMemo(() => {
    const shiftDefs = [
      { key: 'Morning', label: 'Morning Shift (06:00 - 14:00)' },
      { key: 'Afternoon', label: 'Afternoon Shift (14:00 - 22:00)' },
      { key: 'Night', label: 'Night Shift (22:00 - 06:00)' },
    ];

    return shiftDefs.map((def) => {
      const shiftBatches = filteredBatches.filter((b) =>
        (b.shift || '').toLowerCase().includes(def.key.toLowerCase())
      );
      const accepted = shiftBatches.reduce(
        (acc, b) =>
          acc +
          (b.accepted_quantity !== undefined
            ? b.accepted_quantity
            : Math.max(0, b.quantity_produced - b.rejected_quantity - b.damaged_bottles)),
        0
      );
      const rejected = shiftBatches.reduce(
        (acc, b) => acc + ((b.rejected_quantity || 0) + (b.damaged_bottles || 0)),
        0
      );
      const total = accepted + rejected;
      const efficiency = total > 0 ? Number(((accepted / total) * 100).toFixed(1)) : 0;

      return {
        shift: def.label,
        accepted,
        rejected,
        efficiency,
      };
    });
  }, [filteredBatches]);

  // Operator Performance dynamically aggregated from filtered batches
  const operatorData = useMemo(() => {
    const map = new Map<string, { batches: number; units: number; rejected: number }>();

    filteredBatches.forEach((b) => {
      const name = b.operator_name || 'Plant Operator';
      const current = map.get(name) || { batches: 0, units: 0, rejected: 0 };
      current.batches += 1;
      current.units += b.quantity_produced;
      current.rejected += (b.rejected_quantity || 0) + (b.damaged_bottles || 0);
      map.set(name, current);
    });

    if (map.size === 0) {
      return [];
    }

    return Array.from(map.entries())
      .map(([name, data]) => {
        const wastePct = data.units > 0 ? Number(((data.rejected / data.units) * 100).toFixed(2)) : 0;
        const rating = wastePct < 2.0 ? '⭐️⭐️⭐️⭐️⭐️' : wastePct < 3.5 ? '⭐️⭐️⭐️⭐️' : '⭐️⭐️⭐️';
        return {
          name,
          batches: data.batches,
          units: data.units,
          wastePct,
          rating,
        };
      })
      .sort((a, b) => b.units - a.units);
  }, [filteredBatches]);

  // Machines with period batch counts and efficiencies
  const machinesWithPeriodData = useMemo(() => {
    return machines.map((m) => {
      const mBatches = filteredBatches.filter(
        (b) =>
          b.machine_id === m.id ||
          (b.machine_used && b.machine_used.toLowerCase().includes(m.name.toLowerCase()))
      );
      const mProduced = mBatches.reduce((acc, b) => acc + b.quantity_produced, 0);
      const mAccepted = mBatches.reduce(
        (acc, b) =>
          acc +
          (b.accepted_quantity !== undefined
            ? b.accepted_quantity
            : Math.max(0, b.quantity_produced - b.rejected_quantity - b.damaged_bottles)),
        0
      );
      const periodEff =
        mProduced > 0 ? ((mAccepted / mProduced) * 100).toFixed(1) : m.efficiency.toString();

      return {
        ...m,
        periodBatchesCount: mBatches.length,
        periodEfficiency: periodEff,
      };
    });
  }, [machines, filteredBatches]);

  const handleExportAuditPDF = () => {
    generateProductionReportPDF(filteredBatches, finishedGoods);
  };

  const periodLabel = getPeriodDateLabel(period, customStartDate, customEndDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Plant Production & Machine Performance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time bottling yields, scrap rates, operator accountability, and line efficiency
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportAuditPDF}>
            <Download className="w-4 h-4 mr-1.5" /> Export Audit PDF
          </Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate('production')}>
            <Factory className="w-4 h-4 mr-1.5" /> Log Batch Run
          </Button>
        </div>
      </div>

      {/* Period Search Engine: Day, Weekly, Months, Quarterly, Annual, Custom Date Range & Period Search */}
      <PeriodSearchEngine
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search production by period (e.g. 2026-08, Sep, Q3, 2026), date, batch, machine, operator..."
        period={period}
        onPeriodChange={setPeriod}
        customStartDate={customStartDate}
        onCustomStartDateChange={setCustomStartDate}
        customEndDate={customEndDate}
        onCustomEndDateChange={setCustomEndDate}
        resultsCount={filteredBatches.length}
        resultsLabel="Batches"
        onReset={() => {
          setSearchTerm('');
          setPeriod('All Time');
          setCustomStartDate('');
          setCustomEndDate('');
        }}
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          title="Period Accepted Bottles"
          value={formatNumber(totalAccepted)}
          subtitle={`Passed QC in ${periodLabel}`}
          trend={9.4}
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          iconBg="bg-emerald-500/10 dark:bg-emerald-500/20"
        />

        <KPITile
          title="Period Line Efficiency"
          value={`${avgEfficiency}%`}
          subtitle={`Target: ≥ 95.0% (${formatNumber(totalProduced)} total)`}
          trend={1.2}
          icon={<Zap className="w-6 h-6 text-sky-400" />}
          iconBg="bg-sky-500/10 dark:bg-sky-500/20"
        />

        <KPITile
          title="Scrap & Defect Rate"
          value={`${avgWaste}%`}
          subtitle={`${formatNumber(totalRejected)} defective bottles`}
          trend={-0.4}
          trendLabel="defect reduction"
          icon={<AlertTriangle className="w-6 h-6 text-rose-400" />}
          iconBg="bg-rose-500/10 dark:bg-rose-500/20"
        />

        <KPITile
          title="Active Bottling Lines"
          value={`${machines.filter((m) => m.status === 'Operational').length} / ${machines.length}`}
          subtitle={`${filteredBatches.length} runs executed in period`}
          icon={<Cpu className="w-6 h-6 text-indigo-400" />}
          iconBg="bg-indigo-500/10 dark:bg-indigo-500/20"
          onClick={() => onNavigate('machines')}
        />
      </div>

      {/* Shift Comparison Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Production Yield & Defect Rates by Shift ({periodLabel})</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Shift yield performance aggregated across {filteredBatches.length} batches
            </p>
          </div>
          <Badge variant="secondary">3 Shifts Monitored</Badge>
        </CardHeader>
        <CardContent>
          {totalProduced === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
              No production batch runs recorded for this period
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftOutputData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="shift" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="accepted"
                    name="Good Units (Accepted)"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="rejected"
                    name="Defects (Rejected/Damaged)"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Machine Statuses & Operator Accountability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Lines Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Machine Line Performance</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Continuous bottling line metrics & runs in {periodLabel}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('machines')}
              className="text-sky-500 text-xs"
            >
              Full Fleet Status →
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {machinesWithPeriodData.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[200px]">
                      {m.name}
                    </span>
                    <Badge
                      variant={
                        m.status === 'Operational'
                          ? 'success'
                          : m.status === 'Maintenance'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {m.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Cap: {m.capacity_per_hour.toLocaleString()} bph • Runs in Period:{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {m.periodBatchesCount}
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {m.periodEfficiency}%
                  </span>
                  <span className="block text-[10px] text-slate-400">Efficiency</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Operator Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Operator Accountability</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Output and scrap percentage per lead operator in {periodLabel}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {operatorData.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No operator runs found for this period
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3 pl-5">Operator Name</th>
                    <th className="p-3 text-right">Batches</th>
                    <th className="p-3 text-right">Units Handled</th>
                    <th className="p-3 text-right">Waste %</th>
                    <th className="p-3 text-right pr-5">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {operatorData.map((op, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 pl-5 font-bold text-slate-800 dark:text-slate-200">
                        {op.name}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-500">
                        {op.batches}
                      </td>
                      <td className="p-3.5 text-right font-mono font-semibold">
                        {op.units.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {op.wastePct}%
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-5">{op.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
