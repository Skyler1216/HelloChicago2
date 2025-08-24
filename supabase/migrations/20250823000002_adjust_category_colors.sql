-- Adjust similar colors and set Other Facilities to gray
BEGIN;

-- Make shopping, play, hospital more distinct
UPDATE public.categories SET color = '#2DD4BF' WHERE id = 'shopping'; -- teal-400
UPDATE public.categories SET color = '#60A5FA' WHERE id = 'play';     -- blue-400
UPDATE public.categories SET color = '#34D399' WHERE id = 'hospital'; -- green-400

-- Set Other Facilities to gray
UPDATE public.categories SET color = '#9CA3AF' WHERE id = 'other';    -- gray-400

COMMIT;
