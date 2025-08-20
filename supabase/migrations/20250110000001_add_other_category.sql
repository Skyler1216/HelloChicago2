-- Add "その他" (Other) category
-- Migration: 20250110000001_add_other_category.sql

INSERT INTO categories (id, name, name_ja, icon, color) 
VALUES ('other', 'Other', 'その他', 'MoreHorizontal', '#6B7280')
ON CONFLICT (id) DO NOTHING;
