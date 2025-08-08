/*
  # Fix likes trigger functionality

  This migration fixes the likes trigger that was not working properly.
  It ensures that the posts.likes column is updated correctly when likes are added or removed.
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_post_likes_trigger ON likes;
DROP FUNCTION IF EXISTS update_post_likes_count();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update posts table with new like count
    UPDATE posts 
    SET likes = COALESCE(likes, 0) + 1 
    WHERE id = NEW.post_id;
    
    -- Log the update for debugging
    RAISE NOTICE 'Updated likes count for post %: +1', NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update posts table with new like count
    UPDATE posts 
    SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
    WHERE id = OLD.post_id;
    
    -- Log the update for debugging
    RAISE NOTICE 'Updated likes count for post %: -1', OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update likes count
CREATE TRIGGER update_post_likes_trigger
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

-- Function to sync all post likes counts
CREATE OR REPLACE FUNCTION sync_all_post_likes()
RETURNS void AS $$
BEGIN
  UPDATE posts 
  SET likes = (
    SELECT COUNT(*) 
    FROM likes 
    WHERE likes.post_id = posts.id
  );
  
  RAISE NOTICE 'Synced likes counts for all posts';
END;
$$ LANGUAGE plpgsql;

-- Sync existing likes counts
SELECT sync_all_post_likes();
