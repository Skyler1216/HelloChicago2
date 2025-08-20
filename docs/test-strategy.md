# HelloChicago テスト戦略書

## 概要

HelloChicagoアプリケーションのテスト戦略書です。品質保証とリスク軽減のため、包括的なテスト計画を策定しています。

## 📚 この文書の役割と関連

- 本書: テスト方針、レベル、観点、メトリクス
- CI/CD 実行や環境設定は [デプロイメント設計書](./deployment-design.md) を参照
- 技術仕様の詳細は [技術仕様書](./technical-specification.md) を参照

## テスト方針

### 品質目標

- **機能テスト**: 100%の機能要件をカバー
- **セキュリティテスト**: 認証・認可の完全性確保
- **パフォーマンステスト**: 2秒以内の応答時間
- **ユーザビリティテスト**: 直感的な操作体験

### テスト原則

1. **早期テスト**: 開発初期からのテスト実施
2. **自動化優先**: 繰り返し実行可能なテストの自動化
3. **継続的テスト**: CI/CDパイプラインでの継続的テスト
4. **リスクベース**: 重要度の高い機能を優先テスト

## テストピラミッド

```
    E2E Tests (10%)
   ┌─────────────┐
   │             │
   │ Integration │ (20%)
   │   Tests     │
   └─────────────┘
   ┌─────────────┐
   │   Unit      │ (70%)
   │   Tests     │
   └─────────────┘
```

## テストレベル

### 1. ユニットテスト

#### 対象コンポーネント

- **React コンポーネント**
  - `HomeView`
  - `MapView`
  - `PostFormView`
  - `Layout`
  - `PostCard`
  - `ProfileView` ✅
  - `SettingsView` ✅
  - `NotificationCenter` ✅

- **カスタムフック**
  - `useAuth`
  - `usePosts`
  - `useCategories`
  - `useUserStats` ✅
  - `useNotifications` ✅
  - `useProfileDetails` ✅
  - `useImageUpload` ✅

- **ユーティリティ関数**
  - `supabase.ts`
  - `mapbox.ts`

#### テストツール

```json
{
  "testing-library": "^14.0.0",
  "jest": "^29.0.0",
  "msw": "^2.0.0",
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.0.0"
}
```

#### テスト例

**useAuth フックのテスト**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';

describe('useAuth', () => {
  it('should return loading state initially', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
  });

  it('should return user data when authenticated', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
    });
  });
});
```

**PostCard コンポーネントのテスト**

```typescript
import { render, screen } from '@testing-library/react';
import PostCard from '../components/PostCard';

describe('PostCard', () => {
  const mockPost = {
    id: '1',
    title: 'テスト投稿',
    content: 'テスト内容',
    author: { name: '田中花子' },
    category: { name_ja: '病院' },
    created_at: '2025-01-01T00:00:00Z'
  };

  it('should render post information correctly', () => {
    render(<PostCard post={mockPost} onClick={jest.fn()} />);

    expect(screen.getByText('テスト投稿')).toBeInTheDocument();
    expect(screen.getByText('田中花子')).toBeInTheDocument();
    expect(screen.getByText('病院')).toBeInTheDocument();
  });
});
```

### 2. 統合テスト

#### 対象領域

- **認証フロー**
  - サインアップ → プロフィール作成
  - サインイン → セッション管理
  - サインアウト → セッションクリア

- **投稿フロー**
  - 投稿作成 → データベース保存
  - 投稿表示 → データ取得
  - 投稿更新 → データ更新

- **プロフィールフロー** ✅
  - プロフィール編集 → データ保存
  - 詳細情報登録 → profile_details保存
  - 画像アップロード → Storage保存

- **通知フロー** ✅
  - 通知生成 → データベース保存
  - リアルタイム通知 → リアルタイム配信
  - 設定変更 → notification_settings更新

- **地図機能**
  - 位置情報取得 → マップ表示
  - 投稿フィルタリング → マーカー表示

#### テストツール

```json
{
  "msw": "^2.0.0",
  "jest": "^29.0.0",
  "@testing-library/react": "^14.0.0"
}
```

#### テスト例

**投稿作成フローのテスト**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import PostFormView from '../components/PostFormView';

const server = setupServer(
  rest.post('/posts', (req, res, ctx) => {
    return res(ctx.json({ id: '1', title: 'テスト投稿' }));
  })
);

describe('PostFormView Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should create post successfully', async () => {
    render(<PostFormView />);

    fireEvent.change(screen.getByLabelText('タイトル'), {
      target: { value: 'テスト投稿' }
    });

    fireEvent.click(screen.getByText('投稿する'));

    await waitFor(() => {
      expect(screen.getByText('投稿が投稿されました！')).toBeInTheDocument();
    });
  });
});
```

### 3. E2Eテスト

#### 対象シナリオ

1. **ユーザー登録・ログインフロー**
2. **投稿作成・表示フロー**
3. **地図機能・フィルタリング**
4. **管理者機能**
5. **プロフィール機能フロー** ✅
6. **通知システムフロー** ✅
7. **設定機能フロー** ✅

#### テストツール

```json
{
  "playwright": "^1.40.0",
  "@playwright/test": "^1.40.0"
}
```

#### テスト例

**ユーザー登録フローのテスト**

```typescript
import { test, expect } from '@playwright/test';

test('user registration flow', async ({ page }) => {
  await page.goto('/');

  // サインアップ
  await page.click('text=新規登録');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.fill('[name="name"]', '田中花子');
  await page.click('text=登録');

  // 承認待ち画面の確認
  await expect(page.locator('text=承認待ちです')).toBeVisible();
});
```

**投稿作成フローのテスト**

```typescript
test('post creation flow', async ({ page }) => {
  await page.goto('/');

  // ログイン
  await page.click('text=ログイン');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('text=ログイン');

  // 投稿作成
  await page.click('text=投稿');
  await page.fill('[name="title"]', 'テスト投稿');
  await page.fill('[name="content"]', 'テスト内容');
  await page.selectOption('[name="category"]', 'hospital');
  await page.fill('[name="location"]', 'Chicago, IL');
  await page.click('text=投稿する');

  // 投稿完了の確認
  await expect(page.locator('text=投稿が投稿されました！')).toBeVisible();
});
```

### 4. セキュリティテスト

#### 対象項目

- **認証・認可テスト**
  - JWTトークンの有効性
  - 権限レベルの確認
  - セッション管理

- **入力検証テスト**
  - SQLインジェクション対策
  - XSS対策
  - CSRF対策

- **データ保護テスト**
  - 個人情報の暗号化
  - データアクセス制御
  - ログセキュリティ

#### テストツール

```json
{
  "zap": "^2.14.0",
  "burp-suite": "Professional",
  "owasp-zap": "^2.14.0"
}
```

#### テスト例

**認証テスト**

```typescript
describe('Authentication Security', () => {
  it('should reject invalid JWT tokens', async () => {
    const response = await fetch('/api/posts', {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    expect(response.status).toBe(401);
  });

  it('should enforce role-based access control', async () => {
    // 一般ユーザーで管理者機能にアクセス
    const response = await fetch('/api/admin/posts/pending', {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    expect(response.status).toBe(403);
  });
});
```

### 5. パフォーマンステスト

#### 対象項目

- **API応答時間**
  - 投稿一覧取得: < 1秒
  - 投稿作成: < 2秒
  - 地図表示: < 3秒

- **データベース性能**
  - クエリ実行時間
  - インデックス効果
  - 接続プール

- **フロントエンド性能**
  - ページ読み込み時間
  - コンポーネント描画時間
  - メモリ使用量

#### テストツール

```json
{
  "artillery": "^2.0.0",
  "lighthouse": "^11.0.0",
  "k6": "^0.47.0"
}
```

#### テスト例

**API負荷テスト**

```javascript
// k6 テストスクリプト
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 10 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const response = http.get('https://api.hellochicago.app/posts');

  check(response, {
    'status is 200': r => r.status === 200,
    'response time < 1s': r => r.timings.duration < 1000,
  });
}
```

## テスト環境

### 環境構成

```
開発環境 (Development)
├── ローカル開発環境
├── テストデータベース
└── モックサービス

ステージング環境 (Staging)
├── 本番同等環境
├── テストデータ
└── 自動テスト実行

本番環境 (Production)
├── 本番データベース
├── 監視・ログ
└── パフォーマンステスト
```

### テストデータ管理

```sql
-- テスト用カテゴリデータ
INSERT INTO categories (id, name, name_ja, icon, color) VALUES
  ('test-hospital', 'Test Hospital', 'テスト病院', 'Heart', '#FF6B6B');

-- テスト用投稿データ
INSERT INTO posts (title, content, type, category_id, author_id) VALUES
  ('テスト投稿', 'テスト内容', 'post', 'test-hospital', 'test-user-id');
```

## テスト自動化

### CI/CDパイプライン

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Run security tests
        run: npm run test:security
```

### テストスクリプト

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:security": "zap-baseline.py",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

## テストメトリクス

### 品質指標

- **テストカバレッジ**: 目標80%以上
- **バグ密度**: 1000行あたり5個以下
- **テスト実行時間**: 全体で10分以内
- **自動化率**: 90%以上

### 監視項目

- **テスト成功率**: 95%以上
- **テスト実行頻度**: 毎回のコミット
- **テスト結果通知**: Slack/Teams連携
- **テストレポート**: HTML/PDF出力

## テスト計画

### フェーズ1: 基盤テスト（第1-2週）

- [ ] ユニットテスト環境構築
- [ ] 基本コンポーネントのテスト
- [ ] カスタムフックのテスト
- [ ] ユーティリティ関数のテスト

### フェーズ2: 統合テスト（第3-4週）

- [ ] 認証フローのテスト
- [ ] 投稿フローのテスト
- [ ] 地図機能のテスト
- [ ] 管理者機能のテスト

### フェーズ3: E2Eテスト（第5-6週）

- [ ] ユーザーシナリオのテスト
- [ ] エラーケースのテスト
- [ ] パフォーマンステスト
- [ ] セキュリティテスト

### フェーズ4: 自動化・継続的テスト（第7-8週）

- [ ] CI/CDパイプライン構築
- [ ] 自動テスト実行
- [ ] テストレポート生成
- [ ] 監視・アラート設定

## リスク管理

### 高リスク項目

1. **認証・認可**: セキュリティ侵害の可能性
2. **データ整合性**: データ損失・破損の可能性
3. **パフォーマンス**: ユーザビリティ低下の可能性

### 対策

- **認証・認可**: 多層防御、定期的なセキュリティ監査
- **データ整合性**: バックアップ、トランザクション管理
- **パフォーマンス**: 負荷テスト、監視・アラート

## テストドキュメント

### 必要なドキュメント

- [ ] テスト計画書
- [ ] テストケース一覧
- [ ] テスト結果レポート
- [ ] バグレポート
- [ ] テスト環境設定書

### テンプレート

- テストケーステンプレート
- バグレポートテンプレート
- テスト結果レポートテンプレート

---

**最終更新**: 2025年1月
**バージョン**: 2.1
**作成者**: HelloChicago開発チーム
