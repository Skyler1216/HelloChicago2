-- Migration: Remove priority column from notifications table
-- Description: Remove unused priority column and related constraints
-- Date: 2025-01-09
-- Environment: Production

-- Step 1: Drop indexes related to priority
DROP INDEX IF EXISTS idx_notifications_priority;

-- Step 2: Remove priority column from notifications table
ALTER TABLE notifications DROP COLUMN IF EXISTS priority;

-- Step 3: Remove priority column from system_notifications table if it exists
ALTER TABLE system_notifications DROP COLUMN IF EXISTS priority;

-- Step 4: Update any stored procedures or functions that reference priority
-- Remove priority parameter from create_notification_for_user function if it exists
DROP FUNCTION IF EXISTS create_notification_for_user(uuid, text, text, text, text);

-- Recreate function without priority parameter
CREATE OR REPLACE FUNCTION create_notification_for_user(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    message,
    metadata,
    is_read,
    is_pushed,
    is_emailed
  ) VALUES (
    p_recipient_id,
    p_type,
    p_title,
    p_message,
    p_metadata,
    false,
    false,
    false
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
