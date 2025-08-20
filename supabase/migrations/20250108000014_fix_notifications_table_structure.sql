-- Migration: Fix notifications table structure for system notification integration
-- Description: Update notifications table to work with new system notification management
-- Date: 2025-01-10
-- Environment: Production

-- Step 1: Add missing columns to notifications table if they don't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_text text;

-- Step 2: Update metadata column to ensure it can store system_notification_id
-- The metadata column should already exist as jsonb, but let's ensure it's properly configured
COMMENT ON COLUMN notifications.metadata IS 'Additional notification data including system_notification_id for system notifications';

-- Step 3: Create index for better performance when querying system notifications
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_system_id ON notifications USING GIN (metadata);

-- Step 4: Create index for priority and type filtering
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Step 5: Create index for expiration date filtering
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- Step 6: Update existing system notifications to have proper metadata structure
-- This ensures existing notifications have the correct format
UPDATE notifications 
SET metadata = COALESCE(metadata, '{}'::jsonb) 
WHERE metadata IS NULL;

-- Step 7: Create a function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = now()
  WHERE id = notification_id;
  
  -- If this is a system notification, update the delivery status
  UPDATE notification_deliveries 
  SET status = 'read', read_at = now()
  WHERE user_notification_id = notification_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create a function to get user's unread notifications count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM notifications 
    WHERE recipient_id = user_id AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create a function to get user's notifications with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
  user_id uuid,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  message text,
  priority text,
  expires_at timestamptz,
  action_url text,
  action_text text,
  is_read boolean,
  created_at timestamptz,
  metadata jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.priority,
    n.expires_at,
    n.action_url,
    n.action_text,
    n.is_read,
    n.created_at,
    n.metadata
  FROM notifications n
  WHERE n.recipient_id = user_id
  ORDER BY n.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Grant permissions for new functions
GRANT EXECUTE ON FUNCTION mark_notification_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notifications_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications TO authenticated;

-- Step 11: Create a view for system notifications summary
CREATE OR REPLACE VIEW system_notifications_summary AS
SELECT 
  sn.id,
  sn.title,
  sn.message,
  sn.type,
  sn.priority,
  sn.status,
  sn.created_at,
  sn.total_recipients,
  sn.delivered_count,
  sn.read_count,
  COUNT(nd.id) as active_deliveries
FROM system_notifications sn
LEFT JOIN notification_deliveries nd ON sn.id = nd.system_notification_id
GROUP BY sn.id, sn.title, sn.message, sn.type, sn.priority, sn.status, sn.created_at, sn.total_recipients, sn.delivered_count, sn.read_count;

-- Step 12: Grant permissions for the view
GRANT SELECT ON system_notifications_summary TO authenticated;

-- Step 13: Verify the migration
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Step 14: Show indexes
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'notifications';
