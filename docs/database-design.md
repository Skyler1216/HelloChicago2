# HelloChicago データベース設計書

## 概要

HelloChicagoアプリケーションのデータベース設計書です。Supabaseを使用したPostgreSQLベースのデータベースで、駐在妻コミュニティの情報共有プラットフォームを支えています。

## 技術仕様

- **データベース**: PostgreSQL (Supabase)
- **認証**: Supabase Auth
- **セキュリティ**: Row Level Security (RLS)
- **型安全性**: TypeScript型定義付き

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
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_is_approved ON profiles(is_approved);
CREATE INDEX idx_profiles_role ON profiles(role);
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
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_category_id ON posts(category_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_approved ON posts(approved);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_location ON posts(location_lat, location_lng);
```

## リレーション

### 外部キー制約

1. **profiles.id** → **auth.users.id**
   - 削除時: CASCADE（ユーザー削除時にプロフィールも削除）

2. **posts.author_id** → **profiles.id**
   - 削除時: CASCADE（ユーザー削除時に投稿も削除）

3. **posts.category_id** → **categories.id**
   - 削除時: 制約なし（カテゴリ削除時は投稿を残す）

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

## トリガー

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

-- profiles テーブルのトリガー
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- posts テーブルのトリガー
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
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

### 制約

1. **NOT NULL制約**
   - 必須フィールド（name, email, title, content等）

2. **UNIQUE制約**
   - profiles.email（メールアドレスの重複防止）

3. **CHECK制約**
   - 列挙型の値チェック
   - ロール値の検証

4. **外部キー制約**
   - 参照整合性の保証

## パフォーマンス最適化

### インデックス戦略

1. **検索最適化**
   - `posts.approved`: 承認済み投稿の高速検索
   - `posts.type`: 投稿タイプ別検索
   - `posts.category_id`: カテゴリ別検索

2. **時系列最適化**
   - `posts.created_at DESC`: 最新投稿の高速取得

3. **位置情報最適化**
   - `posts.location_lat, posts.location_lng`: 位置情報検索

4. **ユーザー関連最適化**
   - `posts.author_id`: ユーザー別投稿検索
   - `profiles.email`: メールアドレス検索

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

### ログ監視

- 認証エラー
- 権限エラー
- 長時間クエリ
- ストレージ使用量

## 将来の拡張性

### 予定されている機能

1. **コメント機能**
   - `comments` テーブルの追加
   - 投稿への返信機能

2. **いいね機能**
   - `likes` テーブルの追加
   - ユーザー別いいね管理

3. **通知機能**
   - `notifications` テーブルの追加
   - リアルタイム通知

4. **検索機能**
   - 全文検索インデックス
   - 位置情報検索の強化

### スケーラビリティ

- 現在: 最大100ユーザー想定
- 将来: 1000ユーザーまで対応可能
- パーティショニング戦略の検討

---

**最終更新**: 2025年1月
**バージョン**: 1.0
**作成者**: HelloChicago開発チーム
