import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabase';
import {
  Organization,
  Branch,
  UserProfile,
  RawMaterial,
  Supplier,
  BottleType,
  Machine,
  ProductionBatch,
  FinishedGoodsInventory,
  WarehouseTransaction,
  Customer,
  Purchase,
  Sale,
  Expense,
  AuditLog,
  AppNotification,
  OrganizationMember,
  Subscription,
  SubscriptionPlan,
  BillingRecord,
  Invitation,
  ApprovalWorkflow,
  ProductionBudget,
  ChartOfAccount,
  JournalEntry,
} from '../types/database';

export interface OrgFullData {
  organization?: Organization;
  branches: Branch[];
  bottleTypes: BottleType[];
  rawMaterials: RawMaterial[];
  suppliers: Supplier[];
  machines: Machine[];
  finishedGoods: FinishedGoodsInventory[];
  productionBatches: ProductionBatch[];
  customers: Customer[];
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  transactions: WarehouseTransaction[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  productionBudgets: ProductionBudget[];
  chartOfAccounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  approvalWorkflows: ApprovalWorkflow[];
  billingRecords: BillingRecord[];
  invitations: Invitation[];
  members: OrganizationMember[];
}

export class SupabaseDataService {
  /**
   * Fetches all tenant data for a specific organization in parallel.
   */
  async fetchOrganizationData(orgId: string): Promise<{ success: boolean; data?: OrgFullData; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      const [
        orgRes,
        branchesRes,
        bottleTypesRes,
        rawMaterialsRes,
        suppliersRes,
        machinesRes,
        inventoryRes,
        customersRes,
        batchesRes,
        salesRes,
        purchasesRes,
        expensesRes,
        transactionsRes,
        auditLogsRes,
        notificationsRes,
        budgetsRes,
        chartOfAccountsRes,
        journalEntriesRes,
        approvalWorkflowsRes,
        billingRecordsRes,
        invitationsRes,
        membersRes,
      ] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', orgId).maybeSingle(),
        supabase.from('branches').select('*').eq('organization_id', orgId),
        supabase.from('bottle_types').select('*').eq('organization_id', orgId),
        supabase.from('raw_materials').select('*').eq('organization_id', orgId),
        supabase.from('suppliers').select('*').eq('organization_id', orgId),
        supabase.from('machines').select('*').eq('organization_id', orgId),
        supabase.from('inventory').select('*').eq('organization_id', orgId),
        supabase.from('customers').select('*').eq('organization_id', orgId),
        supabase.from('production_batches').select('*').eq('organization_id', orgId).order('date', { ascending: false }),
        supabase.from('sales').select('*').eq('organization_id', orgId).order('date', { ascending: false }),
        supabase.from('purchases').select('*').eq('organization_id', orgId).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('organization_id', orgId).order('date', { ascending: false }),
        supabase.from('warehouse_transactions').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').eq('organization_id', orgId).order('timestamp', { ascending: false }).limit(200),
        supabase.from('notifications').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
        supabase.from('production_budgets').select('*').eq('organization_id', orgId),
        supabase.from('chart_of_accounts').select('*').eq('organization_id', orgId),
        supabase.from('journal_entries').select('*').eq('organization_id', orgId).order('date', { ascending: false }),
        supabase.from('approval_workflows').select('*').eq('organization_id', orgId),
        supabase.from('billing_records').select('*').eq('organization_id', orgId),
        supabase.from('invitations').select('*').eq('organization_id', orgId),
        supabase.from('organization_members').select('*').eq('organization_id', orgId),
      ]);

      // Check if critical query failed
      if (orgRes.error && orgRes.error.code !== 'PGRST116') {
        console.warn('Error fetching organization record:', orgRes.error);
      }

      const fullData: OrgFullData = {
        organization: orgRes.data || undefined,
        branches: (branchesRes.data as Branch[]) || [],
        bottleTypes: (bottleTypesRes.data as BottleType[]) || [],
        rawMaterials: (rawMaterialsRes.data as RawMaterial[]) || [],
        suppliers: (suppliersRes.data as Supplier[]) || [],
        machines: (machinesRes.data as Machine[]) || [],
        finishedGoods: (inventoryRes.data as FinishedGoodsInventory[]) || [],
        productionBatches: (batchesRes.data as ProductionBatch[]) || [],
        customers: (customersRes.data as Customer[]) || [],
        sales: (salesRes.data as Sale[]) || [],
        purchases: (purchasesRes.data as Purchase[]) || [],
        expenses: (expensesRes.data as Expense[]) || [],
        transactions: (transactionsRes.data as WarehouseTransaction[]) || [],
        auditLogs: (auditLogsRes.data as AuditLog[]) || [],
        notifications: (notificationsRes.data as AppNotification[]) || [],
        productionBudgets: (budgetsRes.data as ProductionBudget[]) || [],
        chartOfAccounts: (chartOfAccountsRes.data as ChartOfAccount[]) || [],
        journalEntries: (journalEntriesRes.data as JournalEntry[]) || [],
        approvalWorkflows: (approvalWorkflowsRes.data as ApprovalWorkflow[]) || [],
        billingRecords: (billingRecordsRes.data as BillingRecord[]) || [],
        invitations: (invitationsRes.data as Invitation[]) || [],
        members: (membersRes.data as OrganizationMember[]) || [],
      };

      return { success: true, data: fullData };
    } catch (err: any) {
      console.error('Failed to load organization data from Supabase:', err);
      return { success: false, error: formatSupabaseError(err) };
    }
  }

  /**
   * Generic Insert into Supabase table
   */
  async insertRecord(tableName: string, record: any): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    try {
      const { data, error } = await supabase.from(tableName).insert(record).select().maybeSingle();
      if (error) {
        return { success: false, error: formatSupabaseError(error) };
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: formatSupabaseError(err) };
    }
  }

  /**
   * Generic Update in Supabase table
   */
  async updateRecord(tableName: string, id: string, updates: any): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    try {
      const { data, error } = await supabase.from(tableName).update(updates).eq('id', id).select().maybeSingle();
      if (error) {
        return { success: false, error: formatSupabaseError(error) };
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: formatSupabaseError(err) };
    }
  }

  /**
   * Generic Upsert in Supabase table
   */
  async upsertRecord(tableName: string, record: any): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    try {
      const { data, error } = await supabase.from(tableName).upsert(record).select().maybeSingle();
      if (error) {
        return { success: false, error: formatSupabaseError(error) };
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: formatSupabaseError(err) };
    }
  }

  /**
   * Generic Delete from Supabase table
   */
  async deleteRecord(tableName: string, id: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) {
        return { success: false, error: formatSupabaseError(error) };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: formatSupabaseError(err) };
    }
  }

  /**
   * Realtime Channel Subscription
   * Subscribes to changes for a given organization safely without duplicate callback errors or memory leaks
   */
  private activeSubscriptions = new Map<
    string,
    { channel: any; listeners: Set<(table: string, eventType: string, payload: any) => void> }
  >();

  subscribeToOrganization(
    orgId: string,
    onDataChange: (table: string, eventType: string, payload: any) => void
  ) {
    if (!isSupabaseConfigured || !orgId) return null;

    const channelName = `realtime-org-${orgId}`;
    let sub = this.activeSubscriptions.get(orgId);

    // If channel is already registered and active, simply add this listener to the existing channel
    if (sub) {
      sub.listeners.add(onDataChange);
      return () => {
        const current = this.activeSubscriptions.get(orgId);
        if (current) {
          current.listeners.delete(onDataChange);
          if (current.listeners.size === 0) {
            try {
              supabase.removeChannel(current.channel);
            } catch (err) {
              console.warn('Error removing channel:', err);
            }
            this.activeSubscriptions.delete(orgId);
          }
        }
      };
    }

    // Clean up any stale channels in the supabase client for this topic to avoid "cannot add callbacks after subscribe()"
    try {
      const existingChannels = supabase.getChannels();
      const duplicate = existingChannels.find(
        (c) => c.topic === `realtime:${channelName}` || (c as any).name === channelName
      );
      if (duplicate) {
        supabase.removeChannel(duplicate);
      }
    } catch {
      // ignore
    }

    const listeners = new Set<(table: string, eventType: string, payload: any) => void>();
    listeners.add(onDataChange);

    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', filter: `organization_id=eq.${orgId}` },
          (payload) => {
            listeners.forEach((listener) => {
              try {
                listener(payload.table, payload.eventType, payload);
              } catch (err) {
                console.error('Error in realtime listener:', err);
              }
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to realtime updates for organization: ${orgId}`);
          }
        });

      this.activeSubscriptions.set(orgId, { channel, listeners });

      return () => {
        const current = this.activeSubscriptions.get(orgId);
        if (current) {
          current.listeners.delete(onDataChange);
          if (current.listeners.size === 0) {
            try {
              supabase.removeChannel(current.channel);
            } catch (err) {
              console.warn('Error removing channel:', err);
            }
            this.activeSubscriptions.delete(orgId);
          }
        }
      };
    } catch (err) {
      console.warn('Failed to subscribe to realtime changes:', err);
      return null;
    }
  }
}

export const supabaseDataService = new SupabaseDataService();
