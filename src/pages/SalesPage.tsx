import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Download,
  Printer,
  FileText,
  CreditCard,
  Trash2,
  CheckCircle2,
  DollarSign,
  User,
  Sparkles,
  Receipt,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useERPStore } from '../store/useStore';
import { Sale, SaleType, PaymentStatus, BottleSize, SaleItem } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  generateInvoiceNumber,
  formatCurrency,
  formatNumber,
  formatDate,
} from '../lib/utils';
import { generateInvoicePDF, exportToExcel } from '../lib/exportUtils';

export function SalesPage() {
  const {
    sales,
    customers,
    bottleTypes,
    finishedGoods,
    currentUser,
    addSale,
    recordPayment,
  } = useERPStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // POS Form State
  const [customerId, setCustomerId] = useState(customers[0]?.id || 'cust-1');
  const [saleType, setSaleType] = useState<SaleType>('Wholesale');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<
    { bottle_size: BottleSize; quantity: number; unit_price: number }[]
  >([
    { bottle_size: '500ml', quantity: 2000, unit_price: 0.48 },
    { bottle_size: '1.5L', quantity: 500, unit_price: 1.15 },
  ]);

  // Calculations for current cart
  const cartSubtotal = cartItems.reduce(
    (acc, item) => acc + item.quantity * item.unit_price,
    0
  );
  const cartTotal = Math.max(0, cartSubtotal - discount + tax);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleAddItemToCart = (size: BottleSize) => {
    const bt = bottleTypes.find((b) => b.size === size);
    const price = saleType === 'Wholesale' ? bt?.wholesale_price || 0.48 : bt?.selling_price || 0.75;
    setCartItems((prev) => [
      ...prev,
      { bottle_size: size, quantity: 100, unit_price: price },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    setCartItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleCreateSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    const invoiceNumber = generateInvoiceNumber(sales.length);
    const finalAmountPaid =
      paymentStatus === 'Paid' ? cartTotal : paymentStatus === 'Partial' ? cartTotal / 2 : 0;

    const formattedItems: SaleItem[] = cartItems.map((item, idx) => {
      const bt = bottleTypes.find((b) => b.size === item.bottle_size);
      return {
        id: `si-${Date.now()}-${idx}`,
        sale_id: `sale-${Date.now()}`,
        bottle_size: item.bottle_size,
        bottle_type_id: bt?.id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        unit_cost: bt?.cost || 0.2,
        total_price: Number(item.quantity) * Number(item.unit_price),
      };
    });

    addSale({
      invoice_number: invoiceNumber,
      customer_id: customerId,
      customer_name: selectedCustomer?.name || 'Walk-in Customer',
      type: saleType,
      sale_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      subtotal: cartSubtotal,
      discount: Number(discount),
      tax: Number(tax),
      total_amount: cartTotal,
      amount_paid: finalAmountPaid,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      salesperson_id: currentUser.id,
      salesperson_name: currentUser.full_name,
      items: formattedItems,
      notes,
    });

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    setIsModalOpen(false);
  };

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || s.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Commercial Sales & POS Invoicing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create commercial invoices, generate delivery notes, auto-deduct warehouse stock, and collect payments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToExcel(
                sales.map((s) => ({
                  Invoice: s.invoice_number,
                  Customer: s.customer_name,
                  Date: s.sale_date,
                  Type: s.type,
                  Total: s.total_amount,
                  Paid: s.amount_paid,
                  Balance: s.total_amount - s.amount_paid,
                  Status: s.payment_status,
                })),
                'H2O_Sales_Invoices'
              )
            }
          >
            <Download className="w-4 h-4 mr-1.5" /> Export (.xlsx)
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Create New Invoice / POS
          </Button>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number or customer name..."
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
            <option value="all">All Sales Channels</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Distributor">Distributor</option>
            <option value="Business">Business Accounts</option>
            <option value="Retail">Retail Walk-In</option>
          </select>
        </div>
      </Card>

      {/* Sales Invoices Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sales & Invoice Ledger</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredSales.length} commercial transactions
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Invoice #</th>
                  <th className="p-3">Customer Account</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3 text-right">Amount Paid</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3 text-center">Payment Status</th>
                  <th className="p-3 text-right pr-5">Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSales.map((s) => {
                  const balanceDue = s.total_amount - s.amount_paid;
                  const cust = customers.find((c) => c.id === s.customer_id);
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3.5 pl-5 font-mono font-bold text-sky-600 dark:text-sky-400">
                        {s.invoice_number}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {s.customer_name}
                      </td>
                      <td className="p-3 text-slate-500">{s.type}</td>
                      <td className="p-3 text-slate-400">{formatDate(s.sale_date)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(s.total_amount)}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(s.amount_paid)}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-500 font-bold">
                        {formatCurrency(balanceDue)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={
                            s.payment_status === 'Paid'
                              ? 'success'
                              : s.payment_status === 'Partial'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {s.payment_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => generateInvoicePDF(s, cust, 'Invoice')}
                            title="Download Invoice PDF"
                            className="p-1.5 text-sky-600 dark:text-sky-400"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => generateInvoicePDF(s, cust, 'Receipt')}
                            title="Download Sales Receipt"
                            className="p-1.5 text-emerald-600 dark:text-emerald-400"
                          >
                            <Receipt className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => generateInvoicePDF(s, cust, 'Delivery Note')}
                            title="Download Delivery Note"
                            className="p-1.5 text-indigo-600 dark:text-indigo-400"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* POS / Invoice Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Commercial Invoice & Auto Deduct Stock"
        description="Select customer, add water bottle quantities, and apply commercial wholesale rates"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateSale} className="space-y-5">
          {/* Customer & Channel Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Customer Account"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </Select>

            <Select
              label="Sale Channel"
              value={saleType}
              onChange={(e) => setSaleType(e.target.value as SaleType)}
            >
              <option value="Wholesale">Wholesale Channel</option>
              <option value="Distributor">Distributor Bulk</option>
              <option value="Business">Business / Office Supply</option>
              <option value="Retail">Retail Walk-in</option>
              <option value="Credit">Credit Term</option>
            </Select>

            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Bank Transfer">Bank Wire / ACH</option>
              <option value="Cash">Cash on Delivery</option>
              <option value="Corporate Card">Credit / Debit Card</option>
              <option value="Cheque">Corporate Cheque</option>
            </Select>
          </div>

          {/* Quick SKU Add Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              Quick Add SKU to Order:
            </label>
            <div className="flex flex-wrap gap-2">
              {bottleTypes.map((bt) => (
                <button
                  key={bt.id}
                  type="button"
                  onClick={() => handleAddItemToCart(bt.size)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-sky-500 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-500" />
                  {bt.size} (${saleType === 'Wholesale' ? bt.wholesale_price : bt.selling_price})
                </button>
              ))}
            </div>
          </div>

          {/* Order Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="p-3 pl-4">Bottle Size SKU</th>
                  <th className="p-3 text-right">Qty (Bottles)</th>
                  <th className="p-3 text-right">Unit Price ($)</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-center pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {cartItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 pl-4 font-sans font-bold">{item.bottle_size}</td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(idx, 'quantity', Number(e.target.value))
                        }
                        className="w-24 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-right font-mono font-bold"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleUpdateItem(idx, 'unit_price', Number(e.target.value))
                        }
                        className="w-20 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-right font-mono"
                      />
                    </td>
                    <td className="p-3 text-right font-bold text-sky-600 dark:text-sky-400">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </td>
                    <td className="p-3 text-center pr-4 font-sans">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Math Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Select
                label="Payment Status"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              >
                <option value="Paid">Fully Paid (Immediate settlement)</option>
                <option value="Partial">Partial Deposit (50%)</option>
                <option value="Unpaid">Unpaid (Net 30 Credit)</option>
              </Select>

              <Input
                label="Invoice Notes"
                placeholder="e.g. Forklift pallet loading required at Dock B..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Cart Subtotal:</span>
                <span className="font-mono font-semibold">{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Commercial Discount ($):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-24 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-right font-mono"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Sales Tax / VAT ($):</span>
                <input
                  type="number"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                  className="w-24 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-right font-mono"
                />
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-sm font-bold">
                <span className="text-slate-900 dark:text-white">Total Order Value:</span>
                <span className="text-sky-600 dark:text-sky-400 font-mono">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Complete Order & Generate Invoice
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
