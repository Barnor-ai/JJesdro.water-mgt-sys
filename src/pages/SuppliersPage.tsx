import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Download,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Trash2,
  Filter,
  Edit2,
  Eye,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Power,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import {
  Supplier,
  PurchaseOrder,
  RawMaterial,
  PurchaseStatus,
  SupplierCategory,
} from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '../lib/utils';
import { exportToExcel, generatePurchaseOrderPDF } from '../lib/exportUtils';
import { ExcelImportModal, ImportEntityType } from '../components/common/ExcelImportModal';

export function SuppliersPage() {
  const {
    suppliers = [],
    purchases = [],
    rawMaterials = [],
    currentUser,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    toggleSupplierStatus,
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    toggleRawMaterialStatus,
    addPurchaseOrder,
    receivePurchaseOrder,
    deletePurchaseOrder,
    importSuppliers,
    importPurchases,
    importRawMaterials,
  } = useERPStore();

  const [importModalType, setImportModalType] = useState<ImportEntityType | null>(null);

  const [activeTab, setActiveTab] = useState<'pos' | 'suppliers' | 'raw'>('pos');

  // Purchase Order State
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poSearch, setPOSearch] = useState('');
  const [poStatusFilter, setPOStatusFilter] = useState('all');
  const [poSupplierFilter, setPOSupplierFilter] = useState('all');
  const [poDateFilter, setPODateFilter] = useState('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers?.[0]?.id || 'sup-1');
  const [selectedRawId, setSelectedRawId] = useState(rawMaterials?.[0]?.id || 'rm-1');
  const [poQty, setPOQty] = useState<number>(20000);
  const [unitCost, setUnitCost] = useState<number>(() => {
    const raw = rawMaterials?.[0];
    return raw?.cost_per_unit || 0.04;
  });
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [poNotes, setPONotes] = useState('');
  const [poToDelete, setPOToDelete] = useState<PurchaseOrder | null>(null);

  // Supplier State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isEditSupplierModalOpen, setIsEditSupplierModalOpen] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState('all');
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('all');

  // Supplier Form State
  const [supName, setSupName] = useState('');
  const [supCode, setSupCode] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supCountry, setSupCountry] = useState('Ghana');
  const [supTaxId, setSupTaxId] = useState('');
  const [supType, setSupType] = useState('Manufacturer');
  const [supPaymentTerms, setSupPaymentTerms] = useState('Net 30');
  const [supBankDetails, setSupBankDetails] = useState('');
  const [supItems, setSupItems] = useState('Preforms, Caps, Labels, Packaging');
  const [supNotes, setSupNotes] = useState('');
  const [supStatus, setSupStatus] = useState<'active' | 'inactive'>('active');
  const [supError, setSupError] = useState('');

  // Raw Material State
  const [rawSearch, setRawSearch] = useState('');
  const [rawCategoryFilter, setRawCategoryFilter] = useState('all');
  const [rawStatusFilter, setRawStatusFilter] = useState('all');
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [isEditRawModalOpen, setIsEditRawModalOpen] = useState(false);
  const [editingRaw, setEditingRaw] = useState<RawMaterial | null>(null);
  const [rawToDelete, setRawToDelete] = useState<RawMaterial | null>(null);
  const [rawError, setRawError] = useState('');

  // Raw Material Form State
  const [rmName, setRmName] = useState('');
  const [rmCode, setRmCode] = useState('');
  const [rmCategory, setRmCategory] = useState('Bottle');
  const [rmUnit, setRmUnit] = useState('pcs');
  const [rmStock, setRmStock] = useState<number>(10000);
  const [rmReorder, setRmReorder] = useState<number>(5000);
  const [rmCost, setRmCost] = useState<number>(0.05);
  const [rmSupplierId, setRmSupplierId] = useState(suppliers?.[0]?.id || '');
  const [rmNotes, setRmNotes] = useState('');
  const [rmStatus, setRmStatus] = useState<'active' | 'inactive'>('active');

  const selectedSupplier = suppliers?.find((s) => s.id === selectedSupplierId);
  const selectedRaw = rawMaterials?.find((r) => r.id === selectedRawId);

  // Helper to extract items safely regardless of DB column schema differences
  const getSupplierItems = (s: Supplier): string[] => {
    if (Array.isArray(s?.supplied_items) && s.supplied_items.length > 0) {
      return s.supplied_items;
    }
    const materials = (s as any)?.materials_supplied;
    if (typeof materials === 'string' && materials.trim()) {
      return materials
        .split(',')
        .map((it: string) => it.trim())
        .filter(Boolean);
    }
    return ['Packaging', 'Preforms', 'Caps'];
  };

  // Update default unit cost when raw material selection changes
  const handleRawChange = (rawId: string) => {
    setSelectedRawId(rawId);
    const found = rawMaterials?.find((r) => r.id === rawId);
    if (found) {
      setUnitCost(found.cost_per_unit || 0.04);
    }
  };

  const poTotal = (Number(poQty) || 0) * (Number(unitCost) || 0);

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    const cost = Number(unitCost) || 0;
    const qty = Number(poQty) || 0;
    const total = qty * cost;

    addPurchaseOrder({
      po_number: poNumber,
      supplier_id: selectedSupplierId,
      supplier_name: selectedSupplier?.name || 'Supplier',
      status: 'Ordered',
      order_date: new Date().toISOString().slice(0, 10),
      expected_delivery_date: expectedDate,
      subtotal: total,
      tax: 0,
      total_amount: total,
      notes: poNotes,
      items: [
        {
          id: `pi-${Date.now()}`,
          purchase_id: `po-${Date.now()}`,
          raw_material_id: selectedRawId,
          raw_material_name: selectedRaw?.name || 'Raw Material',
          quantity: qty,
          unit_cost: cost,
          total_cost: total,
        },
      ],
      created_by: currentUser?.full_name || 'Admin',
    });

    setIsPOModalOpen(false);
    setPONotes('');
  };

  const resetSupplierForm = () => {
    setSupName('');
    setSupCode('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupCountry('Ghana');
    setSupTaxId('');
    setSupType('Manufacturer');
    setSupPaymentTerms('Net 30');
    setSupBankDetails('');
    setSupItems('Preforms, Caps, Labels, Packaging');
    setSupNotes('');
    setSupStatus('active');
    setSupError('');
  };

  const handleOpenAddSupplier = () => {
    resetSupplierForm();
    setSupCode(`SUP-${Math.floor(100 + Math.random() * 900)}`);
    setIsSupplierModalOpen(true);
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    setSupError('');

    if (!supName.trim()) {
      setSupError('Supplier Name is required.');
      return;
    }

    const itemsArray = supItems
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    const res = addSupplier({
      name: supName.trim(),
      code: supCode.trim() || `SUP-${Math.floor(100 + Math.random() * 900)}`,
      contact_person: supContact.trim(),
      phone: supPhone.trim(),
      email: supEmail.trim(),
      address: supAddress.trim(),
      country: supCountry.trim() || 'Ghana',
      tax_id: supTaxId.trim(),
      supplier_type: supType,
      payment_terms: supPaymentTerms,
      bank_details: supBankDetails.trim(),
      supplied_items: itemsArray.length > 0 ? itemsArray : ['Raw Materials', 'Packaging'],
      materials_supplied: supItems,
      notes: supNotes.trim(),
      rating: 5,
      status: supStatus,
    });

    if (res && res.error) {
      setSupError(res.error);
      return;
    }

    setIsSupplierModalOpen(false);
    resetSupplierForm();
  };

  const handleOpenEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupName(supplier.name || '');
    setSupCode(supplier.code || '');
    setSupContact(supplier.contact_person || supplier.contact || '');
    setSupPhone(supplier.phone || '');
    setSupEmail(supplier.email || '');
    setSupAddress(supplier.address || '');
    setSupCountry(supplier.country || 'Ghana');
    setSupTaxId(supplier.tax_id || '');
    setSupType(supplier.supplier_type || supplier.category || 'Manufacturer');
    setSupPaymentTerms(supplier.payment_terms || 'Net 30');
    setSupBankDetails(supplier.bank_details || '');
    setSupItems(getSupplierItems(supplier).join(', '));
    setSupNotes(supplier.notes || '');
    setSupStatus(supplier.status === 'inactive' ? 'inactive' : 'active');
    setSupError('');
    setIsEditSupplierModalOpen(true);
  };

  const handleSaveEditSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    setSupError('');
    if (!editingSupplier) return;

    if (!supName.trim()) {
      setSupError('Supplier Name cannot be empty.');
      return;
    }

    const itemsArray = supItems
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    const res = updateSupplier(editingSupplier.id, {
      name: supName.trim(),
      code: supCode.trim() || editingSupplier.code,
      contact_person: supContact.trim(),
      phone: supPhone.trim(),
      email: supEmail.trim(),
      address: supAddress.trim(),
      country: supCountry.trim() || 'Ghana',
      tax_id: supTaxId.trim(),
      supplier_type: supType,
      payment_terms: supPaymentTerms,
      bank_details: supBankDetails.trim(),
      supplied_items: itemsArray,
      materials_supplied: supItems,
      notes: supNotes.trim(),
      status: supStatus,
    });

    if (res && res.error) {
      setSupError(res.error);
      return;
    }

    setIsEditSupplierModalOpen(false);
    setEditingSupplier(null);
  };

  const handleDeleteSupplierConfirm = () => {
    if (supplierToDelete) {
      deleteSupplier(supplierToDelete.id);
      setSupplierToDelete(null);
    }
  };

  const handleDeletePOConfirm = () => {
    if (poToDelete) {
      deletePurchaseOrder(poToDelete.id);
      setPOToDelete(null);
    }
  };

  // Raw Materials Management
  const resetRawMaterialForm = () => {
    setRmName('');
    setRmCode('');
    setRmCategory('Bottle');
    setRmUnit('pcs');
    setRmStock(10000);
    setRmReorder(5000);
    setRmCost(0.05);
    setRmSupplierId(suppliers?.[0]?.id || '');
    setRmNotes('');
    setRmStatus('active');
    setRawError('');
  };

  const handleOpenAddRawMaterial = () => {
    resetRawMaterialForm();
    setRmCode(`RM-${Math.floor(100 + Math.random() * 900)}`);
    setIsRawModalOpen(true);
  };

  const handleCreateRawMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    setRawError('');

    if (!rmName.trim()) {
      setRawError('Raw Material Name is required.');
      return;
    }

    const assignedSupp = suppliers.find((s) => s.id === rmSupplierId);

    const res = addRawMaterial({
      name: rmName.trim(),
      code: rmCode.trim() || `RM-${Math.floor(100 + Math.random() * 900)}`,
      sku: rmCode.trim() || `RM-${Math.floor(100 + Math.random() * 900)}`,
      category: rmCategory,
      unit: rmUnit.trim() || 'pcs',
      current_stock: Number(rmStock) || 0,
      reorder_level: Number(rmReorder) || 0,
      cost_per_unit: Number(rmCost) || 0,
      supplier_id: rmSupplierId || undefined,
      supplier_name: assignedSupp?.name || undefined,
      notes: rmNotes.trim(),
      status: rmStatus,
    });

    if (res && res.error) {
      setRawError(res.error);
      return;
    }

    setIsRawModalOpen(false);
    resetRawMaterialForm();
  };

  const handleOpenEditRawMaterial = (rm: RawMaterial) => {
    setEditingRaw(rm);
    setRmName(rm.name || '');
    setRmCode(rm.code || rm.sku || '');
    setRmCategory(rm.category || 'Bottle');
    setRmUnit(rm.unit || 'pcs');
    setRmStock(rm.current_stock || 0);
    setRmReorder(rm.reorder_level || 0);
    setRmCost(rm.cost_per_unit || 0);
    setRmSupplierId(rm.supplier_id || suppliers?.[0]?.id || '');
    setRmNotes(rm.notes || rm.description || '');
    setRmStatus(rm.status === 'inactive' ? 'inactive' : 'active');
    setRawError('');
    setIsEditRawModalOpen(true);
  };

  const handleSaveEditRawMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    setRawError('');
    if (!editingRaw) return;

    if (!rmName.trim()) {
      setRawError('Raw Material Name cannot be empty.');
      return;
    }

    const assignedSupp = suppliers.find((s) => s.id === rmSupplierId);

    const res = updateRawMaterial(editingRaw.id, {
      name: rmName.trim(),
      code: rmCode.trim() || editingRaw.code,
      sku: rmCode.trim() || editingRaw.sku,
      category: rmCategory,
      unit: rmUnit.trim() || 'pcs',
      current_stock: Number(rmStock),
      reorder_level: Number(rmReorder),
      cost_per_unit: Number(rmCost),
      supplier_id: rmSupplierId || undefined,
      supplier_name: assignedSupp?.name || undefined,
      notes: rmNotes.trim(),
      status: rmStatus,
    });

    if (res && res.error) {
      setRawError(res.error);
      return;
    }

    setIsEditRawModalOpen(false);
    setEditingRaw(null);
  };

  const handleDeleteRawConfirm = () => {
    if (rawToDelete) {
      deleteRawMaterial(rawToDelete.id);
      setRawToDelete(null);
    }
  };

  // Filtered queries
  const filteredPOs = useMemo(() => {
    let list = purchases || [];

    if (poSearch) {
      const q = poSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.po_number?.toLowerCase().includes(q) ||
          p.supplier_name?.toLowerCase().includes(q) ||
          p.status?.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q) ||
          (p.items || []).some((it) => it.raw_material_name?.toLowerCase().includes(q))
      );
    }

    if (poStatusFilter !== 'all') {
      list = list.filter((p) => p.status === poStatusFilter);
    }

    if (poSupplierFilter !== 'all') {
      list = list.filter((p) => p.supplier_id === poSupplierFilter);
    }

    if (poDateFilter !== 'all') {
      const now = new Date();
      list = list.filter((p) => {
        if (!p.order_date) return true;
        const d = new Date(p.order_date);
        switch (poDateFilter) {
          case 'today':
            return d.toDateString() === now.toDateString();
          case 'this_week': {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            return d >= startOfWeek;
          }
          case 'this_month':
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          case 'this_quarter': {
            const currentQ = Math.floor(now.getMonth() / 3);
            const orderQ = Math.floor(d.getMonth() / 3);
            return currentQ === orderQ && d.getFullYear() === now.getFullYear();
          }
          case 'this_year':
            return d.getFullYear() === now.getFullYear();
          case 'prev_month': {
            const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
          }
          case 'prev_quarter': {
            const prevQDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            const prevQ = Math.floor(prevQDate.getMonth() / 3);
            return Math.floor(d.getMonth() / 3) === prevQ && d.getFullYear() === prevQDate.getFullYear();
          }
          case 'prev_year':
            return d.getFullYear() === now.getFullYear() - 1;
          default:
            return true;
        }
      });
    }

    return list;
  }, [purchases, poSearch, poStatusFilter, poSupplierFilter, poDateFilter]);

  const filteredRaw = useMemo(() => {
    let list = rawMaterials || [];

    if (rawSearch) {
      const q = rawSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.code?.toLowerCase().includes(q) ||
          r.sku?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.supplier_name?.toLowerCase().includes(q)
      );
    }

    if (rawCategoryFilter !== 'all') {
      list = list.filter((r) => r.category === rawCategoryFilter);
    }

    if (rawStatusFilter !== 'all') {
      if (rawStatusFilter === 'active') {
        list = list.filter((r) => r.status !== 'inactive');
      } else if (rawStatusFilter === 'inactive') {
        list = list.filter((r) => r.status === 'inactive');
      } else if (rawStatusFilter === 'low_stock') {
        list = list.filter((r) => r.current_stock <= r.reorder_level);
      }
    }

    return list;
  }, [rawMaterials, rawSearch, rawCategoryFilter, rawStatusFilter]);

  const filteredSuppliers = useMemo(() => {
    let list = suppliers || [];

    if (supplierSearch) {
      const q = supplierSearch.toLowerCase();
      list = list.filter((s) => {
        const items = getSupplierItems(s);
        return (
          s.name?.toLowerCase().includes(q) ||
          s.code?.toLowerCase().includes(q) ||
          s.contact_person?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.phone?.toLowerCase().includes(q) ||
          s.tax_id?.toLowerCase().includes(q) ||
          s.country?.toLowerCase().includes(q) ||
          items.some((it) => it.toLowerCase().includes(q))
        );
      });
    }

    if (supplierStatusFilter !== 'all') {
      list = list.filter((s) => (s.status || 'active') === supplierStatusFilter);
    }

    if (supplierCategoryFilter !== 'all') {
      list = list.filter(
        (s) => (s.supplier_type || s.category || '').toLowerCase() === supplierCategoryFilter.toLowerCase()
      );
    }

    return list;
  }, [suppliers, supplierSearch, supplierStatusFilter, supplierCategoryFilter]);

  // Unique Raw Material Categories for filter
  const rawCategories = useMemo(() => {
    const set = new Set<string>();
    rawMaterials.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [rawMaterials]);

  // Unique Supplier Types for filter
  const supplierTypes = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      const t = s.supplier_type || s.category;
      if (t) set.add(t);
    });
    return Array.from(set);
  }, [suppliers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-sky-500" />
            Suppliers & Supply Chain Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Vendor master registry, dynamic raw materials tracking, purchase orders, and multi-tenant inventory ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handleOpenAddRawMaterial}>
            <Plus className="w-4 h-4 mr-1 text-emerald-500" /> Add Raw Material
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenAddSupplier}>
            <Plus className="w-4 h-4 mr-1 text-sky-500" /> Add Supplier
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsPOModalOpen(true)}>
            <Truck className="w-4 h-4 mr-1.5" /> Create Purchase Order
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 w-fit border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'pos'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Purchase Orders ({purchases.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Supplier Directory ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'raw'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Raw Materials Catalog ({rawMaterials.length})
        </button>
      </div>

      {/* TAB 1: Purchase Orders Table */}
      {activeTab === 'pos' && (
        <Card>
          <CardHeader className="space-y-3 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Purchase Orders (POs) & Inbound Shipments</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {filteredPOs.length} of {purchases.length} orders • Total:{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(filteredPOs.reduce((acc, p) => acc + (p.total_amount || 0), 0))}
                  </span>
                </p>
              </div>

              {/* Quick Action Export & Import */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportModalType('purchases')}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5 text-sky-500" /> Import Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportToExcel(
                      filteredPOs.map((p) => ({
                        'PO Number': p.po_number,
                        Supplier: p.supplier_name,
                        'Order Date': p.order_date,
                        'Expected Delivery': p.expected_delivery_date,
                        'Total Cost': p.total_amount,
                        Status: p.status,
                        Notes: p.notes || '',
                      })),
                      'Purchase_Orders_Export'
                    )
                  }
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export Excel
                </Button>
              </div>
            </div>

            {/* Filter Toolbar: Search, Status, Supplier, and Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search PO #, supplier, material..."
                  value={poSearch}
                  onChange={(e) => setPOSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <select
                  value={poStatusFilter}
                  onChange={(e) => setPOStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="Ordered">Ordered</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Received">Received</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <select
                  value={poSupplierFilter}
                  onChange={(e) => setPOSupplierFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="all">All Suppliers</option>
                  {(suppliers || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={poDateFilter}
                  onChange={(e) => setPODateFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Year</option>
                  <option value="prev_month">Previous Month</option>
                  <option value="prev_quarter">Previous Quarter</option>
                  <option value="prev_year">Previous Year</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5 pl-5">PO Number</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Order Date</th>
                    <th className="p-3">Expected Arrival</th>
                    <th className="p-3 text-right">Total Cost</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right pr-5">Warehouse Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                        No purchase orders matching the specified filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((po) => (
                      <tr
                        key={po.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3.5 pl-5 font-mono font-bold text-sky-600 dark:text-sky-400">
                          {po.po_number}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {po.supplier_name}
                        </td>
                        <td className="p-3 text-slate-500">{formatDate(po.order_date)}</td>
                        <td className="p-3 text-slate-500">{formatDate(po.expected_delivery_date)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(po.total_amount)}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              po.status === 'Received'
                                ? 'success'
                                : po.status === 'Ordered'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {po.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right pr-5">
                          <div className="flex items-center justify-end gap-2">
                            {po.status === 'Ordered' ? (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => receivePurchaseOrder(po.id)}
                                className="text-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Receive & Stock In
                              </Button>
                            ) : (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                ✓ Stocked in Warehouse
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const supp = suppliers.find((s) => s.id === po.supplier_id);
                                generatePurchaseOrderPDF(po, supp);
                              }}
                              title="Download Purchase Order PDF"
                              className="p-1.5 rounded text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPOToDelete(po)}
                              title="Delete Purchase Order"
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* TAB 2: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Supplier Filters & Search */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search suppliers by name, code, contact person, email, phone, or tax ID..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={supplierStatusFilter}
                  onChange={(e) => setSupplierStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>

                <select
                  value={supplierCategoryFilter}
                  onChange={(e) => setSupplierCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Supplier Types</option>
                  {supplierTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Importer">Importer</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Chemicals">Chemicals</option>
                </select>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImportModalType('suppliers')}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-sky-500" /> Import Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToExcel(
                        filteredSuppliers.map((s) => ({
                          'Supplier Name': s.name,
                          Category: s.category || s.supplier_type || '',
                          'Contact Person': s.contact_person || '',
                          Phone: s.phone,
                          Email: s.email,
                          Address: s.address,
                          'Tax ID': s.tax_id || '',
                          'Payment Terms': s.payment_terms || '',
                          Status: s.status || 'active',
                        })),
                        'Suppliers_Directory'
                      )
                    }
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export Excel
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Suppliers Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSuppliers.length === 0 ? (
              <div className="col-span-full p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No suppliers matching the selected search query or filters.
              </div>
            ) : (
              filteredSuppliers.map((s) => {
                const isActive = (s.status || 'active') === 'active';
                const items = getSupplierItems(s);
                const supplierPOs = purchases.filter((p) => p.supplier_id === s.id);
                const totalSpend = supplierPOs.reduce((acc, p) => acc + (p.total_amount || 0), 0);

                return (
                  <Card key={s.id} className="relative overflow-hidden flex flex-col justify-between">
                    <CardContent className="p-5 space-y-3.5 flex-1">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                              {s.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {s.code && (
                              <span className="font-mono text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded">
                                {s.code}
                              </span>
                            )}
                            <Badge variant={isActive ? 'success' : 'secondary'} size="sm">
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {s.supplier_type || s.category || 'Vendor'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingSupplier(s)}
                            title="View Full Supplier Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSupplier(s)}
                            title="Edit Supplier"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSupplierStatus(s.id)}
                            title={isActive ? 'Deactivate Supplier' : 'Activate Supplier'}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isActive
                                ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-700'
                                : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSupplierToDelete(s)}
                            title="Delete Supplier"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {s.contact_person && (
                          <p className="font-medium text-slate-700 dark:text-slate-200">
                            👤 {s.contact_person}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{s.phone || 'No phone recorded'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{s.email || 'No email recorded'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {s.address ? `${s.address}, ${s.country || 'Ghana'}` : s.country || 'Ghana'}
                          </span>
                        </div>
                      </div>

                      {/* Terms & Tax ID summary */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">Payment Terms:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {s.payment_terms || 'Net 30'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Tax / TIN ID:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {s.tax_id || 'Not registered'}
                          </span>
                        </div>
                      </div>

                      {/* Supplied Materials Tags */}
                      <div className="pt-1 flex flex-wrap gap-1">
                        {items.slice(0, 4).map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-medium"
                          >
                            {item}
                          </span>
                        ))}
                        {items.length > 4 && (
                          <span className="px-1.5 py-0.5 text-[10px] text-slate-400">
                            +{items.length - 4} more
                          </span>
                        )}
                      </div>
                    </CardContent>

                    {/* Card Footer: PO Activity Summary & Action */}
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Spend:</span>
                        <span className="font-bold font-mono text-sky-600 dark:text-sky-400">
                          {formatCurrency(totalSpend)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSupplierId(s.id);
                          setIsPOModalOpen(true);
                        }}
                        className="text-xs h-7"
                      >
                        <Plus className="w-3 h-3 mr-1" /> New PO
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Raw Materials Catalog */}
      {activeTab === 'raw' && (
        <Card>
          <CardHeader className="space-y-3 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Raw Materials Master Catalog & Inventory</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {filteredRaw.length} of {rawMaterials.length} materials • Total Catalog Value:{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(
                      filteredRaw.reduce((acc, r) => acc + (r.current_stock * r.cost_per_unit || 0), 0)
                    )}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportModalType('raw_materials')}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5 text-sky-500" /> Import Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportToExcel(
                      filteredRaw.map((r) => ({
                        'Material Name': r.name,
                        Code: r.code || r.sku,
                        Category: r.category,
                        'Current Stock': r.current_stock,
                        'Unit of Measure': r.unit,
                        'Reorder Level': r.reorder_level,
                        'Cost per Unit': r.cost_per_unit,
                        'Total Value': r.current_stock * r.cost_per_unit,
                        Supplier: r.supplier_name || 'N/A',
                        Status: r.status || 'active',
                      })),
                      'Raw_Materials_Inventory'
                    )
                  }
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export Excel
                </Button>
                <Button variant="primary" size="sm" onClick={handleOpenAddRawMaterial}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Raw Material
                </Button>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search material by name, code/SKU, category, supplier..."
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <select
                  value={rawCategoryFilter}
                  onChange={(e) => setRawCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="all">All Categories</option>
                  {rawCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="Bottle">Preforms / Bottles</option>
                  <option value="Cap">Caps & Closures</option>
                  <option value="Label">Labels & Sleeves</option>
                  <option value="Packaging">Packaging Film / Cartons</option>
                  <option value="Chemical">Purification & Minerals</option>
                </select>
              </div>

              <div>
                <select
                  value={rawStatusFilter}
                  onChange={(e) => setRawStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="all">All Inventory Statuses</option>
                  <option value="active">Active Materials</option>
                  <option value="low_stock">⚠️ Low Stock (Below Reorder Point)</option>
                  <option value="inactive">Inactive Materials</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5 pl-5">Raw Material Name & Code</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Assigned Supplier</th>
                    <th className="p-3 text-right">Available Stock</th>
                    <th className="p-3 text-right">Reorder Level</th>
                    <th className="p-3 text-right">Unit Cost</th>
                    <th className="p-3 text-right">Total Value</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRaw.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-xs text-slate-400">
                        No raw materials matching your criteria. Click "+ Add Raw Material" to register items.
                      </td>
                    </tr>
                  ) : (
                    filteredRaw.map((rm) => {
                      const isLowStock = rm.current_stock <= rm.reorder_level;
                      const isActive = (rm.status || 'active') === 'active';
                      return (
                        <tr
                          key={rm.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-3.5 pl-5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {rm.name}
                              {isLowStock && (
                                <span title="Low Stock: below reorder point" className="inline-flex text-rose-500">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            {rm.code && (
                              <span className="font-mono text-[10px] text-slate-400">{rm.code}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                              {rm.category}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {rm.supplier_name || 'Unassigned'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            <span className={isLowStock ? 'text-rose-500 font-bold' : ''}>
                              {Number(rm.current_stock || 0).toLocaleString()} {rm.unit}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-500">
                            {Number(rm.reorder_level || 0).toLocaleString()} {rm.unit}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatCurrency(rm.cost_per_unit || 0)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                            {formatCurrency((rm.current_stock || 0) * (rm.cost_per_unit || 0))}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={isActive ? 'success' : 'secondary'} size="sm">
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right pr-5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditRawMaterial(rm)}
                                title="Edit Material Specifications"
                                className="p-1 rounded text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleRawMaterialStatus(rm.id)}
                                title={isActive ? 'Deactivate Raw Material' : 'Activate Raw Material'}
                                className={`p-1 rounded cursor-pointer ${
                                  isActive
                                    ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-700'
                                    : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRawToDelete(rm)}
                                title="Delete Raw Material"
                                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      )}

      {/* MODAL: Add New Supplier */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title="Register New Supplier"
        description="Add a certified raw materials vendor or packaging manufacturer directly to Supabase"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          {supError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {supError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Supplier Company Name *"
              placeholder="e.g. Apex Minerals & Packaging Ltd"
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
              required
            />
            <Input
              label="Supplier Code / ID"
              placeholder="e.g. SUP-004"
              value={supCode}
              onChange={(e) => setSupCode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Contact Person"
              placeholder="e.g. Sandra Akoto"
              value={supContact}
              onChange={(e) => setSupContact(e.target.value)}
            />
            <Input
              label="Telephone *"
              placeholder="+233 24 123 4567"
              value={supPhone}
              onChange={(e) => setSupPhone(e.target.value)}
              required
            />
            <Input
              label="Email Address *"
              type="email"
              placeholder="sales@apexpackaging.com"
              value={supEmail}
              onChange={(e) => setSupEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Physical Address"
              placeholder="Plot 14 Industrial Area, Ring Road"
              value={supAddress}
              onChange={(e) => setSupAddress(e.target.value)}
            />
            <Input
              label="Country"
              placeholder="Ghana"
              value={supCountry}
              onChange={(e) => setSupCountry(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Tax / TIN / VAT ID"
              placeholder="TIN-C002891901"
              value={supTaxId}
              onChange={(e) => setSupTaxId(e.target.value)}
            />
            <Select
              label="Supplier Type"
              value={supType}
              onChange={(e) => setSupType(e.target.value)}
            >
              <option value="Manufacturer">Manufacturer</option>
              <option value="Distributor">Wholesale Distributor</option>
              <option value="Importer">Direct Importer</option>
              <option value="Raw Materials">Raw Materials Specialist</option>
              <option value="Packaging">Packaging Supplier</option>
              <option value="Chemicals">Chemicals & Filtration</option>
              <option value="Logistics">Logistics & Freight</option>
              <option value="Other">Other</option>
            </Select>
            <Select
              label="Payment Terms"
              value={supPaymentTerms}
              onChange={(e) => setSupPaymentTerms(e.target.value)}
            >
              <option value="Immediate Cash">Immediate Cash</option>
              <option value="Net 15">Net 15 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 60">Net 60 Days</option>
              <option value="Advance 50%">50% Advance / 50% Delivery</option>
              <option value="Letter of Credit">Letter of Credit (LC)</option>
            </Select>
          </div>

          <Input
            label="Supplied Materials (Comma-separated tags)"
            placeholder="e.g. PET Preforms, Screw Caps, Shrink Film, Carbon Filters"
            value={supItems}
            onChange={(e) => setSupItems(e.target.value)}
          />

          <Input
            label="Bank Details (Account Name, Bank, Account #, SWIFT)"
            placeholder="e.g. Ecobank Ghana, Apex Minerals A/C # 1441002981, SWIFT: ECOBGHAC"
            value={supBankDetails}
            onChange={(e) => setSupBankDetails(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Notes & Terms"
              placeholder="e.g. Delivery lead time 5 days, minimum order 20,000 pcs..."
              value={supNotes}
              onChange={(e) => setSupNotes(e.target.value)}
            />
            <Select
              label="Initial Status"
              value={supStatus}
              onChange={(e) => setSupStatus(e.target.value as 'active' | 'inactive')}
            >
              <option value="active">Active (Available for Purchasing)</option>
              <option value="inactive">Inactive / Suspended</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsSupplierModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Supplier to Database
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit Supplier */}
      <Modal
        isOpen={isEditSupplierModalOpen}
        onClose={() => setIsEditSupplierModalOpen(false)}
        title={`Edit Supplier: ${editingSupplier?.name || ''}`}
        description="Modify vendor information. Changes will persist directly to Supabase and update local purchasing records immediately."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEditSupplier} className="space-y-4">
          {supError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {supError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Supplier Company Name *"
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
              required
            />
            <Input
              label="Supplier Code / ID"
              value={supCode}
              onChange={(e) => setSupCode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Contact Person"
              value={supContact}
              onChange={(e) => setSupContact(e.target.value)}
            />
            <Input
              label="Telephone *"
              value={supPhone}
              onChange={(e) => setSupPhone(e.target.value)}
              required
            />
            <Input
              label="Email Address *"
              type="email"
              value={supEmail}
              onChange={(e) => setSupEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Physical Address"
              value={supAddress}
              onChange={(e) => setSupAddress(e.target.value)}
            />
            <Input
              label="Country"
              value={supCountry}
              onChange={(e) => setSupCountry(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Tax / TIN / VAT ID"
              value={supTaxId}
              onChange={(e) => setSupTaxId(e.target.value)}
            />
            <Select
              label="Supplier Type"
              value={supType}
              onChange={(e) => setSupType(e.target.value)}
            >
              <option value="Manufacturer">Manufacturer</option>
              <option value="Distributor">Wholesale Distributor</option>
              <option value="Importer">Direct Importer</option>
              <option value="Raw Materials">Raw Materials Specialist</option>
              <option value="Packaging">Packaging Supplier</option>
              <option value="Chemicals">Chemicals & Filtration</option>
              <option value="Logistics">Logistics & Freight</option>
              <option value="Other">Other</option>
            </Select>
            <Select
              label="Payment Terms"
              value={supPaymentTerms}
              onChange={(e) => setSupPaymentTerms(e.target.value)}
            >
              <option value="Immediate Cash">Immediate Cash</option>
              <option value="Net 15">Net 15 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 60">Net 60 Days</option>
              <option value="Advance 50%">50% Advance / 50% Delivery</option>
              <option value="Letter of Credit">Letter of Credit (LC)</option>
            </Select>
          </div>

          <Input
            label="Supplied Materials (Comma-separated tags)"
            value={supItems}
            onChange={(e) => setSupItems(e.target.value)}
          />

          <Input
            label="Bank Details (Account Name, Bank, Account #, SWIFT)"
            value={supBankDetails}
            onChange={(e) => setSupBankDetails(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Notes & Observations"
              value={supNotes}
              onChange={(e) => setSupNotes(e.target.value)}
            />
            <Select
              label="Status"
              value={supStatus}
              onChange={(e) => setSupStatus(e.target.value as 'active' | 'inactive')}
            >
              <option value="active">Active (Available for Purchasing)</option>
              <option value="inactive">Inactive / Suspended</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsEditSupplierModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Changes to Supabase
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: View Supplier Details Dossier */}
      <Modal
        isOpen={Boolean(viewingSupplier)}
        onClose={() => setViewingSupplier(null)}
        title={`Supplier Dossier: ${viewingSupplier?.name || ''}`}
        description="Comprehensive profile, verified tax data, banking coordinates, and purchasing history"
        maxWidth="lg"
      >
        {viewingSupplier && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Supplier Code:</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                  {viewingSupplier.code || 'SUP-AUTO'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Status:</span>
                <Badge
                  variant={(viewingSupplier.status || 'active') === 'active' ? 'success' : 'secondary'}
                  size="sm"
                >
                  {(viewingSupplier.status || 'active').toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400 block">Category:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingSupplier.supplier_type || viewingSupplier.category || 'Manufacturer'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Contact Person:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {viewingSupplier.contact_person || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {viewingSupplier.phone || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Email:</span>
                <span className="text-slate-700 dark:text-slate-300 truncate block">
                  {viewingSupplier.email || 'N/A'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block">Address & Country:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {viewingSupplier.address || 'N/A'} — {viewingSupplier.country || 'Ghana'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Tax / TIN ID:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {viewingSupplier.tax_id || 'Unregistered'}
                </span>
              </div>
            </div>

            {/* Financial Terms & Banking */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Financial Terms & Bank Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 block">Payment Terms:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {viewingSupplier.payment_terms || 'Net 30'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Bank Wire Coordinates:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {viewingSupplier.bank_details || 'No bank information provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Supplied Materials Tags */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Materials & Components Supplied:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {getSupplierItems(viewingSupplier).map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Purchase Orders Dispatched to this Supplier */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Recent Purchase Orders with this Supplier</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {purchases.filter((p) => p.supplier_id === viewingSupplier.id).length} total orders
                </span>
              </h4>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                {purchases.filter((p) => p.supplier_id === viewingSupplier.id).length === 0 ? (
                  <p className="p-3 text-center text-slate-400 text-xs">No purchase orders recorded yet.</p>
                ) : (
                  purchases
                    .filter((p) => p.supplier_id === viewingSupplier.id)
                    .map((po) => (
                      <div key={po.id} className="p-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                            {po.po_number}
                          </span>
                          <span className="text-slate-400 ml-2">{formatDate(po.order_date)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(po.total_amount)}
                          </span>
                          <Badge
                            variant={po.status === 'Received' ? 'success' : 'warning'}
                            size="sm"
                          >
                            {po.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setViewingSupplier(null)}>
                Close Dossier
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const s = viewingSupplier;
                  setViewingSupplier(null);
                  handleOpenEditSupplier(s);
                }}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Add Raw Material */}
      <Modal
        isOpen={isRawModalOpen}
        onClose={() => setIsRawModalOpen(false)}
        title="Add New Raw Material"
        description="Register bottle preforms, caps, labels, chemicals, filters, shrink film, or custom production materials"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateRawMaterial} className="space-y-4">
          {rawError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {rawError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Raw Material Name *"
              placeholder="e.g. PET Preforms (28mm 18g) or Activated Carbon"
              value={rmName}
              onChange={(e) => setRmName(e.target.value)}
              required
            />
            <Input
              label="Material Code / SKU"
              placeholder="e.g. RM-PREFORM-18G"
              value={rmCode}
              onChange={(e) => setRmCode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Category / Material Type *"
              placeholder="e.g. Bottle, Cap, Label, Chemical..."
              value={rmCategory}
              onChange={(e) => setRmCategory(e.target.value)}
              required
            />
            <Input
              label="Unit of Measure (UOM) *"
              placeholder="e.g. pcs, kg, rolls, litres, bags..."
              value={rmUnit}
              onChange={(e) => setRmUnit(e.target.value)}
              required
            />
            <Select
              label="Assigned Primary Supplier"
              value={rmSupplierId}
              onChange={(e) => setRmSupplierId(e.target.value)}
            >
              <option value="">-- No Assigned Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Current Initial Stock Quantity"
              type="number"
              min="0"
              value={rmStock}
              onChange={(e) => setRmStock(Number(e.target.value))}
              required
            />
            <Input
              label="Minimum Reorder Point / Level"
              type="number"
              min="0"
              value={rmReorder}
              onChange={(e) => setRmReorder(Number(e.target.value))}
              required
            />
            <Input
              label="Purchase Unit Cost ($)"
              type="number"
              step="0.0001"
              min="0"
              value={rmCost}
              onChange={(e) => setRmCost(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Description & Specifications"
              placeholder="e.g. Food-grade PET resin, blue tint, 28mm PCO 1881 standard"
              value={rmNotes}
              onChange={(e) => setRmNotes(e.target.value)}
            />
            <Select
              label="Status"
              value={rmStatus}
              onChange={(e) => setRmStatus(e.target.value as 'active' | 'inactive')}
            >
              <option value="active">Active (Available for Production & POs)</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              Total Stock Asset Value ({rmStock.toLocaleString()} × {formatCurrency(rmCost)}):
            </span>
            <span className="text-base font-bold text-sky-600 dark:text-sky-400 font-mono">
              {formatCurrency(rmStock * rmCost)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsRawModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Raw Material to Master
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit Raw Material */}
      <Modal
        isOpen={isEditRawModalOpen}
        onClose={() => setIsEditRawModalOpen(false)}
        title={`Edit Raw Material: ${editingRaw?.name || ''}`}
        description="Update specifications, supplier assignment, reorder thresholds, or cost pricing"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEditRawMaterial} className="space-y-4">
          {rawError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {rawError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Raw Material Name *"
              value={rmName}
              onChange={(e) => setRmName(e.target.value)}
              required
            />
            <Input
              label="Material Code / SKU"
              value={rmCode}
              onChange={(e) => setRmCode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Category / Material Type *"
              value={rmCategory}
              onChange={(e) => setRmCategory(e.target.value)}
              required
            />
            <Input
              label="Unit of Measure (UOM) *"
              value={rmUnit}
              onChange={(e) => setRmUnit(e.target.value)}
              required
            />
            <Select
              label="Assigned Primary Supplier"
              value={rmSupplierId}
              onChange={(e) => setRmSupplierId(e.target.value)}
            >
              <option value="">-- No Assigned Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Current Available Stock"
              type="number"
              min="0"
              value={rmStock}
              onChange={(e) => setRmStock(Number(e.target.value))}
              required
            />
            <Input
              label="Minimum Reorder Threshold"
              type="number"
              min="0"
              value={rmReorder}
              onChange={(e) => setRmReorder(Number(e.target.value))}
              required
            />
            <Input
              label="Purchase Unit Cost ($)"
              type="number"
              step="0.0001"
              min="0"
              value={rmCost}
              onChange={(e) => setRmCost(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Description & Specifications"
              value={rmNotes}
              onChange={(e) => setRmNotes(e.target.value)}
            />
            <Select
              label="Status"
              value={rmStatus}
              onChange={(e) => setRmStatus(e.target.value as 'active' | 'inactive')}
            >
              <option value="active">Active (Available for Production & POs)</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsEditRawModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Update Specifications
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmations */}
      <ConfirmDialog
        isOpen={Boolean(supplierToDelete)}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={handleDeleteSupplierConfirm}
        title="Delete Supplier"
        message={`Are you sure you want to delete supplier "${supplierToDelete?.name}"? Historical purchase records will remain intact.`}
        confirmText="Delete Supplier"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={Boolean(rawToDelete)}
        onClose={() => setRawToDelete(null)}
        onConfirm={handleDeleteRawConfirm}
        title="Delete Raw Material"
        message={`Are you sure you want to remove "${rawToDelete?.name}" from the active materials master?`}
        confirmText="Remove Material"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={Boolean(poToDelete)}
        onClose={() => setPOToDelete(null)}
        onConfirm={handleDeletePOConfirm}
        title="Delete Purchase Order"
        message={`Are you sure you want to delete purchase order ${poToDelete?.po_number} (${formatCurrency(poToDelete?.total_amount || 0)})?`}
        confirmText="Delete PO"
        variant="danger"
      />

      {/* Create PO Modal */}
      <Modal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        title="Create Supply Chain Purchase Order"
        description="Generates an authorized PO for raw materials delivery with explicit cost pricing"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePO} className="space-y-4">
          <Select
            label="Select Supplier"
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
          >
            {(suppliers || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.status === 'inactive' ? '(Inactive)' : ''}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Select
                label="Raw Material Item"
                value={selectedRawId}
                onChange={(e) => handleRawChange(e.target.value)}
              >
                {(rawMaterials || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-1">
              <Input
                label={`Quantity (${selectedRaw?.unit || 'Units'})`}
                type="number"
                min="1"
                value={poQty}
                onChange={(e) => setPOQty(Number(e.target.value))}
                required
              />
            </div>

            <div className="sm:col-span-1">
              <Input
                label="Unit Cost Price"
                type="number"
                step="0.0001"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <Input
            label="Expected Delivery Date"
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            required
          />

          <Input
            label="Purchase Notes"
            placeholder="e.g. Include Certificate of Analysis (COA), shrink film pallet packing..."
            value={poNotes}
            onChange={(e) => setPONotes(e.target.value)}
          />

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              Total Order Cost ({poQty.toLocaleString()} × {formatCurrency(unitCost)}):
            </span>
            <span className="text-base font-bold text-sky-600 dark:text-sky-400 font-mono">
              {formatCurrency(poTotal)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsPOModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Dispatch Purchase Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* Excel Import Modal for Suppliers, POs, and Raw Materials */}
      {importModalType && (
        <ExcelImportModal
          isOpen={Boolean(importModalType)}
          onClose={() => setImportModalType(null)}
          entityType={importModalType}
          onImportComplete={async (validRows) => {
            if (importModalType === 'suppliers' && typeof importSuppliers === 'function') {
              importSuppliers(validRows);
            } else if (importModalType === 'purchases' && typeof importPurchases === 'function') {
              importPurchases(validRows);
            } else if (importModalType === 'raw_materials' && typeof importRawMaterials === 'function') {
              importRawMaterials(validRows);
            }
          }}
        />
      )}
    </div>
  );
}
