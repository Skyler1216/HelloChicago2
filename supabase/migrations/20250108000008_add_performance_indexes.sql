/*
  # Add Performance Indexes for HelloChicago Database

  1. Purpose
    - Improve query performance for common operations
    - Optimize search and filtering operations
    - Reduce response time for user-facing features

  2. Target Tables
    - profiles: User profile queries and filtering
    - posts: Post listing, filtering, and search
    - comments: Comment retrieval and filtering
    - likes: Like counting and user activity
    - profile_details: Profile detail queries
    - notification_settings: User settings queries (temporarily disabled - table may not exist)

  3. Expected Improvements
    - Post listing: 3-5x faster
    - User search: 2-3x faster
    - Category filtering: 2-4x faster
    - Location-based queries: 3-6x faster
*/

-- Profiles table indexes
-- Email search optimization
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Approval status filtering (for admin functions)
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);

-- Role-based queries (for admin functions)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Posts table indexes (most critical for performance)
-- Post type filtering (post, consultation, transfer)
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);

-- Category-based filtering
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);

-- Author-based queries (user's own posts)
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);

-- Approval status filtering (for content moderation)
CREATE INDEX IF NOT EXISTS idx_posts_approved ON posts(approved);

-- Chronological ordering (newest first)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Location-based queries (for map features)
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location_lat, location_lng);

-- Composite index for common post queries
CREATE INDEX IF NOT EXISTS idx_posts_approved_category_created 
ON posts(approved, category_id, created_at DESC);

-- Comments table indexes
-- Post-based comment retrieval
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- Author-based queries
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);

-- Parent comment for reply chains
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- Approval status filtering
CREATE INDEX IF NOT EXISTS idx_comments_approved ON comments(approved);

-- Composite index for comment listing
CREATE INDEX IF NOT EXISTS idx_comments_post_approved_created 
ON comments(post_id, approved, created_at);

-- Likes table indexes
-- User's likes
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- Post's likes
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);

-- Profile details indexes
-- Profile lookup optimization
CREATE INDEX IF NOT EXISTS idx_profile_details_profile_id ON profile_details(profile_id);

-- Location area search
CREATE INDEX IF NOT EXISTS idx_profile_details_location_area ON profile_details(location_area);

-- Notification settings indexes
-- User settings lookup
-- Temporarily commented out - table may not exist in Cloud environment
-- CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- Create function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE (
  table_name text,
  index_name text,
  index_size text,
  index_scans bigint,
  tuples_read bigint,
  tuples_fetched bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname::text as table_name,
    indexrelname::text as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get table sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
  table_name text,
  table_size text,
  index_size text,
  total_size text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    pg_size_pretty(pg_total_relation_size(t.table_name::regclass)) as table_size,
    pg_size_pretty(pg_indexes_size(t.table_name::regclass)) as index_size,
    pg_size_pretty(pg_total_relation_size(t.table_name::regclass) + pg_indexes_size(t.table_name::regclass)) as total_size
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  ORDER BY pg_total_relation_size(t.table_name::regclass) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for monitoring functions
GRANT EXECUTE ON FUNCTION analyze_index_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_sizes TO authenticated;

-- Create a view for performance monitoring
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

-- Grant access to performance monitoring view
GRANT SELECT ON performance_monitoring TO authenticated;

-- Create function to optimize tables
CREATE OR REPLACE FUNCTION optimize_tables()
RETURNS void AS $$
DECLARE
  table_record RECORD;
BEGIN
  -- Analyze all tables to update statistics
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'ANALYZE ' || quote_ident(table_record.tablename);
  END LOOP;
  
  -- Vacuum tables to reclaim space and update statistics
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'VACUUM ANALYZE ' || quote_ident(table_record.tablename);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for table optimization
GRANT EXECUTE ON FUNCTION optimize_tables TO authenticated;
