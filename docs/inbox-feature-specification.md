# HelloChicago 受信トレイ機能仕様書

## 📋 文書概要

**作成日**: 2025年1月8日  
**バージョン**: 1.2  
**対象**: 受信トレイ機能の新規実装・最適化  
**ステータス**: ✅ 実装完了（最適化済み）

## 🎯 機能概要

### **目的**

- ユーザーが自分の投稿・相談・譲渡に関するコメントや通知を一元管理
- アプリのアップデート情報やシステム通知の配信
- コミュニティ内でのやり取りの可視化と管理

### **対象ユーザー**

- HelloChicagoアプリの全登録ユーザー
- 投稿・相談・譲渡機能を利用するユーザー
- システム通知を受け取りたいユーザー

## 🏗️ システム設計

### **アーキテクチャ概要**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│                 │    │                 │    │                 │
│ • InboxView     │◄──►│ • Supabase      │◄──►│ • notifications │
│ • Notification  │    │ • RLS Policies  │    │ • comments      │
│ • Message       │    │ • Triggers      │    │ • posts         │
│ • TabNav        │    │ • Functions     │    │ • profiles      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **技術スタック**

- **フロントエンド**: React + TypeScript + Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL + Auth + RLS)
- **状態管理**: React Hooks + Supabase Realtime
- **UI/UX**: モバイルファースト設計

## 📱 UI/UX設計

### **ナビゲーション構成**

#### **下部ナビゲーションバー（更新）**

```typescript
const navItems = [
  { id: 'home', icon: Home, label: 'ホーム' },
  { id: 'map', icon: MapPin, label: 'マップ' },
  { id: 'post', icon: Plus, label: '投稿' },
  { id: 'inbox', icon: Inbox, label: '受信トレイ' }, // 新規追加
  { id: 'profile', icon: User, label: 'プロフィール' },
];
```

#### **受信トレイ画面構成**

```
┌─────────────────────────────────────┐
│ ステータスバー                      │
├─────────────────────────────────────┤
│ ヘッダー: 「受信トレイ」            │
├─────────────────────────────────────┤
│ タブナビゲーション                  │
│ [通知] [メッセージ]                 │
├─────────────────────────────────────┤
│ コンテンツエリア                    │
│ • 通知リスト / メッセージリスト      │
│ • 空状態表示                        │
│ • 読み込み状態                      │
├─────────────────────────────────────┤
│ 下部ナビゲーションバー              │
└─────────────────────────────────────┘
```

### **タブ設計**

#### **1. 通知タブ**

- **目的**: システム通知、アプリアップデート情報の表示
- **内容**:
  - アプリバージョンアップデート通知
  - システムメンテナンス通知
  - 新機能リリース通知
  - コミュニティイベント通知

#### **2. メッセージタブ**

- **目的**: ユーザーの投稿・相談・譲渡へのコメント表示
- **内容**:
  - 自分の投稿へのコメント
  - 自分の相談へのコメント
  - 自分の譲渡投稿へのコメント
  - コメントへの返信

## 🗄️ データベース設計

### **既存テーブルの拡張**

#### **notifications テーブル（拡張）**

```sql
-- 既存のnotificationsテーブルに新しいtypeを追加
ALTER TYPE notification_type ADD VALUE 'app_update';
ALTER TYPE notification_type ADD VALUE 'system_maintenance';
ALTER TYPE notification_type ADD VALUE 'feature_release';
ALTER TYPE notification_type ADD VALUE 'community_event';

-- テーブル構造（既存 + 新規フィールド）
CREATE TABLE notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  related_post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  related_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  is_pushed boolean DEFAULT false,
  is_emailed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  pushed_at timestamptz,
  emailed_at timestamptz,

  -- 新規フィールド
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at timestamptz,
  action_url text,
  action_text text
);
```

#### **comments テーブル（新規作成）**

```sql
CREATE TABLE comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE SET NULL,
  content text NOT NULL,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- インデックス
  CREATE INDEX idx_comments_post_id ON comments(post_id);
  CREATE INDEX idx_comments_author_id ON comments(author_id);
  CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
  CREATE INDEX idx_comments_created_at ON comments(created_at);
);
```

### **RLSポリシー**

#### **notifications テーブル**

```sql
-- ユーザーは自分の通知のみ読み取り可能
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = recipient_id);

-- システム通知は全ユーザーに配信可能
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- ユーザーは自分の通知を更新可能（既読など）
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = recipient_id);
```

#### **comments テーブル**

```sql
-- 承認済みコメントは全ユーザーが読み取り可能
CREATE POLICY "Anyone can view approved comments" ON comments
  FOR SELECT USING (is_approved = true);

-- ユーザーは自分のコメントを作成可能
CREATE POLICY "Users can create own comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- ユーザーは自分のコメントを更新・削除可能
CREATE POLICY "Users can manage own comments" ON comments
  FOR ALL USING (auth.uid() = author_id);
```

## 🔧 実装仕様

### **コンポーネント構成**

#### **1. InboxView.tsx（メインコンポーネント）**

```typescript
interface InboxViewProps {
  userId: string;
  onNavigateToPost?: (postId: string) => void;
  onNavigateToComment?: (commentId: string) => void;
}

// 機能
- タブナビゲーション（通知・メッセージ）
- 通知・メッセージの統合表示
- 空状態の表示
- エラーハンドリング
```

#### **2. NotificationTab.tsx（通知タブ）**

```typescript
interface NotificationTabProps {
  userId: string;
  onNavigateToAction?: (actionUrl: string) => void;
}

// 機能
-システム通知の表示 -
  通知の既読管理 -
  通知の優先度表示 -
  アクションボタンの処理;
```

#### **3. MessageTab.tsx（メッセージタブ）**

```typescript
interface MessageTabProps {
  userId: string;
  onNavigateToPost: (postId: string) => void;
  onNavigateToComment: (commentId: string) => void;
}

// 機能
-コメントの表示 - コメントへの返信 - 投稿への直接遷移 - コメントの承認状態表示;
```

#### **4. InboxItem.tsx（共通アイテム）**

```typescript
interface InboxItemProps {
  item: Notification | Comment;
  type: 'notification' | 'message';
  onAction?: () => void;
  onMarkAsRead?: () => void;
}

// 機能
-通知・メッセージの統一表示 -
  既読・未読の状態管理 -
  アクション処理 -
  時間表示の最適化;
```

### **カスタムフック**

#### **1. useInbox.ts（統合フック）**

```typescript
interface UseInboxReturn {
  notifications: Notification[];
  messages: Comment[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshInbox: () => Promise<void>;
}

// 機能
-通知・メッセージの統合取得 - 未読数の管理 - 既読処理 - リアルタイム更新;
```

#### **2. useSystemNotifications.ts（システム通知）**

```typescript
interface UseSystemNotificationsReturn {
  systemNotifications: SystemNotification[];
  createSystemNotification: (
    notification: SystemNotificationCreate
  ) => Promise<void>;
  broadcastNotification: (
    notification: SystemNotificationCreate
  ) => Promise<void>;
}

// 機能
-システム通知の作成・配信 - 全ユーザーへの一括通知 - 通知の有効期限管理;
```

### **API設計**

#### **通知関連エンドポイント**

##### **GET /notifications**

```typescript
// ユーザーの通知一覧取得
interface GetNotificationsRequest {
  userId: string;
  type?: NotificationType;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

interface GetNotificationsResponse {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
}
```

##### **POST /notifications/mark-read**

```typescript
// 通知を既読にする
interface MarkAsReadRequest {
  notificationIds: string[];
  userId: string;
}

interface MarkAsReadResponse {
  success: boolean;
  updatedCount: number;
}
```

##### **POST /notifications/system**

```typescript
// システム通知の作成（管理者用）
interface CreateSystemNotificationRequest {
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: string;
  actionUrl?: string;
  actionText?: string;
  targetUsers?: string[]; // 特定ユーザーのみ
}
```

#### **コメント関連エンドポイント**

##### **GET /comments/user/{userId}**

```typescript
// ユーザーの投稿へのコメント一覧取得
interface GetUserCommentsRequest {
  userId: string;
  limit?: number;
  offset?: number;
  postType?: 'post' | 'consultation' | 'transfer';
}

interface GetUserCommentsResponse {
  comments: Comment[];
  totalCount: number;
}
```

##### **POST /comments**

```typescript
// コメントの作成
interface CreateCommentRequest {
  postId: string;
  content: string;
  parentCommentId?: string;
}

interface CreateCommentResponse {
  comment: Comment;
  success: boolean;
}
```

## 📊 データフロー

### **通知の流れ**

```
1. システムイベント発生
   ↓
2. システム通知作成
   ↓
3. 対象ユーザーへの配信
   ↓
4. フロントエンドでの表示
   ↓
5. ユーザーの既読処理
   ↓
6. 通知状態の更新
```

### **コメントの流れ**

```
1. ユーザーが投稿・相談・譲渡を作成
   ↓
2. 他のユーザーがコメント
   ↓
3. コメント通知の自動生成
   ↓
4. 投稿者への通知配信
   ↓
5. 受信トレイでの表示
   ↓
6. コメントへの返信・遷移
```

## 🎨 UI/UX詳細

### **通知タブの表示**

#### **通知アイテムの構造**

```typescript
interface NotificationDisplay {
  icon: React.ReactNode; // 通知タイプに応じたアイコン
  title: string; // 通知タイトル
  message: string; // 通知内容
  timestamp: string; // 時間表示
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean; // 既読状態
  actionButton?: {
    // アクションボタン（オプション）
    text: string;
    url: string;
  };
}
```

#### **優先度別の表示**

- **低優先度**: グレー表示、通常サイズ
- **通常**: 標準表示
- **高優先度**: オレンジ表示、少し大きく
- **緊急**: 赤表示、大きく、強調

### **メッセージタブの表示**

#### **メッセージアイテムの構造**

```typescript
interface MessageDisplay {
  avatar: string; // コメント投稿者のアバター
  authorName: string; // コメント投稿者名
  postTitle: string; // 元の投稿タイトル
  postType: 'post' | 'consultation' | 'transfer';
  commentContent: string; // コメント内容
  timestamp: string; // コメント時間
  isRead: boolean; // 既読状態
  hasReplies: boolean; // 返信の有無
}
```

#### **表示の特徴**

- 投稿タイプ別のアイコン表示
- コメント内容のプレビュー（長い場合は省略）
- 返信がある場合のインジケーター
- 投稿への直接遷移ボタン

### **空状態の表示**

#### **通知タブ（空の場合）**

```
┌─────────────────────────────────────┐
│                                     │
│           📢                        │
│                                     │
│        通知はありません              │
│                                     │
│  システムからのお知らせが            │
│  ここに表示されます                 │
│                                     │
└─────────────────────────────────────┘
```

#### **メッセージタブ（空の場合）**

```
┌─────────────────────────────────────┐
│                                     │
│           💬                        │
│                                     │
│      メッセージはありません          │
│                                     │
│  投稿・相談・譲渡でやりとりを        │
│  はじめると、メッセージが           │
│  表示されます                      │
│                                     │
└─────────────────────────────────────┘
```

## 🔒 セキュリティ・プライバシー

### **アクセス制御**

- ユーザーは自分の通知・メッセージのみ閲覧可能
- システム通知は全ユーザーに配信可能
- コメントは承認済みのもののみ表示

### **データ保護**

- 個人情報の暗号化
- 通知の有効期限管理
- 古い通知の自動削除

### **スパム対策**

- コメントの頻度制限
- 不適切な内容の自動検出
- ユーザー報告機能

## 📈 パフォーマンス要件

### **応答時間**

- 通知一覧表示: 500ms以内
- メッセージ一覧表示: 800ms以内
- 既読処理: 200ms以内

### **スケーラビリティ**

- 同時接続ユーザー: 100人以上
- 通知処理: 1000件/分以上
- データベースクエリ: 最適化されたインデックス

### **キャッシュ戦略**

- 通知データのローカルキャッシュ
- 画像・アバターのCDN配信
- リアルタイム更新の最適化

## 🧪 テスト戦略

### **単体テスト**

- 各コンポーネントの動作確認
- カスタムフックのロジック検証
- ユーティリティ関数の動作確認

### **統合テスト**

- APIエンドポイントの動作確認
- データベース連携の検証
- リアルタイム更新の動作確認

### **E2Eテスト**

- 通知作成から表示までの流れ
- コメント投稿から受信トレイ表示まで
- 既読処理の動作確認

## 🚀 実装計画

### **Phase 1: 基盤実装（完了）** ✅

- ✅ データベーステーブルの作成（notifications拡張、comments新規作成）
- ✅ 基本的なSupabase統合
- ✅ 受信トレイ画面の基本構造（InboxView, InboxItem, EmptyState）
- ✅ 下部ナビゲーションへの受信トレイタブ追加

### **Phase 2: 通知機能（完了）** ✅

- ✅ システム通知作成・配信機能（useSystemNotifications）
- ✅ 管理者用システム通知管理画面（SystemNotificationManager）
- ✅ 通知表示・管理機能（優先度、有効期限、アクションボタン）
- ✅ 既読処理の実装（markAsRead, markAllAsRead）

### **Phase 3: メッセージ機能（完了）** ✅

- ✅ コメントシステムの実装（useComments）
- ✅ メッセージ表示・管理機能（コメント階層化、投稿情報表示）
- ✅ 投稿への直接遷移機能（App.tsx統合）
- ✅ コメント通知の自動生成

### **Phase 4: 統合・最適化（完了）** ✅

- ✅ UI/UXの最終調整（モバイル最適化、レスポンシブ対応）
- ✅ 管理者ダッシュボードとの統合
- ✅ エラーハンドリングとローディング状態の実装

### **Phase 5: システム通知管理の最適化（完了）** ✅

**実装日**: 2025年1月10日

#### **問題の発見と解決**

**問題**: 従来のシステム通知では、ユーザー数に比例して管理者の通知一覧に大量の通知が表示される問題が発見されました。6人のユーザーに通知を送信すると、管理者画面に6件の通知が表示され、ユーザー数の増加に伴い管理が困難になる構造でした。

#### **改善内容**

**1. 新しいテーブル構造の導入**

```sql
-- システム通知管理テーブル（新規追加）
system_notifications: 管理者が作成するシステム通知を1件として管理
notification_deliveries: 各ユーザーへの配信状況を追跡
notifications: 既存テーブルを拡張、個別ユーザー通知として保持
```

**2. 効率的な通知管理システム**

- **管理者視点**: 1件のシステム通知として表示・管理
- **配信統計**: 対象者数、配信済み数、既読数、保留数を一覧表示
- **配信状況追跡**: 各ユーザーへの配信・既読状況を詳細に管理

**3. 新機能の追加**

- ✅ `send_system_notification()` PostgreSQL関数
- ✅ `mark_notification_as_read()` 既読管理関数
- ✅ `get_unread_notifications_count()` 未読数取得関数
- ✅ `get_user_notifications()` ページネーション付き通知取得
- ✅ `system_notifications_summary` ビュー

**4. パフォーマンス最適化**

- ✅ 適切なインデックス追加（GIN、B-tree）
- ✅ RLSポリシーの最適化
- ✅ 既存データの移行・クリーンアップ

#### **技術的改善点**

**Before (問題のある構造)**:

```
6ユーザー × 1通知 = 管理者画面に6件表示
→ ユーザー数増加で管理困難
```

**After (最適化された構造)**:

```
1システム通知 + 配信統計表示
→ ユーザー数に関係なく効率的な管理
```

#### **メリット**

1. **管理効率の向上**: ユーザー数に関係なく1件の通知として管理
2. **詳細な追跡**: 配信・既読状況を個別に把握可能
3. **スケーラビリティ**: ユーザー数増加に対応した設計
4. **データ整合性**: 3テーブル連携による一貫したデータ管理

## 📝 まとめ

受信トレイ機能は、HelloChicagoアプリのユーザーエンゲージメントを向上させる重要な機能です。通知とメッセージの2つのタブにより、ユーザーは自分の投稿への反応やシステムからのお知らせを効率的に管理できます。

**Phase 5での最適化により、システム通知管理がより効率的になり、コミュニティの成長に対応できる拡張性の高いシステムが完成しました。**

この仕様書に基づいて実装された機能は、ユーザビリティが高く、安全で拡張性のある受信トレイ機能を提供します。

---

**作成者**: AI Assistant  
**最終更新**: 2025年1月10日  
**承認者**: 開発チーム
