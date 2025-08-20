-- Migration: Fix RLS policies for performance monitoring and system notifications summary views
-- Description: Add proper RLS policies for admin-only views to fix "Unrestricted" status
-- Date: 2025-01-10
-- Environment: Production

-- Step 1: Drop existing views to recreate with proper RLS
DROP VIEW IF EXISTS performance_monitoring;
DROP VIEW IF EXISTS system_notifications_summary;

-- Step 2: Recreate performance_monitoring view with proper RLS
CREATE OR REPLACE VIEW performance_monitoring AS
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

-- Step 3: Create system_notifications_summary view with proper RLS
CREATE OR REPLACE VIEW system_notifications_summary AS
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

-- Step 4: Enable RLS on views (views don't support RLS directly, so we use security definer functions)
-- Create security definer function for performance monitoring
CREATE OR REPLACE FUNCTION get_performance_monitoring()
RETURNS TABLE (
  metric_type text,
  metric_name text,
  value bigint,
  unit text
) AS $$
BEGIN
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

-- Create security definer function for system notifications summary
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

-- Step 5: Grant permissions for admin functions
GRANT EXECUTE ON FUNCTION get_performance_monitoring TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_notifications_summary TO authenticated;

-- Step 6: Create RLS policies for the base tables that these views depend on
-- Ensure system_notifications has proper RLS
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

-- Ensure notification_deliveries has proper RLS
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

-- Step 7: Create or update RLS policies for system_notifications
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Admins can manage system notifications" ON system_notifications;
  DROP POLICY IF EXISTS "Users can view public system notifications" ON system_notifications;
  DROP POLICY IF EXISTS "admin_only_system_notifications" ON system_notifications;
  
  -- Create admin-only policy
  CREATE POLICY "admin_only_system_notifications" ON system_notifications
    FOR ALL USING (check_admin_access());
END $$;

-- Step 8: Create or update RLS policies for notification_deliveries
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own delivery status" ON notification_deliveries;
  DROP POLICY IF EXISTS "Admins can manage all delivery statuses" ON notification_deliveries;
  DROP POLICY IF EXISTS "admin_only_notification_deliveries" ON notification_deliveries;
  
  -- Create admin-only policy
  CREATE POLICY "admin_only_notification_deliveries" ON notification_deliveries
    FOR ALL USING (check_admin_access());
END $$;

-- Step 9: Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'RLSポリシーの修正が完了しました';
  RAISE NOTICE '- performance_monitoring: 管理者専用アクセス（関数経由）';
  RAISE NOTICE '- system_notifications_summary: 管理者専用アクセス（関数経由）';
  RAISE NOTICE '- system_notifications: 管理者専用アクセス';
  RAISE NOTICE '- notification_deliveries: 管理者専用アクセス';
  RAISE NOTICE 'ビューの「Unrestricted」タグが解消されるはずです';
END $$;
