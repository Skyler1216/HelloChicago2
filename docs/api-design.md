# HelloChicago API設計書

## 概要

HelloChicagoアプリケーションのAPI設計書です。Supabaseを使用したRESTful APIで、駐在妻コミュニティの情報共有プラットフォームを支えています。

## 技術仕様

- **ベースURL**: Supabase Project URL
- **認証**: Supabase Auth (JWT)
- **データ形式**: JSON
- **エンコーディング**: UTF-8
- **APIバージョン**: v1

## 認証・認可

### 認証方式

- **Supabase Auth**: JWTトークンベース認証
- **トークン有効期限**: 1時間（リフレッシュトークン: 1週間）
- **認証ヘッダー**: `Authorization: Bearer <jwt_token>`

### 認可レベル

1. **未認証**: カテゴリ読み取りのみ
2. **認証済み**: 自分のデータの読み書き
3. **承認済み**: 承認済みコンテンツの読み取り
4. **管理者**: 全データの読み書き、承認権限

## エンドポイント一覧

### 認証関連

#### POST /auth/signup

ユーザー登録

**リクエスト**

```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "田中花子"
}
```

**レスポンス**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "name": "田中花子"
    }
  },
  "profile": {
    "id": "uuid",
    "name": "田中花子",
    "email": "user@example.com",
    "is_approved": true,
    "role": "user"
  }
}
```

#### POST /auth/signin

ユーザーログイン

**リクエスト**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**レスポンス**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

#### POST /auth/signout

ユーザーログアウト

**レスポンス**

```json
{
  "message": "Successfully signed out"
}
```

### プロフィール関連

#### GET /profiles/me

自分のプロフィール取得

**レスポンス**

```json
{
  "id": "uuid",
  "name": "田中花子",
  "email": "user@example.com",
  "avatar_url": "https://example.com/avatar.jpg",
  "is_approved": true,
  "role": "user",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

#### PUT /profiles/me

プロフィール更新

**リクエスト**

```json
{
  "name": "田中花子",
  "avatar_url": "https://example.com/new-avatar.jpg"
}
```

**レスポンス**

```json
{
  "id": "uuid",
  "name": "田中花子",
  "email": "user@example.com",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "is_approved": true,
  "role": "user",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### カテゴリ関連

#### GET /categories

カテゴリ一覧取得

**レスポンス**

```json
[
  {
    "id": "hospital",
    "name": "Hospital",
    "name_ja": "病院",
    "icon": "Heart",
    "color": "#FF6B6B"
  },
  {
    "id": "beauty",
    "name": "Beauty",
    "name_ja": "美容院",
    "icon": "Scissors",
    "color": "#4ECDC4"
  }
]
```

### 投稿関連

#### GET /posts

投稿一覧取得

**クエリパラメータ**

- `type`: 投稿タイプ（post, consultation, transfer）
- `category_id`: カテゴリID
- `approved`: 承認状態（true/false）
- `limit`: 取得件数（デフォルト: 20）
- `offset`: オフセット（デフォルト: 0）

**レスポンス**

```json
[
  {
    "id": "uuid",
    "title": "ミレニアムパークで子どもとピクニック",
    "content": "とても楽しいピクニックでした...",
    "summary": "ピクニック体験談",
    "type": "post",
    "status": null,
    "category_id": "park",
    "location_lat": 41.8825,
    "location_lng": -87.6225,
    "location_address": "201 E Randolph St, Chicago, IL 60602",
    "images": ["https://example.com/image1.jpg"],
    "author_id": "uuid",
    "likes": 5,
    "replies": 2,
    "approved": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
    "profiles": {
      "id": "uuid",
      "name": "田中花子",
      "avatar_url": "https://example.com/avatar.jpg"
    },
    "categories": {
      "id": "park",
      "name": "Park",
      "name_ja": "公園",
      "icon": "Trees",
      "color": "#A8E6CF"
    }
  }
]
```

#### GET /posts/{id}

投稿詳細取得

**レスポンス**

```json
{
  "id": "uuid",
  "title": "ミレニアムパークで子どもとピクニック",
  "content": "とても楽しいピクニックでした...",
  "summary": "ピクニック体験談",
  "type": "post",
  "status": null,
  "category_id": "park",
  "location_lat": 41.8825,
  "location_lng": -87.6225,
  "location_address": "201 E Randolph St, Chicago, IL 60602",
  "images": ["https://example.com/image1.jpg"],
  "author_id": "uuid",
  "likes": 5,
  "replies": 2,
  "approved": true,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "profiles": {
    "id": "uuid",
    "name": "田中花子",
    "avatar_url": "https://example.com/avatar.jpg"
  },
  "categories": {
    "id": "park",
    "name": "Park",
    "name_ja": "公園",
    "icon": "Trees",
    "color": "#A8E6CF"
  }
}
```

#### POST /posts

投稿作成

**リクエスト**

```json
{
  "title": "ミレニアムパークで子どもとピクニック",
  "content": "とても楽しいピクニックでした...",
  "type": "post",
  "category_id": "park",
  "location_lat": 41.8825,
  "location_lng": -87.6225,
  "location_address": "201 E Randolph St, Chicago, IL 60602",
  "images": ["https://example.com/image1.jpg"],
  "status": null
}
```

**レスポンス**

```json
{
  "id": "uuid",
  "title": "ミレニアムパークで子どもとピクニック",
  "content": "とても楽しいピクニックでした...",
  "type": "post",
  "category_id": "park",
  "location_lat": 41.8825,
  "location_lng": -87.6225,
  "location_address": "201 E Randolph St, Chicago, IL 60602",
  "images": ["https://example.com/image1.jpg"],
  "author_id": "uuid",
  "likes": 0,
  "replies": 0,
  "approved": true,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

#### PUT /posts/{id}

投稿更新

**リクエスト**

```json
{
  "title": "更新されたタイトル",
  "content": "更新された内容"
}
```

#### DELETE /posts/{id}

投稿削除

**レスポンス**

```json
{
  "message": "Post deleted successfully"
}
```

### 管理者機能

#### GET /admin/posts/pending

承認待ち投稿一覧取得

**レスポンス**

```json
[
  {
    "id": "uuid",
    "title": "承認待ちの投稿",
    "content": "内容...",
    "approved": false,
    "created_at": "2025-01-01T00:00:00Z",
    "profiles": {
      "id": "uuid",
      "name": "田中花子"
    }
  }
]
```

#### PUT /admin/posts/{id}/approve

投稿承認

**レスポンス**

```json
{
  "id": "uuid",
  "approved": true,
  "updated_at": "2025-01-01T00:00:00Z"
}
```

#### PUT /admin/profiles/{id}/approve

ユーザー承認

**レスポンス**

```json
{
  "id": "uuid",
  "is_approved": true,
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### 統計・分析

#### GET /stats/posts

投稿統計

**レスポンス**

```json
{
  "total_posts": 150,
  "posts_by_type": {
    "post": 100,
    "consultation": 30,
    "transfer": 20
  },
  "posts_by_category": {
    "hospital": 25,
    "beauty": 20,
    "shopping": 30,
    "restaurant": 35,
    "kids": 25,
    "park": 15
  },
  "recent_posts": 15
}
```

#### GET /stats/popular-spots

人気スポット

**レスポンス**

```json
[
  {
    "location_address": "251 E Huron St, Chicago, IL 60611",
    "location_lat": 41.8781,
    "location_lng": -87.6298,
    "post_count": 8,
    "category": {
      "id": "hospital",
      "name_ja": "病院",
      "icon": "Heart",
      "color": "#FF6B6B"
    }
  }
]
```

## エラーハンドリング

### エラーレスポンス形式

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {
      "field": "エラー詳細"
    }
  }
}
```

### 主要エラーコード

| コード                     | HTTPステータス | 説明                   |
| -------------------------- | -------------- | ---------------------- |
| `AUTH_REQUIRED`            | 401            | 認証が必要             |
| `INSUFFICIENT_PERMISSIONS` | 403            | 権限不足               |
| `RESOURCE_NOT_FOUND`       | 404            | リソースが見つからない |
| `VALIDATION_ERROR`         | 400            | バリデーションエラー   |
| `DUPLICATE_EMAIL`          | 409            | メールアドレス重複     |
| `UNAPPROVED_USER`          | 403            | 未承認ユーザー         |
| `RATE_LIMIT_EXCEEDED`      | 429            | レート制限超過         |

### エラー例

#### 認証エラー

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "認証が必要です",
    "details": {
      "token": "無効なトークン"
    }
  }
}
```

#### バリデーションエラー

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力データが無効です",
    "details": {
      "title": "タイトルは必須です",
      "content": "内容は100文字以上で入力してください"
    }
  }
}
```

## レート制限

### 制限値

- **認証エンドポイント**: 5回/分
- **投稿作成**: 10回/時間
- **一般エンドポイント**: 100回/分

### レスポンスヘッダー

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## データ検証

### 投稿作成時のバリデーション

```typescript
interface PostValidation {
  title: {
    required: true;
    minLength: 1;
    maxLength: 200;
  };
  content: {
    required: true;
    minLength: 10;
    maxLength: 5000;
  };
  type: {
    required: true;
    enum: ['post', 'consultation', 'transfer'];
  };
  category_id: {
    required: true;
    exists: 'categories.id';
  };
  location_lat: {
    required: true;
    type: 'number';
    min: -90;
    max: 90;
  };
  location_lng: {
    required: true;
    type: 'number';
    min: -180;
    max: 180;
  };
  location_address: {
    required: true;
    minLength: 1;
    maxLength: 500;
  };
}
```

### プロフィール更新時のバリデーション

```typescript
interface ProfileValidation {
  name: {
    required: true;
    minLength: 1;
    maxLength: 100;
  };
  avatar_url: {
    required: false;
    url: true;
    maxLength: 500;
  };
}
```

## セキュリティ

### 入力サニタイゼーション

- SQLインジェクション対策
- XSS対策
- ファイルアップロード検証

### CORS設定

```typescript
const corsOptions = {
  origin: ['https://hellochicago.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
```

### セキュリティヘッダー

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## パフォーマンス最適化

### キャッシュ戦略

- **カテゴリ**: 1時間キャッシュ
- **統計データ**: 30分キャッシュ
- **投稿一覧**: 5分キャッシュ

### ページネーション

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### レスポンス最適化

- 必要なフィールドのみ取得
- 画像の遅延読み込み
- 圧縮レスポンス

## 監視・ログ

### ログレベル

- **ERROR**: エラー・例外
- **WARN**: 警告
- **INFO**: 一般情報
- **DEBUG**: デバッグ情報

### 監視メトリクス

- API応答時間
- エラー率
- リクエスト数
- 認証成功率

### アラート設定

- エラー率 > 5%
- 応答時間 > 2秒
- 認証失敗率 > 10%

## 実装済み拡張機能

### Phase 2 完了エンドポイント ✅

#### 通知機能 ✅

**ユーザー通知API**

```
GET /notifications
PUT /notifications/{id}/read
PUT /notifications/mark-all-read
DELETE /notifications/{id}
GET /notification-settings
PUT /notification-settings
```

**システム通知管理API（管理者専用）** ✅

```
GET /system-notifications
POST /system-notifications
DELETE /system-notifications/{id}
GET /system-notifications/{id}/stats
GET /notification-deliveries
PUT /notification-deliveries/{id}/status
```

**PostgreSQL関数（Supabase RPC）** ✅

```
send_system_notification(title, message, type, priority, expires_at, action_url, action_text, target_users)
mark_notification_as_read(notification_id)
get_unread_notifications_count(user_id)
get_user_notifications(user_id, limit_count, offset_count)
```

#### プロフィール詳細機能 ✅

```
GET /profile-details/{id}
POST /profile-details
PUT /profile-details/{id}
DELETE /profile-details/{id}
```

#### 画像アップロード機能 ✅

```
POST /storage/avatars
DELETE /storage/avatars/{filename}
```

### システム通知管理API詳細仕様 ✅

#### 1. システム通知作成 ✅

**エンドポイント**: `POST /system-notifications` (Supabase RPC: `send_system_notification`)

**権限**: 管理者のみ

**リクエスト例**:

```json
{
  "title": "アプリアップデートのお知らせ",
  "message": "新機能が追加されました。アプリを更新してください。",
  "type": "app_update",
  "priority": "normal",
  "expires_at": "2025-02-10T23:59:59Z",
  "action_url": "https://app.hellochicago.com/update",
  "action_text": "今すぐ更新",
  "target_users": []
}
```

**レスポンス例**:

```json
{
  "success": true,
  "data": {
    "system_notification_id": "uuid",
    "total_recipients": 150,
    "delivered_count": 150,
    "status": "sent"
  }
}
```

#### 2. システム通知一覧取得 ✅

**エンドポイント**: `GET /system-notifications`

**権限**: 管理者のみ

**レスポンス例**:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "システムメンテナンス",
      "message": "明日の午前2時よりメンテナンスを実施します",
      "type": "system_maintenance",
      "priority": "high",
      "status": "sent",
      "total_recipients": 150,
      "delivered_count": 150,
      "read_count": 45,
      "created_at": "2025-01-10T10:00:00Z"
    }
  ]
}
```

#### 3. 配信統計取得 ✅

**エンドポイント**: `GET /system-notifications/{id}/stats`

**権限**: 管理者のみ

**レスポンス例**:

```json
{
  "data": {
    "total": 150,
    "delivered": 150,
    "read": 45,
    "pending": 0,
    "failed": 0
  }
}
```

#### 4. ユーザー通知既読処理 ✅

**エンドポイント**: `PUT /notifications/{id}/read` (Supabase RPC: `mark_notification_as_read`)

**権限**: 認証済みユーザー（自分の通知のみ）

**効果**:

- `notifications`テーブルの`is_read`を`true`に更新
- `notification_deliveries`テーブルの`status`を`'read'`に更新
- システム通知の`read_count`を自動更新

### 将来の拡張予定

#### コメント機能 📋

```
GET /posts/{id}/comments
POST /posts/{id}/comments
PUT /comments/{id}
DELETE /comments/{id}
```

#### 検索機能 📋

```
GET /search?q={query}&type={type}&category={category}
GET /search/nearby?lat={lat}&lng={lng}&radius={radius}
```

### WebSocket対応

- リアルタイム通知
- 投稿の即時反映
- オンライン状態管理

---

**最終更新**: 2025年1月
**バージョン**: 2.1
**作成者**: HelloChicago開発チーム
