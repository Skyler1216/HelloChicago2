-- Remove posts.likes denormalized column (counts computed at runtime)
BEGIN;
ALTER TABLE posts DROP COLUMN IF EXISTS likes;
COMMIT;
