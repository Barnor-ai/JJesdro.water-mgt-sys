import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Download,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  CreditCard,
  Edit2,
  Eye,
  Power,
  Trash2,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { Customer, CustomerType } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '../lib/utils';
import { exportToExcel } from '../lib/exportUtils';

export function CustomersPage() {
  const {
    customers = [],
    sales = [],
    addCustomer,
    updateCustomer,
    toggleCustomerStatus,
    deleteCustomer,
    recordPayment,
    currentUser,
  } = useERPStore();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustForPay, setSelectedCustForPay] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Customer Form State (Add / Edit)
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [type, setType] = useState<CustomerType>('Wholesale');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Ghana');
  const [taxId, setTaxId] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(10000);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Suspended'>('Active');
  const [formError, setFormError] = useState('');

  // Payment Form State
  const [payAmount, setPayAmount] = useState<number>(1000);
  const [payMethod, setPayMethod] = useState('Bank Wire');
  const [payNotes, setPayNotes] = useState('');

  const resetForm = () => {
    setName('');
    setBusinessName('');
    setContactPerson('');
    setType('Wholesale');
    setPhone('');
    setEmail('');
    setAddress('');
    setCountry('Ghana');
    setTaxId('');
    setCreditLimit(10000);
    setPaymentTerms('Net 30');
    setNotes('');
    setStatus('Active');
    setFormError('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Customer or Company Name is required.');
      return;
    }

    const res = addCustomer({
      name: name.trim(),
      business_name: businessName.trim() || undefined,
      contact_person: contactPerson.trim() || undefined,
      type,
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      country: country.trim() || 'Ghana',
      tax_id: taxId.trim() || undefined,
      credit_limit: Number(creditLimit) || 0,
      outstanding_balance: 0,
      payment_terms: paymentTerms,
      notes: notes.trim() || undefined,
      status,
      is_active: status !== 'Inactive',
      total_orders: 0,
    });

    if (res && res.error) {
      setFormError(res.error);
      return;
    }

    setIsAddModalOpen(false);
    resetForm();
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name || '');
    setBusinessName(c.business_name || '');
    setContactPerson(c.contact_person || '');
    setType(c.type || 'Wholesale');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setCountry(c.country || 'Ghana');
    setTaxId(c.tax_id || '');
    setCreditLimit(c.credit_limit || 0);
    setPaymentTerms(c.payment_terms || 'Net 30');
    setNotes(c.notes || '');
    setStatus(c.status || (c.is_active === false ? 'Inactive' : 'Active'));
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!editingCustomer) return;

    if (!name.trim()) {
      setFormError('Customer Name cannot be empty.');
      return;
    }

    const res = updateCustomer(editingCustomer.id, {
      name: name.trim(),
      business_name: businessName.trim() || undefined,
      contact_person: contactPerson.trim() || undefined,
      type,
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      country: country.trim() || 'Ghana',
      tax_id: taxId.trim() || undefined,
      credit_limit: Number(creditLimit) || 0,
      payment_terms: paymentTerms,
      notes: notes.trim() || undefined,
      status,
      is_active: status !== 'Inactive',
    });

    if (res && res.error) {
      setFormError(res.error);
      return;
    }

    setIsEditModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDeleteCustomerConfirm = () => {
    if (customerToDelete) {
      deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    }
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustForPay) return;
    recordPayment({
      payment_number: `PAY-${Date.now().toString().slice(-6)}`,
      customer_id: selectedCustForPay.id,
      customer_name: selectedCustForPay.name,
      amount: Number(payAmount),
      method: payMethod,
      payment_date: new Date().toISOString().split('T')[0],
      notes: payNotes,
      recorded_by: currentUser?.full_name || 'Admin',
    });
    setIsPayModalOpen(false);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        c.name?.toLowerCase().includes(q) ||
        c.business_name?.toLowerCase().includes(q) ||
        c.contact_person?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.tax_id?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q);

      const matchesType = filterType === 'all' || c.type === filterType;

      let matchesStatus = true;
      if (filterStatus === 'active') {
        matchesStatus = (c.status || 'Active') === 'Active' && c.is_active !== false;
      } else if (filterStatus === 'inactive') {
        matchesStatus = c.status === 'Inactive' || c.is_active === false;
      } else if (filterStatus === 'over_limit') {
        matchesStatus = c.outstanding_balance > c.credit_limit;
      } else if (filterStatus === 'suspended') {
        matchesStatus = c.status === 'Suspended';
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [customers, searchTerm, filterType, filterStatus]);

  const totalReceivables = useMemo(
    () => customers.reduce((acc, c) => acc + (c.outstanding_balance || 0), 0),
    [customers]
  );
  const totalCreditAllocated = useMemo(
    () => customers.reduce((acc, c) => acc + (c.credit_limit || 0), 0),
    [customers]
  );
  const overLimitCount = useMemo(
    () => customers.filter((c) => c.outstanding_balance > c.credit_limit).length,
    [customers]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-sky-500" />
            Customer Directory & Accounts Receivable
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise customer master, credit authorization, overdue debt tracking, and Supabase CRM synchronization
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToExcel(
                filteredCustomers.map((c) => ({
                  Name: c.name,
                  'Business Name': c.business_name || '',
                  'Contact Person': c.contact_person || '',
                  Type: c.type,
                  Phone: c.phone,
                  Email: c.email,
                  Address: c.address,
                  Country: c.country || 'Ghana',
                  'Tax / TIN': c.tax_id || '',
                  'Credit Limit': c.credit_limit,
                  'Outstanding Balance': c.outstanding_balance,
                  'Payment Terms': c.payment_terms,
                  Status: c.status || 'Active',
                })),
                'Customer_Directory_Ledger'
              )
            }
          >
            <Download className="w-4 h-4 mr-1.5" /> Export (.xlsx)
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenAddModal}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Customer
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-slate-500 font-medium">Registered Accounts</span>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {customers.length}
          </p>
          <span className="text-[11px] text-emerald-500 mt-1 block">
            {customers.filter((c) => (c.status || 'Active') === 'Active' && c.is_active !== false).length} Active Accounts
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-500 font-medium">Total Accounts Receivable</span>
          <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalReceivables)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Live outstanding debt owed</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-500 font-medium">Total Credit Extended</span>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalCreditAllocated)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Aggregated credit facilities</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-500 font-medium">Credit Limit Breaches</span>
          <p className="text-2xl font-bold font-mono text-amber-500 mt-1">
            {overLimitCount} Accounts
          </p>
          <span className="text-[11px] text-rose-500 font-medium mt-1 block">
            {overLimitCount > 0 ? 'Requires collection follow-up' : 'All accounts within limit'}
          </span>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, contact person, phone, email, tax ID, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Customer Types</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Distributor">Distributor</option>
              <option value="Corporate">Corporate Office</option>
              <option value="Retail">Retail Partner</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="over_limit">⚠️ Over Credit Limit</option>
              <option value="inactive">Inactive Only</option>
              <option value="suspended">Suspended Accounts</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Customers List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No customer accounts found matching your query or filter selections.
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const isOverLimit = (cust.outstanding_balance || 0) > (cust.credit_limit || 0);
            const limitUsage =
              (cust.credit_limit || 0) > 0
                ? ((cust.outstanding_balance || 0) / cust.credit_limit) * 100
                : 0;
            const isActive = (cust.status || 'Active') === 'Active' && cust.is_active !== false;

            return (
              <Card key={cust.id} className="relative overflow-hidden flex flex-col justify-between">
                {isOverLimit && (
                  <div className="bg-rose-500 text-white text-[10px] font-bold text-center py-0.5 uppercase tracking-wider">
                    ⚠️ Credit Limit Exceeded
                  </div>
                )}
                <CardContent className="p-5 space-y-3.5 flex-1">
                  {/* Top Details & Action Icons */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                        {cust.name}
                      </h3>
                      {cust.business_name && cust.business_name !== cust.name && (
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{cust.business_name}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" size="sm">
                          {cust.type}
                        </Badge>
                        <Badge variant={isActive ? 'success' : 'secondary'} size="sm">
                          {cust.status || 'Active'}
                        </Badge>
                        <span className="text-[11px] text-slate-400">
                          {cust.payment_terms || 'Net 30'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewingCustomer(cust)}
                        title="View Full Customer Dossier & Statement"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(cust)}
                        title="Edit Customer Details"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCustomerStatus(cust.id)}
                        title={isActive ? 'Deactivate Customer' : 'Activate Customer'}
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
                        onClick={() => setCustomerToDelete(cust)}
                        title="Delete Customer Account"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {cust.contact_person && (
                      <p className="font-medium text-slate-700 dark:text-slate-200">
                        👤 {cust.contact_person}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cust.phone || 'No phone recorded'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cust.email || 'No email recorded'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {cust.address ? `${cust.address}, ${cust.country || 'Ghana'}` : cust.country || 'Ghana'}
                      </span>
                    </div>
                  </div>

                  {/* Balance & Limit Progress Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Outstanding Debt:</span>
                      <span
                        className={`font-mono ${
                          (cust.outstanding_balance || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'
                        }`}
                      >
                        {formatCurrency(cust.outstanding_balance || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Credit Limit: {formatCurrency(cust.credit_limit || 0)}</span>
                      <span>{limitUsage.toFixed(0)}% used</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverLimit ? 'bg-rose-500' : limitUsage > 75 ? 'bg-amber-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${Math.min(limitUsage, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>

                {/* Card Action Footer */}
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-slate-400">
                    TIN: {cust.tax_id || 'N/A'}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCustForPay(cust);
                      setPayAmount(cust.outstanding_balance || 500);
                      setIsPayModalOpen(true);
                    }}
                    className="text-xs h-7"
                  >
                    <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Collect Pay
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* MODAL: Add New Customer */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer Account"
        description="Register a corporate client, wholesale distributor, or retail partner directly into Supabase"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company / Customer Name *"
              placeholder="e.g. Mumuni Supermarkets Chain"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Trading / Business Name"
              placeholder="e.g. Mumuni Group West Africa"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Contact Person"
              placeholder="e.g. Alhaji Mumuni"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
            <Input
              label="Phone Number *"
              placeholder="+233 24 111 2233"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="Email Address *"
              placeholder="procurement@mumunigroup.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Billing / Delivery Address *"
              placeholder="Plot 8 Commercial Avenue, Central District"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <Input
              label="Country"
              placeholder="Ghana"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Account Type"
              value={type}
              onChange={(e) => setType(e.target.value as CustomerType)}
            >
              <option value="Wholesale">Wholesale</option>
              <option value="Distributor">Distributor</option>
              <option value="Corporate">Corporate Office</option>
              <option value="Retail">Retail Partner</option>
            </Select>

            <Select
              label="Payment Terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            >
              <option value="Immediate Cash">Immediate Cash</option>
              <option value="Net 15">Net 15 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 60">Net 60 Days</option>
            </Select>

            <Input
              label="Tax / TIN / VAT ID"
              placeholder="TIN-C002891901"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Authorized Credit Limit ($)"
              type="number"
              min="0"
              value={creditLimit}
              onChange={(e) => setCreditLimit(Number(e.target.value))}
              required
            />
            <Select
              label="Account Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive' | 'Suspended')}
            >
              <option value="Active">Active (Permitted for Invoicing)</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended (Credit Hold)</option>
            </Select>
          </div>

          <Input
            label="Internal Notes & Instructions"
            placeholder="e.g. Forklift required at warehouse dock, deliveries weekdays only..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit Customer Details */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Customer: ${editingCustomer?.name || ''}`}
        description="Update customer master details. Changes persist directly to Supabase and update sales invoicing instantly."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEditCustomer} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company / Customer Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Trading / Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Contact Person"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
            <Input
              label="Phone Number *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="Email Address *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Billing / Delivery Address *"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <Input
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Account Type"
              value={type}
              onChange={(e) => setType(e.target.value as CustomerType)}
            >
              <option value="Wholesale">Wholesale</option>
              <option value="Distributor">Distributor</option>
              <option value="Corporate">Corporate Office</option>
              <option value="Retail">Retail Partner</option>
            </Select>

            <Select
              label="Payment Terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            >
              <option value="Immediate Cash">Immediate Cash</option>
              <option value="Net 15">Net 15 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 60">Net 60 Days</option>
            </Select>

            <Input
              label="Tax / TIN / VAT ID"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Authorized Credit Limit ($)"
              type="number"
              min="0"
              value={creditLimit}
              onChange={(e) => setCreditLimit(Number(e.target.value))}
              required
            />
            <Select
              label="Account Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive' | 'Suspended')}
            >
              <option value="Active">Active (Permitted for Invoicing)</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended (Credit Hold)</option>
            </Select>
          </div>

          <Input
            label="Internal Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Changes to Supabase
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: View Customer Dossier */}
      <Modal
        isOpen={Boolean(viewingCustomer)}
        onClose={() => setViewingCustomer(null)}
        title={`Customer Account Dossier: ${viewingCustomer?.name || ''}`}
        description="Complete customer profile, credit authorization limit, and historical orders"
        maxWidth="lg"
      >
        {viewingCustomer && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Customer ID:</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                  {viewingCustomer.id}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Account Status:</span>
                <Badge
                  variant={
                    (viewingCustomer.status || 'Active') === 'Active' && viewingCustomer.is_active !== false
                      ? 'success'
                      : 'secondary'
                  }
                  size="sm"
                >
                  {viewingCustomer.status || 'Active'}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400 block">Category / Type:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingCustomer.type}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Contact Person:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {viewingCustomer.contact_person || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {viewingCustomer.phone || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Email:</span>
                <span className="text-slate-700 dark:text-slate-300 truncate block">
                  {viewingCustomer.email || 'N/A'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block">Delivery Address:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {viewingCustomer.address || 'N/A'}, {viewingCustomer.country || 'Ghana'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">TIN / Tax ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {viewingCustomer.tax_id || 'Unregistered'}
                </span>
              </div>
            </div>

            {/* Credit Standing Tile */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-sky-500" />
                Credit Standing & Ledger Position
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 block">Authorized Credit Limit:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(viewingCustomer.credit_limit || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Outstanding Debt:</span>
                  <span
                    className={`font-mono font-bold ${
                      (viewingCustomer.outstanding_balance || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                  >
                    {formatCurrency(viewingCustomer.outstanding_balance || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Terms:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingCustomer.payment_terms || 'Net 30'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sales Orders History with this Customer */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Recent Invoices & Transactions</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {sales.filter((s) => s.customer_id === viewingCustomer.id).length} recorded sales
                </span>
              </h4>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                {sales.filter((s) => s.customer_id === viewingCustomer.id).length === 0 ? (
                  <p className="p-3 text-center text-slate-400 text-xs">No sales invoices recorded yet.</p>
                ) : (
                  sales
                    .filter((s) => s.customer_id === viewingCustomer.id)
                    .map((sale) => (
                      <div key={sale.id} className="p-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                            {sale.invoice_number}
                          </span>
                          <span className="text-slate-400 ml-2">{formatDate(sale.sale_date)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(sale.total_amount)}
                          </span>
                          <Badge
                            variant={sale.payment_status === 'Paid' ? 'success' : 'warning'}
                            size="sm"
                          >
                            {sale.payment_status}
                          </Badge>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setViewingCustomer(null)}>
                Close Dossier
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const c = viewingCustomer;
                  setViewingCustomer(null);
                  handleOpenEditModal(c);
                }}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Account
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Customer Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(customerToDelete)}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleDeleteCustomerConfirm}
        title="Delete Customer Account"
        message={`Are you sure you want to delete customer account "${customerToDelete?.name}"? Past invoices and historical audit logs will be preserved.`}
        confirmText="Delete Customer"
        variant="danger"
      />

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Record Payment for ${selectedCustForPay?.name || 'Customer'}`}
        description="Reduces outstanding customer balance and updates ledger"
        maxWidth="md"
      >
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
          <Input
            label="Payment Amount Received ($)"
            type="number"
            min="1"
            max={selectedCustForPay?.outstanding_balance || 100000}
            value={payAmount}
            onChange={(e) => setPayAmount(Number(e.target.value))}
            required
          />

          <Select
            label="Payment Mode"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
          >
            <option value="Bank Wire">Bank Wire Transfer</option>
            <option value="Cheque">Corporate Bank Cheque</option>
            <option value="Cash">Cash Deposit</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Mobile Money">Mobile Money (MoMo)</option>
          </Select>

          <Input
            label="Payment Notes / Reference"
            placeholder="Ref #WIRE-98231 from Standard Chartered..."
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Apply Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
