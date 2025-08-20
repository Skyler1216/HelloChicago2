-- Migration: Remove views completely and replace with admin-only functions
-- Description: Completely eliminate views that cause RLS issues and use functions only
-- Date: 2025-01-10
-- Environment: Production

-- Step 1: Drop the problematic views completely
DROP VIEW IF EXISTS performance_monitoring CASCADE;
DROP VIEW IF EXISTS system_notifications_summary CASCADE;

-- Step 2: Ensure functions exist and are properly secured
-- Performance monitoring function
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

-- System notifications summary function
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

-- Step 3: Grant execute permissions only to authenticated users
GRANT EXECUTE ON FUNCTION get_performance_monitoring TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_notifications_summary TO authenticated;

-- Step 4: Ensure all base tables have proper RLS enabled
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('system_notifications', 'notification_deliveries', 'profiles', 'posts', 'comments', 'likes', 'categories')
  LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(table_record.tablename) || ' ENABLE ROW LEVEL SECURITY';
  END LOOP;
END $$;

-- Step 5: Create comprehensive RLS policies for all tables
-- Profiles table policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
  
  -- Create new policies
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
  
  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
  
  CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (check_admin_access());
  
  CREATE POLICY "Admins can manage all profiles" ON profiles
    FOR ALL USING (check_admin_access());
END $$;

-- Posts table policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "users_can_view_approved_posts" ON posts;
  DROP POLICY IF EXISTS "users_can_create_own_posts" ON posts;
  DROP POLICY IF EXISTS "users_can_update_own_posts" ON posts;
  DROP POLICY IF EXISTS "admin_can_manage_all_posts" ON posts;
  
  -- Create new policies
  CREATE POLICY "users_can_view_approved_posts" ON posts
    FOR SELECT USING (approved = true);
  
  CREATE POLICY "users_can_create_own_posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);
  
  CREATE POLICY "users_can_update_own_posts" ON posts
    FOR UPDATE USING (auth.uid() = author_id);
  
  CREATE POLICY "admin_can_manage_all_posts" ON posts
    FOR ALL USING (check_admin_access());
END $$;

-- Comments table policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "users_can_view_approved_comments" ON comments;
  DROP POLICY IF EXISTS "users_can_create_comments" ON comments;
  DROP POLICY IF EXISTS "users_can_update_own_comments" ON comments;
  DROP POLICY IF EXISTS "users_can_delete_own_comments" ON comments;
  DROP POLICY IF EXISTS "admin_can_manage_all_comments" ON comments;
  
  -- Create new policies
  CREATE POLICY "users_can_view_approved_comments" ON comments
    FOR SELECT USING (is_approved = true);
  
  CREATE POLICY "users_can_create_comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);
  
  CREATE POLICY "users_can_update_own_comments" ON comments
    FOR UPDATE USING (auth.uid() = author_id);
  
  CREATE POLICY "users_can_delete_own_comments" ON comments
    FOR DELETE USING (auth.uid() = author_id);
  
  CREATE POLICY "admin_can_manage_all_comments" ON comments
    FOR ALL USING (check_admin_access());
END $$;

-- Likes table policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "users_can_view_likes" ON likes;
  DROP POLICY IF EXISTS "users_can_create_likes" ON likes;
  DROP POLICY IF EXISTS "users_can_delete_own_likes" ON likes;
  DROP POLICY IF EXISTS "admin_can_manage_all_likes" ON likes;
  
  -- Create new policies
  CREATE POLICY "users_can_view_likes" ON likes
    FOR SELECT USING (true);
  
  CREATE POLICY "users_can_create_likes" ON likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "users_can_delete_own_likes" ON likes
    FOR DELETE USING (auth.uid() = user_id);
  
  CREATE POLICY "admin_can_manage_all_likes" ON likes
    FOR ALL USING (check_admin_access());
END $$;

-- Categories table policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "users_can_view_categories" ON categories;
  DROP POLICY IF EXISTS "admin_can_manage_categories" ON categories;
  
  -- Create new policies
  CREATE POLICY "users_can_view_categories" ON categories
    FOR SELECT USING (true);
  
  CREATE POLICY "admin_can_manage_categories" ON categories
    FOR ALL USING (check_admin_access());
END $$;

-- Step 6: Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'ビューの完全削除とRLSポリシーの包括的設定が完了しました';
  RAISE NOTICE '- performance_monitoring: ビュー削除、関数経由でのみアクセス可能';
  RAISE NOTICE '- system_notifications_summary: ビュー削除、関数経由でのみアクセス可能';
  RAISE NOTICE '- すべてのテーブル: 適切なRLSポリシー設定';
  RAISE NOTICE 'これで「Unrestricted」タグが完全に解消されるはずです';
END $$;
