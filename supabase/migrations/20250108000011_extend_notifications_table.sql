-- Migration: Extend notifications table for inbox functionality
-- Description: Add new fields and types to support system notifications and enhanced inbox features
-- Date: 2025-01-08
-- Environment: Production

-- Step 1: Install cron extension if not exists
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Step 2: Handle notification type enum
DO $$
BEGIN
  -- Check if the enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    -- Try to add new values to existing enum
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'app_update';
    EXCEPTION WHEN duplicate_object THEN
      -- Value already exists, continue
    END;
    
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'system_maintenance';
    EXCEPTION WHEN duplicate_object THEN
      -- Value already exists, continue
    END;
    
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'feature_release';
    EXCEPTION WHEN duplicate_object THEN
      -- Value already exists, continue
    END;
    
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'community_event';
    EXCEPTION WHEN duplicate_object THEN
      -- Value already exists, continue
    END;
  ELSE
    -- Create new enum type if it doesn't exist
    CREATE TYPE notification_type AS ENUM (
      'like', 'comment', 'mention', 'system', 'weekly_digest',
      'app_update', 'system_maintenance', 'feature_release', 'community_event'
    );
  END IF;
END $$;

-- Step 3: Add new columns to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS action_url text,
ADD COLUMN IF NOT EXISTS action_text text;

-- Step 4: Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type_priority ON notifications(type, priority);

-- Step 5: Add column comments
COMMENT ON COLUMN notifications.priority IS 'Notification priority level (low, normal, high, urgent)';
COMMENT ON COLUMN notifications.expires_at IS 'When the notification expires and should be automatically removed';
COMMENT ON COLUMN notifications.action_url IS 'URL for action button (optional)';
COMMENT ON COLUMN notifications.action_text IS 'Text for action button (optional)';

-- Step 6: Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create a scheduled job to clean up expired notifications (only if cron is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- This will run daily to remove expired notifications
    PERFORM cron.schedule(
      'cleanup-expired-notifications',
      '0 2 * * *', -- Daily at 2 AM
      'SELECT cleanup_expired_notifications();'
    );
  END IF;
END $$;

-- Step 8: Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
