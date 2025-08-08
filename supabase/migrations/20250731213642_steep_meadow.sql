/*
  # Add likes functionality

  1. New Tables
    - `likes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `post_id` (uuid, references posts)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `likes` table
    - Add policies for authenticated users to manage their own likes

  3. Functions
    - Add trigger to update post likes count
*/

-- Ensure posts table has likes column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'likes') THEN
        ALTER TABLE posts ADD COLUMN likes integer DEFAULT 0;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all likes"
  ON likes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own likes"
  ON likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update posts table with new like count
    UPDATE posts 
    SET likes = COALESCE(likes, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update posts table with new like count
    UPDATE posts 
    SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_post_likes_trigger ON likes;

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
END;
$$ LANGUAGE plpgsql;

-- Sync existing likes counts
SELECT sync_all_post_likes();