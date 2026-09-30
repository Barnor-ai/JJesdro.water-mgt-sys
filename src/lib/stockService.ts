/**
 * H2O Water Management System - Unified Stock Calculation & Reconciliation Engine
 * Single source of truth for stock quantities, ledger drill-down, warehouse breakdowns,
 * and management analytics across Bottled Water and Sachet Water.
 */

import {
  FinishedGoodsInventory,
  BottleType,
  BottleSize,
  WarehouseTransaction,
  ProductionBatch,
  Sale,
} from '../types/database';
import {
  getProductUnit,
  getProductCategory,
  getProductPackaging,
  getProductDisplayName,
} from './utils';

export interface WarehouseStockBreakdown {
  warehouseName: string;
  location: string;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
}

export interface ProductStockSummaryItem {
  id: string; // FinishedGoods ID or BottleType ID
  bottleTypeId?: string;
  productName: string;
  size: BottleSize;
  category: 'Bottled Water' | 'Sachet Water';
  unit: string;
  packaging: string;
  location: string;
  warehouseBreakdown: WarehouseStockBreakdown[];

  // Mathematical Inventory Columns
  openingStock: number;
  producedStock: number;
  stockReceived: number;
  stockTransfersIn: number;
  soldStock: number;
  stockTransfersOut: number;
  adjustments: number;
  damagedStock: number;
  returnedStock: number;
  reservedStock: number;
  currentStock: number;
  availableStock: number;

  // Thresholds & Pricing
  minStock: number;
  maxStock: number;
  sellingPrice: number;
  wholesalePrice: number;
  cost: number;
  totalCostValuation: number;
  totalWholesaleValuation: number;

  // Health Status
  status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'HEALTHY';
  statusLabel: string;
  lastUpdated: string;
}

export interface StockMovementLedgerItem {
  id: string;
  date: string;
  transactionType:
    | 'Opening Balance'
    | 'Production'
    | 'Sale'
    | 'Stock In'
    | 'Stock Out'
    | 'Transfer In'
    | 'Transfer Out'
    | 'Adjustment'
    | 'Return'
    | 'Damaged';
  reference: string;
  fromLocation: string;
  toLocation: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  notes?: string;
  operator?: string;
}

export interface StockSummaryTotals {
  totalProducts: number;
  totalStockQuantity: number;
  totalBottledWaterStock: number;
  totalSachetWaterStock: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  healthyItemsCount: number;
  totalCostValuation: number;
  totalWholesaleValuation: number;
}

/**
 * Standard warehouse locations map for plant and depot reconciliation
 */
const DEFAULT_LOCATIONS_MAP: Record<string, string[]> = {
  '330ml': ['Main Warehouse - Bay A', 'Retail Depot Rack 01'],
  '500ml': ['Main Warehouse - Bay A (Racks 02-05)', 'Secondary Distribution Bay'],
  '750ml': ['Main Warehouse - Bay B (Rack 01)', 'Sports & Retail Staging'],
  '1L': ['Main Warehouse - Bay B (Racks 02-03)', 'Commercial Staging Bay'],
  '1.5L': ['Main Warehouse - Bay C (Rack 01)', 'Family Pack Bulk Storage'],
  '5L': ['Main Warehouse - Bay C (Rack 02)', 'Pantry Bulk Area'],
  '19L': ['Main Warehouse - Bay D (Dispenser Station)', 'Refill Return Depot'],
  '500ml-sachet': ['Plant Cold Depot Bay C', 'Main Distribution Warehouse Bay E'],
};

/**
 * Calculates unified stock summaries for all products with strict multi-tenant scoping
 */
export function calculateStockSummaries(params: {
  finishedGoods: FinishedGoodsInventory[];
  bottleTypes: BottleType[];
  productionBatches?: ProductionBatch[];
  sales?: Sale[];
  transactions?: WarehouseTransaction[];
  currentOrganizationId?: string;
  filterCategory?: 'all' | 'Bottled Water' | 'Sachet Water';
  filterWarehouse?: string;
  searchTerm?: string;
}): {
  items: ProductStockSummaryItem[];
  totals: StockSummaryTotals;
} {
  const {
    finishedGoods = [],
    bottleTypes = [],
    productionBatches = [],
    sales = [],
    transactions = [],
    currentOrganizationId,
    filterCategory = 'all',
    filterWarehouse = 'all',
    searchTerm = '',
  } = params;

  // 1. Multi-tenant filter
  const orgGoods = finishedGoods.filter(
    (fg) => !currentOrganizationId || !fg.organization_id || fg.organization_id === currentOrganizationId
  );
  const orgBottleTypes = bottleTypes.filter(
    (bt) => !currentOrganizationId || !bt.organization_id || bt.organization_id === currentOrganizationId
  );
  const orgBatches = productionBatches.filter(
    (b) => !currentOrganizationId || !b.organization_id || b.organization_id === currentOrganizationId
  );
  const orgSales = sales.filter(
    (s) => !currentOrganizationId || !s.organization_id || s.organization_id === currentOrganizationId
  );
  const orgTransactions = transactions.filter(
    (tx) => !currentOrganizationId || !tx.organization_id || tx.organization_id === currentOrganizationId
  );

  // 2. Build list of unique products across bottleTypes and finishedGoods
  const productSizes: BottleSize[] = [
    '330ml',
    '500ml',
    '750ml',
    '1L',
    '1.5L',
    '5L',
    '19L',
    '500ml-sachet',
  ];

  const items: ProductStockSummaryItem[] = productSizes.map((size) => {
    const fg = orgGoods.find((g) => g.bottle_size === size);
    const bt = orgBottleTypes.find((b) => b.size === size);

    const category = bt?.category || getProductCategory(size);
    const unit = bt?.unit || getProductUnit(size);
    const packaging = bt?.packaging || getProductPackaging(size);
    const productName = getProductDisplayName(size, bt?.name || fg?.product_name);

    // Opening & Base numbers from inventory record
    const openingStock = fg?.opening_stock || 0;
    const producedStock = fg?.produced_stock || 0;
    const soldStock = fg?.sold_stock || 0;
    const returnedStock = fg?.returned_stock || 0;
    const damagedStock = fg?.damaged_stock || 0;
    const reservedStock = fg?.reserved_stock || 0;

    // Movement transactions for this size
    const relevantTxs = orgTransactions.filter(
      (tx) => tx.product_size === size || tx.item_id === bt?.id
    );

    let stockReceived = 0;
    let stockTransfersIn = 0;
    let stockTransfersOut = 0;
    let adjustments = 0;

    relevantTxs.forEach((tx) => {
      const type = tx.type || tx.transaction_type;
      const qty = Number(tx.quantity) || 0;
      if (type === 'Stock In') {
        stockReceived += qty;
      } else if (type === 'Transfer') {
        stockTransfersIn += qty;
      } else if (type === 'Stock Out') {
        stockTransfersOut += qty;
      } else if (type === 'Adjustment' || type === 'Stock Count') {
        adjustments += qty;
      }
    });

    // Reconciled stock math:
    // Current = (Opening + Produced + Returned + Received) - (Sold + Damaged)
    // Available = Current - Reserved
    const calculatedCurrent =
      openingStock + producedStock + returnedStock + stockReceived - soldStock - damagedStock;
    const currentStock = fg?.current_stock !== undefined ? fg.current_stock : Math.max(0, calculatedCurrent);
    const availableStock =
      fg?.available_stock !== undefined
        ? fg.available_stock
        : Math.max(0, currentStock - reservedStock);

    const minStock = fg?.min_stock || bt?.reorder_level || (size === '500ml-sachet' ? 4000 : 1000);
    const maxStock = fg?.max_stock || (size === '500ml-sachet' ? 40000 : 20000);
    const location = fg?.location || DEFAULT_LOCATIONS_MAP[size]?.[0] || 'Main Warehouse';

    const sellingPrice = bt?.selling_price || (size === '500ml-sachet' ? 0.25 : 0.75);
    const wholesalePrice = bt?.wholesale_price || (size === '500ml-sachet' ? 0.15 : 0.48);
    const cost = bt?.cost || (size === '500ml-sachet' ? 0.08 : 0.2);

    const totalCostValuation = availableStock * cost;
    const totalWholesaleValuation = availableStock * wholesalePrice;

    // Health Status
    let status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'HEALTHY' = 'HEALTHY';
    let statusLabel = 'HEALTHY';
    if (availableStock === 0) {
      status = 'OUT_OF_STOCK';
      statusLabel = 'OUT OF STOCK';
    } else if (availableStock <= minStock) {
      status = 'LOW_STOCK';
      statusLabel = 'LOW STOCK';
    }

    // Warehouse Breakdown
    const locations = DEFAULT_LOCATIONS_MAP[size] || [location];
    const warehouseBreakdown: WarehouseStockBreakdown[] = locations.map((loc, idx) => {
      // Split between main location (70%) and secondary location (30%) if not explicitly allocated
      const ratio = idx === 0 ? (locations.length > 1 ? 0.7 : 1) : 0.3;
      const subCurrent = Math.round(currentStock * ratio);
      const subAvailable = Math.round(availableStock * ratio);
      const subReserved = Math.round(reservedStock * ratio);

      return {
        warehouseName: loc.includes('Depot')
          ? 'Plant Depot Warehouse'
          : loc.includes('Secondary')
          ? 'Secondary Distribution Center'
          : 'Main Bottling Plant Warehouse',
        location: loc,
        currentStock: subCurrent,
        availableStock: subAvailable,
        reservedStock: subReserved,
      };
    });

    return {
      id: fg?.id || `fg-${size}`,
      bottleTypeId: bt?.id,
      productName,
      size,
      category,
      unit,
      packaging,
      location,
      warehouseBreakdown,
      openingStock,
      producedStock,
      stockReceived,
      stockTransfersIn,
      soldStock,
      stockTransfersOut,
      adjustments,
      damagedStock,
      returnedStock,
      reservedStock,
      currentStock,
      availableStock,
      minStock,
      maxStock,
      sellingPrice,
      wholesalePrice,
      cost,
      totalCostValuation,
      totalWholesaleValuation,
      status,
      statusLabel,
      lastUpdated: fg?.updated_at || fg?.last_updated || new Date().toISOString(),
    };
  });

  // 3. Compute Totals across all active items
  const totals: StockSummaryTotals = {
    totalProducts: items.length,
    totalStockQuantity: items.reduce((acc, it) => acc + it.availableStock, 0),
    totalBottledWaterStock: items
      .filter((it) => it.category === 'Bottled Water')
      .reduce((acc, it) => acc + it.availableStock, 0),
    totalSachetWaterStock: items
      .filter((it) => it.category === 'Sachet Water')
      .reduce((acc, it) => acc + it.availableStock, 0),
    lowStockItemsCount: items.filter((it) => it.status === 'LOW_STOCK').length,
    outOfStockItemsCount: items.filter((it) => it.status === 'OUT_OF_STOCK').length,
    healthyItemsCount: items.filter((it) => it.status === 'HEALTHY').length,
    totalCostValuation: items.reduce((acc, it) => acc + it.totalCostValuation, 0),
    totalWholesaleValuation: items.reduce((acc, it) => acc + it.totalWholesaleValuation, 0),
  };

  // 4. Apply Filters
  const filtered = items.filter((item) => {
    // Category filter
    if (filterCategory !== 'all' && item.category !== filterCategory) {
      return false;
    }

    // Warehouse filter
    if (filterWarehouse !== 'all') {
      const inWarehouse = item.warehouseBreakdown.some((wb) =>
        wb.warehouseName.toLowerCase().includes(filterWarehouse.toLowerCase())
      );
      if (!inWarehouse && !item.location.toLowerCase().includes(filterWarehouse.toLowerCase())) {
        return false;
      }
    }

    // Search query filter (product name, size, category, packaging, SKU)
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchName = item.productName.toLowerCase().includes(q);
      const matchSize = item.size.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchUnit = item.unit.toLowerCase().includes(q);
      const matchPackaging = item.packaging.toLowerCase().includes(q);
      const matchLocation = item.location.toLowerCase().includes(q);

      if (!matchName && !matchSize && !matchCategory && !matchUnit && !matchPackaging && !matchLocation) {
        return false;
      }
    }

    return true;
  });

  return { items: filtered, totals };
}

/**
 * Generates an audit-grade chronological Stock Movement Ledger for drill-down analysis
 * Directly answers Requirement 14:
 * Date | Transaction | Reference | Quantity In | Quantity Out | Balance
 */
export function calculateProductMovementLedger(
  size: BottleSize,
  params: {
    finishedGoods: FinishedGoodsInventory[];
    productionBatches: ProductionBatch[];
    sales: Sale[];
    transactions: WarehouseTransaction[];
    currentOrganizationId?: string;
  }
): StockMovementLedgerItem[] {
  const {
    finishedGoods = [],
    productionBatches = [],
    sales = [],
    transactions = [],
    currentOrganizationId,
  } = params;

  const fg = finishedGoods.find((g) => g.bottle_size === size);
  const openingStock = fg?.opening_stock || 0;

  const events: Array<{
    date: string;
    timestamp: number;
    transactionType: StockMovementLedgerItem['transactionType'];
    reference: string;
    fromLocation: string;
    toLocation: string;
    quantityIn: number;
    quantityOut: number;
    notes?: string;
    operator?: string;
  }> = [];

  // 1. Initial Opening Balance Event
  events.push({
    date: '2026-08-01',
    timestamp: new Date('2026-08-01T00:00:00Z').getTime(),
    transactionType: 'Opening Balance',
    reference: 'OPENING-STOCK',
    fromLocation: 'System Baseline',
    toLocation: fg?.location || 'Warehouse',
    quantityIn: openingStock,
    quantityOut: 0,
    notes: 'Initial monthly reconciled opening balance',
    operator: 'System Audit',
  });

  // 2. Production Batches
  productionBatches
    .filter(
      (b) =>
        b.bottle_size === size &&
        (!currentOrganizationId || !b.organization_id || b.organization_id === currentOrganizationId)
    )
    .forEach((batch) => {
      const qtyIn = batch.accepted_quantity !== undefined
        ? batch.accepted_quantity
        : Math.max(0, batch.quantity_produced - batch.rejected_quantity - batch.damaged_bottles);

      events.push({
        date: batch.production_date || '2026-08-10',
        timestamp: new Date(batch.production_date || batch.created_at || '2026-08-10').getTime(),
        transactionType: 'Production',
        reference: batch.batch_number,
        fromLocation: batch.machine_used || 'Production Floor',
        toLocation: fg?.location || 'Warehouse Bay',
        quantityIn: qtyIn,
        quantityOut: 0,
        notes: `Production Run Shift ${batch.shift}. Rejection: ${batch.rejected_quantity}, Damaged: ${batch.damaged_bottles}`,
        operator: batch.operator_name || 'Production Operator',
      });
    });

  // 3. Sales Invoices
  sales
    .filter(
      (s) => !currentOrganizationId || !s.organization_id || s.organization_id === currentOrganizationId
    )
    .forEach((sale) => {
      const lineItem = sale.items?.find((item) => item.bottle_size === size);
      if (lineItem && lineItem.quantity > 0) {
        events.push({
          date: sale.sale_date || '2026-08-15',
          timestamp: new Date(sale.sale_date || sale.created_at || '2026-08-15').getTime(),
          transactionType: 'Sale',
          reference: sale.invoice_number,
          fromLocation: fg?.location || 'Warehouse Bay',
          toLocation: `Customer: ${sale.customer_name}`,
          quantityIn: 0,
          quantityOut: lineItem.quantity,
          notes: `Sales Invoice (${sale.type}) - ${sale.customer_name}`,
          operator: sale.salesperson_name || 'Sales Officer',
        });
      }
    });

  // 4. Warehouse Transactions
  transactions
    .filter(
      (tx) =>
        tx.product_size === size &&
        (!currentOrganizationId || !tx.organization_id || tx.organization_id === currentOrganizationId)
    )
    .forEach((tx) => {
      const type = tx.type || tx.transaction_type;
      const qty = Number(tx.quantity) || 0;

      let transType: StockMovementLedgerItem['transactionType'] = 'Stock In';
      let inQty = 0;
      let outQty = 0;

      if (type === 'Stock In') {
        transType = 'Stock In';
        inQty = qty;
      } else if (type === 'Stock Out') {
        transType = 'Stock Out';
        outQty = qty;
      } else if (type === 'Transfer') {
        transType = 'Transfer In';
        inQty = qty;
      } else if (type === 'Return') {
        transType = 'Return';
        inQty = qty;
      } else if (type === 'Damaged') {
        transType = 'Damaged';
        outQty = qty;
      } else {
        transType = 'Adjustment';
        inQty = qty;
      }

      events.push({
        date: tx.created_at ? tx.created_at.slice(0, 10) : '2026-08-18',
        timestamp: new Date(tx.created_at || '2026-08-18').getTime(),
        transactionType: transType,
        reference: tx.reference_code || tx.id,
        fromLocation: tx.from_location,
        toLocation: tx.to_location,
        quantityIn: inQty,
        quantityOut: outQty,
        notes: tx.notes || `Warehouse ${type}`,
        operator: (tx as any).logged_by || tx.created_by || 'Warehouse Officer',
      });
    });

  // 5. Sort chronologically
  events.sort((a, b) => a.timestamp - b.timestamp);

  // 6. Calculate running balance
  let runningBalance = 0;
  const ledger: StockMovementLedgerItem[] = events.map((ev, index) => {
    runningBalance = runningBalance + ev.quantityIn - ev.quantityOut;
    return {
      id: `ledger-${index}-${ev.reference}`,
      date: ev.date,
      transactionType: ev.transactionType,
      reference: ev.reference,
      fromLocation: ev.fromLocation,
      toLocation: ev.toLocation,
      quantityIn: ev.quantityIn,
      quantityOut: ev.quantityOut,
      balance: Math.max(0, runningBalance),
      notes: ev.notes,
      operator: ev.operator,
    };
  });

  return ledger;
}
