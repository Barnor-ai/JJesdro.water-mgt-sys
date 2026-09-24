-- ==============================================================================
-- Migration: 007_suppliers_customers_raw_materials_expansion.sql
-- Description: Extends suppliers, customers, and raw_materials schema with full
-- enterprise fields, ensuring compatibility with Supabase PostgreSQL RLS.
-- Idempotent & non-destructive.
-- ==============================================================================

-- 1. SUPPLIERS TABLE EXPANSION
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Ghana',
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_details TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS supplier_type TEXT DEFAULT 'Manufacturer',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_suppliers_org ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON public.suppliers(code);

-- 2. CUSTOMERS TABLE EXPANSION
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Ghana',
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);

-- 3. RAW MATERIALS TABLE EXPANSION
ALTER TABLE public.raw_materials
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS last_restocked TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_raw_materials_org ON public.raw_materials(organization_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_status ON public.raw_materials(status);
CREATE INDEX IF NOT EXISTS idx_raw_materials_code ON public.raw_materials(code);
