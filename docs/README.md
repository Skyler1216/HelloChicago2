# HelloChicago ドキュメント索引
## 構成

- 技術仕様書: `technical-specification.md`
- 実装レポート: `implementation-report.md`
- デプロイメント設計書: `deployment-design.md`
- テスト戦略書: `test-strategy.md`
- プロフィール機能ドキュメント: `profile-documentation.md`
- プロダクト要件定義書（PRD）: `prd.md`

## 役割分担（正典）

- 正典: 技術仕様の詳細（DB/API/セキュリティ/性能）は `technical-specification.md`
- 正典: CI/CD・環境変数・監視・運用は `deployment-design.md`
- 正典: テスト方針・テストレベル・メトリクスは `test-strategy.md`
- 機能別のUX/運用ガイドは各機能ドキュメント（例: `profile-documentation.md`）
- 事業・ユーザー要件・カテゴリ分類は `prd.md`

## 重複排除ポリシー

1. 技術仕様や設定値は「正典」にのみ記述し、他文書からは引用・リンクで参照します。
2. 文書間で内容が競合した場合は、本索引の「正典」に従います。
3. 変更時は「正典」を先に更新し、参照元文書にリンクを追加・更新します。

## 編集のヒント

- 新しい機能が入る場合は、まず PRD → 技術仕様 → テスト戦略 → デプロイ設計の順で追記してください。
- 既存機能の微修正は該当セクションのみ編集し、意図的に他文書へは重複記載しないでください。
