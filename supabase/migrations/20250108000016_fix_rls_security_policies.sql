-- RLSセキュリティポリシーの修正（完全版）
-- 2025年1月8日

-- 1. 管理者アクセスチェック関数を作成
CREATE OR REPLACE FUNCTION check_admin_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. system_notifications テーブルのRLSを有効化（既に設定済みの場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'system_notifications' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 3. notification_deliveries テーブルのRLSを有効化（既に設定済みの場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'notification_deliveries' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 4. system_notifications に管理者専用アクセスポリシーを作成（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_notifications' 
    AND policyname = 'admin_only_system_notifications'
  ) THEN
    CREATE POLICY "admin_only_system_notifications" ON system_notifications
      FOR ALL USING (check_admin_access());
  END IF;
END $$;

-- 5. notification_deliveries に管理者専用アクセスポリシーを作成（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_deliveries' 
    AND policyname = 'admin_only_notification_deliveries'
  ) THEN
    CREATE POLICY "admin_only_notification_deliveries" ON notification_deliveries
      FOR ALL USING (check_admin_access());
  END IF;
END $$;

-- 6. posts テーブルのRLS確認と設定
DO $$
BEGIN
  -- postsテーブルのRLSを有効化
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'posts' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- 承認済み投稿の閲覧ポリシー（正しいカラム名: approved）
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'users_can_view_approved_posts'
  ) THEN
    CREATE POLICY "users_can_view_approved_posts" ON posts
      FOR SELECT USING (approved = true);
  END IF;
  
  -- 自分の投稿作成ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'users_can_create_own_posts'
  ) THEN
    CREATE POLICY "users_can_create_own_posts" ON posts
      FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;
  
  -- 自分の投稿更新ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'users_can_update_own_posts'
  ) THEN
    CREATE POLICY "users_can_update_own_posts" ON posts
      FOR UPDATE USING (auth.uid() = author_id);
  END IF;
  
  -- 管理者が全投稿を管理できるポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'admin_can_manage_all_posts'
  ) THEN
    CREATE POLICY "admin_can_manage_all_posts" ON posts
      FOR ALL USING (check_admin_access());
  END IF;
END $$;

-- 7. comments テーブルのRLS確認と設定
DO $$
BEGIN
  -- commentsテーブルのRLSを有効化
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'comments' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- 承認済みコメントの閲覧ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comments' 
    AND policyname = 'users_can_view_approved_comments'
  ) THEN
    CREATE POLICY "users_can_view_approved_comments" ON comments
      FOR SELECT USING (is_approved = true);
  END IF;
  
  -- コメント作成ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comments' 
    AND policyname = 'users_can_create_comments'
  ) THEN
    CREATE POLICY "users_can_create_comments" ON comments
      FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;
  
  -- 自分のコメント更新ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comments' 
    AND policyname = 'users_can_update_own_comments'
  ) THEN
    CREATE POLICY "users_can_update_own_comments" ON comments
      FOR UPDATE USING (auth.uid() = author_id);
  END IF;
  
  -- 自分のコメント削除ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comments' 
    AND policyname = 'users_can_delete_own_comments'
  ) THEN
    CREATE POLICY "users_can_delete_own_comments" ON comments
      FOR DELETE USING (auth.uid() = author_id);
  END IF;
  
  -- 管理者が全コメントを管理できるポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comments' 
    AND policyname = 'admin_can_manage_all_comments'
  ) THEN
    CREATE POLICY "admin_can_manage_all_comments" ON comments
      FOR ALL USING (check_admin_access());
  END IF;
END $$;

-- 8. 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'RLSセキュリティポリシーの修正が完了しました';
  RAISE NOTICE '- system_notifications: 管理者専用アクセス';
  RAISE NOTICE '- notification_deliveries: 管理者専用アクセス';
  RAISE NOTICE '- posts: 承認済み投稿の表示、所有者・管理者制御（approved カラム使用）';
  RAISE NOTICE '- comments: 承認済みコメントの表示、所有者・管理者制御（is_approved カラム使用）';
  RAISE NOTICE '- ビュー（system_notifications_summary, performance_monitoring）: 基になるテーブルのRLSにより制御';
END $$;
