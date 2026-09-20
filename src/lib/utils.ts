import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = '$'): string {
  return `${currency}${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(num: number): string {
  return Number(num || 0).toLocaleString('en-US');
}

export function formatPercent(num: number): string {
  return `${Number(num || 0).toFixed(1)}%`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

// Auto Calculations
export function calculateCurrentInventory(item: {
  opening_stock: number;
  produced_stock: number;
  sold_stock: number;
  returned_stock: number;
  damaged_stock: number;
}): number {
  return (
    Number(item.opening_stock || 0) +
    Number(item.produced_stock || 0) +
    Number(item.returned_stock || 0) -
    Number(item.sold_stock || 0) -
    Number(item.damaged_stock || 0)
  );
}

export function calculateProductionEfficiency(
  accepted: number,
  totalProduced: number
): number {
  if (!totalProduced || totalProduced <= 0) return 0;
  return Math.round((accepted / totalProduced) * 1000) / 10;
}

export function calculateWastePercentage(
  rejected: number,
  damaged: number,
  totalProduced: number
): number {
  if (!totalProduced || totalProduced <= 0) return 0;
  return Math.round(((rejected + damaged) / totalProduced) * 1000) / 10;
}

export function generateInvoiceNumber(count: number): string {
  const prefix = 'INV-';
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(5, '0');
  return `${prefix}${year}-${seq}`;
}

export function generateBatchNumber(size: string, count: number): string {
  const cleanSize = (size || '500ML').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(count + 1).padStart(3, '0');
  return `BATCH-${cleanSize}-${dateStr}-${seq}`;
}

export function generatePONumber(count: number): string {
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, '0');
  return `PO-${year}-${seq}`;
}

export function generatePaymentNumber(count: number): string {
  const seq = String(count + 1).padStart(5, '0');
  return `PAY-${seq}`;
}

export function generateTransactionReference(type: string, count: number): string {
  const prefix = (type || 'TRX').replace(/\s+/g, '').slice(0, 3).toUpperCase();
  const seq = String(count + 1).padStart(5, '0');
  return `TRX-${prefix}-${seq}`;
}

// --- VERIFIED ERP & FINANCIAL MATHEMATICAL ENGINES ---

// 1. Raw Materials Stock Math: opening + received - used - waste = current
export function calculateRawMaterialStock(item: {
  opening_stock: number;
  received_stock: number;
  used_in_production: number;
  waste_stock: number;
}): number {
  return Math.max(
    0,
    Math.round(
      (Number(item.opening_stock || 0) +
        Number(item.received_stock || 0) -
        Number(item.used_in_production || 0) -
        Number(item.waste_stock || 0)) *
        100
    ) / 100
  );
}

// 2. Production Yield Math: (actual / target) * 100 (handles zero targets gracefully)
export function calculateProductionYield(actualProduction: number, targetProduction: number): number {
  if (!targetProduction || targetProduction <= 0) return 0;
  return Math.round(((actualProduction || 0) / targetProduction) * 10000) / 100;
}

// 3. Batch Cost per Bottle: total batch cost / actual bottles produced
export function calculateCostPerBottle(totalBatchCost: number, actualBottlesProduced: number): number {
  if (!actualBottlesProduced || actualBottlesProduced <= 0) return 0;
  return Math.round(((totalBatchCost || 0) / actualBottlesProduced) * 100) / 100;
}

// 4. Sales & Invoicing Math
export function calculateSalesTotals(
  items: Array<{ quantity: number; unit_price: number; unit_cost?: number }>,
  discount: number = 0,
  taxRate: number = 0,
  amountPaid: number = 0
) {
  const grossSales = items.reduce(
    (acc, it) => acc + Number(it.quantity || 0) * Number(it.unit_price || 0),
    0
  );
  const netSales = Math.max(0, grossSales - (Number(discount) || 0));
  const taxAmount = Math.round(netSales * (Number(taxRate) || 0) * 100) / 100;
  const totalAmount = Math.round((netSales + taxAmount) * 100) / 100;
  const paid = Math.min(totalAmount, Math.max(0, Number(amountPaid) || 0));
  const outstandingBalance = Math.max(0, Math.round((totalAmount - paid) * 100) / 100);

  let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
  if (outstandingBalance === 0 && totalAmount > 0) {
    paymentStatus = 'paid';
  } else if (paid > 0 && paid < totalAmount) {
    paymentStatus = 'partial';
  }

  const cogs = items.reduce(
    (acc, it) => acc + Number(it.quantity || 0) * Number(it.unit_cost || 0),
    0
  );
  const grossProfit = Math.round((netSales - cogs) * 100) / 100;
  const grossMargin = netSales > 0 ? Math.round(((grossProfit / netSales) * 100) * 100) / 100 : 0;

  return {
    grossSales: Math.round(grossSales * 100) / 100,
    netSales: Math.round(netSales * 100) / 100,
    taxAmount,
    totalAmount,
    amountPaid: paid,
    outstandingBalance,
    paymentStatus,
    cogs: Math.round(cogs * 100) / 100,
    grossProfit,
    grossMargin,
  };
}

// 5. Profit & Loss Math
export function calculateProfitAndLoss(
  netSales: number,
  cogs: number,
  operatingExpenses: number
) {
  const grossProfit = Math.round((netSales - cogs) * 100) / 100;
  const netProfit = Math.round((grossProfit - operatingExpenses) * 100) / 100;
  const grossMargin = netSales > 0 ? Math.round(((grossProfit / netSales) * 100) * 10) / 10 : 0;
  const netMargin = netSales > 0 ? Math.round(((netProfit / netSales) * 100) * 10) / 10 : 0;

  return {
    grossProfit,
    netProfit,
    grossMargin,
    netMargin,
  };
}
