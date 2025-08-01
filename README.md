# シカゴ生活情報共有アプリ

シカゴ在住の日本人向けの生活情報共有プラットフォームです。

## 機能

- **マップ機能**: シカゴ周辺の生活情報をマップ上で確認
- **カテゴリ別フィルタリング**: 病院、美容院、買い物、レストラン、子ども関連、公園など
- **投稿機能**: 生活情報の投稿・共有
- **人気スポット**: よく利用されるスポットの一覧表示
- **レスポンシブデザイン**: モバイル・デスクトップ対応

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、Mapbox APIキーを設定してください：

```bash
# .env.local
VITE_MAPBOX_TOKEN=your_mapbox_api_key_here
```

#### Mapbox APIキーの取得方法

1. [Mapbox](https://account.mapbox.com/) にアクセス
2. アカウントを作成またはログイン
3. 「Access Tokens」セクションでAPIキーを取得
4. APIキーを `.env.local` ファイルに設定

**注意**: APIキーが設定されていない場合でも、フォールバック表示でアプリは動作します。

### 3. 開発サーバーの起動

```bash
npm run dev
```

## 開発ツール

### ESLint & Prettier

プロジェクトにはESLintとPrettierが設定されており、コードの品質とフォーマットを自動的に管理します。

#### 利用可能なコマンド

```bash
# コードの品質チェック
npm run lint

# ESLintエラーの自動修正
npm run lint:fix

# Prettierによるコードフォーマット
npm run format

# フォーマットチェック（CI/CD用）
npm run format:check
```

#### VSCode設定

プロジェクトには `.vscode/settings.json` が含まれており、以下の機能が自動的に有効になります：

- **保存時の自動フォーマット**: ファイル保存時にPrettierが自動実行
- **ESLint自動修正**: 保存時にESLintエラーが自動修正
- **推奨拡張機能**: 必要なVSCode拡張機能が自動提案

#### 推奨VSCode拡張機能

- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense
- TypeScript Importer

## マップ機能について

### 利用可能な機能

- インタラクティブなマップ表示（Mapbox使用）
- カテゴリ別マーカー表示
- 投稿詳細のポップアップ表示
- 位置情報取得（ユーザー許可時）
- ズームイン・ズームアウト
- マップスタイルの自動フォールバック

### フォールバック機能

Mapbox APIキーが設定されていない場合は、以下の機能が利用できます：

- 静的なマップ風表示
- マーカーのクリック機能
- カテゴリフィルタリング
- 人気スポット一覧への切り替え

## 技術スタック

- **React 18** + **TypeScript**
- **Vite** (ビルドツール)
- **Tailwind CSS** (スタイリング)
- **Mapbox GL JS** (マップ機能)
- **Lucide React** (アイコン)
- **Supabase** (データベース)
- **ESLint** + **Prettier** (コード品質・フォーマット)

## ディレクトリ構成

```
src/
├── components/          # Reactコンポーネント
│   ├── MapView.tsx     # メインマップコンポーネント
│   ├── CategoryFilter.tsx
│   └── PopularSpots.tsx
├── lib/                # ライブラリ設定
│   └── mapbox.ts       # Mapbox設定
├── hooks/              # カスタムフック
├── data/               # モックデータ
└── types/              # TypeScript型定義
```

## ビルド

```bash
npm run build
```

## トラブルシューティング

### マップが表示されない場合

1. `.env.local` ファイルが存在し、正しいAPIキーが設定されているか確認
2. ブラウザのコンソールでエラーメッセージを確認
3. フォールバック表示が正常に動作するか確認

### パフォーマンスの問題

- ブラウザのハードウェアアクセラレーションが有効になっているか確認
- 古いブラウザの場合、最新版への更新を推奨

### ESLint/Prettierの問題

- VSCode拡張機能が正しくインストールされているか確認
- プロジェクトの設定ファイル（`.prettierrc`, `eslint.config.js`）が存在するか確認
- 必要に応じて `npm run lint:fix` を実行してエラーを修正
