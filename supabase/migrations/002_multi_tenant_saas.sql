-- ==============================================================================
-- Migration: 002_multi_tenant_saas.sql
-- Upgrades H2O Management System into a Commercial Multi-Tenant SaaS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  max_users INTEGER NOT NULL DEFAULT 3,
  max_branches INTEGER NOT NULL DEFAULT 1,
  max_warehouses INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Default Subscription Plans (Starter $29, Professional $79, Business $199)
INSERT INTO public.subscription_plans (id, name, price_monthly, currency, max_users, max_branches, max_warehouses, features)
VALUES 
  (
    'starter', 
    'Starter', 
    29.00, 
    'USD', 
    3, 
    1, 
    1, 
    '["Up to 3 Users", "1 Plant Branch", "1 Central Warehouse", "Production & Inventory Tracking", "Sales & Invoicing", "Customer & Supplier Directory", "Basic Expense Tracking", "Executive Dashboard", "Standard Reports"]'::jsonb
  ),
  (
    'professional', 
    'Professional', 
    79.00, 
    'USD', 
    10, 
    3, 
    5, 
    '["Up to 10 Users", "Up to 3 Branches", "Up to 5 Warehouses", "Everything in Starter", "Advanced Expenses & Approvals", "AI Business Insights Assistant", "Customer Credit & Overdue Alerts", "Multi-Warehouse Transfers", "Audit Trail Logs", "Year-over-Year Reports"]'::jsonb
  ),
  (
    'business', 
    'Business', 
    199.00, 
    'USD', 
    999999, 
    999999, 
    999999, 
    '["Unlimited Users", "Unlimited Branches", "Unlimited Warehouses", "Everything in Professional", "AI Demand Forecasting", "Advanced Warehouse & Barcodes", "API Access & Webhooks", "Dedicated Platform SLA", "Custom Document Storage"]'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  max_users = EXCLUDED.max_users,
  max_branches = EXCLUDED.max_branches,
  max_warehouses = EXCLUDED.max_warehouses,
  features = EXCLUDED.features;

-- 2. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY DEFAULT ('org-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  name TEXT NOT NULL,
  trading_name TEXT,
  registration_number TEXT,
  tax_id TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'Ghana',
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'GHS',
  financial_year_start TEXT DEFAULT 'January',
  timezone TEXT DEFAULT 'Africa/Accra',
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id) DEFAULT 'professional',
  status TEXT NOT NULL DEFAULT 'trial', -- 'trial', 'active', 'suspended', 'canceled'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Default Demo Organization
INSERT INTO public.organizations (id, name, trading_name, registration_number, tax_id, email, phone, address, city, country, currency, plan_id, status)
VALUES (
  'org-default',
  'AquaFlow Water Industries Ltd',
  'AquaFlow Pure Spring',
  'CS-GH-2024-99812',
  'TIN-P002341991',
  'operations@aquaflow.com',
  '+233 24 000 1122',
  'Spintex Industrial Area Plot 14',
  'Accra',
  'Ghana',
  'GHS',
  'professional',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- 3. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY DEFAULT ('sub-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trialing', -- 'trialing', 'active', 'past_due', 'canceled'
  amount NUMERIC(10,2) NOT NULL DEFAULT 79.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  trial_end TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  cancel_at_period_end BOOLEAN DEFAULT false,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.subscriptions (id, organization_id, plan_id, status, amount, currency, current_period_start, current_period_end, trial_end)
VALUES (
  'sub-default',
  'org-default',
  'professional',
  'active',
  79.00,
  'USD',
  now(),
  now() + interval '30 days',
  now() + interval '14 days'
) ON CONFLICT (id) DO NOTHING;

-- 4. Organization Members Table (Mapping users to organizations & 10 roles)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id TEXT PRIMARY KEY DEFAULT ('mem-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'production_officer', 
  -- Allowed roles: 'owner', 'admin', 'production_manager', 'warehouse_manager', 'sales_manager', 'accountant', 'sales_officer', 'warehouse_officer', 'production_officer', 'viewer'
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- Index for speedy lookups
CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON public.organization_members (organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON public.organization_members (lower(email));

-- 5. Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
  id TEXT PRIMARY KEY DEFAULT ('inv-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL,
  invited_by_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'revoked'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations (token);

-- 6. Billing Records Table (Paystack / Stripe ready)
CREATE TABLE IF NOT EXISTS public.billing_records (
  id TEXT PRIMARY KEY DEFAULT ('bill-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'paid', -- 'paid', 'pending', 'failed'
  payment_method TEXT DEFAULT 'Card',
  reference TEXT NOT NULL,
  description TEXT,
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Document Attachments Table
CREATE TABLE IF NOT EXISTS public.document_attachments (
  id TEXT PRIMARY KEY DEFAULT ('doc-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'expense', 'purchase', 'supplier', 'customer', 'invoice', 'production'
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Approval Workflows Table
CREATE TABLE IF NOT EXISTS public.approval_workflows (
  id TEXT PRIMARY KEY DEFAULT ('appr-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'Purchase Approval', 'Expense Approval', 'Stock Adjustment', 'Credit Sale', 'Sales Return'
  record_id TEXT NOT NULL,
  reference_title TEXT NOT NULL,
  amount NUMERIC(10,2),
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

-- 9. Add organization_id column to ALL existing tables with safe default
DO $$ 
DECLARE 
  tbl text;
  target_tables text[] := ARRAY[
    'branches', 'user_profiles', 'bottle_types', 'raw_materials', 
    'suppliers', 'machines', 'inventory', 'customers', 
    'production_batches', 'sales', 'purchases', 'expenses', 
    'warehouse_transactions', 'audit_logs', 'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT ''org-default'';', tbl);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_org_id ON public.%I (organization_id);', tbl, tbl);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 10. Helper Function: Get organization IDs for current authenticated user
CREATE OR REPLACE FUNCTION public.get_auth_user_organization_ids()
RETURNS TABLE (org_id text) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id::text
  FROM public.organization_members om
  WHERE (om.user_id = auth.uid()::text OR lower(om.email) = lower(auth.jwt() ->> 'email'))
    AND om.is_active = true;
END;
$$;

-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict multi-tenant data isolation:
-- 1. Tenants only see, insert, update and delete data for their own organization
-- 2. Platform super admins (service role or super admin flag) can manage the system

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
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      
      -- Drop previous public or conflicting policies
      EXECUTE format('DROP POLICY IF EXISTS "Public access for all" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation policy" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Tenant read policy" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Tenant write policy" ON public.%I;', tbl);
      
      -- Tenant isolation policy:
      -- Rows where organization_id matches user's active membership, or platform service role
      EXECUTE format(
        'CREATE POLICY "Tenant isolation policy" ON public.%I FOR ALL USING (
          auth.uid() IS NOT NULL AND (
            organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
            OR (auth.jwt() ->> ''role'') = ''service_role''
          )
        ) WITH CHECK (
          auth.uid() IS NOT NULL AND (
            organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
            OR (auth.jwt() ->> ''role'') = ''service_role''
          )
        );', tbl
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- Enable Realtime for multi-tenant updates
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.organizations,
      public.organization_members,
      public.subscriptions,
      public.approval_workflows;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;
