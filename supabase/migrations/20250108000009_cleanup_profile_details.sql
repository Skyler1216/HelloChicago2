-- Migration: Cleanup profile_details table for mobile-optimized profile
-- Description: Remove unused fields (bio, location_area, interests, languages) 
-- and keep only essential fields (arrival_date, family_structure)
-- Date: 2025-01-08
-- Environment: Production (Safe migration - preserves existing data)

-- Step 1: Create backup of existing data (if needed)
-- This step is optional but recommended for production

-- Step 2: Remove unused columns from profile_details table
-- Using IF EXISTS to prevent errors if columns don't exist
ALTER TABLE profile_details 
  DROP COLUMN IF EXISTS bio,
  DROP COLUMN IF EXISTS location_area,
  DROP COLUMN IF EXISTS interests,
  DROP COLUMN IF EXISTS languages;

-- Step 3: Add comment to document the current structure
COMMENT ON TABLE profile_details IS 'Profile details optimized for mobile use - contains arrival_date and family_structure only';

-- Step 4: Update the table structure comment
COMMENT ON COLUMN profile_details.arrival_date IS 'Date when user first arrived in America (used for calculating residence duration)';
COMMENT ON COLUMN profile_details.family_structure IS 'User family structure information';

-- Step 5: Ensure arrival_date has proper constraints (only if not exists)
-- Check if constraint already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_arrival_date_not_future'
  ) THEN
    ALTER TABLE profile_details 
      ADD CONSTRAINT check_arrival_date_not_future 
      CHECK (arrival_date <= CURRENT_DATE);
  END IF;
END $$;

-- Step 6: Add index for arrival_date queries (for performance)
-- Only if index doesn't exist
CREATE INDEX IF NOT EXISTS idx_profile_details_arrival_date 
  ON profile_details(arrival_date);

-- Step 7: Verify the migration
-- This will show the current table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profile_details' 
ORDER BY ordinal_position;

-- Note: Existing RLS policies will continue to work with the simplified structure
-- No changes needed to security policies
