import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Plus,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Activity,
  Edit2,
  Archive,
  Search,
  Filter,
  Layers,
  Building2,
  Calendar,
  ShieldCheck,
  Power,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { Machine, MachineStatus } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatDate } from '../lib/utils';

const MACHINE_TYPES = [
  'Rotary Rinse-Fill-Capper',
  'Linear Blow Molder',
  'Rotary Blow Molder',
  'Sachet Water Form-Fill-Seal Machine',
  'Reverse Osmosis (RO) Skid',
  'Ozone & UV Disinfection System',
  '19L Gallon Washer & Capper',
  'Sleeve & Wrap-Around Labeler',
  'AutoPack Shrink Film Bundler',
  'Continuous Inkjet (CIJ) Batch Coder',
  'End-of-Line Palletizer & Conveyor',
  'Raw Water Deep Well Submersible Pump',
  'Other Bottling Equipment',
];

interface MachineFormData {
  id?: string;
  name: string;
  code: string;
  type: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  purchase_cost: string | number;
  branch_id: string;
  location: string;
  capacity_per_hour: string | number;
  status: MachineStatus;
  installation_date: string;
  warranty_expiry: string;
  notes: string;
  efficiency: number;
}

const emptyMachineForm: MachineFormData = {
  name: '',
  code: '',
  type: 'Rotary Rinse-Fill-Capper',
  manufacturer: '',
  model: '',
  serial_number: '',
  purchase_date: '',
  purchase_cost: '',
  branch_id: 'branch-1',
  location: 'Main Bottling Hall',
  capacity_per_hour: '',
  status: 'Active',
  installation_date: '',
  warranty_expiry: '',
  notes: '',
  efficiency: 98,
};

export function MachinesPage() {
  const {
    machines,
    branches,
    currentOrganization,
    currentUser,
    activeRole,
    addMachine,
    updateMachine,
    retireMachine,
    updateMachineStatus,
  } = useERPStore();

  const userRole = (currentUser?.role || activeRole || 'viewer').toLowerCase();
  const canManageMachines =
    userRole === 'owner' ||
    userRole === 'admin' ||
    userRole === 'production_manager' ||
    userRole === 'super_admin';

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Under Maintenance' | 'Inactive' | 'Retired'>('All');

  // Add / Edit Machine Modal State
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<MachineFormData>(emptyMachineForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Maintenance & Calibration Modal State
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<MachineStatus>('Active');
  const [newEfficiency, setNewEfficiency] = useState<number>(98);

  // Filtered Machines
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.code && m.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.type && m.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.manufacturer && m.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.model && m.model.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (statusFilter === 'All') return true;
      if (statusFilter === 'Active') return m.status === 'Active' || m.status === 'Operational';
      if (statusFilter === 'Under Maintenance') return m.status === 'Under Maintenance' || m.status === 'Maintenance';
      if (statusFilter === 'Inactive') return m.status === 'Inactive' || m.status === 'Idle' || m.status === 'Offline';
      if (statusFilter === 'Retired') return m.status === 'Retired';

      return true;
    });
  }, [machines, searchTerm, statusFilter]);

  // Statistics
  const totalMachines = machines.length;
  const activeCount = machines.filter((m) => m.status === 'Active' || m.status === 'Operational').length;
  const maintenanceCount = machines.filter((m) => m.status === 'Under Maintenance' || m.status === 'Maintenance').length;
  const totalCapacityBph = machines
    .filter((m) => m.status === 'Active' || m.status === 'Operational')
    .reduce((sum, m) => sum + (Number(m.capacity_per_hour) || 0), 0);

  // Open Add Machine Modal
  const handleOpenAdd = () => {
    // Generate next machine code suggestion
    const nextNum = machines.length + 1;
    const suggestedCode = `MCH-${String(nextNum).padStart(3, '0')}`;
    setFormData({
      ...emptyMachineForm,
      code: suggestedCode,
      branch_id: branches[0]?.id || 'branch-1',
    });
    setIsEditing(false);
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  // Open Edit Machine Modal
  const handleOpenEdit = (m: Machine) => {
    setFormData({
      id: m.id,
      name: m.name,
      code: m.code || `MCH-${m.id.replace('m-', '').slice(0, 3)}`,
      type: m.type || 'Rotary Rinse-Fill-Capper',
      manufacturer: m.manufacturer || '',
      model: m.model || m.model_number || '',
      serial_number: m.serial_number || '',
      purchase_date: m.purchase_date || '',
      purchase_cost: m.purchase_cost || '',
      branch_id: m.branch_id || branches[0]?.id || 'branch-1',
      location: m.location || '',
      capacity_per_hour: m.capacity_per_hour || '',
      status: m.status || 'Active',
      installation_date: m.installation_date || '',
      warranty_expiry: m.warranty_expiry || '',
      notes: m.notes || '',
      efficiency: m.efficiency !== undefined ? m.efficiency : 98,
    });
    setIsEditing(true);
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  // Save Add or Edit Machine
  const handleSaveMachine = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = formData.name.trim();
    const code = formData.code.trim().toUpperCase();
    const capacity = Number(formData.capacity_per_hour);

    if (!name) {
      setFormError('Machine Name is required.');
      return;
    }
    if (!code) {
      setFormError('Machine Code/ID is required.');
      return;
    }
    if (!formData.type) {
      setFormError('Machine Type is required.');
      return;
    }
    if (!capacity || capacity <= 0) {
      setFormError('Rated Capacity must be a positive number greater than 0.');
      return;
    }

    if (isEditing && formData.id) {
      const result = updateMachine(formData.id, {
        name,
        code,
        type: formData.type,
        manufacturer: formData.manufacturer.trim(),
        model: formData.model.trim(),
        model_number: formData.model.trim(),
        serial_number: formData.serial_number.trim(),
        purchase_date: formData.purchase_date,
        purchase_cost: Number(formData.purchase_cost) || 0,
        branch_id: formData.branch_id,
        location: formData.location.trim(),
        capacity_per_hour: capacity,
        capacity,
        status: formData.status,
        installation_date: formData.installation_date,
        warranty_expiry: formData.warranty_expiry,
        notes: formData.notes.trim(),
        efficiency: Number(formData.efficiency) || 98,
      });

      if (!result.success) {
        setFormError(result.error || 'Failed to update machine.');
        return;
      }
      setFormSuccess('Machine details successfully updated.');
    } else {
      const result = addMachine({
        name,
        code,
        type: formData.type,
        manufacturer: formData.manufacturer.trim(),
        model: formData.model.trim(),
        model_number: formData.model.trim(),
        serial_number: formData.serial_number.trim(),
        purchase_date: formData.purchase_date,
        purchase_cost: Number(formData.purchase_cost) || 0,
        branch_id: formData.branch_id,
        location: formData.location.trim(),
        capacity_per_hour: capacity,
        capacity,
        status: formData.status,
        installation_date: formData.installation_date,
        warranty_expiry: formData.warranty_expiry,
        notes: formData.notes.trim(),
        efficiency: Number(formData.efficiency) || 98,
      });

      if (!result.success) {
        setFormError(result.error || 'Failed to add machine.');
        return;
      }
      setFormSuccess('Machine successfully added to plant registry.');
    }

    setTimeout(() => {
      setFormSuccess(null);
      setIsAddEditModalOpen(false);
    }, 800);
  };

  // Retire / Reactivate Machine
  const handleToggleRetire = (m: Machine) => {
    if (!canManageMachines) return;
    if (m.status === 'Retired') {
      updateMachine(m.id, { status: 'Active' });
    } else {
      if (confirm(`Are you sure you want to retire ${m.name}? Historical production records will be preserved.`)) {
        retireMachine(m.id);
      }
    }
  };

  // Open Maintenance & Calibration Modal
  const handleOpenMaintenance = (m: Machine) => {
    setSelectedMachine(m);
    setNewStatus(m.status);
    setNewEfficiency(m.efficiency || 98);
    setIsMaintenanceModalOpen(true);
  };

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    updateMachineStatus(selectedMachine.id, newStatus, Number(newEfficiency));
    setIsMaintenanceModalOpen(false);
  };

  const getStatusBadgeVariant = (status: MachineStatus): 'success' | 'warning' | 'danger' | 'secondary' => {
    if (status === 'Active' || status === 'Operational') return 'success';
    if (status === 'Under Maintenance' || status === 'Maintenance') return 'warning';
    if (status === 'Retired') return 'danger';
    return 'secondary';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            Bottling Machinery & Equipment
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Plant asset registry for blow molders, rinse-fill-cappers, labelers, RO filtration skids, and packaging lines
          </p>
        </div>

        {canManageMachines && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            className="shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Machine
          </Button>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Machinery</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalMachines}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{currentOrganization?.name || 'Workspace'}</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Lines</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Ready for production</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Maintenance</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{maintenanceCount}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Servicing or offline</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Rated Capacity</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">{totalCapacityBph.toLocaleString()}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Units / hour aggregate</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, machine ID, type, manufacturer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['All', 'Active', 'Under Maintenance', 'Inactive', 'Retired'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === tab
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Machines Grid */}
      {filteredMachines.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <Cpu className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No machines found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm || statusFilter !== 'All'
              ? 'No machinery matches your filter criteria. Try clearing search or status filters.'
              : 'No machinery registered in this organization yet. Click "Add Machine" to register your first bottling line.'}
          </p>
          {canManageMachines && (
            <Button size="sm" variant="primary" onClick={handleOpenAdd} className="mt-4">
              <Plus className="w-4 h-4 mr-1.5" /> Add First Machine
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMachines.map((m) => {
            const isActive = m.status === 'Active' || m.status === 'Operational';
            const isMaint = m.status === 'Under Maintenance' || m.status === 'Maintenance';
            const isRetired = m.status === 'Retired';

            return (
              <Card key={m.id} className="relative overflow-hidden flex flex-col justify-between transition-all hover:shadow-md">
                {/* Top Status Accent Bar */}
                <div
                  className={`h-1.5 w-full ${
                    isActive
                      ? 'bg-emerald-500'
                      : isMaint
                      ? 'bg-amber-500'
                      : isRetired
                      ? 'bg-purple-500'
                      : 'bg-slate-400'
                  }`}
                />

                <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {m.code || 'MCH'}
                          </span>
                          <span className="text-xs text-slate-400">{m.type}</span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                          {m.name}
                        </h3>
                      </div>
                      <Badge variant={getStatusBadgeVariant(m.status)} size="sm" className="shrink-0 capitalize">
                        {m.status}
                      </Badge>
                    </div>

                    {(m.manufacturer || m.model || m.serial_number) && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                        {m.manufacturer && <span><strong>Mfr:</strong> {m.manufacturer}</span>}
                        {m.model && <span><strong>Model:</strong> {m.model}</span>}
                        {m.serial_number && <span><strong>SN:</strong> {m.serial_number}</span>}
                      </div>
                    )}

                    {/* Operational Metrics */}
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 text-[11px]">Hourly Capacity:</span>
                        <p className="font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                          {(Number(m.capacity_per_hour) || 0).toLocaleString()} bph
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px]">Efficiency:</span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          {m.efficiency || 98}%
                        </p>
                      </div>
                    </div>

                    {/* Location & Dates */}
                    <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {m.location && (
                        <p className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span>Location: {m.location}</span>
                        </p>
                      )}
                      {m.last_serviced_date && (
                        <p className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span>Last Serviced: {formatDate(m.last_serviced_date)}</span>
                        </p>
                      )}
                      {m.warranty_expiry && (
                        <p className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span>Warranty Expiry: {formatDate(m.warranty_expiry)}</span>
                        </p>
                      )}
                    </div>

                    {m.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50/80 dark:bg-slate-800/30 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        "{m.notes}"
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {canManageMachines && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(m)}
                          className="text-xs p-1.5 h-auto text-slate-600 dark:text-slate-400 hover:text-sky-600"
                          title="Edit Machine Details"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                      )}
                      {canManageMachines && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleRetire(m)}
                          className={`text-xs p-1.5 h-auto ${
                            isRetired
                              ? 'text-emerald-600 hover:text-emerald-700'
                              : 'text-slate-400 hover:text-purple-600'
                          }`}
                          title={isRetired ? 'Reactivate Machine' : 'Retire / Deactivate Machine without deleting historical batches'}
                        >
                          <Archive className="w-3.5 h-3.5 mr-1" />
                          {isRetired ? 'Reactivate' : 'Retire'}
                        </Button>
                      )}
                    </div>

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
      )}

      {/* Add / Edit Machine Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={isEditing ? 'Edit Machine Details' : 'Add New Production Machine'}
        description={
          isEditing
            ? `Update asset specifications for ${formData.name}.`
            : `Register a new bottling machine for ${currentOrganization?.name || 'your plant'}.`
        }
        maxWidth="lg"
      >
        <form onSubmit={handleSaveMachine} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Machine Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Krones Rotary High-Speed Bottling Monoblock #2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Machine Code / ID * (Unique)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MCH-005"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Machine Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {MACHINE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rated Capacity (Bottles / Units per Hour) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 5000"
                value={formData.capacity_per_hour}
                onChange={(e) => setFormData({ ...formData, capacity_per_hour: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                placeholder="e.g. Krones AG, Sidel, SACMI"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Model Number / Series
              </label>
              <input
                type="text"
                placeholder="e.g. KRN-ISO-4800"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                placeholder="e.g. SN-2024-8841"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Plant Location / Floor Area
              </label>
              <input
                type="text"
                placeholder="e.g. Main Bottling Line 2, Hall B"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Operational Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as MachineStatus })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="Active">Active (Ready for Production)</option>
                <option value="Under Maintenance">Under Maintenance (Servicing)</option>
                <option value="Inactive">Inactive (Idle / Standby)</option>
                <option value="Retired">Retired (Preserved for History)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Cost ({currentOrganization?.currency || 'GHS'})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.purchase_cost}
                onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Installation Date
              </label>
              <input
                type="date"
                value={formData.installation_date}
                onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Warranty Expiry Date
              </label>
              <input
                type="date"
                value={formData.warranty_expiry}
                onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Operating Efficiency Rating (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.efficiency}
                onChange={(e) => setFormData({ ...formData, efficiency: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes & Technical Description
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Primary line for 500ml and 750ml bottles with nitrogen dosing."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {isEditing ? 'Save Changes' : 'Create Machine'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Maintenance & Calibration Modal */}
      <Modal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        title={`Service & Calibrate: ${selectedMachine?.name}`}
        description="Update operational status, cycle efficiency, and log preventive maintenance"
        maxWidth="md"
      >
        <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Machine Operational Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as MachineStatus)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="Active">Active (Ready for Production)</option>
              <option value="Operational">Operational (Live Run)</option>
              <option value="Under Maintenance">Under Maintenance (Scheduled PM)</option>
              <option value="Maintenance">Maintenance (Under Repair)</option>
              <option value="Idle">Idle (Between Shifts)</option>
              <option value="Faulty">Faulty (Breakdown)</option>
              <option value="Inactive">Inactive (Offline)</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Line Efficiency Rating (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={newEfficiency}
              onChange={(e) => setNewEfficiency(Number(e.target.value))}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" size="sm" onClick={() => setIsMaintenanceModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" size="sm">
              Save Status
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
