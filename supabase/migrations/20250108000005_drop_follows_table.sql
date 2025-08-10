-- followsテーブルの完全削除
-- フォロー機能の残存部分を完全に削除

BEGIN;

-- followsテーブルを削除（CASCADEで依存関係も削除）
DROP TABLE IF EXISTS follows CASCADE;

COMMIT;
