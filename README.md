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

## 📛 名称について

- プロダクト名: HelloChicago
- リポジトリ名: HelloChicago2

本READMEではプロダクト全般を「HelloChicago」と記載する場合があります。

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

プロジェクトの正式なドキュメント索引は [docs/README.md](docs/README.md) を正典として参照してください。

## 🤝 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。
