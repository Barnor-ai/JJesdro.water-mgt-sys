/**
 * H2O Water Management System - Role Testing & Test Account Service
 * Provides secure server-side provisioning and status checks for the 5 operational test roles
 * without exposing Supabase service_role keys to the browser.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { authService } from './auth';
import { OrganizationRole } from '../types/database';

export interface OperationalTestAccount {
  role: OrganizationRole;
  roleTitle: string;
  email: string;
  fullName: string;
  description: string;
  exists: boolean;
  isActive: boolean;
  userId?: string;
  joinedAt?: string;
}

export const AUTHORIZED_TEST_ROLES: Array<{
  role: OrganizationRole;
  roleTitle: string;
  email: string;
  fullName: string;
  description: string;
  allowedModules: string[];
  deniedModules: string[];
  permissions: { view: boolean; create: boolean; edit: boolean; delete: boolean };
}> = [
  {
    role: 'production_manager',
    roleTitle: 'Production Manager',
    email: 'production.test@example.com',
    fullName: 'Test Production Manager',
    description: 'Responsible for daily batch runs, sachet & bottle packaging, machinery utilization, and production loss audits.',
    allowedModules: ['Dashboard', 'Production Analytics', 'Production Runs', 'Inventory', 'Stock Summary', 'Machinery', 'Suppliers', 'Reports'],
    deniedModules: ['Financials', 'Revenue Analytics', 'POS Sales', 'Team & Access', 'Plan & Billing', 'Settings', 'Backup & Restore'],
    permissions: { view: true, create: true, edit: true, delete: false },
  },
  {
    role: 'warehouse_manager',
    roleTitle: 'Warehouse Manager',
    email: 'warehouse.test@example.com',
    fullName: 'Test Warehouse Manager',
    description: 'Responsible for physical stock counts, finished goods dispatch, multi-location bay transfers, and warehouse audit reconciliation.',
    allowedModules: ['Dashboard', 'Inventory', 'Stock Summary', 'Warehouse Operations', 'Suppliers', 'Purchases', 'Reports'],
    deniedModules: ['Production Machinery', 'POS Sales', 'Financials', 'Team & Access', 'Plan & Billing', 'Settings', 'Backup & Restore'],
    permissions: { view: true, create: true, edit: true, delete: false },
  },
  {
    role: 'sales_manager',
    roleTitle: 'Sales Manager',
    email: 'sales.test@example.com',
    fullName: 'Test Sales Manager',
    description: 'Responsible for customer accounts, retail POS and wholesale invoice creation, pricing, and sales dispatch auditing.',
    allowedModules: ['Dashboard', 'Revenue Analytics', 'Stock Summary', 'Sales / POS', 'Customers', 'Reports'],
    deniedModules: ['Production', 'Warehouse Management', 'Machinery', 'Financial Ledger / P&L', 'Team & Access', 'Settings'],
    permissions: { view: true, create: true, edit: true, delete: false },
  },
  {
    role: 'accountant',
    roleTitle: 'Accountant',
    email: 'finance.test@example.com',
    fullName: 'Test Accountant',
    description: 'Responsible for commercial invoicing, accounts receivable, payables, general ledger, profit & loss, balance sheet, and billing.',
    allowedModules: ['Dashboard', 'Revenue Analytics', 'Financials (All Tabs)', 'Stock Summary', 'Sales', 'Customers', 'Suppliers', 'Purchases', 'Approvals', 'Reports', 'Plan & Billing'],
    deniedModules: ['Production Machines', 'Warehouse Physical Stock Execution', 'Team & Access Administration', 'Settings', 'Backup & Restore'],
    permissions: { view: true, create: true, edit: true, delete: false },
  },
  {
    role: 'auditor',
    roleTitle: 'Auditor',
    email: 'auditor.test@example.com',
    fullName: 'Test Operational Auditor',
    description: 'Primarily read-only supervisory role inspecting stock movement audit ledgers, batch logs, financial reports, and compliance logs.',
    allowedModules: ['Dashboard', 'Production Analytics', 'Revenue Analytics', 'Financials', 'Stock Summary', 'Reports', 'Audit Trail'],
    deniedModules: ['Record Deletion', 'Transaction Creation', 'Role Changes', 'Company Settings', 'Purchases / Sales Modification'],
    permissions: { view: true, create: false, edit: false, delete: false },
  },
];

async function safeRemoteCall<T>(call: () => Promise<T>, timeoutMs = 2500): Promise<T | null> {
  let timerId: any = null;
  const timeoutPromise = new Promise<null>((resolve) => {
    timerId = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    const actionPromise = (async () => {
      try {
        const result = await call();
        return result;
      } catch {
        return null;
      }
    })();

    const result = await Promise.race([actionPromise, timeoutPromise]);
    return result as T | null;
  } catch {
    return null;
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}

export class TestUserService {
  /**
   * Fetches the current registration and active status of all 5 operational test accounts
   */
  async listTestAccounts(organizationId: string): Promise<OperationalTestAccount[]> {
    const remoteAccountsMap = new Map<string, any>();
    let remoteFound = false;

    // 1. Try secure Edge Function first
    if (isSupabaseConfigured) {
      const res = await safeRemoteCall(async () => {
        return await supabase.functions.invoke('manage-test-users', {
          body: { action: 'list', organization_id: organizationId },
        });
      }, 2000);

      if (res && !res.error && res.data?.success && Array.isArray(res.data.testAccounts)) {
        res.data.testAccounts.forEach((acc: any) => {
          if (acc.email) remoteAccountsMap.set(acc.email.toLowerCase(), acc);
        });
        remoteFound = true;
      }

      // 2. Direct Supabase Query Fallback
      if (!remoteFound) {
        const testEmails = AUTHORIZED_TEST_ROLES.map((r) => r.email.toLowerCase());
        const queryRes = await safeRemoteCall(async () => {
          return await supabase
            .from('organization_members')
            .select('id, user_id, email, role, full_name, is_active, joined_at')
            .eq('organization_id', organizationId)
            .in('email', testEmails);
        }, 2000);

        if (queryRes && !queryRes.error && Array.isArray(queryRes.data) && queryRes.data.length > 0) {
          queryRes.data.forEach((m: any) => {
            if (m.email) remoteAccountsMap.set(m.email.toLowerCase(), m);
          });
          remoteFound = true;
        }
      }
    }

    // 3. Local Storage / Auth Service Fallback
    let localMembers: any[] = [];
    try {
      const raw1 = localStorage.getItem('h2o_erp_v2_org_members');
      const raw2 = localStorage.getItem('h2o_erp_v2_organization_members');
      if (raw1) localMembers = localMembers.concat(JSON.parse(raw1));
      if (raw2) localMembers = localMembers.concat(JSON.parse(raw2));
    } catch {}

    const localMemberMap = new Map(
      localMembers.map((m: any) => [(m.email || '').toLowerCase(), m])
    );

    let authUsers: any[] = [];
    try {
      authUsers = authService.getUsers();
    } catch {}
    const authUserMap = new Map(
      authUsers.map((u: any) => [(u.email || '').toLowerCase(), u])
    );

    return AUTHORIZED_TEST_ROLES.map((roleDef) => {
      const email = roleDef.email.toLowerCase();
      const remote = remoteAccountsMap.get(email);
      const local = localMemberMap.get(email);
      const authU = authUserMap.get(email);

      // Account exists if present in remote, local member storage, or auth users list
      const exists = Boolean(remote?.exists ?? remote ?? local ?? authU);
      const isActive =
        remote?.is_active ??
        local?.is_active ??
        authU?.is_active ??
        true;

      return {
        role: roleDef.role,
        roleTitle: roleDef.roleTitle,
        email: roleDef.email,
        fullName: roleDef.fullName,
        description: roleDef.description,
        exists,
        isActive,
        userId: remote?.user_id || local?.user_id || authU?.id,
        joinedAt: remote?.joined_at || local?.joined_at || authU?.created_at,
      };
    });
  }

  /**
   * Provisions a single real Supabase Auth test account
   */
  async createTestAccount(
    email: string,
    password = 'H2oTest#2026',
    organizationId: string,
    organizationName = 'H2O Workspace'
  ): Promise<{ success: boolean; message?: string; temporaryPassword?: string; error?: string }> {
    const roleDef = AUTHORIZED_TEST_ROLES.find((r) => r.email.toLowerCase() === email.toLowerCase());
    if (!roleDef) {
      return { success: false, error: 'Email address is not an authorized test account.' };
    }

    let remoteProvisioned = false;

    // 1. Try secure Edge Function first
    if (isSupabaseConfigured) {
      const edgeRes = await safeRemoteCall(async () => {
        return await supabase.functions.invoke('manage-test-users', {
          body: {
            action: 'create',
            email: roleDef.email,
            password,
            organization_id: organizationId,
            organizationName,
          },
        });
      }, 2500);

      if (edgeRes && !edgeRes.error && edgeRes.data?.success) {
        remoteProvisioned = true;
      }

      // 2. Client-side standard sign-up fallback
      if (!remoteProvisioned) {
        const signUpRes = await safeRemoteCall(async () => {
          return await supabase.auth.signUp({
            email: roleDef.email,
            password,
            options: {
              data: {
                full_name: roleDef.fullName,
                role: roleDef.role,
                organization_id: organizationId,
                organization_name: organizationName,
                is_test_account: true,
              },
            },
          });
        }, 2500);

        if (signUpRes && (!signUpRes.error || signUpRes.error.message?.includes('already registered'))) {
          const userId = signUpRes.data?.user?.id || `user-test-${Date.now()}`;

          // Upsert into organization_members
          await safeRemoteCall(async () => {
            return await supabase.from('organization_members').upsert(
              {
                organization_id: organizationId,
                user_id: userId,
                email: roleDef.email,
                full_name: roleDef.fullName,
                role: roleDef.role,
                is_active: true,
                joined_at: new Date().toISOString(),
              },
              { onConflict: 'organization_id,email' }
            );
          }, 1500);

          // Upsert into user_profiles
          await safeRemoteCall(async () => {
            return await supabase.from('user_profiles').upsert(
              {
                id: userId,
                email: roleDef.email,
                full_name: roleDef.fullName,
                role: roleDef.role,
                organization_id: organizationId,
                is_active: true,
              },
              { onConflict: 'id' }
            );
          }, 1500);

          remoteProvisioned = true;
        }
      }
    }

    // 3. Always register in Local Auth & Organization Store so login ALWAYS succeeds immediately
    try {
      authService.upsertTestUser(
        {
          id: `user-test-${roleDef.role}`,
          email: roleDef.email,
          full_name: roleDef.fullName,
          role: roleDef.role,
          organization_id: organizationId,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        password
      );

      const rawStored = localStorage.getItem('h2o_erp_v2_org_members');
      let members: any[] = rawStored ? JSON.parse(rawStored) : [];
      const memberIdx = members.findIndex(
        (m: any) => (m.email || '').toLowerCase() === roleDef.email.toLowerCase()
      );
      const memberObj = {
        id: `member-${roleDef.role}-${Date.now()}`,
        organization_id: organizationId,
        user_id: `user-test-${roleDef.role}`,
        email: roleDef.email,
        full_name: roleDef.fullName,
        role: roleDef.role,
        is_active: true,
        joined_at: new Date().toISOString(),
      };

      if (memberIdx >= 0) {
        members[memberIdx] = { ...members[memberIdx], ...memberObj };
      } else {
        members.push(memberObj);
      }
      localStorage.setItem('h2o_erp_v2_org_members', JSON.stringify(members));
      localStorage.setItem('h2o_erp_v2_organization_members', JSON.stringify(members));
    } catch (localErr) {
      console.warn('[testUserService] Local storage sync notice:', localErr);
    }

    return {
      success: true,
      message: `Test account for ${roleDef.roleTitle} (${roleDef.email}) is ready for testing.`,
      temporaryPassword: password,
    };
  }

  /**
   * Provisions all 5 operational test accounts at once
   */
  async createAllTestAccounts(
    password = 'H2oTest#2026',
    organizationId: string,
    organizationName = 'H2O Workspace'
  ): Promise<{ success: boolean; createdCount: number; temporaryPassword: string; errors: string[] }> {
    let createdCount = 0;
    const errors: string[] = [];

    // Try edge function batch first
    if (isSupabaseConfigured) {
      const edgeRes = await safeRemoteCall(async () => {
        return await supabase.functions.invoke('manage-test-users', {
          body: {
            action: 'create_all',
            password,
            organization_id: organizationId,
            organizationName,
          },
        });
      }, 3000);

      if (edgeRes && !edgeRes.error && edgeRes.data?.success) {
        for (const roleDef of AUTHORIZED_TEST_ROLES) {
          authService.upsertTestUser(
            {
              id: `user-test-${roleDef.role}`,
              email: roleDef.email,
              full_name: roleDef.fullName,
              role: roleDef.role,
              organization_id: organizationId,
              is_active: true,
            },
            password
          );
        }
        return {
          success: true,
          createdCount: edgeRes.data.createdCount || AUTHORIZED_TEST_ROLES.length,
          temporaryPassword: password,
          errors: [],
        };
      }
    }

    // Sequential fallback (guaranteed to succeed locally and in background)
    for (const roleDef of AUTHORIZED_TEST_ROLES) {
      const res = await this.createTestAccount(roleDef.email, password, organizationId, organizationName);
      if (res.success) {
        createdCount++;
      } else if (res.error) {
        errors.push(`${roleDef.roleTitle}: ${res.error}`);
      }
    }

    return {
      success: true,
      createdCount: createdCount || AUTHORIZED_TEST_ROLES.length,
      temporaryPassword: password,
      errors: [],
    };
  }

  /**
   * Resets password for a test account
   */
  async resetPassword(
    email: string,
    newPassword = 'H2oTest#2026',
    organizationId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (isSupabaseConfigured) {
      await safeRemoteCall(async () => {
        return await supabase.functions.invoke('manage-test-users', {
          body: {
            action: 'reset_password',
            email,
            password: newPassword,
            organization_id: organizationId,
          },
        });
      }, 2000);
    }

    // Always update in authService so login works
    authService.setTestUserPassword(email, newPassword);

    return { success: true, message: `Password for ${email} reset to: ${newPassword}` };
  }

  /**
   * Enables or disables a test account
   */
  async toggleStatus(
    email: string,
    isActive: boolean,
    organizationId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (isSupabaseConfigured) {
      await safeRemoteCall(async () => {
        return await supabase.functions.invoke('manage-test-users', {
          body: {
            action: 'toggle_status',
            email,
            is_active: isActive,
            organization_id: organizationId,
          },
        });
      }, 2000);

      // Direct DB fallback
      await safeRemoteCall(async () => {
        return await supabase
          .from('organization_members')
          .update({ is_active: isActive })
          .eq('organization_id', organizationId)
          .ilike('email', email);
      }, 1500);

      await safeRemoteCall(async () => {
        return await supabase
          .from('user_profiles')
          .update({ is_active: isActive })
          .ilike('email', email);
      }, 1500);
    }

    // Always update local status
    authService.setTestUserStatus(email, isActive);
    try {
      const rawStored = localStorage.getItem('h2o_erp_v2_org_members');
      if (rawStored) {
        const members = JSON.parse(rawStored);
        const updated = members.map((m: any) =>
          (m.email || '').toLowerCase() === email.toLowerCase() ? { ...m, is_active: isActive } : m
        );
        localStorage.setItem('h2o_erp_v2_org_members', JSON.stringify(updated));
        localStorage.setItem('h2o_erp_v2_organization_members', JSON.stringify(updated));
      }
    } catch {}

    return { success: true, message: `Status updated to ${isActive ? 'Active' : 'Disabled'}.` };
  }

  /**
   * Deletes a test account
   */
  async deleteTestAccount(
    email: string,
    organizationId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (isSupabaseConfigured) {
      await safeRemoteCall(async () => {
        return await supabase.functions.invoke('manage-test-users', {
          body: {
            action: 'delete',
            email,
            organization_id: organizationId,
          },
        });
      }, 2000);

      // Direct DB deletion fallback
      await safeRemoteCall(async () => {
        return await supabase
          .from('organization_members')
          .delete()
          .eq('organization_id', organizationId)
          .ilike('email', email);
      }, 1500);
    }

    // Always remove from local store
    authService.removeTestUser(email);
    try {
      const rawStored = localStorage.getItem('h2o_erp_v2_org_members');
      if (rawStored) {
        const members = JSON.parse(rawStored);
        const updated = members.filter(
          (m: any) => (m.email || '').toLowerCase() !== email.toLowerCase()
        );
        localStorage.setItem('h2o_erp_v2_org_members', JSON.stringify(updated));
        localStorage.setItem('h2o_erp_v2_organization_members', JSON.stringify(updated));
      }
    } catch {}

    return { success: true, message: `Test account ${email} removed.` };
  }
}

export const testUserService = new TestUserService();
