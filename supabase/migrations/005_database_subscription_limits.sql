-- ==============================================================================
-- 005_database_subscription_limits.sql
-- Database-Level Subscription Limit Enforcement for H2O Multi-Tenant SaaS
-- ==============================================================================

-- 1. ENFORCE PLAN LIMITS ON USER SEATS (organization_members)
CREATE OR REPLACE FUNCTION public.check_organization_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id TEXT;
  v_max_users INTEGER;
  v_current_users INTEGER;
  v_plan_name TEXT;
BEGIN
  -- Allow platform administrators and background service_role to bypass
  IF public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  -- 1. Resolve active subscription plan for this organization
  SELECT s.plan_id, sp.name, sp.max_users
  INTO v_plan_id, v_plan_name, v_max_users
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = NEW.organization_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Fallback to organization plan_id column if subscription record is absent
  IF v_plan_id IS NULL THEN
    SELECT o.plan_id, sp.name, sp.max_users
    INTO v_plan_id, v_plan_name, v_max_users
    FROM public.organizations o
    JOIN public.subscription_plans sp ON sp.id = o.plan_id
    WHERE o.id = NEW.organization_id;
  END IF;

  -- Default to Starter plan limits if unconfigured
  IF v_max_users IS NULL THEN
    v_max_users := 3;
    v_plan_name := 'Starter';
  END IF;

  -- Unlimited tier threshold (> 1000 users)
  IF v_max_users >= 1000 THEN
    RETURN NEW;
  END IF;

  -- Count current active members in this organization
  SELECT COUNT(*)
  INTO v_current_users
  FROM public.organization_members
  WHERE organization_id = NEW.organization_id
    AND is_active = true;

  -- Check if limit would be breached
  IF v_current_users >= v_max_users THEN
    RAISE EXCEPTION 'SUBSCRIPTION_LIMIT_EXCEEDED: Organization has reached the % user limit on the % plan. Please upgrade your subscription to invite additional staff.', 
      v_max_users, v_plan_name
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to organization_members
DROP TRIGGER IF EXISTS trg_enforce_member_limit ON public.organization_members;
CREATE TRIGGER trg_enforce_member_limit
  BEFORE INSERT ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_organization_member_limit();

-- 2. ENFORCE PLAN LIMITS ON BRANCH LOCATIONS (branches)
CREATE OR REPLACE FUNCTION public.check_organization_branch_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id TEXT;
  v_max_branches INTEGER;
  v_current_branches INTEGER;
  v_plan_name TEXT;
BEGIN
  -- Allow platform administrators and background service_role to bypass
  IF public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  -- 1. Resolve active subscription plan for this organization
  SELECT s.plan_id, sp.name, sp.max_branches
  INTO v_plan_id, v_plan_name, v_max_branches
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = NEW.organization_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Fallback to organization plan_id column if subscription record is absent
  IF v_plan_id IS NULL THEN
    SELECT o.plan_id, sp.name, sp.max_branches
    INTO v_plan_id, v_plan_name, v_max_branches
    FROM public.organizations o
    JOIN public.subscription_plans sp ON sp.id = o.plan_id
    WHERE o.id = NEW.organization_id;
  END IF;

  -- Default to Starter plan limits if unconfigured
  IF v_max_branches IS NULL THEN
    v_max_branches := 1;
    v_plan_name := 'Starter';
  END IF;

  -- Unlimited tier threshold (> 100 branches)
  IF v_max_branches >= 100 THEN
    RETURN NEW;
  END IF;

  -- Count current branches in this organization
  SELECT COUNT(*)
  INTO v_current_branches
  FROM public.branches
  WHERE organization_id = NEW.organization_id;

  -- Check if limit would be breached
  IF v_current_branches >= v_max_branches THEN
    RAISE EXCEPTION 'SUBSCRIPTION_LIMIT_EXCEEDED: Organization has reached the % branch location limit on the % plan. Please upgrade your subscription to establish additional plant branches.', 
      v_max_branches, v_plan_name
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to branches (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'branches') THEN
    DROP TRIGGER IF EXISTS trg_enforce_branch_limit ON public.branches;
    CREATE TRIGGER trg_enforce_branch_limit
      BEFORE INSERT ON public.branches
      FOR EACH ROW
      EXECUTE FUNCTION public.check_organization_branch_limit();
  END IF;
END $$;
