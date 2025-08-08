/*
  # Fix likes trigger security and correctness

  This migration recreates the likes trigger function as SECURITY DEFINER
  so that Row Level Security on `posts` does not block likes count updates.
  It also recalculates the exact count from the `likes` table on each change
  to avoid race conditions.
*/

-- Recreate the function with SECURITY DEFINER and stable logic
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_post_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    affected_post_id := NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    affected_post_id := OLD.post_id;
  ELSE
    RETURN NULL;
  END IF;

  -- Set likes to the authoritative count to avoid drift
  UPDATE posts
  SET likes = (
    SELECT COUNT(*)::int
    FROM likes
    WHERE likes.post_id = affected_post_id
  )
  WHERE id = affected_post_id;

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  ELSE
    RETURN OLD;
  END IF;
END;
$$;

-- Ensure trigger exists and points to the latest function
DROP TRIGGER IF EXISTS update_post_likes_trigger ON likes;
CREATE TRIGGER update_post_likes_trigger
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();