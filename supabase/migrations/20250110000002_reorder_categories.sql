-- Reorder categories to put "その他" (Other) at the end
-- Migration: 20250110000002_reorder_categories.sql

-- First, delete the existing "その他" category
DELETE FROM categories WHERE id = 'other';

-- Then re-insert it to ensure it appears last
INSERT INTO categories (id, name, name_ja, icon, color) 
VALUES ('other', 'Other', 'その他', 'MoreHorizontal', '#6B7280');
