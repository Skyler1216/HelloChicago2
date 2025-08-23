-- Remove computed 'replies' column from posts (counts are derived from comments)
BEGIN;
ALTER TABLE posts DROP COLUMN IF EXISTS replies;
COMMIT;
