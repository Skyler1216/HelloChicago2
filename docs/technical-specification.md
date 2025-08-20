# HelloChicago 統合技術仕様書

## 📋 文書概要

**作成日**: 2025年1月10日  
**バージョン**: 2.0  
**対象**: HelloChicagoアプリケーションの包括的な技術仕様  
**ステータス**: 🔄 統合作業中

## 🎯 概要

HelloChicagoアプリケーションの包括的な技術仕様書です。データベース設計、API設計、機能仕様を統合し、開発・保守・運用に必要な情報を一元化しています。

## 📚 ドキュメント構成

- 技術仕様書（本書）
- [プロダクト要件定義書（PRD）](./prd.md)
- [実装レポート](./implementation-report.md)
- [デプロイメント設計書](./deployment-design.md)
- [テスト戦略書](./test-strategy.md)
- [プロフィール機能ドキュメント](./profile-documentation.md)

## 🏗️ システムアーキテクチャ

### **技術スタック**

- **フロントエンド**: React + TypeScript + Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL + Auth + RLS)
- **状態管理**: React Hooks + Supabase Realtime
- **UI/UX**: モバイルファースト設計
- **セキュリティ**: Row Level Security (RLS)
- **型安全性**: TypeScript型定義付き

### **システム構成図**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│                 │    │                 │    │                 │
│ • React App     │◄──►│ • Supabase      │◄──►│ • PostgreSQL   │
│ • TypeScript    │    │ • Auth          │    │ • RLS Policies  │
│ • Tailwind CSS  │    │ • RLS           │    │ • Functions     │
│ • Hooks         │    │ • Realtime      │    │ • Triggers      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 データベース設計

### **テーブル構成**

HelloChicagoアプリケーションは以下のテーブルで構成されています：

1. **profiles** - ユーザープロフィール管理
2. **categories** - 投稿カテゴリ管理
3. **posts** - 投稿情報管理
4. **comments** - コメント・返信管理
5. **likes** - いいね機能
6. **profile_details** - 詳細プロフィール情報
7. **notification_settings** - 通知設定
8. **通知システム（3テーブル構成）**
   - system_notifications - システム通知管理
   - notification_deliveries - 配信状況追跡
   - notifications - 個別ユーザー通知

### **主要テーブル詳細**

#### **1. profiles テーブル**

ユーザープロフィール情報を管理するテーブルです。

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

#### **2. 通知システム（3テーブル構成）**

効率的な通知管理のため、以下の3つのテーブルで構成されています：

**system_notifications**: 管理者が作成するシステム通知（1件）
**notification_deliveries**: 各ユーザーへの配信状況を追跡
**notifications**: 個別ユーザーへの通知を管理

詳細なスキーマとカラム情報は、`supabase/migrations/` の各SQLに正典として記載しています（本書は概要を提供）。

## 🔌 API設計

### **API概要**

HelloChicagoアプリケーションは、SupabaseをベースとしたRESTful APIを提供します。

### **主要エンドポイント**

#### **認証・ユーザー管理**

- `POST /auth/signup` - ユーザー登録
- `POST /auth/signin` - ユーザーログイン
- `GET /profiles/{id}` - プロフィール取得
- `PUT /profiles/{id}` - プロフィール更新

#### **投稿・コメント管理**

- `GET /posts` - 投稿一覧取得
- `POST /posts` - 新規投稿作成
- `GET /posts/{id}/comments` - コメント一覧取得
- `POST /posts/{id}/comments` - コメント作成

#### **通知システム**

- `GET /notifications` - ユーザー通知一覧
- `PUT /notifications/{id}/read` - 通知既読処理
- `GET /system-notifications` - システム通知一覧（管理者専用）
- `POST /system-notifications` - システム通知作成（管理者専用）

### **PostgreSQL関数（Supabase RPC）**

効率的な処理のため、以下のPostgreSQL関数を提供：

- `send_system_notification()` - システム通知配信
- `mark_notification_as_read()` - 通知既読管理
- `get_unread_notifications_count()` - 未読数取得
- `get_user_notifications()` - ページネーション付き通知取得

## 📱 機能仕様

### **主要機能**

#### **1. 受信トレイ機能**

- 通知とメッセージの統合管理
- タブナビゲーション（すべて・通知・メッセージ）
- リアルタイム更新機能

#### **2. システム通知機能**

- 管理者によるシステム通知作成・配信
- 通知の優先度管理（低・通常・高・緊急）
- 有効期限付き通知
- アクションボタン付き通知

#### **3. コメントシステム**

- 投稿へのコメント機能
- 階層化された返信機能
- 承認状態の管理

### **実装フェーズ**

#### **Phase 1: 基盤実装** ✅

- データベーステーブルの作成
- 基本的なSupabase統合
- 受信トレイ画面の基本構造

#### **Phase 2: 通知機能** ✅

- システム通知作成・配信機能
- 管理者用システム通知管理画面
- 通知表示・管理機能

#### **Phase 3: メッセージ機能** ✅

- コメントシステムの実装
- メッセージ表示・管理機能
- 投稿への直接遷移機能

#### **Phase 4: 統合・最適化** ✅

- UI/UXの最終調整
- 管理者ダッシュボードとの統合
- エラーハンドリングとローディング状態の実装

#### **Phase 5: システム通知管理の最適化** ✅

- 新しいテーブル構造の導入
- 効率的な通知管理システム
- パフォーマンス最適化

## 🔒 セキュリティ設計

### **Row Level Security (RLS)**

全てのテーブルでRLSを有効化し、適切なアクセス制御を実装：

- ユーザーは自分のデータのみアクセス可能
- 管理者は全データにアクセス可能
- システム通知は適切な権限で管理

### **認証・認可**

- Supabase Authによる安全な認証
- JWTトークンによるセッション管理
- ロールベースのアクセス制御

## 📈 パフォーマンス最適化

### **インデックス戦略**

- 主要クエリパスに対する適切なインデックス
- GINインデックスによるJSONBデータの高速検索
- 複合インデックスによる効率的なフィルタリング

### **クエリ最適化**

- トリガーによる自動カウント更新
- バッチ処理による大量データの効率的処理
- 適切なJOIN戦略によるデータ取得

## 🔄 統合作業状況

### **完了済み**

- ✅ 基本構造の作成
- ✅ 主要テーブルの概要
- ✅ API設計の概要
- ✅ 機能仕様の概要

### **進行中**

- 🔄 詳細スキーマの統合
- 🔄 完全なカラム情報の統合
- 🔄 インデックス・トリガー情報の統合

### **予定**

- 📋 完全版の公開
- 📋 古い文書のアーカイブ化
- 📋 README.mdの更新

---

**作成者**: AI Assistant  
**最終更新**: 2025年1月10日  
**プロジェクト**: HelloChicago統合技術仕様書
