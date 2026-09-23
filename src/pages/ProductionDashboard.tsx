import React from 'react';
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

export function ProductionDashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { productionBatches, finishedGoods, machines } = useERPStore();

  const totalProduced = productionBatches.reduce((acc, b) => acc + b.quantity_produced, 0);
  const totalAccepted = productionBatches.reduce((acc, b) => acc + b.accepted_quantity, 0);
  const totalRejected = productionBatches.reduce(
    (acc, b) => acc + (b.rejected_quantity + b.damaged_bottles),
    0
  );
  const avgEfficiency =
    totalProduced > 0 ? ((totalAccepted / totalProduced) * 100).toFixed(2) : '97.8';
  const avgWaste =
    totalProduced > 0 ? ((totalRejected / totalProduced) * 100).toFixed(2) : '2.2';

  // Output by Shift Data
  const shiftOutputData = [
    { shift: 'Morning Shift (06:00 - 14:00)', accepted: 14200, rejected: 190, efficiency: 98.6 },
    { shift: 'Afternoon Shift (14:00 - 22:00)', accepted: 11800, rejected: 280, efficiency: 97.6 },
    { shift: 'Night Shift (22:00 - 06:00)', accepted: 8600, rejected: 210, efficiency: 97.5 },
  ];

  // Operator Performance
  const operatorData = [
    { name: 'Marcus Vance', batches: 2, units: 10255, wastePct: 1.83, rating: '⭐️⭐️⭐️⭐️⭐️' },
    { name: 'Elena Rostova', batches: 1, units: 1180, wastePct: 1.67, rating: '⭐️⭐️⭐️⭐️⭐️' },
    { name: 'David Chen', batches: 1, units: 3730, wastePct: 1.84, rating: '⭐️⭐️⭐️⭐️' },
  ];

  const handleExportAuditPDF = () => {
    generateProductionReportPDF(productionBatches, finishedGoods);
  };

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

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          title="Total Accepted Bottles"
          value={formatNumber(totalAccepted)}
          subtitle="Passed QC inspection"
          trend={9.4}
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          iconBg="bg-emerald-500/10 dark:bg-emerald-500/20"
        />

        <KPITile
          title="Plant Efficiency"
          value={`${avgEfficiency}%`}
          subtitle="Target: ≥ 95.0%"
          trend={1.2}
          icon={<Zap className="w-6 h-6 text-sky-400" />}
          iconBg="bg-sky-500/10 dark:bg-sky-500/20"
        />

        <KPITile
          title="Scrap & Defect Rate"
          value={`${avgWaste}%`}
          subtitle={`${formatNumber(totalRejected)} total bottles`}
          trend={-0.4}
          trendLabel="defect reduction"
          icon={<AlertTriangle className="w-6 h-6 text-rose-400" />}
          iconBg="bg-rose-500/10 dark:bg-rose-500/20"
        />

        <KPITile
          title="Active Bottling Lines"
          value={`${machines.filter((m) => m.status === 'Operational').length} / ${machines.length}`}
          subtitle="All main fillers running"
          icon={<Cpu className="w-6 h-6 text-indigo-400" />}
          iconBg="bg-indigo-500/10 dark:bg-indigo-500/20"
          onClick={() => onNavigate('machines')}
        />
      </div>

      {/* Shift Comparison Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Production Yield & Defect Rates by Shift</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Morning, Afternoon, and Night shifts comparison
            </p>
          </div>
          <Badge variant="secondary">3 Active Shifts</Badge>
        </CardHeader>
        <CardContent>
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
                Continuous bottling line metrics & cycle speed
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
            {machines.map((m) => (
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
                    Cap: {m.capacity_per_hour.toLocaleString()} bph • Last Service: {m.last_serviced_date}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {m.efficiency}%
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
              Output and scrap percentage per lead operator
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3 pl-5">Operator Name</th>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
