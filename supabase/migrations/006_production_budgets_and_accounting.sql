-- ==============================================================================
-- Migration: 006_production_budgets_and_accounting.sql
-- Description: Adds Production Budgets, Chart of Accounts, and Journal Entries
-- Idempotent & Non-destructive with full Multi-Tenant RLS isolation
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PRODUCTION BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.production_budgets (
  id TEXT PRIMARY KEY DEFAULT ('pbdg-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  bottle_size TEXT NOT NULL,
  period TEXT NOT NULL, -- e.g., '2026-09', '2026-Q3', '2026'
  period_type TEXT NOT NULL DEFAULT 'month', -- 'month', 'quarter', 'year'
  budgeted_production_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
  budgeted_raw_material_consumption NUMERIC(15,2) NOT NULL DEFAULT 0,
  budgeted_labour_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  budgeted_packaging_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  budgeted_overhead NUMERIC(15,2) NOT NULL DEFAULT 0,
  budgeted_production_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  budgeted_sales_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
  budgeted_revenue NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_production_budgets_org ON public.production_budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_production_budgets_period ON public.production_budgets(period);

-- 2. CHART OF ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id TEXT PRIMARY KEY DEFAULT ('coa-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Asset', 'Liability', 'Equity', 'Revenue', 'Cost of Sales', 'Operating Expense'
  sub_category TEXT,
  normal_balance TEXT NOT NULL DEFAULT 'Debit', -- 'Debit', 'Credit'
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_org_account_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_org ON public.chart_of_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON public.chart_of_accounts(code);

-- 3. JOURNAL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id TEXT PRIMARY KEY DEFAULT ('je-' || lower(replace(gen_random_uuid()::text, '-', ''))),
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  date DATE NOT NULL,
  reference TEXT,
  description TEXT NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Posted', -- 'Posted', 'Draft', 'Void'
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_org ON public.journal_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(date);

-- 4. ENABLE RLS & APPLY TENANT ISOLATION POLICIES
ALTER TABLE public.production_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  tbl TEXT;
  tenant_tables TEXT[] := ARRAY['production_budgets', 'chart_of_accounts', 'journal_entries'];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    BEGIN
      -- Drop existing policies
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation select" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation insert" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation update" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation delete" ON public.%I;', tbl);

      -- Policy 1: SELECT
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
      RAISE NOTICE 'Skipping policy creation for %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;
