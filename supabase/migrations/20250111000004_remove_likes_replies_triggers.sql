-- Drop triggers and functions that updated posts.likes and posts.replies
-- These referenced columns have been removed in previous migrations

BEGIN;

-- 1) Drop triggers
DROP TRIGGER IF EXISTS update_post_likes_trigger ON likes;
DROP TRIGGER IF EXISTS update_post_replies_trigger ON comments;

-- 2) Drop functions (if they still exist)
DROP FUNCTION IF EXISTS update_post_likes_count() CASCADE;
DROP FUNCTION IF EXISTS update_post_replies_count() CASCADE;
DROP FUNCTION IF EXISTS sync_all_post_likes() CASCADE;
DROP FUNCTION IF EXISTS sync_all_post_replies() CASCADE;

COMMIT;
