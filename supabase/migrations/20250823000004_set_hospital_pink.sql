-- Set Hospital category color to pink for better differentiation
BEGIN;
UPDATE public.categories SET color = '#EC4899' WHERE id = 'hospital'; -- pink-500
COMMIT;
