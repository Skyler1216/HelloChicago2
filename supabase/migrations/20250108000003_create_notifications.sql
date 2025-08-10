-- 通知設定テーブル
CREATE TABLE notification_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- プッシュ通知設定
  push_likes boolean DEFAULT true,
  push_comments boolean DEFAULT true,
  push_mentions boolean DEFAULT true,
  -- メール通知設定
  email_likes boolean DEFAULT false,
  email_comments boolean DEFAULT true,
  email_mentions boolean DEFAULT true,
  -- 一般設定
  weekly_digest boolean DEFAULT false,
  important_updates boolean DEFAULT true,
  system_notifications boolean DEFAULT true,
  -- おやすみモード
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00:00',
  quiet_hours_end time DEFAULT '08:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 通知履歴テーブル
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'mention', 'system', 'weekly_digest')),
  title text NOT NULL,
  message text NOT NULL,
  -- 関連データ（JSON形式）
  metadata jsonb DEFAULT '{}',
  -- 関連するリソースのID
  related_post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  related_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  -- 通知状態
  is_read boolean DEFAULT false,
  is_pushed boolean DEFAULT false,
  is_emailed boolean DEFAULT false,
  -- タイムスタンプ
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  pushed_at timestamptz,
  emailed_at timestamptz
);

-- RLS (Row Level Security) ポリシーの設定
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 通知設定のポリシー
CREATE POLICY "Users can view own notification settings" ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings" ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 通知履歴のポリシー
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- システムが通知を作成可能（サービスロール）
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();

-- インデックスの作成
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = false;

-- 通知関数：いいね通知
CREATE OR REPLACE FUNCTION notify_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  post_title text;
  liker_name text;
BEGIN
  -- 投稿者とライカーの情報を取得
  SELECT p.author_id, p.title INTO post_author_id, post_title
  FROM posts p WHERE p.id = NEW.post_id;
  
  SELECT name INTO liker_name FROM profiles WHERE id = NEW.user_id;
  
  -- 自分自身の投稿にいいねした場合は通知しない
  IF post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- 通知を作成
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    related_post_id,
    metadata
  ) VALUES (
    post_author_id,
    NEW.user_id,
    'like',
    'いいねを受け取りました',
    liker_name || 'さんがあなたの投稿「' || COALESCE(LEFT(post_title, 30), '無題') || '」にいいねしました',
    NEW.post_id,
    jsonb_build_object('liker_id', NEW.user_id, 'liker_name', liker_name)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 通知関数：コメント通知
CREATE OR REPLACE FUNCTION notify_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  post_title text;
  commenter_name text;
BEGIN
  -- 投稿者とコメント者の情報を取得
  SELECT p.author_id, p.title INTO post_author_id, post_title
  FROM posts p WHERE p.id = NEW.post_id;
  
  SELECT name INTO commenter_name FROM profiles WHERE id = NEW.author_id;
  
  -- 自分自身の投稿にコメントした場合は通知しない
  IF post_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;
  
  -- コメントが承認された場合のみ通知
  IF NEW.approved = true THEN
    INSERT INTO notifications (
      recipient_id,
      sender_id,
      type,
      title,
      message,
      related_post_id,
      related_comment_id,
      metadata
    ) VALUES (
      post_author_id,
      NEW.author_id,
      'comment',
      'コメントを受け取りました',
      commenter_name || 'さんがあなたの投稿「' || COALESCE(LEFT(post_title, 30), '無題') || '」にコメントしました',
      NEW.post_id,
      NEW.id,
      jsonb_build_object('commenter_id', NEW.author_id, 'commenter_name', commenter_name)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER trigger_notify_like
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_like();

CREATE TRIGGER trigger_notify_comment
  AFTER INSERT OR UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment();

-- テーブルコメント
COMMENT ON TABLE notification_settings IS 'ユーザーの通知設定';
COMMENT ON TABLE notifications IS '通知履歴・受信箱';

COMMENT ON COLUMN notification_settings.quiet_hours_start IS 'おやすみモード開始時間';
COMMENT ON COLUMN notification_settings.quiet_hours_end IS 'おやすみモード終了時間';
COMMENT ON COLUMN notifications.metadata IS '通知に関連する追加データ（JSON形式）';
COMMENT ON COLUMN notifications.is_pushed IS 'プッシュ通知送信済みフラグ';
COMMENT ON COLUMN notifications.is_emailed IS 'メール通知送信済みフラグ';
