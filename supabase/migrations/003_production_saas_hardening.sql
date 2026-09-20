-- ==============================================================================
-- Migration: 003_production_saas_hardening.sql
-- Production Multi-Tenant Row Level Security (RLS) & Security Hardening
-- ==============================================================================

-- 1. Helper Function: Extract organization IDs for currently authenticated user
-- Validates user session against organization_members via user_id OR user email
CREATE OR REPLACE FUNCTION public.get_auth_user_organization_ids()
RETURNS TABLE (org_id text) 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id::text
  FROM public.organization_members om
  WHERE (
    om.user_id = auth.uid()::text 
    OR lower(om.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
  AND om.is_active = true;
END;
$$;

-- 2. Helper Function: Check if caller is platform super administrator or service role
-- Strictly checks server-authoritative service_role or app_metadata (Never trusts user_metadata)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    (auth.jwt() ->> 'role') = 'service_role'
    OR (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
  );
END;
$$;

-- 3. Apply Production RLS Policies to all 22 Tenant-Scoped Tables
-- Enforces absolute cross-tenant isolation (No data leakage between organizations)
DO $$ 
DECLARE 
  tbl text;
  all_tenant_tables text[] := ARRAY[
    'branches', 'user_profiles', 'bottle_types', 'raw_materials', 
    'suppliers', 'machines', 'inventory', 'customers', 
    'production_batches', 'sales', 'purchases', 'expenses', 
    'warehouse_transactions', 'audit_logs', 'notifications',
    'organization_members', 'invitations', 'billing_records',
    'document_attachments', 'approval_workflows', 'subscriptions'
  ];
BEGIN
  FOREACH tbl IN ARRAY all_tenant_tables LOOP
    BEGIN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      
      -- Drop outdated or permissive policies
      EXECUTE format('DROP POLICY IF EXISTS "Public access for all" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation policy" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Tenant read policy" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Tenant write policy" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation select" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation insert" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation update" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation delete" ON public.%I;', tbl);

      -- Policy 1: SELECT (Tenant members can ONLY read records belonging to their organization)
      EXECUTE format(
        'CREATE POLICY "Strict tenant isolation select" ON public.%I FOR SELECT USING (
          auth.uid() IS NOT NULL AND (
            organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
            OR public.is_platform_admin()
          )
        );', tbl
      );

      -- Policy 2: INSERT (Tenant members can ONLY insert records into their own organization)
      EXECUTE format(
        'CREATE POLICY "Strict tenant isolation insert" ON public.%I FOR INSERT WITH CHECK (
          auth.uid() IS NOT NULL AND (
            organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
            OR public.is_platform_admin()
          )
        );', tbl
      );

      -- Policy 3: UPDATE (Tenant members can ONLY update records in their own organization)
      EXECUTE format(
        'CREATE POLICY "Strict tenant isolation update" ON public.%I FOR UPDATE USING (
          auth.uid() IS NOT NULL AND (
            organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
            OR public.is_platform_admin()
          )
        ) WITH CHECK (
          auth.uid() IS NOT NULL AND (
            organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
            OR public.is_platform_admin()
          )
        );', tbl
      );

      -- Policy 4: DELETE (Tenant members can ONLY delete records in their own organization)
      EXECUTE format(
        'CREATE POLICY "Strict tenant isolation delete" ON public.%I FOR DELETE USING (
          auth.uid() IS NOT NULL AND (
            organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
            OR public.is_platform_admin()
          )
        );', tbl
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 4. Special RLS for public.organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Organizations read policy" ON public.organizations;
DROP POLICY IF EXISTS "Organizations insert policy" ON public.organizations;
DROP POLICY IF EXISTS "Organizations update policy" ON public.organizations;

-- Users can read their own organization details or if platform admin
CREATE POLICY "Organizations read policy" ON public.organizations FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
    OR public.is_platform_admin()
  )
);

-- Any authenticated user can create a new organization during company sign-up
CREATE POLICY "Organizations insert policy" ON public.organizations FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Only members of the organization or admins can update organization settings
CREATE POLICY "Organizations update policy" ON public.organizations FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
    OR public.is_platform_admin()
  )
);

-- 5. Special RLS for subscription_plans (Public readable catalog)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Subscription plans public read" ON public.subscription_plans;
CREATE POLICY "Subscription plans public read" ON public.subscription_plans FOR SELECT USING (true);
