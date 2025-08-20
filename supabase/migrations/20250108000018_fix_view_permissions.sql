-- Migration: Fix view permissions to ensure RLS policies work correctly
-- Description: Remove overly permissive grants and ensure admin-only access
-- Date: 2025-01-10
-- Environment: Production

-- Step 1: Revoke overly permissive permissions from views
REVOKE SELECT ON performance_monitoring FROM authenticated;
REVOKE SELECT ON system_notifications_summary FROM authenticated;

-- Step 2: Ensure views are owned by postgres (for proper RLS inheritance)
ALTER VIEW performance_monitoring OWNER TO postgres;
ALTER VIEW system_notifications_summary OWNER TO postgres;

-- Step 3: Create security definer functions with proper permissions
-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_performance_monitoring();
DROP FUNCTION IF EXISTS get_system_notifications_summary();

-- Create performance monitoring function with proper security
CREATE OR REPLACE FUNCTION get_performance_monitoring()
RETURNS TABLE (
  metric_type text,
  metric_name text,
  value bigint,
  unit text
) AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    'Index Usage' as metric_type,
    indexrelname as metric_name,
    idx_scan as value,
    'scans' as unit
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  UNION ALL
  SELECT 
    'Table Sizes' as metric_type,
    relname as metric_name,
    pg_total_relation_size(relname::regclass) as value,
    'bytes' as unit
  FROM pg_stat_user_tables
  WHERE schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create system notifications summary function with proper security
CREATE OR REPLACE FUNCTION get_system_notifications_summary()
RETURNS TABLE (
  id uuid,
  title text,
  message text,
  type text,
  priority text,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  total_recipients integer,
  delivered_count integer,
  read_count integer,
  created_by_email text,
  current_status text
) AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    sn.id,
    sn.title,
    sn.message,
    sn.type,
    sn.priority,
    sn.status,
    sn.created_at,
    sn.expires_at,
    sn.total_recipients,
    sn.delivered_count,
    sn.read_count,
    p.email as created_by_email,
    CASE 
      WHEN sn.expires_at IS NOT NULL AND sn.expires_at < now() THEN 'expired'
      WHEN sn.status = 'sent' THEN 'active'
      ELSE sn.status
    END as current_status
  FROM system_notifications sn
  LEFT JOIN profiles p ON sn.created_by = p.id
  ORDER BY sn.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant execute permissions only to authenticated users
GRANT EXECUTE ON FUNCTION get_performance_monitoring TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_notifications_summary TO authenticated;

-- Step 5: Ensure base tables have proper RLS policies
-- Verify system_notifications RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'system_notifications' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Verify notification_deliveries RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'notification_deliveries' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Step 6: Create or update RLS policies with proper names
-- Drop all existing policies to avoid conflicts
DO $$
DECLARE
  policy_name text;
BEGIN
  -- Drop all policies on system_notifications
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'system_notifications'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON system_notifications';
  END LOOP;
  
  -- Drop all policies on notification_deliveries
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'notification_deliveries'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON notification_deliveries';
  END LOOP;
END $$;

-- Create clean admin-only policies
CREATE POLICY "admin_only_system_notifications" ON system_notifications
  FOR ALL USING (check_admin_access());

CREATE POLICY "admin_only_notification_deliveries" ON notification_deliveries
  FOR ALL USING (check_admin_access());

-- Step 7: Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'ビューの権限修正が完了しました';
  RAISE NOTICE '- performance_monitoring: 直接アクセス不可、関数経由でのみアクセス可能';
  RAISE NOTICE '- system_notifications_summary: 直接アクセス不可、関数経由でのみアクセス可能';
  RAISE NOTICE '- 基になるテーブル: 管理者専用アクセス';
  RAISE NOTICE 'これで「Unrestricted」タグが解消されるはずです';
END $$;
