-- フォロー機能の完全削除
-- 通知テーブルの型制約を更新し、フォロー関連のフィールドを削除

BEGIN;

-- 通知テーブルの型制約を更新（followを削除）
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'mention', 'system', 'weekly_digest'));

-- 通知設定テーブルからフォロー関連フィールドを削除
ALTER TABLE notification_settings DROP COLUMN IF EXISTS push_follows;
ALTER TABLE notification_settings DROP COLUMN IF EXISTS email_follows;

-- 既存のフォロー関連の通知データを削除（もし存在する場合）
DELETE FROM notifications WHERE type = 'follow';

-- followsテーブル自体を削除
DROP TABLE IF EXISTS follows;

COMMIT;
