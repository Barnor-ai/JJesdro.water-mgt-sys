-- ==============================================================================
-- 004_storage_and_realtime_setup.sql
-- Storage Buckets & Realtime RLS Security for H2O Multi-Tenant SaaS
-- ==============================================================================

-- 1. PROVISION STORAGE BUCKETS (IF NOT ALREADY EXISTING)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('attachments', 'attachments', false, 20971520, NULL),
  ('documents', 'documents', false, 20971520, NULL),
  ('receipts', 'receipts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- 2. ENABLE RLS ON STORAGE OBJECTS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. STORAGE RLS: AVATARS
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Avatars are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload own avatar" ON storage.objects;
CREATE POLICY "Authenticated users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can update own avatar" ON storage.objects;
CREATE POLICY "Authenticated users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can delete own avatar" ON storage.objects;
CREATE POLICY "Authenticated users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. STORAGE RLS: TENANT ISOLATION FOR DOCUMENTS, ATTACHMENTS, RECEIPTS
-- Storage path structure MUST follow: <organization_id>/<file_name>
DROP POLICY IF EXISTS "Tenant members can view own organization files" ON storage.objects;
CREATE POLICY "Tenant members can view own organization files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('attachments', 'documents', 'receipts')
    AND (
      (storage.foldername(name))[1] IN (
        SELECT organization_id::text 
        FROM public.organization_members 
        WHERE user_id = auth.uid() 
        AND is_active = true
      )
      OR public.is_platform_admin()
    )
  );

DROP POLICY IF EXISTS "Tenant members can upload files to own organization folder" ON storage.objects;
CREATE POLICY "Tenant members can upload files to own organization folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('attachments', 'documents', 'receipts')
    AND (
      (storage.foldername(name))[1] IN (
        SELECT organization_id::text 
        FROM public.organization_members 
        WHERE user_id = auth.uid() 
        AND is_active = true
      )
      OR public.is_platform_admin()
    )
  );

DROP POLICY IF EXISTS "Tenant staff can update organization files" ON storage.objects;
CREATE POLICY "Tenant staff can update organization files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('attachments', 'documents', 'receipts')
    AND (
      (storage.foldername(name))[1] IN (
        SELECT organization_id::text 
        FROM public.organization_members 
        WHERE user_id = auth.uid() 
        AND is_active = true
        AND role IN ('owner', 'admin', 'production_manager', 'warehouse_manager', 'sales_manager', 'accountant')
      )
      OR public.is_platform_admin()
    )
  );

DROP POLICY IF EXISTS "Tenant admins can delete organization files" ON storage.objects;
CREATE POLICY "Tenant admins can delete organization files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('attachments', 'documents', 'receipts')
    AND (
      (storage.foldername(name))[1] IN (
        SELECT organization_id::text 
        FROM public.organization_members 
        WHERE user_id = auth.uid() 
        AND is_active = true
        AND role IN ('owner', 'admin')
      )
      OR public.is_platform_admin()
    )
  );

-- 5. REALTIME REPLICA IDENTITY (ENFORCE RLS ON REALTIME BROADCASTS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales') THEN
    ALTER TABLE public.sales REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'production_batches') THEN
    ALTER TABLE public.production_batches REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'finished_goods_inventory') THEN
    ALTER TABLE public.finished_goods_inventory REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
    ALTER TABLE public.customers REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    ALTER TABLE public.expenses REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'raw_materials') THEN
    ALTER TABLE public.raw_materials REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'warehouse_transactions') THEN
    ALTER TABLE public.warehouse_transactions REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_members') THEN
    ALTER TABLE public.organization_members REPLICA IDENTITY FULL;
  END IF;
END $$;
