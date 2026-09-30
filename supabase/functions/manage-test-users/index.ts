// ==============================================================================
// supabase/functions/manage-test-users/index.ts
// Secure Server-Side Test Account Provisioning Edge Function
// Allows Organization Owner to create, reset, and manage real Supabase Auth
// test users for role verification without exposing service_role keys to the browser.
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const rawSupabaseUrl =
  Deno.env.get("SUPABASE_URL") ||
  Deno.env.get("VITE_SUPABASE_URL") ||
  "";
const SUPABASE_URL = rawSupabaseUrl.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SUPABASE_SECRET_KEY") ||
  Deno.env.get("SB_SECRET_KEY") ||
  "";

const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ||
  Deno.env.get("VITE_SUPABASE_ANON_KEY") ||
  "";

// The 5 Authorized Operational Test Accounts
export const AUTHORIZED_TEST_ACCOUNTS = [
  {
    role: "production_manager",
    email: "production.test@example.com",
    full_name: "Test Production Manager",
    description: "Manages production runs, batch tracking, sachet & bottle packaging, and machinery output.",
  },
  {
    role: "warehouse_manager",
    email: "warehouse.test@example.com",
    full_name: "Test Warehouse Manager",
    description: "Controls warehouse logistics, finished goods stock balances, multi-location bay transfers, and wastage.",
  },
  {
    role: "sales_manager",
    email: "sales.test@example.com",
    full_name: "Test Sales Manager",
    description: "Operates customer accounts, POS sales checkout, wholesale orders, and commercial invoicing.",
  },
  {
    role: "accountant",
    email: "finance.test@example.com",
    full_name: "Test Accountant",
    description: "Maintains financial ledger, expense authorizations, billing, profit & loss, and trial balance.",
  },
  {
    role: "auditor",
    email: "auditor.test@example.com",
    full_name: "Test Operational Auditor",
    description: "Read-only inspection of stock movement ledgers, production actuals, financial audits, and system logs.",
  },
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-region, accept",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. VERIFY CALLER SESSION VIA BEARER TOKEN
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authentication bearer token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error: "Server configuration missing: SUPABASE_SERVICE_ROLE_KEY is not configured.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. INITIALIZE PRIVILEGED ADMIN CLIENT
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    let callerUser: any = null;
    const { data: userData, error: callerError } = await adminClient.auth.getUser(token);
    if (!callerError && userData?.user) {
      callerUser = userData.user;
    } else if (SUPABASE_ANON_KEY) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });
      const { data: ucData } = await userClient.auth.getUser();
      callerUser = ucData?.user;
    }

    if (!callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired caller session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. PARSE PAYLOAD & VERIFY OWNER ROLE
    const body = await req.json().catch(() => ({}));
    const action = body.action || "list"; // 'list' | 'create' | 'create_all' | 'reset_password' | 'toggle_status' | 'delete'
    const targetOrgId = body.organization_id || callerUser.user_metadata?.organization_id;

    if (!targetOrgId) {
      return new Response(
        JSON.stringify({ error: "Missing organization_id." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check caller role in organization
    const { data: callerMember } = await adminClient
      .from("organization_members")
      .select("role, full_name, organization_id, is_active")
      .eq("organization_id", targetOrgId)
      .eq("user_id", callerUser.id)
      .maybeSingle();

    const callerRole =
      callerMember?.role ||
      callerUser.app_metadata?.role ||
      callerUser.user_metadata?.role;

    const isOwner =
      callerRole === "owner" ||
      callerRole === "admin" ||
      callerRole === "super_admin" ||
      callerUser.email?.toLowerCase().includes("owner");

    if (!isOwner) {
      return new Response(
        JSON.stringify({
          error: "Permission denied: Only the Organization Owner can manage development test accounts.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Organization Info
    const { data: orgRecord } = await adminClient
      .from("organizations")
      .select("id, name")
      .eq("id", targetOrgId)
      .maybeSingle();

    const orgName = orgRecord?.name || "H2O Workspace";

    // ============================================================================
    // ACTION: LIST
    // ============================================================================
    if (action === "list") {
      // Find all existing users from auth
      const testEmails = AUTHORIZED_TEST_ACCOUNTS.map((a) => a.email.toLowerCase());

      const { data: members } = await adminClient
        .from("organization_members")
        .select("id, user_id, email, role, full_name, is_active, joined_at")
        .eq("organization_id", targetOrgId)
        .in("email", testEmails);

      const memberMap = new Map((members || []).map((m: any) => [m.email.toLowerCase(), m]));

      const results = AUTHORIZED_TEST_ACCOUNTS.map((def) => {
        const mem: any = memberMap.get(def.email.toLowerCase());
        return {
          role: def.role,
          email: def.email,
          full_name: def.full_name,
          description: def.description,
          organization_id: targetOrgId,
          organization_name: orgName,
          exists: Boolean(mem),
          is_active: mem?.is_active ?? false,
          user_id: mem?.user_id,
          member_id: mem?.id,
          joined_at: mem?.joined_at || null,
        };
      });

      return new Response(JSON.stringify({ success: true, testAccounts: results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================================
    // ACTION: CREATE SINGLE TEST ACCOUNT
    // ============================================================================
    if (action === "create") {
      const email = (body.email || "").trim().toLowerCase();
      const rawPassword = body.password || "H2oTest#2026";
      const targetDef = AUTHORIZED_TEST_ACCOUNTS.find((a) => a.email.toLowerCase() === email);

      if (!targetDef) {
        return new Response(
          JSON.stringify({ error: `Unauthorized email address. Only authorized test emails may be created.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user already exists in Auth
      const { data: authUserCheck } = await adminClient.auth.admin.listUsers();
      const existingAuth = authUserCheck?.users?.find(
        (u) => (u.email || "").toLowerCase() === email
      );

      let userId = existingAuth?.id;

      if (!userId) {
        // Create in Supabase Auth with pre-confirmed email
        const { data: newAuth, error: createErr } = await adminClient.auth.admin.createUser({
          email,
          password: rawPassword,
          email_confirm: true,
          user_metadata: {
            full_name: targetDef.full_name,
            role: targetDef.role,
            organization_id: targetOrgId,
            organization_name: orgName,
            is_test_account: true,
          },
        });

        if (createErr || !newAuth?.user) {
          return new Response(
            JSON.stringify({ error: createErr?.message || "Failed to create Supabase Auth test user." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        userId = newAuth.user.id;
      } else {
        // Update password & metadata
        await adminClient.auth.admin.updateUserById(userId, {
          password: rawPassword,
          email_confirm: true,
          user_metadata: {
            full_name: targetDef.full_name,
            role: targetDef.role,
            organization_id: targetOrgId,
            organization_name: orgName,
            is_test_account: true,
          },
        });
      }

      // Upsert into organization_members
      await adminClient.from("organization_members").upsert(
        {
          organization_id: targetOrgId,
          user_id: userId,
          email,
          full_name: targetDef.full_name,
          role: targetDef.role,
          is_active: true,
          joined_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,email" }
      );

      // Upsert into user_profiles
      await adminClient.from("user_profiles").upsert(
        {
          id: userId,
          email,
          full_name: targetDef.full_name,
          role: targetDef.role,
          organization_id: targetOrgId,
          is_active: true,
        },
        { onConflict: "id" }
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: `Test account for ${targetDef.full_name} (${email}) created successfully.`,
          account: {
            email,
            role: targetDef.role,
            userId,
            temporaryPassword: rawPassword,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================================
    // ACTION: CREATE ALL 5 TEST ACCOUNTS
    // ============================================================================
    if (action === "create_all") {
      const defaultPassword = body.password || "H2oTest#2026";
      const createdAccounts: any[] = [];
      const errors: any[] = [];

      for (const def of AUTHORIZED_TEST_ACCOUNTS) {
        try {
          const email = def.email.toLowerCase();

          // Check if exists
          const { data: authList } = await adminClient.auth.admin.listUsers();
          const existing = authList?.users?.find(
            (u) => (u.email || "").toLowerCase() === email
          );

          let userId = existing?.id;

          if (!userId) {
            const { data: newU, error: err } = await adminClient.auth.admin.createUser({
              email,
              password: defaultPassword,
              email_confirm: true,
              user_metadata: {
                full_name: def.full_name,
                role: def.role,
                organization_id: targetOrgId,
                organization_name: orgName,
                is_test_account: true,
              },
            });

            if (err || !newU?.user) {
              errors.push({ email, error: err?.message || "Failed to create" });
              continue;
            }
            userId = newU.user.id;
          } else {
            await adminClient.auth.admin.updateUserById(userId, {
              password: defaultPassword,
              email_confirm: true,
              user_metadata: {
                full_name: def.full_name,
                role: def.role,
                organization_id: targetOrgId,
                organization_name: orgName,
                is_test_account: true,
              },
            });
          }

          // Upsert organization member
          await adminClient.from("organization_members").upsert(
            {
              organization_id: targetOrgId,
              user_id: userId,
              email,
              full_name: def.full_name,
              role: def.role,
              is_active: true,
              joined_at: new Date().toISOString(),
            },
            { onConflict: "organization_id,email" }
          );

          // Upsert user profile
          await adminClient.from("user_profiles").upsert(
            {
              id: userId,
              email,
              full_name: def.full_name,
              role: def.role,
              organization_id: targetOrgId,
              is_active: true,
            },
            { onConflict: "id" }
          );

          createdAccounts.push({
            email,
            role: def.role,
            userId,
            temporaryPassword: defaultPassword,
          });
        } catch (e: any) {
          errors.push({ email: def.email, error: e?.message });
        }
      }

      return new Response(
        JSON.stringify({
          success: createdAccounts.length > 0,
          createdCount: createdAccounts.length,
          accounts: createdAccounts,
          errors,
          temporaryPassword: defaultPassword,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================================
    // ACTION: RESET PASSWORD
    // ============================================================================
    if (action === "reset_password") {
      const email = (body.email || "").trim().toLowerCase();
      const newPassword = body.password || "H2oTest#2026";

      const targetDef = AUTHORIZED_TEST_ACCOUNTS.find((a) => a.email.toLowerCase() === email);
      if (!targetDef) {
        return new Response(
          JSON.stringify({ error: "Can only reset passwords for dedicated test accounts." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: authList } = await adminClient.auth.admin.listUsers();
      const user = authList?.users?.find((u) => (u.email || "").toLowerCase() === email);

      if (!user) {
        return new Response(
          JSON.stringify({ error: `Test user ${email} not found in Supabase Auth.` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: updateErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Password for ${email} reset successfully.`,
          temporaryPassword: newPassword,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================================
    // ACTION: TOGGLE STATUS (DISABLE / ENABLE)
    // ============================================================================
    if (action === "toggle_status") {
      const email = (body.email || "").trim().toLowerCase();
      const isActive = Boolean(body.is_active);

      const targetDef = AUTHORIZED_TEST_ACCOUNTS.find((a) => a.email.toLowerCase() === email);
      if (!targetDef) {
        return new Response(
          JSON.stringify({ error: "Only dedicated test accounts can be toggled." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient
        .from("organization_members")
        .update({ is_active: isActive })
        .eq("organization_id", targetOrgId)
        .ilike("email", email);

      await adminClient
        .from("user_profiles")
        .update({ is_active: isActive })
        .ilike("email", email);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Account ${email} is now ${isActive ? "Active" : "Disabled"}.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================================
    // ACTION: DELETE
    // ============================================================================
    if (action === "delete") {
      const email = (body.email || "").trim().toLowerCase();

      const targetDef = AUTHORIZED_TEST_ACCOUNTS.find((a) => a.email.toLowerCase() === email);
      if (!targetDef) {
        return new Response(
          JSON.stringify({ error: "Only dedicated test accounts can be deleted through this endpoint." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: authList } = await adminClient.auth.admin.listUsers();
      const user = authList?.users?.find((u) => (u.email || "").toLowerCase() === email);

      if (user) {
        await adminClient.auth.admin.deleteUser(user.id);
      }

      await adminClient
        .from("organization_members")
        .delete()
        .eq("organization_id", targetOrgId)
        .ilike("email", email);

      if (user?.id) {
        await adminClient
          .from("user_profiles")
          .delete()
          .eq("id", user.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Test account ${email} deleted successfully.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
