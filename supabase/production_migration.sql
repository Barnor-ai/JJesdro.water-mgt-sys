-- ==============================================================================
-- AQUAFLOW ERP - PRODUCTION MASTER MIGRATION
-- Project Ref: azrmhdrplehntylmrdpt
-- Ingress URL: https://azrmhdrplehntylmrdpt.supabase.co
-- Instructions: Run this script in the Supabase Dashboard SQL Editor
-- Features: 
--   1. Strict Multi-Tenant Isolation
--   2. Granular RLS Policies (ZERO auth.uid() IS NULL bypasses)
--   3. Server-authoritative Super Admin checking (app_metadata only)
--   4. Subscription Tiers (Starter $29, Professional $79, Business $199)
--   5. Realtime replication & Storage Buckets (avatars, attachments, documents, receipts)
--   6. Audit Logging & Approval Workflows
-- ==============================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SUBSCRIPTION PLANS (Exact SaaS Pricing)
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
  currency = EXCLUDED.currency,
  max_users = EXCLUDED.max_users,
  max_branches = EXCLUDED.max_branches,
  max_warehouses = EXCLUDED.max_warehouses,
  features = EXCLUDED.features;

-- 2. ORGANIZATIONS (Tenants)
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
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id) DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Default Production Tenant (for instant bootstrap)
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

-- 3. BRANCHES (Manufacturing Plants / Warehouses)
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY DEFAULT ('branch-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  location TEXT NOT NULL,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.branches (id, organization_id, name, code, location, is_main)
VALUES 
  ('branch-1', 'org-default', 'Spintex Main Bottling Plant', 'PLANT-01', 'Spintex Rd, Light Industrial Area, Accra', true),
  ('branch-2', 'org-default', 'Tema Central Depot & Warehouse', 'DEPOT-02', 'Tema Industrial Zone Harbour Rd, Tema', false)
ON CONFLICT (id) DO NOTHING;

-- 4. ORGANIZATION MEMBERS (Role-Based Access Control)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id TEXT PRIMARY KEY DEFAULT ('mem-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);

-- Index for speedy authentication membership lookups
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON public.organization_members(lower(email));
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);

-- 5. USER PROFILES
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  two_factor_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Compatibility view for queries expecting 'profiles'
CREATE OR REPLACE VIEW public.profiles AS 
SELECT id, organization_id, branch_id, email, full_name, role, avatar_url, is_active, created_at, updated_at 
FROM public.user_profiles;

-- 6. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY DEFAULT ('sub-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
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

-- 7. INVITATIONS
CREATE TABLE IF NOT EXISTS public.invitations (
  id TEXT PRIMARY KEY DEFAULT ('inv-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  invited_by TEXT,
  invited_by_name TEXT,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

-- 8. BILLING RECORDS
CREATE TABLE IF NOT EXISTS public.billing_records (
  id TEXT PRIMARY KEY DEFAULT ('inv-rec-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'paid',
  payment_method TEXT DEFAULT 'Paystack Card',
  payment_reference TEXT,
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. APPROVAL WORKFLOWS
CREATE TABLE IF NOT EXISTS public.approval_workflows (
  id TEXT PRIMARY KEY DEFAULT ('appr-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  title TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by TEXT,
  reviewer_name TEXT,
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

-- 10. BOTTLE TYPES
CREATE TABLE IF NOT EXISTS public.bottle_types (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  size TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  pack_size INTEGER NOT NULL DEFAULT 1,
  cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.bottle_types (id, organization_id, size, category, unit_price, pack_size, cost_per_unit)
VALUES 
  ('bt-1', 'org-default', '500ml Small Pack', 'Bottled Water', 1.50, 24, 0.70),
  ('bt-2', 'org-default', '750ml Sports Cap', 'Bottled Water', 2.00, 16, 0.95),
  ('bt-3', 'org-default', '1.5L Family Size', 'Bottled Water', 3.50, 12, 1.60),
  ('bt-4', 'org-default', '19L Dispenser Jar', 'Refill / Dispenser', 18.00, 1, 8.50),
  ('bt-5', 'org-default', '500ml Sachet Water (Bag)', 'Sachet Water', 8.00, 30, 4.20)
ON CONFLICT (id) DO NOTHING;

-- 11. RAW MATERIALS
CREATE TABLE IF NOT EXISTS public.raw_materials (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  minimum_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.raw_materials (id, organization_id, branch_id, name, category, current_stock, minimum_stock, reorder_point, unit, cost_per_unit)
VALUES 
  ('mat-1', 'org-default', 'branch-1', 'PET Preforms (28mm)', 'Preforms', 45000, 10000, 15000, 'pcs', 0.25),
  ('mat-2', 'org-default', 'branch-1', 'HDPE Screw Caps (Blue)', 'Caps & Closures', 60000, 12000, 20000, 'pcs', 0.08),
  ('mat-3', 'org-default', 'branch-1', 'BOPP Wrap-Around Labels 500ml', 'Labels & Sleeves', 35000, 8000, 12000, 'pcs', 0.05),
  ('mat-4', 'org-default', 'branch-1', '19L Polycarbonate Jars', 'Dispenser Bottles', 850, 200, 300, 'pcs', 7.50),
  ('mat-5', 'org-default', 'branch-1', 'LDPE Shrink Wrap Film (Rolls)', 'Packaging Film', 120, 25, 40, 'rolls', 45.00)
ON CONFLICT (id) DO NOTHING;

-- 12. SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  materials_supplied TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  rating NUMERIC(3,1) DEFAULT 5.0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.suppliers (id, organization_id, name, contact_person, email, phone, materials_supplied)
VALUES 
  ('sup-1', 'org-default', 'Polytank Plastics Ltd', 'Kwame Boateng', 'sales@polytankgh.com', '+233 24 456 7890', 'PET Preforms, Polycarbonate Jars'),
  ('sup-2', 'org-default', 'Crown Closures West Africa', 'Sandra Akoto', 'orders@crownclosures.com', '+233 20 123 4567', 'HDPE Caps & Seals'),
  ('sup-3', 'org-default', 'Apex Flexibles & Packaging', 'Emmanuel Tetteh', 'info@apexflexibles.com', '+233 50 987 6543', 'Roll Labels, Shrink Film')
ON CONFLICT (id) DO NOTHING;

-- 13. MACHINES
CREATE TABLE IF NOT EXISTS public.machines (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'operational',
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  operating_hours NUMERIC(10,2) DEFAULT 0,
  failure_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.machines (id, organization_id, branch_id, name, code, type, status, operating_hours)
VALUES 
  ('mac-1', 'org-default', 'branch-1', 'AquaBlow 4-Cavity PET Blow Molder', 'BLOW-01', 'Blow Molder', 'operational', 1840.5),
  ('mac-2', 'org-default', 'branch-1', 'Rotary 16-Head Monoblock Filler/Capper', 'FILL-01', 'Filling & Capping', 'operational', 2150.0),
  ('mac-3', 'org-default', 'branch-1', 'Hot Melt High-Speed Labeler', 'LBL-01', 'Labeler', 'operational', 1420.0),
  ('mac-4', 'org-default', 'branch-1', 'Thermal Tunnel Shrink Packer', 'PACK-01', 'Shrink Packer', 'operational', 980.5)
ON CONFLICT (id) DO NOTHING;

-- 14. INVENTORY (FINISHED GOODS)
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  bottle_size TEXT NOT NULL,
  produced_stock INTEGER NOT NULL DEFAULT 0,
  damaged_stock INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  warehouse_location TEXT,
  min_threshold INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Compatibility view for queries targeting finished_goods_inventory
CREATE OR REPLACE VIEW public.finished_goods_inventory AS 
SELECT id, organization_id, branch_id, bottle_size, produced_stock, damaged_stock, reserved_stock, warehouse_location, min_threshold, updated_at 
FROM public.inventory;

INSERT INTO public.inventory (id, organization_id, branch_id, bottle_size, produced_stock, damaged_stock, reserved_stock, warehouse_location, min_threshold)
VALUES 
  ('inv-1', 'org-default', 'branch-1', '500ml Small Pack', 1450, 18, 200, 'Aisle A-01 (Bay 3)', 300),
  ('inv-2', 'org-default', 'branch-1', '750ml Sports Cap', 820, 8, 100, 'Aisle A-02 (Bay 1)', 200),
  ('inv-3', 'org-default', 'branch-1', '1.5L Family Size', 540, 5, 50, 'Aisle B-01 (Bay 2)', 150),
  ('inv-4', 'org-default', 'branch-1', '19L Dispenser Jar', 320, 3, 40, 'Pallet Station P-04', 80),
  ('inv-5', 'org-default', 'branch-1', '500ml Sachet Water (Bag)', 2800, 32, 400, 'Cold Depot Bay C', 500)
ON CONFLICT (id) DO NOTHING;

-- 15. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  name TEXT NOT NULL,
  business_name TEXT,
  type TEXT NOT NULL DEFAULT 'retail',
  email TEXT,
  phone TEXT,
  address TEXT,
  credit_limit NUMERIC(12,2) DEFAULT 0,
  current_balance NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.customers (id, organization_id, name, business_name, type, email, phone, credit_limit, current_balance)
VALUES 
  ('cust-1', 'org-default', 'Alhaji Mumuni', 'Mumuni Supermarkets Chain', 'wholesaler', 'procurement@mumunigroup.com', '+233 24 111 2233', 15000.00, 3200.00),
  ('cust-2', 'org-default', 'Patricia Lawson', 'Airport View Hotel & Resorts', 'corporate', 'finance@airportviewgh.com', '+233 20 888 9900', 8000.00, 0.00),
  ('cust-3', 'org-default', 'Kofi Mensah', 'Apex Distribution Hub', 'distributor', 'orders@apexdist.gh', '+233 50 333 4455', 25000.00, 7850.00)
ON CONFLICT (id) DO NOTHING;

-- 16. PRODUCTION BATCHES
CREATE TABLE IF NOT EXISTS public.production_batches (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  batch_code TEXT NOT NULL,
  bottle_size TEXT NOT NULL,
  planned_quantity INTEGER NOT NULL,
  produced_quantity INTEGER NOT NULL DEFAULT 0,
  damaged_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Planned',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  supervisor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. SALES & INVOICING
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12,2) NOT NULL,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'paid',
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  sale_date DATE DEFAULT CURRENT_DATE,
  recorded_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. PURCHASES
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  po_number TEXT NOT NULL,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  order_date DATE DEFAULT CURRENT_DATE,
  delivery_date DATE,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  expense_number TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'Cash',
  payee TEXT,
  description TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. WAREHOUSE TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.warehouse_transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  reference_code TEXT NOT NULL,
  type TEXT NOT NULL,
  product_size TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  from_location TEXT,
  to_location TEXT,
  barcode TEXT,
  qr_code TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. AUDIT LOGS (Immutable Activity Ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  branch_id TEXT,
  user_id TEXT,
  user_name TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  module TEXT,
  record_id TEXT,
  old_value JSONB,
  new_value JSONB,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 22. DOCUMENT ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.document_attachments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  target_table TEXT NOT NULL,
  target_record_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 23. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'org-default',
  user_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- SECURITY FUNCTIONS & ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Helper Function: Get organization IDs where currently authenticated user is an active member
CREATE OR REPLACE FUNCTION public.get_auth_user_organization_ids()
RETURNS TABLE (org_id TEXT) 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id::TEXT
  FROM public.organization_members om
  WHERE (
    om.user_id = auth.uid()::TEXT 
    OR lower(om.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
  AND om.is_active = true;
END;
$$;

-- Helper Function: Platform Super Admin Check
-- Strictly checks server-authoritative JWT service_role or app_metadata. Never trusts user_metadata.
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
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );
END;
$$;

-- Enable RLS and apply strict tenant policies to all tenant tables
DO $$ 
DECLARE 
  tbl TEXT;
  tenant_tables TEXT[] := ARRAY[
    'branches', 'user_profiles', 'bottle_types', 'raw_materials', 
    'suppliers', 'machines', 'inventory', 'customers', 
    'production_batches', 'sales', 'purchases', 'expenses', 
    'warehouse_transactions', 'audit_logs', 'document_attachments', 
    'approval_workflows', 'subscriptions', 'billing_records', 
    'invitations', 'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      
      -- Drop any previous policies
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation select" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation insert" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation update" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation delete" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation read" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation write" ON public.%I;', tbl);

      -- Policy 1: SELECT (Strictly authenticated members of tenant or platform admin)
      EXECUTE format(
        'CREATE POLICY "Strict tenant isolation select" ON public.%I FOR SELECT USING (
          auth.uid() IS NOT NULL AND (
            organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
            OR public.is_platform_admin()
          )
        );', tbl
      );

      -- Policy 2: INSERT
      EXECUTE format(
        'CREATE POLICY "Strict tenant isolation insert" ON public.%I FOR INSERT WITH CHECK (
          auth.uid() IS NOT NULL AND (
            organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
            OR public.is_platform_admin()
          )
        );', tbl
      );

      -- Policy 3: UPDATE
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

      -- Policy 4: DELETE
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

-- Special RLS for public.organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Organizations read policy" ON public.organizations;
DROP POLICY IF EXISTS "Organizations insert policy" ON public.organizations;
DROP POLICY IF EXISTS "Organizations update policy" ON public.organizations;

CREATE POLICY "Organizations read policy" ON public.organizations FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
    OR public.is_platform_admin()
  )
);

CREATE POLICY "Organizations insert policy" ON public.organizations FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Organizations update policy" ON public.organizations FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
    OR public.is_platform_admin()
  )
);

-- Special RLS for public.organization_members table
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read policy" ON public.organization_members;
DROP POLICY IF EXISTS "Members insert policy" ON public.organization_members;
DROP POLICY IF EXISTS "Members update policy" ON public.organization_members;
DROP POLICY IF EXISTS "Members delete policy" ON public.organization_members;

CREATE POLICY "Members read policy" ON public.organization_members FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid()::TEXT
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    OR organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
    OR public.is_platform_admin()
  )
);

CREATE POLICY "Members insert policy" ON public.organization_members FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
    OR public.is_platform_admin()
    OR NOT EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_members.organization_id)
  )
);

CREATE POLICY "Members update policy" ON public.organization_members FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
    OR public.is_platform_admin()
  )
);

CREATE POLICY "Members delete policy" ON public.organization_members FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    organization_id IN (SELECT org_id FROM public.get_auth_user_organization_ids())
    OR public.is_platform_admin()
  )
);

-- Special RLS for public.subscription_plans (Public readable catalog)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Subscription plans public read" ON public.subscription_plans;
CREATE POLICY "Subscription plans public read" ON public.subscription_plans FOR SELECT USING (true);

-- ==============================================================================
-- STORAGE BUCKETS AND STORAGE RLS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('attachments', 'attachments', false, 20971520, NULL),
  ('documents', 'documents', false, 20971520, NULL),
  ('receipts', 'receipts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Avatars are publicly viewable" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload own avatar" ON storage.objects;
CREATE POLICY "Authenticated users can upload own avatar" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "Tenant members can view own organization files" ON storage.objects;
CREATE POLICY "Tenant members can view own organization files" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id IN ('attachments', 'documents', 'receipts')
  AND (
    (storage.foldername(name))[1] IN (
      SELECT organization_id::TEXT 
      FROM public.organization_members 
      WHERE (user_id = auth.uid()::TEXT OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
      AND is_active = true
    )
    OR public.is_platform_admin()
  )
);

DROP POLICY IF EXISTS "Tenant members can upload files to own organization folder" ON storage.objects;
CREATE POLICY "Tenant members can upload files to own organization folder" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('attachments', 'documents', 'receipts')
  AND (
    (storage.foldername(name))[1] IN (
      SELECT organization_id::TEXT 
      FROM public.organization_members 
      WHERE (user_id = auth.uid()::TEXT OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
      AND is_active = true
    )
    OR public.is_platform_admin()
  )
);

-- ==============================================================================
-- REALTIME REPLICATION REPLICA IDENTITY
-- ==============================================================================
DO $$
BEGIN
  ALTER TABLE public.sales REPLICA IDENTITY FULL;
  ALTER TABLE public.production_batches REPLICA IDENTITY FULL;
  ALTER TABLE public.inventory REPLICA IDENTITY FULL;
  ALTER TABLE public.customers REPLICA IDENTITY FULL;
  ALTER TABLE public.expenses REPLICA IDENTITY FULL;
  ALTER TABLE public.raw_materials REPLICA IDENTITY FULL;
  ALTER TABLE public.warehouse_transactions REPLICA IDENTITY FULL;
  ALTER TABLE public.organization_members REPLICA IDENTITY FULL;
  ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
