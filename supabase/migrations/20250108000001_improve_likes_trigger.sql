/*
  # Improve likes trigger functionality

  This migration further improves the likes trigger to ensure it works correctly
  and handles edge cases properly.
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_post_likes_trigger ON likes;
DROP FUNCTION IF EXISTS update_post_likes_count();

-- Recreate the function with better error handling and logging
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
DECLARE
  old_count integer;
  new_count integer;
BEGIN
  -- Get current likes count for the post
  SELECT COALESCE(likes, 0) INTO old_count
  FROM posts 
  WHERE id = CASE 
    WHEN TG_OP = 'INSERT' THEN NEW.post_id 
    ELSE OLD.post_id 
  END;

  -- Calculate new count
  IF TG_OP = 'INSERT' THEN
    new_count := old_count + 1;
    RAISE NOTICE 'Adding like to post %: % -> %', NEW.post_id, old_count, new_count;
    
    UPDATE posts 
    SET likes = new_count 
    WHERE id = NEW.post_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    new_count := GREATEST(old_count - 1, 0);
    RAISE NOTICE 'Removing like from post %: % -> %', OLD.post_id, old_count, new_count;
    
    UPDATE posts 
    SET likes = new_count 
    WHERE id = OLD.post_id;
    
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
