import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Activity,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { Machine, MachineStatus } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatDate } from '../lib/utils';

export function MachinesPage() {
  const { machines, updateMachineStatus } = useERPStore();
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<MachineStatus>('Operational');
  const [newEfficiency, setNewEfficiency] = useState<number>(98);

  const handleOpenMaintenance = (m: Machine) => {
    setSelectedMachine(m);
    setNewStatus(m.status);
    setNewEfficiency(m.efficiency);
    setIsModalOpen(true);
  };

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    updateMachineStatus(selectedMachine.id, newStatus, Number(newEfficiency));
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Bottling Machinery & Line Telemetry
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time status of blow molders, rotary rinse-fill-cappers, sleeve labelers, and packagers
          </p>
        </div>
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {machines.map((m) => {
          const isOk = m.status === 'Operational';
          const isMaint = m.status === 'Maintenance';

          return (
            <Card key={m.id} className="relative overflow-hidden">
              <div
                className={`h-1.5 w-full ${
                  isOk ? 'bg-emerald-500' : isMaint ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {m.name}
                    </h3>
                    <p className="text-xs text-slate-400">{m.type}</p>
                  </div>
                  <Badge
                    variant={isOk ? 'success' : isMaint ? 'warning' : 'danger'}
                    size="sm"
                  >
                    {m.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                  <div>
                    <span className="text-slate-400">Capacity:</span>
                    <p className="font-bold text-slate-900 dark:text-white font-mono">
                      {m.capacity_per_hour.toLocaleString()} bph
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Efficiency:</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {m.efficiency}%
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <p>📅 Last Serviced: {formatDate(m.last_serviced_date)}</p>
                  <p>🔧 Next Scheduled PM: {formatDate(m.next_maintenance_date)}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenMaintenance(m)}
                    className="text-xs"
                  >
                    <Wrench className="w-3.5 h-3.5 mr-1" /> Calibrate / Service
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Maintenance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Service & Calibrate: ${selectedMachine?.name}`}
        description="Update operational status, cycle efficiency, and log preventive maintenance"
        maxWidth="md"
      >
        <form onSubmit={handleSaveStatus} className="space-y-4">
          <Select
            label="Machine Operational Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as MachineStatus)}
          >
            <option value="Operational">Operational (Live Production)</option>
            <option value="Maintenance">Maintenance (Scheduled PM)</option>
            <option value="Idle">Idle (Between Shifts)</option>
            <option value="Faulty">Faulty (Breakdown)</option>
          </Select>

          <Input
            label="Line Efficiency Rating (%)"
            type="number"
            min="0"
            max="100"
            value={newEfficiency}
            onChange={(e) => setNewEfficiency(Number(e.target.value))}
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Status
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
