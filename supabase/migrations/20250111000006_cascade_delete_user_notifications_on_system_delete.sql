-- When admin deletes a system notification, delete or soft-delete linked user notifications
-- Approach: ON DELETE CASCADE already removes notification_deliveries; here we soft-delete notifications
BEGIN;

CREATE OR REPLACE FUNCTION soft_delete_user_notifications_on_system_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft delete all user notifications linked via metadata.system_notification_id
  UPDATE notifications
  SET deleted_at = now()
  WHERE (metadata->>'system_notification_id')::uuid = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_soft_delete_user_notifications ON system_notifications;
CREATE TRIGGER trg_soft_delete_user_notifications
AFTER DELETE ON system_notifications
FOR EACH ROW
EXECUTE FUNCTION soft_delete_user_notifications_on_system_delete();

COMMIT;
