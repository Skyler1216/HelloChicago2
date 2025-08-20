-- Migration: Add system notification types to notifications table
-- Description: Extend notifications type constraint to include system notification types
-- Date: 2025-01-09
-- Environment: Production

-- Step 1: Drop the existing check constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Step 2: Add new check constraint with extended types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'like', 'comment', 'mention', 'system', 'weekly_digest',
  'app_update', 'system_maintenance', 'feature_release', 'community_event'
));

-- Step 3: Verify the constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND conname = 'notifications_type_check';
