import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  UserRole,
  Branch,
  FinishedGoodsInventory,
  ProductionBatch,
  BottleType,
  RawMaterial,
  Supplier,
  Machine,
  WarehouseTransaction,
  Customer,
  Purchase,
  PurchaseStatus,
  Sale,
  Payment,
  Expense,
  AuditLog,
  AppNotification,
  BottleSize,
  TransactionType,
  Organization,
  OrganizationMember,
  OrganizationRole,
  Subscription,
  SubscriptionPlan,
  SubscriptionPlanId,
  BillingRecord,
  Invitation,
  ApprovalWorkflow,
  ProductionBudget,
  ChartOfAccount,
  JournalEntry,
  SyncStatus,
  SyncAction,
} from '../types/database';
import {
  initialBranches,
  demoProfiles,
  initialBottleTypes,
  initialRawMaterials,
  initialSuppliers,
  initialMachines,
  initialFinishedGoods,
  initialProductionBatches,
  initialCustomers,
  initialSales,
  initialPurchases,
  initialExpenses,
  initialTransactions,
  initialAuditLogs,
  initialNotifications,
  initialOrganizations,
  initialSubscriptions,
  initialOrganizationMembers,
  initialSubscriptionPlans,
  initialInvitations,
  initialBillingRecords,
  initialApprovalWorkflows,
  initialProductionBudgets,
  initialChartOfAccounts,
  initialJournalEntries,
} from './initialData';
import {
  saveTableToIndexedDB,
  enqueueSyncTransaction,
  processSyncQueue,
  getPendingSyncCount,
} from '../lib/offlineStorage';
import {
  calculateCurrentInventory,
  calculateProductionEfficiency,
  calculateWastePercentage,
  generateTransactionReference,
} from '../lib/utils';
import { authService, AuthUser } from '../lib/auth';
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseConfigError,
  formatSupabaseError,
  checkSupabaseConnection,
} from '../lib/supabase';
import { supabaseDataService } from '../lib/supabaseDataService';

const STORAGE_KEY_PREFIX = 'h2o_erp_v2_';

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn(`Failed to load ${key} from storage:`, e);
    return fallback;
  }
}

function saveStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save ${key} to storage:`, e);
  }
}

function sanitizeSubscription(sub: any): Subscription {
  if (!sub || typeof sub !== 'object' || !sub.plan_id) {
    return initialSubscriptions[0];
  }
  return {
    ...initialSubscriptions[0],
    ...sub,
    plan_id: sub.plan_id || 'professional',
    status: sub.status || 'active',
  };
}

function sanitizeOrganization(org: any): Organization {
  if (!org || typeof org !== 'object' || !org.id || !org.name || org.name.includes('undefined')) {
    return initialOrganizations[0];
  }
  return {
    ...initialOrganizations[0],
    ...org,
  };
}

function deduplicateOrganizations(orgs: any[]): Organization[] {
  if (!Array.isArray(orgs)) return [initialOrganizations[0]];
  const seen = new Set<string>();
  const unique: Organization[] = [];
  for (const raw of orgs) {
    const org = sanitizeOrganization(raw);
    if (!org || !org.id) continue;
    if (!seen.has(org.id)) {
      seen.add(org.id);
      unique.push(org);
    }
  }
  return unique.length > 0 ? unique : [initialOrganizations[0]];
}

export function sanitizeBranch(b: any): Branch {
  if (!b || typeof b !== 'object') {
    return initialBranches[0];
  }
  let name = b.name;
  if (!name || name === 'undefined' || name.includes('undefined') || name === '[object Object]') {
    name = 'Main Plant';
  }
  return {
    ...initialBranches[0],
    ...b,
    name,
  };
}

export function sanitizeSupplier(s: any): Supplier {
  if (!s || typeof s !== 'object') {
    return {
      id: `sup-${Date.now()}`,
      name: 'General Supplier',
      email: '',
      phone: '',
      address: '',
      supplied_items: ['Preforms', 'Caps', 'Packaging'],
      rating: 5,
    };
  }

  let supplied_items: string[] = [];
  if (Array.isArray(s.supplied_items) && s.supplied_items.length > 0) {
    supplied_items = s.supplied_items;
  } else if (typeof s.materials_supplied === 'string' && s.materials_supplied.trim()) {
    supplied_items = s.materials_supplied
      .split(',')
      .map((it: string) => it.trim())
      .filter(Boolean);
  } else if (typeof s.supplied_items === 'string' && s.supplied_items.trim()) {
    try {
      const parsed = JSON.parse(s.supplied_items);
      supplied_items = Array.isArray(parsed) ? parsed : [s.supplied_items];
    } catch {
      supplied_items = s.supplied_items
        .split(',')
        .map((it: string) => it.trim())
        .filter(Boolean);
    }
  } else {
    supplied_items = ['Preforms', 'Caps', 'Packaging'];
  }

  return {
    ...s,
    supplied_items,
    rating: typeof s.rating === 'number' ? s.rating : 5,
    contact_person: s.contact_person || s.contact || '',
    phone: s.phone || '',
    email: s.email || '',
    address: s.address || '',
  };
}

export interface ERPStoreState {
  // Auth & Profile
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  currentUser: UserProfile | null;
  activeRole: UserRole;
  currentBranchId: string;
  theme: 'light' | 'dark';

  // Multi-Tenant SaaS Workspace
  currentOrganization: Organization;
  currentSubscription: Subscription;
  subscriptionPlans: SubscriptionPlan[];
  organizations: Organization[];
  organizationMembers: OrganizationMember[];
  invitations: Invitation[];
  billingRecords: BillingRecord[];
  approvalWorkflows: ApprovalWorkflow[];
  upgradeModalOpen: boolean;
  upgradeModalReason?: string;
  sessionTimeoutMinutes: number;

  // Master Data & Operations
  branches: Branch[];
  finishedGoods: FinishedGoodsInventory[];
  productionBatches: ProductionBatch[];
  bottleTypes: BottleType[];
  rawMaterials: RawMaterial[];
  suppliers: Supplier[];
  machines: Machine[];
  transactions: WarehouseTransaction[];
  customers: Customer[];
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];

  // Financials & Production Budgeting
  productionBudgets: ProductionBudget[];
  chartOfAccounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  customExpenseCategories: string[];

  // Offline-First Sync & Network State
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  lastSyncTimestamp: string | null;

  // System State & Connectivity
  isRealtimeConnected: boolean;
  supabaseConnected: boolean;
  isSyncingWithSupabase: boolean;
  supabaseLastSyncTime: string | null;
  systemOnline: boolean;
  storageEngine: string;
}

// Initial session from standalone authService
const initialActiveUser = authService.getCurrentUser();
const storedUser = loadStored<UserProfile | null>('user', null);
const effectiveUser = initialActiveUser
  ? {
      id: initialActiveUser.id,
      email: initialActiveUser.email,
      full_name: initialActiveUser.full_name,
      role: initialActiveUser.role,
      branch_id: initialActiveUser.branch_id || 'branch-1',
      is_active: initialActiveUser.is_active,
      two_factor_enabled: Boolean(initialActiveUser.two_factor_enabled),
      created_at: initialActiveUser.created_at,
    }
  : storedUser;

const globalState: ERPStoreState = {
  isAuthenticated: Boolean(effectiveUser && authService.isAuthenticated()),
  isAuthChecking: false,
  currentUser: effectiveUser,
  activeRole: (effectiveUser?.role as UserRole) || loadStored<UserRole>('role', 'owner'),
  currentBranchId: loadStored<string>('branch_id', 'branch-1'),
  theme: loadStored<'light' | 'dark'>('theme', 'dark'),

  branches: loadStored<Branch[]>('branches', initialBranches).map(sanitizeBranch),
  currentOrganization: sanitizeOrganization(loadStored('current_org', initialOrganizations[0])),
  currentSubscription: sanitizeSubscription(loadStored('subscription', initialSubscriptions[0])),
  subscriptionPlans: initialSubscriptionPlans,
  organizations: deduplicateOrganizations(loadStored<Organization[]>('organizations', initialOrganizations)),
  organizationMembers: loadStored<OrganizationMember[]>('org_members', initialOrganizationMembers),
  invitations: loadStored<Invitation[]>('invitations', initialInvitations),
  billingRecords: loadStored<BillingRecord[]>('billing_records', initialBillingRecords),
  approvalWorkflows: loadStored<ApprovalWorkflow[]>('approvals', initialApprovalWorkflows),
  upgradeModalOpen: false,
  upgradeModalReason: undefined,

  finishedGoods: loadStored<FinishedGoodsInventory[]>('inventory', initialFinishedGoods),
  productionBatches: loadStored<ProductionBatch[]>('batches', initialProductionBatches),
  bottleTypes: loadStored<BottleType[]>('bottle_types', initialBottleTypes),
  rawMaterials: loadStored<RawMaterial[]>('raw_materials', initialRawMaterials),
  suppliers: loadStored<Supplier[]>('suppliers', initialSuppliers).map(sanitizeSupplier),
  machines: loadStored<Machine[]>('machines', initialMachines),
  transactions: loadStored<WarehouseTransaction[]>('transactions', initialTransactions),
  customers: loadStored<Customer[]>('customers', initialCustomers),
  purchases: loadStored<Purchase[]>('purchases', initialPurchases),
  sales: loadStored<Sale[]>('sales', initialSales),
  expenses: loadStored<Expense[]>('expenses', initialExpenses),
  auditLogs: loadStored<AuditLog[]>('audit_logs', initialAuditLogs),
  notifications: loadStored<AppNotification[]>('notifications', initialNotifications),

  productionBudgets: loadStored<ProductionBudget[]>('budgets', initialProductionBudgets),
  chartOfAccounts: loadStored<ChartOfAccount[]>('chart_of_accounts', initialChartOfAccounts),
  journalEntries: loadStored<JournalEntry[]>('journal_entries', initialJournalEntries),
  customExpenseCategories: loadStored<string[]>('custom_expense_categories', []),
  sessionTimeoutMinutes: loadStored<number>('session_timeout_minutes', 30),

  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncStatus: 'synced',
  pendingSyncCount: 0,
  lastSyncTimestamp: new Date().toISOString(),

  isRealtimeConnected: true,
  supabaseConnected: true,
  isSyncingWithSupabase: false,
  supabaseLastSyncTime: 'Synchronized Locally',
  systemOnline: true,
  storageEngine: 'IndexedDB & Local Offline Storage Engine',
};

const listeners = new Set<(state: ERPStoreState) => void>();

function notify() {
  listeners.forEach((l) => l({ ...globalState }));
}

// Global Audit Logger
export const addAuditLog = (
  action: AuditLog['action'],
  table_name: string,
  record_id?: string,
  details: Record<string, any> = {}
) => {
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    organization_id: globalState.currentOrganization?.id || 'org-default',
    branch_id: globalState.currentBranchId,
    user_id: globalState.currentUser?.id || 'system',
    user_name: globalState.currentUser?.full_name || 'System User',
    user_email: globalState.currentUser?.email || 'operations@aquaflow.local',
    action,
    table_name,
    record_id,
    details,
    created_at: new Date().toISOString(),
  };
  globalState.auditLogs = [newLog, ...globalState.auditLogs];
  saveStored('audit_logs', globalState.auditLogs);
  notify();
};

// Real Supabase Synchronization Services (Singleton Module Level)
export const syncToSupabase = async () => {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase configuration is missing. Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.',
    };
  }
  globalState.isSyncingWithSupabase = true;
  notify();

  const orgId = globalState.currentOrganization.id;
  try {
    // 1. Organization
    await supabaseDataService.upsertRecord('organizations', {
      id: orgId,
      name: globalState.currentOrganization.name,
      currency: globalState.currentOrganization.currency,
      country: globalState.currentOrganization.country,
      status: globalState.currentOrganization.status || 'active',
      plan_id: globalState.currentOrganization.plan_id || 'professional',
    });

    // 2. Production Batches
    for (const b of globalState.productionBatches) {
      await supabaseDataService.upsertRecord('production_batches', {
        id: b.id,
        organization_id: orgId,
        batch_number: b.batch_number,
        bottle_type_id: b.bottle_type_id,
        target_quantity: b.quantity_produced,
        actual_quantity: b.accepted_quantity ?? b.quantity_produced,
        damaged_quantity: (b.damaged_bottles || 0) + (b.rejected_quantity || 0),
        production_cost: b.production_cost,
        unit_cost: b.cost_per_bottle ?? 0,
        status: b.status,
        date: b.production_date,
        notes: b.notes,
      });
    }

    // 3. Finished Goods
    for (const fg of globalState.finishedGoods) {
      await supabaseDataService.upsertRecord('inventory', {
        id: fg.id,
        organization_id: orgId,
        bottle_type_id: fg.bottle_type_id,
        name: `${fg.bottle_size} Bottled Water`,
        size: fg.bottle_size,
        quantity: fg.current_stock,
        damaged_quantity: fg.damaged_stock || 0,
        reorder_level: fg.min_stock,
        unit_cost: 0,
        selling_price: 0,
        batch_code: fg.location,
      });
    }

    // 4. Sales
    for (const s of globalState.sales) {
      await supabaseDataService.upsertRecord('sales', {
        id: s.id,
        organization_id: orgId,
        invoice_number: s.invoice_number,
        customer_id: s.customer_id,
        sale_type: s.type,
        payment_method: 'Cash',
        payment_status: s.payment_status,
        total_amount: s.total_amount,
        paid_amount: s.amount_paid,
        balance_due: Math.max(0, s.total_amount - s.amount_paid),
        date: s.sale_date,
        items: s.items,
      });
    }

    // 5. Customers
    for (const c of globalState.customers) {
      await supabaseDataService.upsertRecord('customers', {
        id: c.id,
        organization_id: orgId,
        name: c.name,
        type: c.type,
        phone: c.phone,
        email: c.email,
        address: c.address,
        credit_limit: c.credit_limit,
        outstanding_balance: c.outstanding_balance,
      });
    }

    globalState.supabaseConnected = true;
    globalState.isSyncingWithSupabase = false;
    globalState.supabaseLastSyncTime = new Date().toLocaleTimeString();
    notify();

    return {
      success: true,
      message: 'Workspace data synchronized to Supabase successfully.',
    };
  } catch (err: any) {
    globalState.isSyncingWithSupabase = false;
    notify();
    return { success: false, message: formatSupabaseError(err) };
  }
};

export const syncFromSupabase = async () => {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase configuration is missing. Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.',
    };
  }

  globalState.isSyncingWithSupabase = true;
  notify();

  try {
    const orgId = globalState.currentOrganization.id;
    const res = await supabaseDataService.fetchOrganizationData(orgId);

    if (!res.success || !res.data) {
      globalState.isSyncingWithSupabase = false;
      notify();
      return { success: false, message: res.error || 'Failed to fetch data from Supabase.' };
    }

    const d = res.data;
    if (d.organization) {
      globalState.currentOrganization = sanitizeOrganization(d.organization);
      saveStored('current_org', globalState.currentOrganization);
    }
    if (d.branches.length > 0) {
      globalState.branches = d.branches.map(sanitizeBranch);
      saveStored('branches', globalState.branches);
    }
    if (d.bottleTypes.length > 0) {
      globalState.bottleTypes = d.bottleTypes;
      saveStored('bottle_types', globalState.bottleTypes);
    }
    if (d.rawMaterials.length > 0) {
      globalState.rawMaterials = d.rawMaterials;
      saveStored('raw_materials', globalState.rawMaterials);
    }
    if (d.suppliers.length > 0) {
      globalState.suppliers = d.suppliers.map(sanitizeSupplier);
      saveStored('suppliers', globalState.suppliers);
    }
    if (d.machines.length > 0) {
      globalState.machines = d.machines;
      saveStored('machines', globalState.machines);
    }
    if (d.finishedGoods.length > 0) {
      globalState.finishedGoods = d.finishedGoods;
      saveStored('inventory', globalState.finishedGoods);
    }
    if (d.productionBatches.length > 0) {
      globalState.productionBatches = d.productionBatches;
      saveStored('batches', globalState.productionBatches);
    }
    if (d.customers.length > 0) {
      globalState.customers = d.customers;
      saveStored('customers', globalState.customers);
    }
    if (d.purchases.length > 0) {
      globalState.purchases = d.purchases;
      saveStored('purchases', globalState.purchases);
    }
    if (d.sales.length > 0) {
      globalState.sales = d.sales;
      saveStored('sales', globalState.sales);
    }
    if (d.expenses.length > 0) {
      globalState.expenses = d.expenses;
      saveStored('expenses', globalState.expenses);
    }
    if (d.transactions.length > 0) {
      globalState.transactions = d.transactions;
      saveStored('transactions', globalState.transactions);
    }
    if (d.auditLogs.length > 0) {
      globalState.auditLogs = d.auditLogs;
      saveStored('audit_logs', globalState.auditLogs);
    }
    if (d.notifications.length > 0) {
      globalState.notifications = d.notifications;
      saveStored('notifications', globalState.notifications);
    }
    if (d.productionBudgets.length > 0) {
      globalState.productionBudgets = d.productionBudgets;
      saveStored('budgets', globalState.productionBudgets);
    }
    if (d.chartOfAccounts.length > 0) {
      globalState.chartOfAccounts = d.chartOfAccounts;
      saveStored('chart_of_accounts', globalState.chartOfAccounts);
    }
    if (d.journalEntries.length > 0) {
      globalState.journalEntries = d.journalEntries;
      saveStored('journal_entries', globalState.journalEntries);
    }
    if (d.approvalWorkflows.length > 0) {
      globalState.approvalWorkflows = d.approvalWorkflows;
      saveStored('approvals', globalState.approvalWorkflows);
    }
    if (d.billingRecords.length > 0) {
      globalState.billingRecords = d.billingRecords;
      saveStored('billing_records', globalState.billingRecords);
    }
    if (d.invitations.length > 0) {
      globalState.invitations = d.invitations;
      saveStored('invitations', globalState.invitations);
    }
    if (d.members.length > 0) {
      globalState.organizationMembers = d.members;
      saveStored('org_members', globalState.organizationMembers);
    }

    globalState.supabaseConnected = true;
    globalState.isSyncingWithSupabase = false;
    globalState.supabaseLastSyncTime = new Date().toLocaleTimeString();
    notify();

    return {
      success: true,
      message: `Synchronized ${
        d.productionBatches.length + d.sales.length + d.finishedGoods.length
      } records from Supabase!`,
    };
  } catch (err: any) {
    globalState.isSyncingWithSupabase = false;
    notify();
    return { success: false, message: formatSupabaseError(err) };
  }
};

let globalServicesInitialized = false;
let currentRealtimeOrgId: string | null = null;
let realtimeUnsubscribe: (() => void) | null = null;

export const updateRealtimeSubscription = (orgId: string | undefined | null) => {
  if (!isSupabaseConfigured || !orgId) {
    if (realtimeUnsubscribe) {
      realtimeUnsubscribe();
      realtimeUnsubscribe = null;
      currentRealtimeOrgId = null;
    }
    return;
  }
  if (currentRealtimeOrgId === orgId && realtimeUnsubscribe) {
    return;
  }
  if (realtimeUnsubscribe) {
    realtimeUnsubscribe();
    realtimeUnsubscribe = null;
  }
  currentRealtimeOrgId = orgId;
  realtimeUnsubscribe = supabaseDataService.subscribeToOrganization(
    orgId,
    (table, eventType) => {
      console.log(`Supabase Realtime event: ${eventType} on ${table}`);
      syncFromSupabase().catch((err) => console.warn('Realtime sync error:', err));
    }
  );
};

export const triggerSync = async () => {
  if (!globalState.isOnline) return;
  globalState.syncStatus = 'syncing';
  notify();

  try {
    const result = await processSyncQueue();
    globalState.pendingSyncCount = result.remainingCount;
    globalState.lastSyncTimestamp = new Date().toISOString();
    globalState.syncStatus = result.remainingCount === 0 ? 'synced' : 'pending';
    globalState.supabaseLastSyncTime = 'Synchronized with local storage';
  } catch {
    globalState.syncStatus = 'error';
  }
  notify();
};

export const initGlobalServicesOnce = () => {
  if (globalServicesInitialized) return;
  globalServicesInitialized = true;

  if (typeof window !== 'undefined') {
    const handleOnline = () => {
      globalState.isOnline = true;
      notify();
      triggerSync();
    };
    const handleOffline = () => {
      globalState.isOnline = false;
      notify();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    getPendingSyncCount().then((count) => {
      if (globalState.pendingSyncCount !== count) {
        globalState.pendingSyncCount = count;
        notify();
      }
    });

    if (isSupabaseConfigured) {
      checkSupabaseConnection().then((res) => {
        globalState.supabaseConnected = res.connected;
        if (res.connected) {
          globalState.storageEngine = 'Supabase Cloud Database (PostgreSQL + RLS)';
        }
        notify();
      });

      authService.restoreSupabaseSession().then((user) => {
        if (user && !globalState.isAuthenticated) {
          const profile: UserProfile = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            branch_id: user.branch_id || 'branch-1',
            is_active: true,
            two_factor_enabled: false,
            created_at: user.created_at,
          };
          globalState.currentUser = profile;
          globalState.activeRole = profile.role;
          globalState.isAuthenticated = true;
          saveStored('user', profile);
          saveStored('role', profile.role);
          saveStored('is_authenticated', true);
          notify();
          syncFromSupabase().catch((err) => console.warn('Session sync error:', err));
        }
      });

      if (globalState.currentOrganization?.id) {
        updateRealtimeSubscription(globalState.currentOrganization.id);
      }
    }
  }
};

export function useERPStore() {
  const [state, setState] = useState<ERPStoreState>(() => ({ ...globalState }));

  useEffect(() => {
    initGlobalServicesOnce();
    const listener = (s: ERPStoreState) => setState(s);
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Theme Toggler
  const setTheme = (theme: 'light' | 'dark') => {
    globalState.theme = theme;
    saveStored('theme', theme);
    notify();
  };

  const toggleTheme = () => {
    const next = globalState.theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  // Role Switcher
  const switchRole = (role: UserRole) => {
    globalState.activeRole = role;
    if (globalState.currentUser) {
      globalState.currentUser = { ...globalState.currentUser, role };
      saveStored('user', globalState.currentUser);
    }
    saveStored('role', role);
    addAuditLog('ROLE_SWITCH', 'auth.users', globalState.currentUser?.id, { role });
    notify();
  };

  // Branch Switcher
  const setBranch = (branchId: string) => {
    globalState.currentBranchId = branchId;
    saveStored('branch_id', branchId);
    notify();
  };

  // Login User via Standalone Auth Service
  const loginUser = async (email: string, pass?: string, role?: UserRole, fullName?: string) => {
    // If password is provided, authenticate against standalone auth service
    if (pass) {
      const authRes = await authService.login(email, pass);
      if (!authRes.success || !authRes.user) {
        return { success: false, error: authRes.error || 'Invalid email or password.' };
      }

      const profile: UserProfile = {
        id: authRes.user.id,
        email: authRes.user.email,
        full_name: authRes.user.full_name,
        role: authRes.user.role,
        branch_id: authRes.user.branch_id || 'branch-1',
        is_active: true,
        two_factor_enabled: false,
        created_at: authRes.user.created_at,
      };

      globalState.currentUser = profile;
      globalState.activeRole = profile.role;
      globalState.isAuthenticated = true;

      saveStored('user', profile);
      saveStored('role', profile.role);
      saveStored('is_authenticated', true);

      addAuditLog('LOGIN', 'auth.users', profile.id, { email });
      notify();
      if (isSupabaseConfigured) {
        syncFromSupabase().catch((err) => console.warn('Background sync on login notice:', err));
      }
      return { success: true, user: profile };
    }

    // Direct profile selection fallback (for testing/dev switching)
    const found = demoProfiles.find((p) => (p.email || '').toLowerCase() === (email || '').toLowerCase());
    const profile: UserProfile = found || {
      id: `user-${Date.now()}`,
      email,
      full_name: fullName || (email ? email.split('@')[0].toUpperCase() : 'USER'),
      role: role || 'owner',
      is_active: true,
      two_factor_enabled: false,
      created_at: new Date().toISOString(),
    };

    globalState.currentUser = profile;
    globalState.activeRole = profile.role;
    globalState.isAuthenticated = true;
    saveStored('user', profile);
    saveStored('role', profile.role);
    saveStored('is_authenticated', true);
    addAuditLog('LOGIN', 'auth.users', profile.id, { email });
    notify();
    return { success: true, user: profile };
  };

  const signupUser = (email: string, fullName: string, role: UserRole) => {
    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      email,
      full_name: fullName?.trim() || (email ? email.split('@')[0].toUpperCase() : 'USER'),
      role,
      branch_id: 'branch-1',
      is_active: true,
      two_factor_enabled: false,
      created_at: new Date().toISOString(),
    };
    globalState.currentUser = profile;
    globalState.activeRole = role;
    globalState.isAuthenticated = true;
    saveStored('user', profile);
    saveStored('role', role);
    saveStored('is_authenticated', true);
    addAuditLog('REGISTER', 'auth.users', profile.id, { email, role });
    notify();
  };

  // Logout User
  const logoutUser = () => {
    authService.logout();
    globalState.isAuthenticated = false;
    globalState.currentUser = null;
    globalState.activeRole = 'viewer';
    saveStored('is_authenticated', false);
    saveStored('user', null);
    saveStored('role', 'viewer');

    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'user');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'role');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'is_authenticated');
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }

    notify();
  };

  // Production Batches
  const addProductionBatch = (
    batch: Omit<ProductionBatch, 'id' | 'created_at' | 'organization_id' | 'branch_id'>
  ) => {
    const qty = Number(batch.quantity_produced) || 0;
    const rej = Number(batch.rejected_quantity) || 0;
    const dmg = Number(batch.damaged_bottles) || 0;
    const accepted = batch.accepted_quantity !== undefined ? batch.accepted_quantity : Math.max(0, qty - rej - dmg);
    const waste = batch.waste_percent !== undefined ? batch.waste_percent : (qty > 0 ? ((rej + dmg) / qty) * 100 : 0);
    const eff = batch.efficiency_percent !== undefined ? batch.efficiency_percent : (qty > 0 ? (accepted / qty) * 100 : 0);
    const cost = Number(batch.production_cost) || 0;
    const costPerBottle = batch.cost_per_bottle !== undefined ? batch.cost_per_bottle : (accepted > 0 ? cost / accepted : 0);

    const newBatch: ProductionBatch = {
      ...batch,
      accepted_quantity: accepted,
      waste_percent: waste,
      efficiency_percent: eff,
      cost_per_bottle: costPerBottle,
      id: `PB-${new Date().getFullYear()}-${String(globalState.productionBatches.length + 1).padStart(4, '0')}`,
      organization_id: globalState.currentOrganization?.id || 'org-default',
      branch_id: globalState.currentBranchId,
      created_at: new Date().toISOString(),
    };

    globalState.finishedGoods = globalState.finishedGoods.map((item) => {
      if (item.bottle_size === newBatch.bottle_size || (newBatch.bottle_type_id && item.bottle_type_id === newBatch.bottle_type_id)) {
        return {
          ...item,
          current_stock: item.current_stock + accepted,
          produced_stock: item.produced_stock + accepted,
          available_stock: item.available_stock + accepted,
          updated_at: new Date().toISOString(),
        };
      }
      return item;
    });

    globalState.productionBatches = [newBatch, ...globalState.productionBatches];
    saveStored('batches', globalState.productionBatches);
    saveStored('inventory', globalState.finishedGoods);

    addAuditLog('CREATE', 'production_batches', newBatch.id, {
      bottle_size: newBatch.bottle_size,
      quantity_produced: newBatch.quantity_produced,
      accepted_quantity: newBatch.accepted_quantity,
    });

    addNotification({
      title: 'Production Batch Completed',
      message: `Batch ${newBatch.batch_number} (${newBatch.bottle_size}) completed with ${newBatch.accepted_quantity} units stored.`,
      type: 'success',
    });

    notify();
  };

  // Warehouse Transactions
  const addWarehouseTransaction = (
    tx: Omit<WarehouseTransaction, 'id' | 'created_at' | 'organization_id' | 'branch_id'>
  ) => {
    const txType = tx.type || tx.transaction_type || 'Stock In';
    const newTx: WarehouseTransaction = {
      ...tx,
      type: txType,
      reference_code: tx.reference_code || `TX-${Date.now().toString().slice(-6)}`,
      id: `TX-${Date.now()}`,
      organization_id: globalState.currentOrganization?.id || 'org-default',
      branch_id: globalState.currentBranchId,
      created_at: new Date().toISOString(),
    };

    globalState.finishedGoods = globalState.finishedGoods.map((item) => {
      if (item.bottle_size === newTx.product_size || item.id === newTx.item_id) {
        const adjustment =
          txType === 'Stock In' || txType === 'Return'
            ? newTx.quantity
            : -newTx.quantity;
        return {
          ...item,
          current_stock: Math.max(0, item.current_stock + adjustment),
          available_stock: Math.max(0, item.available_stock + adjustment),
          updated_at: new Date().toISOString(),
        };
      }
      return item;
    });

    globalState.transactions = [newTx, ...globalState.transactions];
    saveStored('transactions', globalState.transactions);
    saveStored('inventory', globalState.finishedGoods);

    addAuditLog('CREATE', 'warehouse_transactions', newTx.id, {
      type: newTx.type,
      quantity: newTx.quantity,
    });

    notify();
  };

  // Sales
  const addSale = (saleData: Omit<Sale, 'id' | 'created_at' | 'organization_id' | 'branch_id'>) => {
    const paid = saleData.amount_paid !== undefined ? saleData.amount_paid : (saleData.paid_amount || 0);
    const newSale: Sale = {
      ...saleData,
      amount_paid: paid,
      paid_amount: paid,
      payments: saleData.payments || [],
      id: `INV-${new Date().getFullYear()}-${String(globalState.sales.length + 1).padStart(4, '0')}`,
      organization_id: globalState.currentOrganization?.id || 'org-default',
      branch_id: globalState.currentBranchId,
      created_at: new Date().toISOString(),
    };

    // Deduct stock for each item in the sale
    newSale.items.forEach((item) => {
      const idx = globalState.finishedGoods.findIndex(
        (fg) => fg.bottle_size === item.bottle_size || fg.id === item.bottle_size
      );
      if (idx !== -1) {
        globalState.finishedGoods[idx] = {
          ...globalState.finishedGoods[idx],
          current_stock: Math.max(0, globalState.finishedGoods[idx].current_stock - item.quantity),
          sold_stock: (globalState.finishedGoods[idx].sold_stock || 0) + item.quantity,
          available_stock: Math.max(0, (globalState.finishedGoods[idx].available_stock || globalState.finishedGoods[idx].current_stock) - item.quantity),
          updated_at: new Date().toISOString(),
        };
      }
    });

    // Update customer stats
    const custIndex = globalState.customers.findIndex((c) => c.id === newSale.customer_id);
    if (custIndex !== -1) {
      const cust = globalState.customers[custIndex];
      const outstandingDiff = newSale.total_amount - paid;
      globalState.customers[custIndex] = {
        ...cust,
        outstanding_balance: Math.max(0, cust.outstanding_balance + outstandingDiff),
        total_orders: (cust.total_orders || 0) + 1,
      };
      saveStored('customers', globalState.customers);
    }

    globalState.sales = [newSale, ...globalState.sales];
    saveStored('sales', globalState.sales);
    saveStored('inventory', globalState.finishedGoods);

    addAuditLog('CREATE', 'sales', newSale.id, {
      invoice_number: newSale.invoice_number,
      total_amount: newSale.total_amount,
    });

    addNotification({
      title: 'Order Completed',
      message: `Sale invoice ${newSale.invoice_number} dispatched for $${newSale.total_amount.toLocaleString()}.`,
      type: 'success',
    });

    notify();
  };

  // Record Payment
  const recordPayment = (
    saleIdOrPayment: string | (Omit<Payment, 'id' | 'created_at'> & { sale_id?: string }),
    optionalPayment?: Omit<Payment, 'id' | 'created_at'>
  ) => {
    let saleId: string | undefined;
    let payment: Omit<Payment, 'id' | 'created_at'>;

    if (typeof saleIdOrPayment === 'string') {
      saleId = saleIdOrPayment;
      payment = optionalPayment!;
    } else {
      payment = saleIdOrPayment;
      saleId = saleIdOrPayment.sale_id;
    }

    if (!payment) return;

    const newPayment: Payment = {
      ...payment,
      id: `PAY-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    if (saleId) {
      const saleIndex = globalState.sales.findIndex((s) => s.id === saleId);
      if (saleIndex !== -1) {
        const sale = globalState.sales[saleIndex];
        const currentPaid = sale.amount_paid ?? sale.paid_amount ?? 0;
        const newPaidAmount = currentPaid + payment.amount;
        const newPaymentStatus =
          newPaidAmount >= sale.total_amount
            ? 'Paid'
            : newPaidAmount > 0
            ? 'Partial'
            : 'Unpaid';

        globalState.sales[saleIndex] = {
          ...sale,
          amount_paid: newPaidAmount,
          paid_amount: newPaidAmount,
          payment_status: newPaymentStatus,
          payments: [...(sale.payments || []), newPayment],
        };
        saveStored('sales', globalState.sales);
        addAuditLog('UPDATE', 'sales', saleId, { payment_amount: payment.amount });
      }
    }

    if (payment.customer_id) {
      const custIndex = globalState.customers.findIndex((c) => c.id === payment.customer_id);
      if (custIndex !== -1) {
        const cust = globalState.customers[custIndex];
        globalState.customers[custIndex] = {
          ...cust,
          outstanding_balance: Math.max(0, (cust.outstanding_balance || 0) - payment.amount),
        };
        saveStored('customers', globalState.customers);
      }
    }

    notify();
  };

  // Customers
  const addCustomer = (customer: Omit<Customer, 'id' | 'created_at' | 'organization_id' | 'branch_id'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: `CUST-${Date.now()}`,
      organization_id: globalState.currentOrganization?.id || 'org-default',
      branch_id: globalState.currentBranchId,
      created_at: new Date().toISOString(),
    };
    globalState.customers = [newCustomer, ...globalState.customers];
    saveStored('customers', globalState.customers);
    addAuditLog('CREATE', 'customers', newCustomer.id, { name: newCustomer.name });
    notify();
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    globalState.customers = globalState.customers.map((c) => (c.id === id ? { ...c, ...updates } : c));
    saveStored('customers', globalState.customers);
    addAuditLog('UPDATE', 'customers', id, updates);
    notify();
  };

  // Raw Materials
  const addRawMaterial = (rm: Omit<RawMaterial, 'id' | 'created_at' | 'organization_id' | 'branch_id'>) => {
    const newRM: RawMaterial = {
      ...rm,
      id: `RM-${Date.now()}`,
      organization_id: globalState.currentOrganization?.id || 'org-default',
      branch_id: globalState.currentBranchId,
      created_at: new Date().toISOString(),
    };
    globalState.rawMaterials = [newRM, ...globalState.rawMaterials];
    saveStored('raw_materials', globalState.rawMaterials);
    addAuditLog('CREATE', 'raw_materials', newRM.id, { name: newRM.name });
    notify();
  };

  const updateRawMaterialStock = (id: string, newStock: number) => {
    globalState.rawMaterials = globalState.rawMaterials.map((rm) =>
      rm.id === id ? { ...rm, current_stock: newStock, last_restocked: new Date().toISOString() } : rm
    );
    saveStored('raw_materials', globalState.rawMaterials);
    addAuditLog('UPDATE', 'raw_materials', id, { new_stock: newStock });
    notify();
  };

  // Suppliers
  const addSupplier = (supplier: Omit<Supplier, 'id' | 'created_at' | 'organization_id' | 'branch_id'>) => {
    const newSup: Supplier = sanitizeSupplier({
      ...supplier,
      id: `SUP-${Date.now()}`,
      organization_id: globalState.currentOrganization?.id || 'org-default',
      branch_id: globalState.currentBranchId,
      created_at: new Date().toISOString(),
    });
    globalState.suppliers = [newSup, ...globalState.suppliers];
    saveStored('suppliers', globalState.suppliers);
    addAuditLog('CREATE', 'suppliers', newSup.id, { name: newSup.name });
    notify();
  };

  // Purchase Orders
  const addPurchaseOrder = (po: Omit<Purchase, 'id' | 'created_at' | 'organization_id'> & { branch_id?: string }) => {
    const rawBranch = globalState.branches.find((b) => b.id === (po.branch_id || globalState.currentBranchId));
    const branchName = rawBranch?.name || 'Main Plant';

    // Ensure items calculate correct total with explicit unit cost
    const items = (po.items || []).map((it, idx) => {
      const quantity = Number(it.quantity || 0);
      const unit_cost = Number(it.unit_cost || 0);
      const discount = Number(it.discount || 0);
      const tax = Number(it.tax || 0);
      const total_cost = it.total_cost || Math.max(0, quantity * unit_cost - discount + tax);
      return {
        ...it,
        id: it.id || `poi-${Date.now()}-${idx}`,
        quantity,
        unit_cost,
        discount,
        tax,
        total_cost,
      };
    });

    const subtotal = po.subtotal || items.reduce((acc, it) => acc + (it.quantity * it.unit_cost), 0);
    const total_amount = po.total_amount || items.reduce((acc, it) => acc + it.total_cost, 0);

    const newPO: Purchase = {
      ...po,
      id: `PO-${new Date().getFullYear()}-${String(globalState.purchases.length + 1).padStart(4, '0')}`,
      po_number: po.po_number || `PO-${new Date().getFullYear()}-${String(globalState.purchases.length + 1).padStart(4, '0')}`,
      organization_id: globalState.currentOrganization?.id || 'org-default',
      branch_id: po.branch_id || globalState.currentBranchId,
      branch_name: branchName,
      items,
      subtotal,
      total_amount,
      status: po.status || 'Ordered',
      created_by: po.created_by || globalState.currentUser?.full_name || 'Procurement Officer',
      created_at: new Date().toISOString(),
    };

    globalState.purchases = [newPO, ...globalState.purchases];
    saveStored('purchases', globalState.purchases);
    saveTableToIndexedDB('purchases', globalState.purchases);

    // Queue offline sync
    enqueueSyncTransaction({
      entity_type: 'purchase',
      entity_id: newPO.id,
      action: 'CREATE',
      payload: newPO,
    }).then(() => {
      getPendingSyncCount().then((count) => {
        globalState.pendingSyncCount = count;
        notify();
      });
    });

    addAuditLog('CREATE', 'purchases', newPO.id, {
      po_number: newPO.po_number,
      supplier_name: newPO.supplier_name,
      total_amount: newPO.total_amount,
    });
    notify();
  };

  const updatePurchaseOrder = (id: string, updates: Partial<Purchase>) => {
    const oldPO = globalState.purchases.find((p) => p.id === id);
    globalState.purchases = globalState.purchases.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    saveStored('purchases', globalState.purchases);
    saveTableToIndexedDB('purchases', globalState.purchases);

    enqueueSyncTransaction({
      entity_type: 'purchase',
      entity_id: id,
      action: 'UPDATE',
      payload: updates,
    });

    addAuditLog('UPDATE', 'purchases', id, { old_value: oldPO, new_value: updates });
    notify();
  };

  const receivePurchaseOrder = (id: string) => {
    const poIndex = globalState.purchases.findIndex((p) => p.id === id);
    if (poIndex === -1) return;

    const po = globalState.purchases[poIndex];
    if (po.status === 'Received') return;

    globalState.purchases[poIndex] = {
      ...po,
      status: 'Received',
      received_date: new Date().toISOString(),
    };

    // Flow user's explicit purchase cost directly into raw materials inventory and calculate weighted average cost
    po.items.forEach((item) => {
      const rmIndex = globalState.rawMaterials.findIndex((rm) => rm.id === item.raw_material_id);
      if (rmIndex !== -1) {
        const rm = globalState.rawMaterials[rmIndex];
        const oldStock = Number(rm.current_stock || 0);
        const oldCost = Number(rm.cost_per_unit || 0);
        const newQty = Number(item.quantity || 0);
        const enteredUnitCost = Number(item.unit_cost || oldCost);

        // Weighted Average Costing Formula: ((oldStock * oldCost) + (newQty * enteredUnitCost)) / (oldStock + newQty)
        const totalStock = oldStock + newQty;
        const weightedCost = totalStock > 0
          ? ((oldStock * oldCost) + (newQty * enteredUnitCost)) / totalStock
          : enteredUnitCost;

        globalState.rawMaterials[rmIndex] = {
          ...rm,
          current_stock: totalStock,
          cost_per_unit: Number(weightedCost.toFixed(4)),
          last_restocked: new Date().toISOString(),
        };
      }
    });

    saveStored('purchases', globalState.purchases);
    saveTableToIndexedDB('purchases', globalState.purchases);
    saveStored('raw_materials', globalState.rawMaterials);
    saveTableToIndexedDB('raw_materials', globalState.rawMaterials);

    enqueueSyncTransaction({
      entity_type: 'purchase',
      entity_id: id,
      action: 'UPDATE',
      payload: { status: 'Received' },
    });

    addAuditLog('UPDATE', 'purchases', id, { status: 'Received', notes: 'Stock and weighted average cost updated' });
    notify();
  };

  const voidPurchaseOrder = (id: string) => {
    const po = globalState.purchases.find((p) => p.id === id);
    if (!po) return;
    globalState.purchases = globalState.purchases.map((p) =>
      p.id === id ? { ...p, status: 'Cancelled' as PurchaseStatus } : p
    );
    saveStored('purchases', globalState.purchases);
    saveTableToIndexedDB('purchases', globalState.purchases);

    enqueueSyncTransaction({
      entity_type: 'purchase',
      entity_id: id,
      action: 'VOID',
      payload: { status: 'Cancelled' },
    });

    addAuditLog('VOID', 'purchases', id, { po_number: po.po_number, previous_status: po.status });
    notify();
  };

  const deletePurchaseOrder = (id: string) => {
    const po = globalState.purchases.find((p) => p.id === id);
    globalState.purchases = globalState.purchases.filter((p) => p.id !== id);
    saveStored('purchases', globalState.purchases);
    saveTableToIndexedDB('purchases', globalState.purchases);

    enqueueSyncTransaction({
      entity_type: 'purchase',
      entity_id: id,
      action: 'DELETE',
      payload: { id },
    });

    addAuditLog('DELETE', 'purchases', id, { deleted_record: po });
    notify();
  };

  // Expenses
  const addExpense = (exp: Omit<Expense, 'id' | 'created_at' | 'organization_id'> & { branch_id?: string }) => {
    const rawBranch = globalState.branches.find((b) => b.id === (exp.branch_id || globalState.currentBranchId));
    const branchName = rawBranch?.name || 'Main Plant';

    const newExp: Expense = {
      ...exp,
      id: `EXP-${Date.now()}`,
      expense_number: exp.expense_number || `EXP-${new Date().getFullYear()}-${String(globalState.expenses.length + 1).padStart(4, '0')}`,
      organization_id: globalState.currentOrganization?.id || 'org-default',
      branch_id: exp.branch_id || globalState.currentBranchId,
      branch_name: branchName,
      currency: exp.currency || globalState.currentOrganization?.currency || 'GHS',
      date: exp.date || exp.expense_date || new Date().toISOString().split('T')[0],
      expense_date: exp.expense_date || exp.date || new Date().toISOString().split('T')[0],
      approval_status: exp.approval_status || 'Approved',
      created_at: new Date().toISOString(),
    };
    globalState.expenses = [newExp, ...globalState.expenses];
    saveStored('expenses', globalState.expenses);
    saveTableToIndexedDB('expenses', globalState.expenses);

    enqueueSyncTransaction({
      entity_type: 'expense',
      entity_id: newExp.id,
      action: 'CREATE',
      payload: newExp,
    }).then(() => {
      getPendingSyncCount().then((count) => {
        globalState.pendingSyncCount = count;
        notify();
      });
    });

    addAuditLog('CREATE', 'expenses', newExp.id, {
      expense_number: newExp.expense_number,
      amount: newExp.amount,
      category: newExp.category,
      payee: newExp.payee,
    });
    notify();
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    const oldExp = globalState.expenses.find((e) => e.id === id);
    globalState.expenses = globalState.expenses.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    );
    saveStored('expenses', globalState.expenses);
    saveTableToIndexedDB('expenses', globalState.expenses);

    enqueueSyncTransaction({
      entity_type: 'expense',
      entity_id: id,
      action: 'UPDATE',
      payload: updates,
    });

    addAuditLog('UPDATE', 'expenses', id, { old_value: oldExp, new_value: updates });
    notify();
  };

  const deleteExpense = (id: string) => {
    const exp = globalState.expenses.find((e) => e.id === id);
    globalState.expenses = globalState.expenses.filter((e) => e.id !== id);
    saveStored('expenses', globalState.expenses);
    saveTableToIndexedDB('expenses', globalState.expenses);

    enqueueSyncTransaction({
      entity_type: 'expense',
      entity_id: id,
      action: 'DELETE',
      payload: { id },
    });

    addAuditLog('DELETE', 'expenses', id, { deleted_record: exp });
    notify();
  };

  const addCustomExpenseCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (!trimmed || globalState.customExpenseCategories.includes(trimmed)) return;
    globalState.customExpenseCategories = [...globalState.customExpenseCategories, trimmed];
    saveStored('custom_expense_categories', globalState.customExpenseCategories);
    notify();
  };

  // Sales Void & Delete
  const voidSale = (saleId: string) => {
    const sale = globalState.sales.find((s) => s.id === saleId);
    if (!sale) return;
    globalState.sales = globalState.sales.map((s) =>
      s.id === saleId ? { ...s, payment_status: 'Void' as any, notes: `${s.notes ? s.notes + ' - ' : ''}VOIDED` } : s
    );
    saveStored('sales', globalState.sales);
    saveTableToIndexedDB('sales', globalState.sales);

    enqueueSyncTransaction({
      entity_type: 'sale',
      entity_id: saleId,
      action: 'VOID',
      payload: { status: 'Void' },
    });

    addAuditLog('VOID', 'sales', saleId, { invoice_number: sale.invoice_number });
    notify();
  };

  const deleteSale = (saleId: string) => {
    const sale = globalState.sales.find((s) => s.id === saleId);
    globalState.sales = globalState.sales.filter((s) => s.id !== saleId);
    saveStored('sales', globalState.sales);
    saveTableToIndexedDB('sales', globalState.sales);

    enqueueSyncTransaction({
      entity_type: 'sale',
      entity_id: saleId,
      action: 'DELETE',
      payload: { id: saleId },
    });

    addAuditLog('DELETE', 'sales', saleId, { deleted_record: sale });
    notify();
  };

  // Production Batches Delete
  const deleteProductionBatch = (id: string) => {
    const batch = globalState.productionBatches.find((b) => b.id === id);
    globalState.productionBatches = globalState.productionBatches.filter((b) => b.id !== id);
    saveStored('batches', globalState.productionBatches);
    saveTableToIndexedDB('productionBatches', globalState.productionBatches);

    enqueueSyncTransaction({
      entity_type: 'production_batch',
      entity_id: id,
      action: 'DELETE',
      payload: { id },
    });

    addAuditLog('DELETE', 'production_batches', id, { deleted_record: batch });
    notify();
  };

  // Customer & Supplier Deletions
  const deleteCustomer = (id: string) => {
    const cust = globalState.customers.find((c) => c.id === id);
    globalState.customers = globalState.customers.filter((c) => c.id !== id);
    saveStored('customers', globalState.customers);
    saveTableToIndexedDB('customers', globalState.customers);

    enqueueSyncTransaction({
      entity_type: 'customer',
      entity_id: id,
      action: 'DELETE',
      payload: { id },
    });

    addAuditLog('DELETE', 'customers', id, { deleted_record: cust });
    notify();
  };

  const deleteSupplier = (id: string) => {
    const sup = globalState.suppliers.find((s) => s.id === id);
    globalState.suppliers = globalState.suppliers.filter((s) => s.id !== id);
    saveStored('suppliers', globalState.suppliers);
    saveTableToIndexedDB('suppliers', globalState.suppliers);

    enqueueSyncTransaction({
      entity_type: 'supplier',
      entity_id: id,
      action: 'DELETE',
      payload: { id },
    });

    addAuditLog('DELETE', 'suppliers', id, { deleted_record: sup });
    notify();
  };

  const deleteMachine = (id: string) => {
    const mach = globalState.machines.find((m) => m.id === id);
    globalState.machines = globalState.machines.filter((m) => m.id !== id);
    saveStored('machines', globalState.machines);
    saveTableToIndexedDB('machines', globalState.machines);

    enqueueSyncTransaction({
      entity_type: 'machine',
      entity_id: id,
      action: 'DELETE',
      payload: { id },
    });

    addAuditLog('DELETE', 'machines', id, { deleted_record: mach });
    notify();
  };

  // Production Budgets
  const addProductionBudget = (budget: Omit<ProductionBudget, 'id' | 'created_at'>) => {
    const newBudget: ProductionBudget = {
      ...budget,
      id: `budget-${Date.now()}`,
      organization_id: globalState.currentOrganization?.id || 'org-default',
      branch_id: budget.branch_id || globalState.currentBranchId,
      created_at: new Date().toISOString(),
    };
    globalState.productionBudgets = [newBudget, ...globalState.productionBudgets];
    saveStored('budgets', globalState.productionBudgets);
    saveTableToIndexedDB('productionBudgets', globalState.productionBudgets);

    enqueueSyncTransaction({
      entity_type: 'production_budget',
      entity_id: newBudget.id,
      action: 'CREATE',
      payload: newBudget,
    });

    addAuditLog('CREATE', 'production_budgets', newBudget.id, {
      product: newBudget.product_name,
      period: newBudget.period,
      budgeted_quantity: newBudget.budgeted_production_quantity,
    });
    notify();
  };

  const updateProductionBudget = (id: string, updates: Partial<ProductionBudget>) => {
    globalState.productionBudgets = globalState.productionBudgets.map((b) =>
      b.id === id ? { ...b, ...updates } : b
    );
    saveStored('budgets', globalState.productionBudgets);
    saveTableToIndexedDB('productionBudgets', globalState.productionBudgets);

    enqueueSyncTransaction({
      entity_type: 'production_budget',
      entity_id: id,
      action: 'UPDATE',
      payload: updates,
    });

    addAuditLog('UPDATE', 'production_budgets', id, updates);
    notify();
  };

  const deleteProductionBudget = (id: string) => {
    const b = globalState.productionBudgets.find((item) => item.id === id);
    globalState.productionBudgets = globalState.productionBudgets.filter((item) => item.id !== id);
    saveStored('budgets', globalState.productionBudgets);
    saveTableToIndexedDB('productionBudgets', globalState.productionBudgets);

    enqueueSyncTransaction({
      entity_type: 'production_budget',
      entity_id: id,
      action: 'DELETE',
      payload: { id },
    });

    addAuditLog('DELETE', 'production_budgets', id, { deleted_record: b });
    notify();
  };

  // Journal Entries
  const addJournalEntry = (entry: Omit<JournalEntry, 'id' | 'created_at'>) => {
    const totalAmount = entry.lines.reduce((acc, l) => acc + (l.debit || 0), 0);
    const newEntry: JournalEntry = {
      ...entry,
      id: `je-${Date.now()}`,
      entry_number: entry.entry_number || `JE-${new Date().getFullYear()}-${String(globalState.journalEntries.length + 1).padStart(4, '0')}`,
      organization_id: globalState.currentOrganization?.id || 'org-default',
      total_amount: totalAmount,
      created_by: entry.created_by || globalState.currentUser?.full_name || 'Accountant',
      created_at: new Date().toISOString(),
    };
    globalState.journalEntries = [newEntry, ...globalState.journalEntries];
    saveStored('journal_entries', globalState.journalEntries);
    saveTableToIndexedDB('journalEntries', globalState.journalEntries);

    enqueueSyncTransaction({
      entity_type: 'journal_entry',
      entity_id: newEntry.id,
      action: 'CREATE',
      payload: newEntry,
    });

    addAuditLog('CREATE', 'journal_entries', newEntry.id, {
      entry_number: newEntry.entry_number,
      total_amount: newEntry.total_amount,
    });
    notify();
  };

  const voidJournalEntry = (id: string) => {
    const je = globalState.journalEntries.find((j) => j.id === id);
    if (!je) return;
    globalState.journalEntries = globalState.journalEntries.map((j) =>
      j.id === id ? { ...j, status: 'Void' as any } : j
    );
    saveStored('journal_entries', globalState.journalEntries);
    saveTableToIndexedDB('journalEntries', globalState.journalEntries);

    enqueueSyncTransaction({
      entity_type: 'journal_entry',
      entity_id: id,
      action: 'VOID',
      payload: { status: 'Void' },
    });

    addAuditLog('VOID', 'journal_entries', id, { entry_number: je.entry_number });
    notify();
  };

  // Offline-First Sync Controllers
  const setIsOnline = (online: boolean) => {
    globalState.isOnline = online;
    if (online) {
      triggerSync();
    } else {
      notify();
    }
  };

  const queueOfflineTransaction = async (
    entity_type: string,
    entity_id: string,
    action: SyncAction,
    payload: any
  ) => {
    await enqueueSyncTransaction({
      entity_type,
      entity_id,
      action,
      payload,
    });
    const count = await getPendingSyncCount();
    globalState.pendingSyncCount = count;
    notify();
  };

  // Machines
  const addMachine = (data: Partial<Machine> & { name: string; capacity_per_hour?: number }): { success: boolean; error?: string; machine?: Machine } => {
    const currentOrgId = globalState.currentOrganization?.id || 'org-default';
    const name = (data.name || '').trim();
    const code = (data.code || '').trim().toUpperCase();

    if (!name) {
      return { success: false, error: 'Machine Name is required.' };
    }
    if (!code) {
      return { success: false, error: 'Machine Code/ID is required.' };
    }
    if (!data.type) {
      return { success: false, error: 'Machine Type is required.' };
    }
    const capacity = Number(data.capacity_per_hour) || Number(data.capacity) || 0;
    if (capacity <= 0) {
      return { success: false, error: 'Machine capacity must be a positive number greater than 0.' };
    }

    // Prevent duplicate Machine Codes/IDs within the same company/organization
    const duplicate = globalState.machines.find(
      (m) =>
        (!m.organization_id || m.organization_id === currentOrgId) &&
        m.code &&
        m.code.trim().toUpperCase() === code
    );
    if (duplicate) {
      return {
        success: false,
        error: `Machine Code/ID "${code}" already exists in your organization. Please assign a unique identifier.`,
      };
    }

    const newMachine: Machine = {
      id: `m-${Date.now()}`,
      organization_id: currentOrgId,
      branch_id: data.branch_id || globalState.currentBranchId || 'branch-1',
      name,
      code,
      type: data.type,
      manufacturer: data.manufacturer || '',
      model: data.model || data.model_number || '',
      model_number: data.model || data.model_number || '',
      serial_number: data.serial_number || '',
      purchase_date: data.purchase_date || '',
      purchase_cost: Number(data.purchase_cost) || 0,
      location: data.location || '',
      capacity_per_hour: capacity,
      capacity: capacity,
      status: data.status || 'Active',
      installation_date: data.installation_date || '',
      warranty_expiry: data.warranty_expiry || '',
      notes: data.notes || '',
      efficiency: data.efficiency !== undefined ? Number(data.efficiency) : 98,
      last_serviced_date: data.last_serviced_date || new Date().toISOString().split('T')[0],
      next_maintenance_date: data.next_maintenance_date || '',
      temperature: data.temperature || 20,
      pressure: data.pressure || 6.0,
      cycles_today: 0,
      created_at: new Date().toISOString(),
    };

    globalState.machines = [newMachine, ...globalState.machines];
    saveStored('machines', globalState.machines);
    saveTableToIndexedDB('machines', globalState.machines);
    addAuditLog('CREATE', 'machines', newMachine.id, { name, code, status: newMachine.status });
    notify();
    return { success: true, machine: newMachine };
  };

  const updateMachine = (id: string, updates: Partial<Machine>): { success: boolean; error?: string } => {
    const currentOrgId = globalState.currentOrganization?.id || 'org-default';
    if (updates.code) {
      const code = updates.code.trim().toUpperCase();
      const duplicate = globalState.machines.find(
        (m) =>
          m.id !== id &&
          (!m.organization_id || m.organization_id === currentOrgId) &&
          m.code &&
          m.code.trim().toUpperCase() === code
      );
      if (duplicate) {
        return {
          success: false,
          error: `Machine Code/ID "${code}" already exists in your organization. Please assign a unique identifier.`,
        };
      }
    }

    let found = false;
    globalState.machines = globalState.machines.map((m) => {
      if (m.id === id) {
        found = true;
        const capacity = updates.capacity_per_hour !== undefined
          ? Number(updates.capacity_per_hour)
          : (updates.capacity !== undefined ? Number(updates.capacity) : m.capacity_per_hour);

        return {
          ...m,
          ...updates,
          name: updates.name ? updates.name.trim() : m.name,
          code: updates.code ? updates.code.trim().toUpperCase() : m.code,
          capacity_per_hour: capacity,
          capacity: capacity,
        };
      }
      return m;
    });

    if (!found) {
      return { success: false, error: 'Machine record not found.' };
    }

    saveStored('machines', globalState.machines);
    saveTableToIndexedDB('machines', globalState.machines);
    addAuditLog('UPDATE', 'machines', id, updates);
    notify();
    return { success: true };
  };

  const retireMachine = (id: string): { success: boolean; error?: string } => {
    return updateMachine(id, { status: 'Retired' });
  };

  const updateMachineStatus = (id: string, status: Machine['status'], efficiency?: number) => {
    globalState.machines = globalState.machines.map((m) =>
      m.id === id
        ? {
            ...m,
            status,
            efficiency: efficiency !== undefined ? efficiency : m.efficiency,
            last_maintenance: (status === 'Maintenance' || status === 'Under Maintenance') ? new Date().toISOString() : m.last_maintenance,
          }
        : m
    );
    saveStored('machines', globalState.machines);
    addAuditLog('UPDATE', 'machines', id, { status, efficiency });
    notify();
  };

  // Session Timeout
  const setSessionTimeoutMinutes = (minutes: number) => {
    globalState.sessionTimeoutMinutes = minutes;
    saveStored('session_timeout_minutes', minutes);
    try {
      localStorage.setItem('h2o_session_timeout_minutes', String(minutes));
    } catch {}
    if (globalState.currentOrganization) {
      globalState.currentOrganization = {
        ...globalState.currentOrganization,
        session_timeout_minutes: minutes,
      };
      saveStored('current_org', globalState.currentOrganization);
    }
    addAuditLog('UPDATE', 'settings.security', 'session_timeout', { minutes });
    notify();
  };

  // Notifications
  const addNotification = (n: { title: string; message: string; type: 'info' | 'warning' | 'alert' | 'success'; timestamp?: string; link?: string; [key: string]: any }) => {
    const newN: AppNotification = {
      id: `notif-${Date.now()}`,
      title: n.title,
      message: n.message,
      type: n.type,
      read: false,
      timestamp: n.timestamp || new Date().toISOString(),
      created_at: new Date().toISOString(),
      link: n.link,
    };
    globalState.notifications = [newN, ...globalState.notifications];
    saveStored('notifications', globalState.notifications);
    notify();
  };

  const markNotificationAsRead = (id: string) => {
    globalState.notifications = globalState.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveStored('notifications', globalState.notifications);
    notify();
  };

  const markAllNotificationsAsRead = () => {
    globalState.notifications = globalState.notifications.map((n) => ({ ...n, read: true }));
    saveStored('notifications', globalState.notifications);
    notify();
  };

  // Limit checking for SaaS
  const checkLimit = (type: 'users' | 'branches' | 'production_capacity', currentCount: number): boolean => {
    const plan =
      globalState.subscriptionPlans.find((p) => p.id === globalState.currentSubscription.plan_id) ||
      globalState.subscriptionPlans[1];
    switch (type) {
      case 'users':
        return currentCount < plan.maxUsers;
      case 'branches':
        return currentCount < plan.maxBranches;
      case 'production_capacity':
        return currentCount < (plan.maxProductionMonthly || 1000000);
      default:
        return true;
    }
  };

  const setUpgradeModalOpen = (open: boolean, reason?: string) => {
    globalState.upgradeModalOpen = open;
    globalState.upgradeModalReason = reason;
    notify();
  };

  // Branches
  const addBranch = (
    name: string,
    locationOrCode?: string,
    codeOrAddress?: string,
    maybeLocation?: string
  ) => {
    const cleanName = !name || name === 'undefined' ? 'Main Plant' : name;
    const code = maybeLocation ? locationOrCode : (codeOrAddress ? codeOrAddress : undefined);
    const address = maybeLocation ? codeOrAddress : undefined;
    const location = maybeLocation ? maybeLocation : (locationOrCode || 'Main Plant');

    const newB: Branch = {
      id: `branch-${Date.now()}`,
      organization_id: globalState.currentOrganization?.id || 'org-default',
      name: cleanName,
      code: code || `PLANT-${String(globalState.branches.length + 1).padStart(2, '0')}`,
      location,
      address,
      is_main: globalState.branches.length === 0,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    globalState.branches = [...globalState.branches, newB];
    saveStored('branches', globalState.branches);
    addAuditLog('CREATE', 'branches', newB.id, { name: cleanName });
    notify();
    return { success: true, branch: newB, error: undefined };
  };

  const toggleBranchStatus = (id: string) => {
    globalState.branches = globalState.branches.map((b) =>
      b.id === id ? { ...b, is_active: !b.is_active } : b
    );
    saveStored('branches', globalState.branches);
    notify();
  };

  // Multi-Tenant Workspaces
  const switchOrganization = async (organizationId: string) => {
    const target = globalState.organizations.find((o) => o.id === organizationId);
    if (!target) return;

    globalState.currentOrganization = target;
    saveStored('current_org', target);

    const sub =
      loadStored<Subscription[]>('subscriptions', initialSubscriptions).find(
        (s) => s.organization_id === organizationId
      ) || initialSubscriptions[0];

    globalState.currentSubscription = sub;
    saveStored('subscription', sub);

    addAuditLog('WORKSPACE_SWITCH', 'organizations', organizationId, { name: target.name });
    updateRealtimeSubscription(target.id);
    notify();
  };

  const registerOrganization = async (data: {
    companyName: string;
    tradingName?: string;
    regNumber?: string;
    taxId?: string;
    country: string;
    city: string;
    currency: string;
    phone?: string;
    address?: string;
    planId: SubscriptionPlanId;
    email: string;
    ownerName: string;
    ownerPassword?: string;
  }) => {
    const newOrgId = `org-${Date.now()}`;
    const cleanCompanyName = data.companyName?.trim() || 'AquaFlow Demo Water Company';
    const cleanPlantName = 'Main Plant';

    const newOrg: Organization = {
      id: newOrgId,
      name: cleanCompanyName,
      trading_name: data.tradingName || cleanCompanyName,
      registration_number: data.regNumber,
      tax_id: data.taxId,
      email: data.email.trim(),
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      currency: data.currency,
      financial_year_start: 'January',
      timezone: 'UTC',
      plan_id: data.planId,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      organization_id: newOrgId,
      plan_id: data.planId,
      status: 'active',
      amount: data.planId === 'enterprise' ? 199 : data.planId === 'professional' ? 79 : 29,
      currency: data.currency || 'USD',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
      trial_end: new Date(Date.now() + 14 * 86400000).toISOString(),
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
    };

    const newUserId = `user-owner-${Date.now()}`;
    const ownerMember: OrganizationMember = {
      id: `mem-${Date.now()}`,
      organization_id: newOrgId,
      user_id: newUserId,
      role: 'owner',
      full_name: data.ownerName.trim(),
      email: data.email.trim(),
      phone: data.phone,
      is_active: true,
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };

    const mainBranch: Branch = {
      id: `branch-${Date.now()}`,
      organization_id: newOrgId,
      name: cleanPlantName,
      code: 'PLANT-01',
      location: data.address || `${data.city || 'Valley'}, ${data.country || 'USA'}`,
      is_main: true,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Register user in standalone auth service
    if (data.ownerPassword) {
      await authService.createUser({
        email: data.email,
        full_name: data.ownerName,
        role: 'owner',
        organization_id: newOrgId,
        branch_id: mainBranch.id,
        password: data.ownerPassword,
      });
    }

    globalState.organizations = deduplicateOrganizations([newOrg, ...globalState.organizations]);
    globalState.currentOrganization = newOrg;
    globalState.currentSubscription = newSub;
    globalState.organizationMembers = [ownerMember, ...globalState.organizationMembers];
    globalState.branches = [mainBranch, ...globalState.branches];
    globalState.currentBranchId = mainBranch.id;

    globalState.currentUser = {
      id: newUserId,
      email: data.email,
      full_name: data.ownerName,
      role: 'owner',
      branch_id: mainBranch.id,
      is_active: true,
      two_factor_enabled: false,
      created_at: new Date().toISOString(),
    };
    globalState.activeRole = 'owner';
    globalState.isAuthenticated = true;

    saveStored('user', globalState.currentUser);
    saveStored('role', 'owner');
    saveStored('is_authenticated', true);
    saveStored('organizations', globalState.organizations);
    saveStored('current_org', newOrg);
    saveStored('subscription', newSub);
    saveStored('org_members', globalState.organizationMembers);
    saveStored('branches', globalState.branches);
    saveStored('branch_id', mainBranch.id);

    addAuditLog('CREATE', 'organizations', newOrgId, { name: cleanCompanyName, plan: data.planId });
    addNotification({
      title: 'Company Workspace Created!',
      message: `Welcome to AquaFlow ERP! ${cleanCompanyName} is registered with a 14-day free trial.`,
      type: 'success',
    });

    notify();
    return { success: true, organization: newOrg };
  };

  const updateOrganization = async (updates: Partial<Organization>) => {
    const updated: Organization = {
      ...globalState.currentOrganization,
      ...updates,
    };
    globalState.currentOrganization = updated;
    globalState.organizations = deduplicateOrganizations(globalState.organizations.map((o) => (o.id === updated.id ? updated : o)));
    saveStored('current_org', updated);
    saveStored('organizations', globalState.organizations);
    addAuditLog('UPDATE', 'organizations', updated.id, updates);
    notify();
  };

  const updateCurrentUserProfile = (updates: Partial<UserProfile>) => {
    if (!globalState.currentUser) return;
    const updated: UserProfile = {
      ...globalState.currentUser,
      ...updates,
    };
    globalState.currentUser = updated;
    saveStored('user', updated);

    // Sync to standalone authService
    try {
      authService.updateUser(updated.id, {
        full_name: updated.full_name,
        avatar_url: updated.avatar_url,
        phone: updated.phone,
      });
    } catch (e) {
      console.warn('AuthService sync warning:', e);
    }

    // Sync to organizationMembers list
    globalState.organizationMembers = globalState.organizationMembers.map((m) =>
      m.user_id === updated.id || (updated.email && m.email.toLowerCase() === updated.email.toLowerCase())
        ? { ...m, full_name: updated.full_name, avatar_url: updated.avatar_url }
        : m
    );
    saveStored('org_members', globalState.organizationMembers);
    addAuditLog('UPDATE', 'profiles', updated.id, updates);
    notify();
  };

  // Team & Invitations
  const inviteMember = async (email: string, role: OrganizationRole, invited_by_name?: string) => {
    const secureToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newInvite: Invitation = {
      id: `inv-${Date.now()}`,
      organization_id: globalState.currentOrganization.id,
      organization_name: globalState.currentOrganization.name,
      email,
      role,
      token: secureToken,
      invited_by: globalState.currentUser?.id || 'owner',
      invited_by_name: invited_by_name || globalState.currentUser?.full_name || 'Owner',
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    globalState.invitations = [newInvite, ...globalState.invitations];
    saveStored('invitations', globalState.invitations);

    addAuditLog('CREATE', 'invitations', newInvite.id, { email, role });
    addNotification({
      title: 'Invitation Sent',
      message: `Invitation generated for ${email} with role ${(role || 'operator').replace('_', ' ').toUpperCase()}.`,
      type: 'info',
    });

    notify();
    return { success: true, invitation: newInvite };
  };

  const acceptInvitation = async (token: string, password?: string, fullName?: string) => {
    const invite = globalState.invitations.find((i) => i.token === token);
    if (!invite) {
      return { success: false, error: 'Invitation link is invalid or does not exist.' };
    }
    if (invite.status === 'accepted' || invite.accepted_at) {
      return { success: false, error: 'This invitation has already been accepted.' };
    }
    if (invite.status === 'revoked') {
      return { success: false, error: 'This invitation has been revoked by the workspace administrator.' };
    }

    const assignedRole = invite.role as UserRole;
    let authUserId = `user-${Date.now()}`;

    // Create user locally in standalone auth service
    if (password) {
      const createRes = await authService.createUser({
        email: invite.email,
        full_name: fullName || invite.email.split('@')[0],
        role: assignedRole,
        organization_id: invite.organization_id,
        password,
      });
      if (createRes.user) {
        authUserId = createRes.user.id;
      }
    }

    const newMember: OrganizationMember = {
      id: `mem-${Date.now()}`,
      organization_id: invite.organization_id,
      user_id: authUserId,
      role: assignedRole as OrganizationRole,
      full_name: fullName || invite.email.split('@')[0],
      email: invite.email,
      is_active: true,
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };

    invite.status = 'accepted';
    invite.accepted_at = new Date().toISOString();

    globalState.organizationMembers = [...globalState.organizationMembers.filter((m) => m.id !== newMember.id), newMember];
    globalState.invitations = globalState.invitations.map((i) => (i.id === invite.id ? invite : i));
    saveStored('org_members', globalState.organizationMembers);
    saveStored('invitations', globalState.invitations);

    const targetOrg = globalState.organizations.find((o) => o.id === invite.organization_id) || initialOrganizations[0];
    globalState.currentOrganization = targetOrg;
    saveStored('current_org', targetOrg);

    const newProfile: UserProfile = {
      id: authUserId,
      email: invite.email,
      full_name: newMember.full_name,
      role: assignedRole,
      is_active: true,
      two_factor_enabled: false,
      created_at: new Date().toISOString(),
    };

    globalState.currentUser = newProfile;
    globalState.activeRole = assignedRole;
    globalState.isAuthenticated = true;
    saveStored('user', newProfile);
    saveStored('role', assignedRole);
    saveStored('is_authenticated', true);

    addAuditLog('ACCEPT_INVITE', 'invitations', invite.id, {
      email: invite.email,
      role: assignedRole,
    });
    notify();

    return { success: true };
  };

  const revokeInvitation = async (invitationId: string) => {
    globalState.invitations = globalState.invitations.map((i) =>
      i.id === invitationId ? { ...i, status: 'revoked' as const } : i
    );
    saveStored('invitations', globalState.invitations);
    addAuditLog('REVOKE_INVITE', 'invitations', invitationId);
    notify();
    return { success: true };
  };

  const updateMemberRole = async (memberId: string, newRole: OrganizationRole) => {
    globalState.organizationMembers = globalState.organizationMembers.map((m) =>
      m.id === memberId ? { ...m, role: newRole } : m
    );
    saveStored('org_members', globalState.organizationMembers);
    notify();
    return { success: true };
  };

  const toggleMemberStatus = async (memberId: string) => {
    globalState.organizationMembers = globalState.organizationMembers.map((m) =>
      m.id === memberId ? { ...m, is_active: !m.is_active } : m
    );
    saveStored('org_members', globalState.organizationMembers);
    notify();
    return { success: true };
  };

  const removeMember = async (memberId: string) => {
    globalState.organizationMembers = globalState.organizationMembers.filter((m) => m.id !== memberId);
    saveStored('org_members', globalState.organizationMembers);
    notify();
    return { success: true };
  };

  // Subscriptions & Plans
  const changeSubscriptionPlan = async (newPlanId: SubscriptionPlanId) => {
    const plan = globalState.subscriptionPlans.find((p) => p.id === newPlanId);
    if (!plan) return;

    const updatedSub: Subscription = {
      ...globalState.currentSubscription,
      plan_id: newPlanId,
      amount: plan.priceMonthly,
      status: 'active',
    };

    const newBill: BillingRecord = {
      id: `bill-${Date.now()}`,
      organization_id: globalState.currentOrganization.id,
      amount: plan.priceMonthly,
      currency: updatedSub.currency,
      status: 'paid',
      description: `Plan updated to ${plan.name} ($${plan.priceMonthly}/mo)`,
      invoice_url: '#',
      created_at: new Date().toISOString(),
    };

    globalState.currentSubscription = updatedSub;
    globalState.billingRecords = [newBill, ...globalState.billingRecords];
    saveStored('subscription', updatedSub);
    saveStored('billing_records', globalState.billingRecords);

    addAuditLog('PLAN_CHANGE', 'subscriptions', updatedSub.id, { plan: newPlanId });
    notify();
  };

  // Approval Workflows
  const requestApproval = (
    workflow_type: string,
    reference_id: string,
    reference_title: string,
    detailsOrAmount?: any,
    notesOrExtra?: any
  ) => {
    const isAmountNumber = typeof detailsOrAmount === 'number';
    const amount = isAmountNumber ? detailsOrAmount : (detailsOrAmount?.amount);
    const details = !isAmountNumber && typeof detailsOrAmount === 'object' ? detailsOrAmount : {};
    const notes = typeof notesOrExtra === 'string' ? notesOrExtra : detailsOrAmount?.notes;

    const newApproval: ApprovalWorkflow = {
      id: `appr-${Date.now()}`,
      organization_id: globalState.currentOrganization.id,
      branch_id: globalState.currentBranchId,
      type: workflow_type as any,
      workflow_type,
      reference_id,
      record_id: reference_id,
      reference_title,
      amount,
      notes,
      requested_by: globalState.currentUser?.id || 'unknown',
      requested_by_name: globalState.currentUser?.full_name || 'System User',
      status: 'Pending',
      details,
      created_at: new Date().toISOString(),
      requested_at: new Date().toISOString(),
    };

    globalState.approvalWorkflows = [newApproval, ...globalState.approvalWorkflows];
    saveStored('approvals', globalState.approvalWorkflows);

    addAuditLog('REQUEST_APPROVAL', 'approval_workflows', newApproval.id, {
      type: workflow_type,
      title: reference_title,
    });

    notify();
    return newApproval;
  };

  const reviewApproval = (id: string, status: 'Approved' | 'Rejected', notes?: string) => {
    const idx = globalState.approvalWorkflows.findIndex((a) => a.id === id);
    if (idx !== -1) {
      const appr = globalState.approvalWorkflows[idx];
      globalState.approvalWorkflows[idx] = {
        ...appr,
        status,
        reviewed_by: globalState.currentUser?.id || 'admin',
        reviewed_by_name: globalState.currentUser?.full_name || 'Admin',
        reviewed_at: new Date().toISOString(),
        notes: notes || appr.notes,
      };
      saveStored('approvals', globalState.approvalWorkflows);
      addAuditLog('REVIEW_APPROVAL', 'approval_workflows', id, { status, notes });
    }
    notify();
  };

  // Standalone Auth Compatibles
  const signInWithSupabase = async (email: string, pass: string) => {
    return loginUser(email, pass);
  };

  const signUpWithSupabase = async (email: string, pass: string, fullName: string) => {
    const res = await authService.createUser({
      email,
      full_name: fullName,
      role: 'admin',
      organization_id: globalState.currentOrganization.id,
      password: pass,
    });
    return { success: res.success, error: res.error };
  };

  const resetPasswordForEmail = async (email: string) => {
    return authService.resetPasswordForEmail(email);
  };

  const updateSupabasePassword = async (newPassword: string) => {
    const userId = globalState.currentUser?.id || 'user-owner-01';
    const res = await authService.updatePassword(userId, newPassword);
    if (res.success) {
      addAuditLog('UPDATE', 'auth.users', userId, { action: 'password_reset' });
      addNotification({
        title: 'Password Updated',
        message: 'Your account password has been updated securely.',
        type: 'success',
      });
      notify();
    }
    return res;
  };

  const currentOrgId = state.currentOrganization?.id || 'org-default';
  const orgScopedMachines = state.machines.filter(
    (m) => !m.organization_id || m.organization_id === currentOrgId
  );

  return {
    ...state,
    machines: orgScopedMachines,
    setTheme,
    toggleTheme,
    switchRole,
    setBranch,
    loginUser,
    signupUser,
    logoutUser,
    addMachine,
    updateMachine,
    retireMachine,
    setSessionTimeoutMinutes,
    addProductionBatch,
    addWarehouseTransaction,
    addSale,
    recordPayment,
    addCustomer,
    updateCustomer,
    addRawMaterial,
    updateRawMaterialStock,
    addSupplier,
    addPurchaseOrder,
    updatePurchaseOrder,
    receivePurchaseOrder,
    voidPurchaseOrder,
    deletePurchaseOrder,
    addExpense,
    updateExpense,
    deleteExpense,
    addCustomExpenseCategory,
    voidSale,
    deleteSale,
    deleteProductionBatch,
    deleteCustomer,
    deleteSupplier,
    deleteMachine,
    addProductionBudget,
    updateProductionBudget,
    deleteProductionBudget,
    addJournalEntry,
    voidJournalEntry,
    setIsOnline,
    triggerSync,
    queueOfflineTransaction,
    updateMachineStatus,
    addAuditLog,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    syncToSupabase,
    syncFromSupabase,
    // Multi-Tenant SaaS
    checkLimit,
    setUpgradeModalOpen,
    addBranch,
    toggleBranchStatus,
    switchOrganization,
    registerOrganization,
    updateOrganization,
    updateCurrentUserProfile,
    inviteMember,
    acceptInvitation,
    revokeInvitation,
    updateMemberRole,
    toggleMemberStatus,
    removeMember,
    changeSubscriptionPlan,
    requestApproval,
    reviewApproval,
    signInWithSupabase,
    signUpWithSupabase,
    resetPasswordForEmail,
    updateSupabasePassword,
  };
}

useERPStore.getState = (): ERPStoreState => ({ ...globalState });

