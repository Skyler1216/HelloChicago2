-- Remove location columns from posts as Home no longer uses them
-- Safe migration: make columns nullable first if needed, then drop

BEGIN;

-- 1) Ensure columns are nullable (in case existing constraints exist)
ALTER TABLE posts ALTER COLUMN location_lat DROP NOT NULL;
ALTER TABLE posts ALTER COLUMN location_lng DROP NOT NULL;
ALTER TABLE posts ALTER COLUMN location_address DROP NOT NULL;

-- 2) Drop columns
ALTER TABLE posts DROP COLUMN IF EXISTS location_lat;
ALTER TABLE posts DROP COLUMN IF EXISTS location_lng;
ALTER TABLE posts DROP COLUMN IF EXISTS location_address;

COMMIT;
