-- スポーツと学校のカテゴリを追加
INSERT INTO categories (id, name, name_ja, icon, color)
VALUES 
  ('sports', 'Sports', 'スポーツ', 'Dumbbell', '#FFEAA7'),
  ('school', 'School', '学校', 'GraduationCap', '#A29BFE')
ON CONFLICT (id) DO NOTHING;

-- カテゴリの並び順を制御するための順序フィールドを追加（既存のテーブルに影響しない）
-- 注: 実際の並び順はフロントエンドで制御されます
