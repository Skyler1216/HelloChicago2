-- Add soft-delete column to notifications and index, to allow hiding deleted system notifications
BEGIN;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications(deleted_at);
COMMIT;
