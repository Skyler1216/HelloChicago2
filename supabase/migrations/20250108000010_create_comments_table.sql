-- Migration: Create comments table for inbox messages
-- Description: Create comments table to support user interactions on posts
-- Date: 2025-01-08
-- Environment: Production

-- Step 1: Check if comments table exists and create if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
    -- Create comments table
    CREATE TABLE comments (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
      author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      parent_comment_id uuid REFERENCES comments(id) ON DELETE SET NULL,
      content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
      is_approved boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Step 2: Add missing columns if they don't exist
DO $$
BEGIN
  -- Add parent_comment_id column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'parent_comment_id') THEN
    ALTER TABLE comments ADD COLUMN parent_comment_id uuid REFERENCES comments(id) ON DELETE SET NULL;
  END IF;
  
  -- Add is_approved column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'is_approved') THEN
    ALTER TABLE comments ADD COLUMN is_approved boolean DEFAULT true;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'updated_at') THEN
    ALTER TABLE comments ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Step 3: Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_is_approved ON comments(is_approved);

-- Step 4: Add table comments
COMMENT ON TABLE comments IS 'User comments on posts, consultations, and transfers';
COMMENT ON COLUMN comments.post_id IS 'Reference to the post being commented on';
COMMENT ON COLUMN comments.author_id IS 'User who wrote the comment';
COMMENT ON COLUMN comments.parent_comment_id IS 'Parent comment for replies (threading)';
COMMENT ON COLUMN comments.content IS 'Comment text content (max 1000 chars)';
COMMENT ON COLUMN comments.is_approved IS 'Whether comment is approved for display';

-- Step 5: Enable Row Level Security (only if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'comments' AND rowsecurity = true) THEN
    ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Step 6: Create RLS policies (only if they don't exist)
DO $$
BEGIN
  -- Users can view approved comments
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Anyone can view approved comments') THEN
    CREATE POLICY "Anyone can view approved comments" ON comments
      FOR SELECT USING (is_approved = true);
  END IF;

  -- Users can create their own comments
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can create own comments') THEN
    CREATE POLICY "Users can create own comments" ON comments
      FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;

  -- Users can update their own comments
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can update own comments') THEN
    CREATE POLICY "Users can update own comments" ON comments
      FOR UPDATE USING (auth.uid() = author_id);
  END IF;

  -- Users can delete their own comments
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can delete own comments') THEN
    CREATE POLICY "Users can delete own comments" ON comments
      FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;

-- Step 7: Create updated_at trigger (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'trigger_update_comments_updated_at') THEN
    CREATE OR REPLACE FUNCTION update_comments_updated_at()
    RETURNS TRIGGER AS $function$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_comments_updated_at
      BEFORE UPDATE ON comments
      FOR EACH ROW
      EXECUTE FUNCTION update_comments_updated_at();
  END IF;
END $$;

-- Step 8: Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'comments' 
ORDER BY ordinal_position;
