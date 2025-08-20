# HelloChicago データベース設計書

## 概要

HelloChicagoアプリケーションのデータベース設計書です。Supabaseを使用したPostgreSQLベースのデータベースで、駐在妻コミュニティの情報共有プラットフォームを支えています。

## 技術仕様

- **データベース**: PostgreSQL (Supabase)
- **認証**: Supabase Auth
- **セキュリティ**: Row Level Security (RLS)
- **型安全性**: TypeScript型定義付き
- **バージョン**: 2.1 (2025年1月最新)

## テーブル設計

### 1. profiles テーブル

ユーザープロフィール情報を管理するテーブルです。

#### スキーマ

```sql
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  avatar_url text,
  is_approved boolean DEFAULT false,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### カラム詳細

| カラム名    | 型          | 制約                               | 説明                              |
| ----------- | ----------- | ---------------------------------- | --------------------------------- |
| id          | uuid        | PRIMARY KEY, REFERENCES auth.users | ユーザーID（Supabase Authと連携） |
| name        | text        | NOT NULL                           | ユーザー名                        |
| email       | text        | UNIQUE, NOT NULL                   | メールアドレス                    |
| avatar_url  | text        | NULL                               | アバター画像URL                   |
| is_approved | boolean     | DEFAULT false                      | 承認状態                          |
| role        | text        | DEFAULT 'user', CHECK              | ユーザーロール（user/admin）      |
| created_at  | timestamptz | DEFAULT now()                      | 作成日時                          |
| updated_at  | timestamptz | DEFAULT now()                      | 更新日時                          |

#### インデックス

```sql
-- 現在実装されているインデックス（基本的なもののみ）
-- パフォーマンス向上のため、以下のインデックス追加を推奨
-- CREATE INDEX idx_profiles_email ON profiles(email);
-- CREATE INDEX idx_profiles_is_approved ON profiles(is_approved);
-- CREATE INDEX idx_profiles_role ON profiles(role);
```

### 2. categories テーブル

投稿のカテゴリ情報を管理するテーブルです。

#### スキーマ

```sql
CREATE TABLE categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_ja text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL
);
```

#### カラム詳細

| カラム名 | 型   | 制約        | 説明              |
| -------- | ---- | ----------- | ----------------- |
| id       | text | PRIMARY KEY | カテゴリID        |
| name     | text | NOT NULL    | 英語名            |
| name_ja  | text | NOT NULL    | 日本語名          |
| icon     | text | NOT NULL    | Lucideアイコン名  |
| color    | text | NOT NULL    | カテゴリ色（HEX） |

#### 初期データ

```sql
INSERT INTO categories (id, name, name_ja, icon, color) VALUES
  ('hospital', 'Hospital', '病院', 'Heart', '#FF6B6B'),
  ('beauty', 'Beauty', '美容院', 'Scissors', '#4ECDC4'),
  ('shopping', 'Shopping', '買い物', 'ShoppingBag', '#FFE66D'),
  ('restaurant', 'Restaurant', 'レストラン', 'UtensilsCrossed', '#95E1D3'),
  ('kids', 'Kids', '子ども', 'Baby', '#F38BA8'),
  ('park', 'Park', '公園', 'Trees', '#A8E6CF');
```

### 3. posts テーブル

投稿情報を管理するメインテーブルです。

#### スキーマ

```sql
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  summary text,
  type text NOT NULL CHECK (type IN ('post', 'consultation', 'transfer')),
  status text CHECK (status IN ('open', 'in_progress', 'closed')),
  category_id text REFERENCES categories(id),
  location_lat numeric NOT NULL,
  location_lng numeric NOT NULL,
  location_address text NOT NULL,
  images text[] DEFAULT '{}',
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  likes integer DEFAULT 0,
  replies integer DEFAULT 0,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### カラム詳細

| カラム名         | 型          | 制約                                   | 説明                                     |
| ---------------- | ----------- | -------------------------------------- | ---------------------------------------- |
| id               | uuid        | PRIMARY KEY, DEFAULT gen_random_uuid() | 投稿ID                                   |
| title            | text        | NOT NULL                               | 投稿タイトル                             |
| content          | text        | NOT NULL                               | 投稿内容                                 |
| summary          | text        | NULL                                   | 投稿要約                                 |
| type             | text        | NOT NULL, CHECK                        | 投稿タイプ（post/consultation/transfer） |
| status           | text        | CHECK                                  | ステータス（open/in_progress/closed）    |
| category_id      | text        | REFERENCES categories(id)              | カテゴリID                               |
| location_lat     | numeric     | NOT NULL                               | 緯度                                     |
| location_lng     | numeric     | NOT NULL                               | 経度                                     |
| location_address | text        | NOT NULL                               | 住所                                     |
| images           | text[]      | DEFAULT '{}'                           | 画像URL配列                              |
| author_id        | uuid        | REFERENCES profiles(id)                | 投稿者ID                                 |
| likes            | integer     | DEFAULT 0                              | いいね数                                 |
| replies          | integer     | DEFAULT 0                              | 返信数                                   |
| approved         | boolean     | DEFAULT false                          | 承認状態                                 |
| created_at       | timestamptz | DEFAULT now()                          | 作成日時                                 |
| updated_at       | timestamptz | DEFAULT now()                          | 更新日時                                 |

#### インデックス

```sql
-- 現在実装されているインデックス（基本的なもののみ）
-- パフォーマンス向上のため、以下のインデックス追加を推奨
-- CREATE INDEX idx_posts_type ON posts(type);
-- CREATE INDEX idx_posts_category_id ON posts(category_id);
-- CREATE INDEX idx_posts_author_id ON posts(author_id);
-- CREATE INDEX idx_posts_approved ON posts(approved);
-- CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
-- CREATE INDEX idx_posts_location ON posts(location_lat, location_lng);
```

### 4. comments テーブル

投稿へのコメント・返信を管理するテーブルです。

#### スキーマ

```sql
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### カラム詳細

| カラム名   | 型          | 制約                                   | 説明                   |
| ---------- | ----------- | -------------------------------------- | ---------------------- |
| id         | uuid        | PRIMARY KEY, DEFAULT gen_random_uuid() | コメントID             |
| post_id    | uuid        | NOT NULL, REFERENCES posts(id)         | 投稿ID                 |
| author_id  | uuid        | NOT NULL, REFERENCES profiles(id)      | コメント投稿者ID       |
| content    | text        | NOT NULL                               | コメント内容           |
| parent_id  | uuid        | REFERENCES comments(id)                | 親コメントID（返信用） |
| approved   | boolean     | DEFAULT true                           | 承認状態               |
| created_at | timestamptz | DEFAULT now()                          | 作成日時               |
| updated_at | timestamptz | DEFAULT now()                          | 更新日時               |

### 5. likes テーブル

投稿へのいいねを管理するテーブルです。

#### スキーマ

```sql
CREATE TABLE likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);
```

#### カラム詳細

| カラム名   | 型          | 制約                                   | 説明                 |
| ---------- | ----------- | -------------------------------------- | -------------------- |
| id         | uuid        | PRIMARY KEY, DEFAULT gen_random_uuid() | いいねID             |
| user_id    | uuid        | NOT NULL, REFERENCES profiles(id)      | いいねしたユーザーID |
| post_id    | uuid        | NOT NULL, REFERENCES posts(id)         | いいねされた投稿ID   |
| created_at | timestamptz | DEFAULT now()                          | いいね日時           |

### 6. profile_details テーブル

ユーザーの詳細プロフィール情報を管理するテーブルです。

#### スキーマ

```sql
CREATE TABLE profile_details (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bio text,
  location_area text,
  interests text[],
  languages text[],
  arrival_date date,
  family_structure text,
  privacy_settings jsonb DEFAULT '{"profile_visible": true, "posts_visible": true, "activity_visible": true, "contact_allowed": true}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### カラム詳細

| カラム名         | 型          | 制約                                 | 説明               |
| ---------------- | ----------- | ------------------------------------ | ------------------ |
| profile_id       | uuid        | PRIMARY KEY, REFERENCES profiles(id) | プロフィールID     |
| bio              | text        | NULL                                 | 自己紹介           |
| location_area    | text        | NULL                                 | 居住エリア         |
| interests        | text[]      | NULL                                 | 趣味・関心事の配列 |
| languages        | text[]      | NULL                                 | 話せる言語の配列   |
| arrival_date     | date        | NULL                                 | シカゴ到着日       |
| family_structure | text        | NULL                                 | 家族構成           |
| privacy_settings | jsonb       | DEFAULT privacy_settings_default     | プライバシー設定   |
| created_at       | timestamptz | DEFAULT now()                        | 作成日時           |
| updated_at       | timestamptz | DEFAULT now()                        | 更新日時           |

#### プライバシー設定の詳細

```json
{
  "profile_visible": true, // プロフィール表示許可
  "posts_visible": true, // 投稿表示許可
  "activity_visible": true, // 活動履歴表示許可
  "contact_allowed": true // 連絡許可
}
```

### 7. notification_settings テーブル

ユーザー別通知設定を管理するテーブルです。

#### スキーマ

```sql
CREATE TABLE notification_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  push_likes boolean DEFAULT true,
  push_comments boolean DEFAULT true,
  push_mentions boolean DEFAULT true,
  email_likes boolean DEFAULT false,
  email_comments boolean DEFAULT true,
  email_mentions boolean DEFAULT false,
  weekly_digest boolean DEFAULT false,
  important_updates boolean DEFAULT true,
  system_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### カラム詳細

| カラム名             | 型          | 制約                                 | 説明                       |
| -------------------- | ----------- | ------------------------------------ | -------------------------- |
| user_id              | uuid        | PRIMARY KEY, REFERENCES profiles(id) | ユーザーID                 |
| push_likes           | boolean     | DEFAULT true                         | プッシュ通知（いいね）     |
| push_comments        | boolean     | DEFAULT true                         | プッシュ通知（コメント）   |
| push_mentions        | boolean     | DEFAULT true                         | プッシュ通知（メンション） |
| email_likes          | boolean     | DEFAULT false                        | メール通知（いいね）       |
| email_comments       | boolean     | DEFAULT true                         | メール通知（コメント）     |
| email_mentions       | boolean     | DEFAULT false                        | メール通知（メンション）   |
| weekly_digest        | boolean     | DEFAULT false                        | 週次ダイジェスト           |
| important_updates    | boolean     | DEFAULT true                         | 重要更新通知               |
| system_notifications | boolean     | DEFAULT true                         | システム通知               |
| created_at           | timestamptz | DEFAULT now()                        | 作成日時                   |
| updated_at           | timestamptz | DEFAULT now()                        | 更新日時                   |

### 8. 通知システム（3テーブル構成）

通知システムは効率的な管理のため、以下の3つのテーブルで構成されています。

#### 8.1 system_notifications テーブル

管理者が作成するシステム通知を管理するテーブルです。

##### スキーマ

```sql
CREATE TABLE system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('app_update', 'system_maintenance', 'feature_release', 'community_event', 'system')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at timestamptz,
  action_url text,
  action_text text,
  target_users text[] DEFAULT '{}',
  total_recipients integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  read_count integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'cancelled')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

##### カラム詳細

| カラム名         | 型          | 制約                    | 説明                             |
| ---------------- | ----------- | ----------------------- | -------------------------------- |
| id               | uuid        | PRIMARY KEY             | システム通知ID                   |
| title            | text        | NOT NULL                | 通知タイトル                     |
| message          | text        | NOT NULL                | 通知メッセージ                   |
| type             | text        | NOT NULL, CHECK         | 通知タイプ                       |
| priority         | text        | DEFAULT 'normal', CHECK | 優先度（低・通常・高・緊急）     |
| expires_at       | timestamptz | NULL                    | 有効期限                         |
| action_url       | text        | NULL                    | アクションURL                    |
| action_text      | text        | NULL                    | アクションボタンテキスト         |
| target_users     | text[]      | DEFAULT '{}'            | 対象ユーザー（空なら全ユーザー） |
| total_recipients | integer     | DEFAULT 0               | 総対象者数                       |
| delivered_count  | integer     | DEFAULT 0               | 配信済み数                       |
| read_count       | integer     | DEFAULT 0               | 既読数                           |
| status           | text        | DEFAULT 'draft', CHECK  | 配信状態                         |
| created_by       | uuid        | REFERENCES profiles(id) | 作成者ID                         |
| created_at       | timestamptz | DEFAULT now()           | 作成日時                         |
| updated_at       | timestamptz | DEFAULT now()           | 更新日時                         |

#### 8.2 notification_deliveries テーブル

システム通知の配信状況を追跡するテーブルです。

##### スキーマ

```sql
CREATE TABLE notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_notification_id uuid REFERENCES system_notifications(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  user_notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'read', 'failed')),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(system_notification_id, recipient_id)
);
```

##### カラム詳細

| カラム名               | 型          | 制約                                | 説明           |
| ---------------------- | ----------- | ----------------------------------- | -------------- |
| id                     | uuid        | PRIMARY KEY                         | 配信記録ID     |
| system_notification_id | uuid        | REFERENCES system_notifications(id) | システム通知ID |
| recipient_id           | uuid        | REFERENCES profiles(id)             | 受信者ID       |
| user_notification_id   | uuid        | REFERENCES notifications(id)        | ユーザー通知ID |
| status                 | text        | DEFAULT 'pending', CHECK            | 配信状態       |
| delivered_at           | timestamptz | NULL                                | 配信日時       |
| read_at                | timestamptz | NULL                                | 既読日時       |
| created_at             | timestamptz | DEFAULT now()                       | 作成日時       |

#### 8.3 notifications テーブル

個別ユーザーへの通知を管理するテーブルです。

##### スキーマ

```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'mention', 'system', 'weekly_digest', 'app_update', 'system_maintenance', 'feature_release', 'community_event')),
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  related_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  related_comment_id uuid REFERENCES comments(id) ON DELETE SET NULL,
  is_read boolean DEFAULT false,
  is_pushed boolean DEFAULT false,
  is_emailed boolean DEFAULT false,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at timestamptz,
  action_url text,
  action_text text,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  pushed_at timestamptz,
  emailed_at timestamptz
);
```

##### カラム詳細

| カラム名           | 型          | 制約                              | 説明                     |
| ------------------ | ----------- | --------------------------------- | ------------------------ |
| id                 | uuid        | PRIMARY KEY                       | 通知ID                   |
| recipient_id       | uuid        | NOT NULL, REFERENCES profiles(id) | 受信者ID                 |
| sender_id          | uuid        | REFERENCES profiles(id)           | 送信者ID                 |
| type               | text        | NOT NULL, CHECK                   | 通知タイプ               |
| title              | text        | NOT NULL                          | 通知タイトル             |
| message            | text        | NOT NULL                          | 通知メッセージ           |
| metadata           | jsonb       | DEFAULT '{}'                      | 通知メタデータ           |
| related_post_id    | uuid        | REFERENCES posts(id)              | 関連投稿ID               |
| related_comment_id | uuid        | REFERENCES comments(id)           | 関連コメントID           |
| is_read            | boolean     | DEFAULT false                     | 既読状態                 |
| is_pushed          | boolean     | DEFAULT false                     | プッシュ配信済み         |
| is_emailed         | boolean     | DEFAULT false                     | メール配信済み           |
| priority           | text        | DEFAULT 'normal', CHECK           | 優先度                   |
| expires_at         | timestamptz | NULL                              | 有効期限                 |
| action_url         | text        | NULL                              | アクションURL            |
| action_text        | text        | NULL                              | アクションボタンテキスト |
| created_at         | timestamptz | DEFAULT now()                     | 作成日時                 |
| read_at            | timestamptz | NULL                              | 既読日時                 |
| pushed_at          | timestamptz | NULL                              | プッシュ配信日時         |
| emailed_at         | timestamptz | NULL                              | メール配信日時           |

#### インデックス

```sql
-- system_notifications テーブルのインデックス
CREATE INDEX idx_system_notifications_status ON system_notifications(status);
CREATE INDEX idx_system_notifications_type ON system_notifications(type);
CREATE INDEX idx_system_notifications_created_at ON system_notifications(created_at);

-- notification_deliveries テーブルのインデックス
CREATE INDEX idx_notification_deliveries_system_id ON notification_deliveries(system_notification_id);
CREATE INDEX idx_notification_deliveries_recipient ON notification_deliveries(recipient_id);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);

-- notifications テーブルのインデックス
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX idx_notifications_metadata_system_id ON notifications USING GIN (metadata);
```

## リレーション

### 外部キー制約

1. **profiles.id** → **auth.users.id**
   - 削除時: CASCADE（ユーザー削除時にプロフィールも削除）

2. **posts.author_id** → **profiles.id**
   - 削除時: CASCADE（ユーザー削除時に投稿も削除）

3. **posts.category_id** → **categories.id**
   - 削除時: 制約なし（カテゴリ削除時は投稿を残す）

4. **comments.post_id** → **posts.id**
   - 削除時: CASCADE（投稿削除時にコメントも削除）

5. **comments.author_id** → **profiles.id**
   - 削除時: CASCADE（ユーザー削除時にコメントも削除）

6. **comments.parent_id** → **comments.id**
   - 削除時: CASCADE（親コメント削除時に子コメントも削除）

7. **likes.user_id** → **profiles.id**
   - 削除時: CASCADE（ユーザー削除時にいいねも削除）

8. **likes.post_id** → **posts.id**
   - 削除時: CASCADE（投稿削除時にいいねも削除）

9. **profile_details.profile_id** → **profiles.id**
   - 削除時: CASCADE（ユーザー削除時に詳細情報も削除）

10. **notification_settings.user_id** → **profiles.id**
    - 削除時: CASCADE（ユーザー削除時に通知設定も削除）

11. **notifications.recipient_id** → **profiles.id**
    - 削除時: CASCADE（ユーザー削除時に通知も削除）

12. **notifications.sender_id** → **profiles.id**
    - 削除時: SET NULL（送信者削除時は通知を残す）

13. **notifications.related_post_id** → **posts.id**
    - 削除時: SET NULL（投稿削除時は通知を残す）

14. **notifications.related_comment_id** → **comments.id**
    - 削除時: SET NULL（コメント削除時は通知を残す）

## セキュリティ設計

### Row Level Security (RLS)

すべてのテーブルでRLSが有効化されています。

#### profiles テーブルのポリシー

```sql
-- 承認済みプロフィールの読み取り
CREATE POLICY "Users can read all approved profiles"
  ON profiles FOR SELECT TO authenticated
  USING (is_approved = true);

-- 自分のプロフィールの読み取り
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 自分のプロフィールの作成
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 自分のプロフィールの更新
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
```

#### categories テーブルのポリシー

```sql
-- カテゴリの読み取り（認証済みユーザー全員）
CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT TO authenticated
  USING (true);
```

#### posts テーブルのポリシー

```sql
-- 承認済み投稿の読み取り
CREATE POLICY "Users can read approved posts"
  ON posts FOR SELECT TO authenticated
  USING (approved = true);

-- 自分の投稿の読み取り
CREATE POLICY "Users can read own posts"
  ON posts FOR SELECT TO authenticated
  USING (auth.uid() = author_id);

-- 投稿の作成
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 自分の投稿の更新
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);
```

#### comments テーブルのポリシー

```sql
-- 承認済みコメントの読み取り
CREATE POLICY "Users can read approved comments"
  ON comments FOR SELECT TO authenticated
  USING (approved = true);

-- 自分のコメントの読み取り
CREATE POLICY "Users can read their own comments"
  ON comments FOR SELECT TO authenticated
  USING (auth.uid() = author_id);

-- コメントの作成
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 自分のコメントの更新
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);

-- 自分のコメントの削除
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id);
```

#### likes テーブルのポリシー

```sql
-- いいねの読み取り
CREATE POLICY "Users can read all likes"
  ON likes FOR SELECT TO authenticated
  USING (true);

-- いいねの作成
CREATE POLICY "Users can create their own likes"
  ON likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- いいねの削除
CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

#### profile_details テーブルのポリシー

```sql
-- 自分の詳細情報の読み取り
CREATE POLICY "Users can read own profile details"
  ON profile_details FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

-- 自分の詳細情報の作成
CREATE POLICY "Users can create own profile details"
  ON profile_details FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

-- 自分の詳細情報の更新
CREATE POLICY "Users can update own profile details"
  ON profile_details FOR UPDATE TO authenticated
  USING (auth.uid() = profile_id);
```

#### notification_settings テーブルのポリシー

```sql
-- 自分の通知設定の読み取り
CREATE POLICY "Users can read own notification settings"
  ON notification_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 自分の通知設定の作成
CREATE POLICY "Users can create own notification settings"
  ON notification_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 自分の通知設定の更新
CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
```

#### notifications テーブルのポリシー

```sql
-- 自分の通知の読み取り
CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

-- 自分の通知の更新
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

-- サービスによる通知作成
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT TO authenticated, service_role
  WITH CHECK (true);
```

## トリガーと関数

### updated_at 自動更新

```sql
-- トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルのトリガー
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_details_updated_at
  BEFORE UPDATE ON profile_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 自動カウント更新

#### いいね数の自動更新

```sql
-- いいね数更新関数
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET likes = COALESCE(likes, 0) + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- いいね数更新トリガー
CREATE TRIGGER update_post_likes_trigger
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();
```

#### コメント数の自動更新

```sql
-- コメント数更新関数
CREATE OR REPLACE FUNCTION update_post_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET replies = replies + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET replies = replies - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- コメント数更新トリガー
CREATE TRIGGER update_post_replies_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_replies_count();
```

### 通知自動生成

#### いいね通知の自動生成

```sql
-- いいね通知作成関数
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  post_title text;
BEGIN
  -- 投稿の著者とタイトルを取得
  SELECT author_id, title INTO post_author_id, post_title
  FROM posts
  WHERE id = NEW.post_id;

  -- 自分の投稿へのいいねは通知しない
  IF NEW.user_id = post_author_id THEN
    RETURN NEW;
  END IF;

  -- 通知を作成
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    metadata,
    related_post_id
  ) VALUES (
    post_author_id,
    NEW.user_id,
    'like',
    '新しいいいね',
    post_title || ' にいいねが付きました',
    jsonb_build_object('post_id', NEW.post_id, 'post_title', post_title),
    NEW.post_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- いいね通知作成トリガー
CREATE TRIGGER trigger_create_like_notification
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();
```

#### コメント通知の自動生成

```sql
-- コメント通知作成関数
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  post_title text;
  commenter_name text;
BEGIN
  -- 投稿の著者とタイトルを取得
  SELECT author_id, title INTO post_author_id, post_title
  FROM posts
  WHERE id = NEW.post_id;

  -- コメント投稿者の名前を取得
  SELECT name INTO commenter_name
  FROM profiles
  WHERE id = NEW.author_id;

  -- 自分の投稿へのコメントは通知しない
  IF NEW.author_id = post_author_id THEN
    RETURN NEW;
  END IF;

  -- 通知を作成
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    metadata,
    related_post_id,
    related_comment_id
  ) VALUES (
    post_author_id,
    NEW.author_id,
    'comment',
    '新しいコメント',
    post_title || ' にコメントが付きました',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'post_title', post_title,
      'comment_id', NEW.id,
      'commenter_name', commenter_name
    ),
    NEW.post_id,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント通知作成トリガー
CREATE TRIGGER trigger_create_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();
```

#### 返信通知の自動生成

```sql
-- 返信通知作成関数
CREATE OR REPLACE FUNCTION create_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_author_id uuid;
  post_title text;
  replier_name text;
BEGIN
  -- 返信の場合のみ処理（parent_idがある場合）
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 親コメントの著者を取得
  SELECT author_id INTO parent_comment_author_id
  FROM comments
  WHERE id = NEW.parent_id;

  -- 投稿タイトルを取得
  SELECT title INTO post_title
  FROM posts
  WHERE id = NEW.post_id;

  -- 返信者の名前を取得
  SELECT name INTO replier_name
  FROM profiles
  WHERE id = NEW.author_id;

  -- 自分のコメントへの返信は通知しない
  IF NEW.author_id = parent_comment_author_id THEN
    RETURN NEW;
  END IF;

  -- 通知を作成
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    metadata,
    related_post_id,
    related_comment_id
  ) VALUES (
    parent_comment_author_id,
    NEW.author_id,
    'comment',
    '新しい返信',
    post_title || ' のコメントに返信が付きました',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'post_title', post_title,
      'comment_id', NEW.id,
      'parent_comment_id', NEW.parent_id,
      'replier_name', replier_name
    ),
    NEW.post_id,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 返信通知作成トリガー
CREATE TRIGGER trigger_create_reply_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_reply_notification();
```

### 通知管理関数

#### 通知作成関数

```sql
-- 通知作成関数
CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_sender_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_related_post_id uuid DEFAULT NULL,
  p_related_comment_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (
    recipient_id, sender_id, type, title, message,
    metadata, related_post_id, related_comment_id
  )
  VALUES (
    p_recipient_id, p_sender_id, p_type, p_title, p_message,
    p_metadata, p_related_post_id, p_related_comment_id
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 通知既読管理関数

```sql
-- 通知既読化関数
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND recipient_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 全通知既読化関数
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id uuid)
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE recipient_id = user_id AND is_read = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 統計同期関数

#### いいね数・コメント数の同期

```sql
-- 全投稿のいいね数を同期
CREATE OR REPLACE FUNCTION sync_all_post_likes()
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET likes = (
    SELECT COUNT(*)
    FROM likes
    WHERE likes.post_id = posts.id
  );
END;
$$ LANGUAGE plpgsql;

-- 全投稿のコメント数を同期
CREATE OR REPLACE FUNCTION sync_all_post_replies()
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET replies = (
    SELECT COUNT(*)
    FROM comments
    WHERE comments.post_id = posts.id
  );
END;
$$ LANGUAGE plpgsql;
```

## データ型と制約

### 列挙型

#### 投稿タイプ (post.type)

- `post`: 通常の投稿
- `consultation`: 相談
- `transfer`: 譲渡

#### 投稿ステータス (post.status)

- `open`: オープン
- `in_progress`: 進行中
- `closed`: クローズ

#### ユーザーロール (profile.role)

- `user`: 一般ユーザー
- `admin`: 管理者

#### 通知タイプ (notification.type)

- `like`: いいね
- `comment`: コメント
- `mention`: メンション
- `system`: システム通知
- `weekly_digest`: 週次ダイジェスト

### 制約

1. **NOT NULL制約**
   - 必須フィールド（name, email, title, content等）

2. **UNIQUE制約**
   - profiles.email（メールアドレスの重複防止）
   - likes(user_id, post_id)（重複いいね防止）

3. **CHECK制約**
   - 列挙型の値チェック
   - ロール値の検証

4. **外部キー制約**
   - 参照整合性の保証

## パフォーマンス最適化

### 現在実装されているインデックス

```sql
-- notifications テーブルのインデックス
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

### 推奨インデックス（パフォーマンス向上のため）

```sql
-- profiles テーブルのインデックス
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_is_approved ON profiles(is_approved);
CREATE INDEX idx_profiles_role ON profiles(role);

-- posts テーブルのインデックス
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_category_id ON posts(category_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_approved ON posts(approved);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_location ON posts(location_lat, location_lng);

-- comments テーブルのインデックス
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_approved ON comments(approved);

-- likes テーブルのインデックス
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);

-- profile_details テーブルのインデックス
CREATE INDEX idx_profile_details_profile_id ON profile_details(profile_id);

-- notification_settings テーブルのインデックス
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);
```

### クエリ最適化

```sql
-- 承認済み投稿の取得（JOIN使用）
SELECT
  p.*,
  pr.name as author_name,
  pr.avatar_url as author_avatar,
  c.name_ja as category_name,
  c.icon as category_icon,
  c.color as category_color
FROM posts p
JOIN profiles pr ON p.author_id = pr.id
JOIN categories c ON p.category_id = c.id
WHERE p.approved = true
ORDER BY p.created_at DESC;
```

## バックアップ戦略

### Supabase自動バックアップ

- 日次自動バックアップ
- ポイントインタイムリカバリ（PITR）
- 地理的冗長性

### データエクスポート

```sql
-- 投稿データのエクスポート
COPY (
  SELECT
    p.id,
    p.title,
    p.content,
    p.type,
    p.location_address,
    pr.name as author_name,
    c.name_ja as category_name,
    p.created_at
  FROM posts p
  JOIN profiles pr ON p.author_id = pr.id
  JOIN categories c ON p.category_id = c.id
  WHERE p.approved = true
) TO STDOUT WITH CSV HEADER;
```

## 監視とログ

### 重要なメトリクス

1. **投稿数**: 日次/週次投稿数
2. **アクティブユーザー**: 週次アクティブユーザー数
3. **承認率**: 投稿承認率
4. **レスポンス時間**: クエリ実行時間
5. **通知配信率**: 通知の正常配信率
6. **プロフィール完成度**: ユーザーの詳細情報入力率

### ログ監視

- 認証エラー
- 権限エラー
- 長時間クエリ
- ストレージ使用量
- 通知配信エラー

## 実装済み拡張機能

### Phase 2 完了機能 ✅

1. **プロフィール詳細機能** ✅
   - `profile_details` テーブル実装済み
   - プライバシー設定対応

2. **通知システム** ✅
   - `notifications` テーブル実装済み
   - `notification_settings` テーブル実装済み
   - リアルタイム通知対応
   - 自動通知生成トリガー

3. **いいね・コメント機能** ✅
   - `likes` テーブル実装済み
   - `comments` テーブル実装済み
   - 自動カウント更新トリガー
   - 通知自動生成統合

4. **高度なセキュリティ** ✅
   - 包括的なRLSポリシー
   - 自動トリガー関数
   - データ整合性保証

### 今後の拡張可能性

5. **検索機能** 📋
   - 全文検索インデックス
   - 位置情報検索の強化

6. **ソーシャル機能** 📋
   - フォロー機能
   - ユーザー間のつながり

7. **分析・レポート機能** 📋
   - ユーザー活動分析
   - コンテンツ人気度分析

### スケーラビリティ

- 現在: 最大100ユーザー想定
- 将来: 1000ユーザーまで対応可能
- パーティショニング戦略の検討
- 読み取り専用レプリカの検討

## パフォーマンス監視

### 重要なクエリの監視

```sql
-- 遅いクエリの特定
SELECT
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;

-- インデックス使用状況
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 自動メンテナンス

```sql
-- 統計情報の更新
ANALYZE;

-- テーブルの最適化
VACUUM ANALYZE;

-- インデックスの再構築
REINDEX TABLE posts;
```

---

**最終更新**: 2025年1月
**バージョン**: 2.1
**作成者**: HelloChicago開発チーム
**整合性確認**: 完了（マイグレーションファイルと一致）
