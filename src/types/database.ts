export type OrganizationRole =
  | 'owner'
  | 'admin'
  | 'production_manager'
  | 'warehouse_manager'
  | 'sales_manager'
  | 'accountant'
  | 'sales_officer'
  | 'warehouse_officer'
  | 'production_officer'
  | 'auditor'
  | 'viewer';

// Keep backward compatibility with legacy role strings
export type UserRole =
  | OrganizationRole
  | 'super_admin'
  | 'factory_manager';

export type SubscriptionPlanId = 'starter' | 'professional' | 'business' | 'enterprise';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  priceMonthly: number;
  currency: string;
  maxUsers: number; // 3, 10, Infinity
  maxBranches: number; // 1, 3, Infinity
  maxWarehouses: number; // 1, 5, Infinity
  maxProductionMonthly?: number;
  features: string[];
  recommended?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  trading_name?: string;
  registration_number?: string;
  tax_id?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string; // default 'Ghana'
  logo_url?: string;
  currency: 'GHS' | 'USD' | 'EUR' | 'GBP' | string;
  financial_year_start?: string;
  timezone: string;
  plan_id: SubscriptionPlanId;
  status: 'active' | 'trial' | 'suspended' | 'canceled';
  created_at: string;
  updated_at?: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  joined_at: string;
  last_active_at?: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: SubscriptionPlanId;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  payment_reference?: string;
  created_at: string;
}

export interface BillingRecord {
  id: string;
  organization_id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  payment_method?: 'Paystack' | 'Stripe' | 'Bank Transfer' | 'Mobile Money' | string;
  reference?: string;
  description: string;
  invoice_url?: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  organization_name?: string;
  email: string;
  role: OrganizationRole;
  token: string;
  invited_by: string;
  invited_by_name?: string;
  expires_at: string;
  accepted_at?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
}

export interface DocumentAttachment {
  id: string;
  organization_id: string;
  entity_type: 'expense' | 'purchase' | 'supplier' | 'customer' | 'invoice' | 'production';
  entity_id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: string;
  created_at: string;
}

export interface ApprovalWorkflow {
  id: string;
  organization_id: string;
  branch_id?: string;
  type?: 'Purchase Approval' | 'Expense Approval' | 'Stock Adjustment' | 'Credit Sale' | 'Sales Return' | string;
  workflow_type?: string;
  record_id?: string;
  reference_id?: string;
  reference_title: string;
  amount?: number;
  requested_by: string;
  requested_by_name?: string;
  requested_at?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  notes?: string;
  details?: Record<string, any>;
  created_at?: string;
}

export type BottleSize =
  | '330ml'
  | '500ml'
  | '750ml'
  | '1L'
  | '1.5L'
  | '5L'
  | '19L';

export type ShiftType = 'Morning' | 'Afternoon' | 'Night';
export type BatchStatus = 'Completed' | 'Pending' | 'Cancelled';
export type TransactionType =
  | 'Stock In'
  | 'Stock Out'
  | 'Transfer'
  | 'Adjustment'
  | 'Return'
  | 'Damaged'
  | 'Stock Count';

export type CustomerType = 'Business' | 'Retail' | 'Distributor' | 'Wholesale' | 'Corporate';
export type SupplierCategory =
  | 'Bottle'
  | 'Cap'
  | 'Label'
  | 'Packaging'
  | 'Chemical'
  | 'Water'
  | 'Other';

export type SaleType =
  | 'Cash'
  | 'Credit'
  | 'Wholesale'
  | 'Retail'
  | 'Distributor'
  | 'Business';

export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
export type MachineStatus = 'Operational' | 'Maintenance' | 'Offline' | 'Degraded' | 'Idle' | 'Faulty';
export type PurchaseStatus = 'Draft' | 'Ordered' | 'Received' | 'Cancelled';

export type ExpenseCategory =
  | 'Electricity & Power'
  | 'Diesel & Fuel'
  | 'Machine Maintenance'
  | 'Water Treatment & Chemicals'
  | 'Salaries & Wages'
  | 'Packaging Supplies'
  | 'Logistics & Transport'
  | 'Rent & Utilities'
  | 'Other';

export interface Branch {
  id: string;
  organization_id?: string;
  name: string;
  code: string;
  location?: string;
  address?: string;
  is_main?: boolean;
  is_active?: boolean;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  organization_id?: string;
  email: string;
  full_name: string;
  role: UserRole;
  branch_id?: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  two_factor_enabled?: boolean;
  created_at: string;
}

export interface RawMaterial {
  id: string;
  organization_id?: string;
  branch_id?: string;
  name: string;
  category: SupplierCategory | string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  cost_per_unit: number;
  last_restocked?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  organization_id?: string;
  branch_id?: string;
  name: string;
  category?: SupplierCategory | string;
  contact?: string;
  contact_person?: string;
  email: string;
  phone: string;
  address: string;
  payment_terms?: string;
  supplied_items?: string[];
  rating?: number;
  created_at?: string;
}

export interface BottleType {
  id: string;
  organization_id?: string;
  branch_id?: string;
  size: BottleSize;
  name: string;
  selling_price: number;
  wholesale_price: number;
  cost: number;
  current_quantity?: number;
  supplier_id?: string;
  usage_count?: number;
  balance?: number;
  reorder_level?: number;
  barcode: string;
  created_at?: string;
}

export interface Machine {
  id: string;
  organization_id?: string;
  branch_id?: string;
  name: string;
  type?: string;
  model_number?: string;
  status: MachineStatus;
  efficiency: number; // percentage e.g. 96.5
  capacity_per_hour: number;
  last_serviced_date: string;
  last_maintenance?: string;
  next_service_date?: string;
  next_maintenance_date?: string;
  temperature?: number;
  pressure?: number;
  cycles_today?: number;
  created_at?: string;
}

export interface ProductionBatch {
  id: string;
  organization_id?: string;
  branch_id?: string;
  batch_number: string;
  production_date: string;
  shift: ShiftType;
  machine_used: string;
  machine_id?: string;
  operator_name: string;
  bottle_size: BottleSize;
  bottle_type_id?: string;
  quantity_produced: number;
  rejected_quantity: number;
  damaged_bottles: number;
  accepted_quantity?: number; // produced - rejected - damaged
  waste_percent?: number; // (rejected + damaged) / produced * 100
  efficiency_percent?: number; // accepted / produced * 100
  production_cost: number;
  cost_per_bottle?: number; // production_cost / accepted
  status: BatchStatus;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface FinishedGoodsInventory {
  id: string;
  organization_id?: string;
  branch_id?: string;
  bottle_size: BottleSize;
  bottle_type_id?: string;
  opening_stock: number;
  produced_stock: number;
  sold_stock: number;
  returned_stock: number;
  damaged_stock: number;
  reserved_stock: number;
  current_stock: number; // (opening + produced + returned) - (sold + damaged)
  available_stock: number; // current - reserved
  min_stock: number;
  max_stock: number;
  location: string;
  last_updated?: string;
  updated_at: string;
}

export interface WarehouseTransaction {
  id: string;
  organization_id?: string;
  branch_id?: string;
  reference_code?: string;
  type: TransactionType;
  transaction_type?: TransactionType;
  item_id?: string;
  product_size: BottleSize;
  quantity: number;
  from_location: string;
  to_location: string;
  barcode?: string;
  qr_code?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface Customer {
  id: string;
  organization_id?: string;
  branch_id?: string;
  name: string;
  type: CustomerType;
  contact_person?: string;
  phone: string;
  email: string;
  address: string;
  credit_limit: number;
  outstanding_balance: number;
  payment_terms?: string;
  total_orders?: number;
  status?: 'Active' | 'Inactive' | 'Suspended';
  created_at?: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  raw_material_id: string;
  raw_material_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface Purchase {
  id: string;
  organization_id?: string;
  branch_id?: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  status: PurchaseStatus;
  order_date: string;
  expected_delivery_date: string;
  received_date?: string;
  subtotal: number;
  tax: number;
  total_amount: number;
  notes?: string;
  items: PurchaseItem[];
  created_by: string;
  created_at?: string;
}

export type PurchaseOrder = Purchase;

export interface SaleItem {
  id: string;
  sale_id: string;
  bottle_size: BottleSize;
  bottle_type_id?: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
}

export interface Sale {
  id: string;
  organization_id?: string;
  branch_id?: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  type: SaleType;
  sale_date: string;
  due_date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  amount_paid: number;
  paid_amount?: number;
  payment_status: PaymentStatus;
  payment_method: string;
  salesperson_id?: string;
  salesperson_name?: string;
  items: SaleItem[];
  payments?: any[];
  notes?: string;
  created_at?: string;
}

export interface Payment {
  id: string;
  organization_id?: string;
  branch_id?: string;
  payment_number: string;
  customer_id: string;
  customer_name?: string;
  sale_id?: string;
  invoice_number?: string;
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Card' | 'Mobile Money' | 'Cheque' | string;
  reference_number?: string;
  payment_date: string;
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface Expense {
  id: string;
  organization_id?: string;
  branch_id?: string;
  expense_number?: string;
  category: ExpenseCategory | string;
  amount: number;
  date?: string;
  expense_date?: string;
  payment_method: string;
  payee: string;
  description: string;
  receipt_number?: string;
  recorded_by: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  organization_id?: string;
  branch_id?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STOCK_ADJUST' | 'LOGIN' | 'LOGOUT' | 'PAYMENT' | 'EXPORT' | 'APPROVE' | 'REJECT' | 'ROLE_CHANGE' | 'SUBSCRIPTION_CHANGE' | string;
  table_name?: string;
  module?: string;
  record_id?: string;
  old_value?: any;
  new_value?: any;
  details: string | Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  organization_id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  timestamp?: string;
  created_at?: string;
  read: boolean;
  link?: string;
}
