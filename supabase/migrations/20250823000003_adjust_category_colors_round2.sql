-- Further adjust similar colors: make hospital distinct from shopping
BEGIN;

-- shopping remains teal-400
UPDATE public.categories SET color = '#14B8A6' WHERE id = 'shopping'; -- teal-500 for better contrast
-- hospital to emerald-600 for stronger green
UPDATE public.categories SET color = '#059669' WHERE id = 'hospital'; -- emerald-600
-- play stays blue-400 (#60A5FA)
-- other stays gray-400 (#9CA3AF)

COMMIT;
