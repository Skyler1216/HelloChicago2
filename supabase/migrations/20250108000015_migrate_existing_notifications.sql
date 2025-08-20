-- Migration: Migrate existing notifications to new structure
-- Description: Clean up existing notifications and migrate to new system notification structure
-- Date: 2025-01-10
-- Environment: Production

-- Step 1: Identify and remove duplicate system notifications
-- Remove notifications that don't have proper metadata structure
DELETE FROM notifications 
WHERE type IN ('app_update', 'system_maintenance', 'feature_release', 'community_event', 'system')
AND (metadata IS NULL OR metadata = '{}'::jsonb OR metadata->>'created_by' IS NULL);

-- Step 2: Update remaining system notifications to have proper metadata
UPDATE notifications 
SET metadata = jsonb_build_object(
  'created_by', 'system',
  'notification_type', 'legacy_system',
  'migrated_at', now()::text
)
WHERE type IN ('app_update', 'system_maintenance', 'feature_release', 'community_event', 'system')
AND metadata IS NOT NULL;

-- Step 3: Create a temporary table to store notification statistics
CREATE TEMP TABLE notification_stats AS
SELECT 
  type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN is_read = true THEN 1 END) as read_count,
  COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
FROM notifications
GROUP BY type;

-- Step 4: Display migration summary
SELECT 
  'Migration Summary' as info,
  type,
  total_count,
  read_count,
  unread_count
FROM notification_stats
ORDER BY total_count DESC;

-- Step 5: Clean up temporary table
DROP TABLE notification_stats;

-- Step 6: Verify the migration
SELECT 
  'Verification' as check_type,
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN type IN ('app_update', 'system_maintenance', 'feature_release', 'community_event', 'system') THEN 1 END) as system_notifications,
  COUNT(CASE WHEN metadata IS NOT NULL AND metadata != '{}'::jsonb THEN 1 END) as notifications_with_metadata
FROM notifications;

-- Step 7: Show sample of cleaned notifications
SELECT 
  id,
  type,
  title,
  message,
  priority,
  metadata,
  created_at
FROM notifications
WHERE type IN ('app_update', 'system_maintenance', 'feature_release', 'community_event', 'system')
ORDER BY created_at DESC
LIMIT 5;
