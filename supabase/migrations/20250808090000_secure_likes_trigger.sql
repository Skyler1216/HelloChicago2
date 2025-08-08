/*
  # Secure likes trigger to bypass RLS on posts

  - Redefine update_post_likes_count() as SECURITY DEFINER so it can update posts.likes
    regardless of the invoking user's RLS on posts
*/

CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET likes = likes + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET likes = likes - 1 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Ensure trigger remains in place (idempotent)
DROP TRIGGER IF EXISTS update_post_likes_trigger ON likes;
CREATE TRIGGER update_post_likes_trigger
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();