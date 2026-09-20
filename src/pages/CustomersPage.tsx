import React, { useState } from 'react';
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
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { Customer, CustomerType } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../lib/utils';
import { exportToExcel } from '../lib/exportUtils';

export function CustomersPage() {
  const { customers, addCustomer, recordPayment, currentUser } = useERPStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCustForPay, setSelectedCustForPay] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Customer Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomerType>('Wholesale');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(10000);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  // Payment Form State
  const [payAmount, setPayAmount] = useState<number>(1000);
  const [payMethod, setPayMethod] = useState('Bank Wire');
  const [payNotes, setPayNotes] = useState('');

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer({
      name,
      type,
      phone,
      email,
      address,
      credit_limit: Number(creditLimit),
      payment_terms: paymentTerms,
      outstanding_balance: 0,
      total_orders: 0,
    });
    setIsAddModalOpen(false);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
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

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalReceivables = customers.reduce((acc, c) => acc + c.outstanding_balance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Customer Directory & Accounts Receivable
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage corporate distributors, supermarkets, credit limits, and collections
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToExcel(
                customers.map((c) => ({
                  Name: c.name,
                  Type: c.type,
                  Phone: c.phone,
                  Email: c.email,
                  CreditLimit: c.credit_limit,
                  OutstandingBalance: c.outstanding_balance,
                  PaymentTerms: c.payment_terms,
                })),
                'H2O_Customer_Directory'
              )
            }
          >
            <Download className="w-4 h-4 mr-1.5" /> Export (.xlsx)
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Filter & Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name, email, or telephone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Customer Types</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Distributor">Distributor</option>
            <option value="Retail">Retail</option>
            <option value="Corporate">Corporate</option>
          </select>
        </div>
      </Card>

      {/* Customers List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.map((cust) => {
          const isOverLimit = cust.outstanding_balance > cust.credit_limit;
          const limitUsage =
            cust.credit_limit > 0 ? (cust.outstanding_balance / cust.credit_limit) * 100 : 0;

          return (
            <Card key={cust.id} className="relative overflow-hidden">
              {isOverLimit && (
                <div className="absolute top-0 right-0 left-0 bg-rose-500 text-white text-[10px] font-bold text-center py-0.5 uppercase tracking-wider">
                  ⚠️ Credit Limit Exceeded
                </div>
              )}
              <CardContent className={`p-5 ${isOverLimit ? 'pt-7' : ''} space-y-4`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {cust.name}
                    </h3>
                    <Badge variant="secondary" size="sm" className="mt-1">
                      {cust.type} • {cust.payment_terms}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCustForPay(cust);
                      setPayAmount(cust.outstanding_balance || 500);
                      setIsPayModalOpen(true);
                    }}
                    className="text-xs"
                  >
                    <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Collect Pay
                  </Button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {cust.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {cust.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {cust.address}
                  </div>
                </div>

                {/* Balance & Limit Progress Bar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Outstanding Debt:</span>
                    <span
                      className={`font-mono ${
                        cust.outstanding_balance > 0 ? 'text-rose-500' : 'text-emerald-500'
                      }`}
                    >
                      {formatCurrency(cust.outstanding_balance)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Credit Limit: {formatCurrency(cust.credit_limit)}</span>
                    <span>{limitUsage.toFixed(0)}% used</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isOverLimit ? 'bg-rose-500' : limitUsage > 75 ? 'bg-amber-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${Math.min(limitUsage, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer Account"
        description="Register a corporate client, wholesale distributor, or retail partner"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label="Company / Customer Name"
            placeholder="Metro Supermarket Distribution"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Account Type"
              value={type}
              onChange={(e) => setType(e.target.value as CustomerType)}
            >
              <option value="Wholesale">Wholesale</option>
              <option value="Distributor">Distributor</option>
              <option value="Corporate">Corporate Office</option>
              <option value="Retail">Retail</option>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              placeholder="+1 (555) 234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              placeholder="purchasing@metro.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Input
            label="Billing & Delivery Address"
            placeholder="1200 Logistics Blvd, Dock #4, Industrial Zone"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <Input
            label="Authorized Credit Limit ($)"
            type="number"
            min="0"
            value={creditLimit}
            onChange={(e) => setCreditLimit(Number(e.target.value))}
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>

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
          </Select>

          <Input
            label="Payment Notes / Reference"
            placeholder="Ref #WIRE-98231 from Bank of America..."
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
