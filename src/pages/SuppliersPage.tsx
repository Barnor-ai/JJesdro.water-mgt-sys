import React, { useState } from 'react';
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
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { Supplier, PurchaseOrder, PurchaseStatus } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../lib/utils';
import { exportToExcel } from '../lib/exportUtils';

export function SuppliersPage() {
  const {
    suppliers,
    purchases,
    rawMaterials,
    currentUser,
    addSupplier,
    addPurchaseOrder,
    receivePurchaseOrder,
  } = useERPStore();

  const [activeTab, setActiveTab] = useState<'pos' | 'suppliers' | 'raw'>('pos');
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Supplier Form
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // PO Form
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || 'sup-1');
  const [selectedRawId, setSelectedRawId] = useState(rawMaterials[0]?.id || 'rm-1');
  const [poQty, setPOQty] = useState<number>(20000);
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [poNotes, setPONotes] = useState('');

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const selectedRaw = rawMaterials.find((r) => r.id === selectedRawId);
  const unitCost = selectedRaw?.cost_per_unit || 0.04;
  const poTotal = poQty * unitCost;

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    addPurchaseOrder({
      po_number: poNumber,
      supplier_id: selectedSupplierId,
      supplier_name: selectedSupplier?.name || 'Supplier',
      status: 'Ordered',
      order_date: new Date().toISOString().slice(0, 10),
      expected_delivery_date: expectedDate,
      subtotal: poTotal,
      tax: 0,
      total_amount: poTotal,
      notes: poNotes,
      items: [
        {
          id: `pi-${Date.now()}`,
          purchase_id: `po-${Date.now()}`,
          raw_material_id: selectedRawId,
          raw_material_name: selectedRaw?.name || 'Raw Material',
          quantity: Number(poQty),
          unit_cost: unitCost,
          total_cost: poTotal,
        },
      ],
      created_by: currentUser.full_name,
    });

    setIsPOModalOpen(false);
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    addSupplier({
      name: supName,
      contact_person: supContact,
      phone: supPhone,
      email: supEmail,
      address: supAddress,
      supplied_items: ['Preforms', 'Caps', 'Packaging'],
      rating: 5,
    });
    setIsSupplierModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Suppliers & Supply Chain Purchasing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Procurement of PET preforms, tamper caps, shrink wrap films, mineral salts, and PO tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsSupplierModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Supplier
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
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'pos'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Purchase Orders ({purchases.length})
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'raw'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Raw Materials Stock ({rawMaterials.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'suppliers'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Supplier Directory ({suppliers.length})
        </button>
      </div>

      {/* Tab 1: Purchase Orders Table */}
      {activeTab === 'pos' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Purchase Orders (POs) & Inbound Shipments</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click "Receive Goods" on delivered POs to automatically replenish raw materials inventory
              </p>
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
                  {purchases.map((po) => (
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Raw Materials */}
      {activeTab === 'raw' && (
        <Card>
          <CardHeader>
            <CardTitle>Raw Materials Inventory Ledger</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live stock levels of bottle preforms, caps, labels, shrink film, and purification chemicals
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Raw Material Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Current Stock</th>
                  <th className="p-3 text-right">Reorder Threshold</th>
                  <th className="p-3 text-right">Unit Cost</th>
                  <th className="p-3 text-right pr-5">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {rawMaterials.map((rm) => (
                  <tr
                    key={rm.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors font-medium"
                  >
                    <td className="p-3.5 pl-5 font-sans font-bold text-slate-800 dark:text-slate-200">
                      {rm.name}
                    </td>
                    <td className="p-3 font-sans text-slate-500">{rm.category}</td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      {rm.current_stock.toLocaleString()} {rm.unit}
                    </td>
                    <td className="p-3 text-right text-slate-400">
                      {rm.reorder_level.toLocaleString()} {rm.unit}
                    </td>
                    <td className="p-3 text-right">{formatCurrency(rm.cost_per_unit)}</td>
                    <td className="p-3 text-right pr-5 font-bold text-sky-600 dark:text-sky-400">
                      {formatCurrency(rm.current_stock * rm.cost_per_unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{s.name}</h3>
                  <Badge variant="secondary">⭐️ {s.rating}.0 Supplier</Badge>
                </div>
                <p className="text-xs text-slate-500">Contact: {s.contact_person}</p>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>📞 {s.phone}</p>
                  <p>✉️ {s.email}</p>
                  <p>📍 {s.address}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {s.supplied_items.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-semibold"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create PO Modal */}
      <Modal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        title="Create Supply Chain Purchase Order"
        description="Generates an authorized PO for raw materials delivery"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePO} className="space-y-4">
          <Select
            label="Select Supplier"
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Raw Material Item"
              value={selectedRawId}
              onChange={(e) => setSelectedRawId(e.target.value)}
            >
              {rawMaterials.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (${r.cost_per_unit}/{r.unit})
                </option>
              ))}
            </Select>

            <Input
              label="Quantity to Order"
              type="number"
              min="1"
              value={poQty}
              onChange={(e) => setPOQty(Number(e.target.value))}
              required
            />
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
            placeholder="e.g. Include Certificate of Analysis (COA)..."
            value={poNotes}
            onChange={(e) => setPONotes(e.target.value)}
          />

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              Estimated Total Cost:
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

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title="Register New Supplier"
        description="Add a raw materials vendor or packaging manufacturer"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <Input
            label="Supplier Company Name"
            placeholder="e.g. Apex Minerals & Salts Co."
            value={supName}
            onChange={(e) => setSupName(e.target.value)}
            required
          />
          <Input
            label="Contact Person"
            placeholder="e.g. Robert Hansen"
            value={supContact}
            onChange={(e) => setSupContact(e.target.value)}
            required
          />
          <Input
            label="Phone"
            placeholder="+1 (555) 019-2834"
            value={supPhone}
            onChange={(e) => setSupPhone(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="sales@apexminerals.com"
            value={supEmail}
            onChange={(e) => setSupEmail(e.target.value)}
            required
          />
          <Input
            label="Physical Address"
            placeholder="88 Industrial Parkway, Bay 10"
            value={supAddress}
            onChange={(e) => setSupAddress(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsSupplierModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
