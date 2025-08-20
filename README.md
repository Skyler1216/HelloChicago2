# HelloChicago2

シカゴ在住の日本人妻のためのコミュニティプラットフォーム

## 🚀 プロジェクト概要

HelloChicago2は、シカゴ在住の日本人妻が情報交換や相談を行えるコミュニティプラットフォームです。

### 主な機能

- 📝 投稿・相談・譲渡情報の共有
- 🗺️ 地図ベースでの情報検索
- 👥 ユーザー認証・承認システム
- 📱 レスポンシブデザイン

## 🛠️ 技術スタック

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Maps**: Mapbox GL JS
- **Deployment**: Netlify

## 📋 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd HelloChicago2
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Mapbox Configuration
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

### 4. Supabaseプロジェクトのセットアップ

1. [Supabase](https://supabase.com)で新しいプロジェクトを作成
2. プロジェクトのURLとanon keyを取得
3. データベースマイグレーションを実行：

```bash
npx supabase db push
```

### 5. Mapboxの設定

1. [Mapbox](https://mapbox.com)でアカウントを作成
2. Access Tokenを取得
3. 環境変数に設定

### 6. 開発サーバーの起動

```bash
npm run dev
```

## 📁 プロジェクト構造

```
src/
├── components/          # Reactコンポーネント
├── hooks/              # カスタムフック
├── lib/                # ライブラリ設定
├── types/              # TypeScript型定義
└── data/               # モックデータ
```

## 🧪 利用可能なスクリプト

- `npm run dev` - 開発サーバー起動
- `npm run build` - プロダクションビルド
- `npm run lint` - ESLint実行
- `npm run format` - Prettier実行

## 📚 ドキュメント

詳細なドキュメントは`docs/`フォルダを参照してください：

### **📋 基盤文書**

- [Product Requirements Document](docs/prd.md) - プロダクト要件定義
- [Test Strategy](docs/test-strategy.md) - テスト戦略

### **🏗️ 技術仕様書**

- [Technical Specification](docs/technical-specification.md) - 統合技術仕様書（データベース設計・API設計・機能仕様）
- [Deployment Design](docs/deployment-design.md) - デプロイメント設計

### **📱 機能仕様書**

- [Profile Documentation](docs/profile-documentation.md) - プロフィール機能統合ドキュメント

### **📊 実装レポート**

- [Implementation Report](docs/implementation-report.md) - 統合実装完了レポート

### **📖 文書構成の詳細**

各文書の詳細な説明や使用方法については、[docs/README.md](docs/README.md)を参照してください。

## 🤝 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。
