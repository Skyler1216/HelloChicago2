-- Migration: Create comment_reads table for tracking read status
-- Description: Create table to track which comments have been read by post authors
-- Date: 2025-01-10
-- Environment: Production

-- Step 1: Create comment_reads table
CREATE TABLE IF NOT EXISTS comment_reads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  post_author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Ensure unique combination of comment and post author
  UNIQUE(comment_id, post_author_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_reads_comment_id ON comment_reads(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reads_post_author_id ON comment_reads(post_author_id);
CREATE INDEX IF NOT EXISTS idx_comment_reads_read_at ON comment_reads(read_at);

-- Step 3: Add table comments
COMMENT ON TABLE comment_reads IS 'Tracks which comments have been read by post authors';
COMMENT ON COLUMN comment_reads.comment_id IS 'Reference to the comment';
COMMENT ON COLUMN comment_reads.post_author_id IS 'Post author who read the comment';
COMMENT ON COLUMN comment_reads.read_at IS 'When the comment was marked as read';

-- Step 4: Enable Row Level Security
ALTER TABLE comment_reads ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view their own comment reads" ON comment_reads
  FOR SELECT USING (auth.uid() = post_author_id);

CREATE POLICY "Users can create their own comment reads" ON comment_reads
  FOR INSERT WITH CHECK (auth.uid() = post_author_id);

CREATE POLICY "Users can update their own comment reads" ON comment_reads
  FOR UPDATE USING (auth.uid() = post_author_id);

-- Step 6: Create function to mark comment as read
CREATE OR REPLACE FUNCTION mark_comment_as_read(
  p_comment_id uuid,
  p_post_author_id uuid
) RETURNS void AS $$
BEGIN
  INSERT INTO comment_reads (comment_id, post_author_id)
  VALUES (p_comment_id, p_post_author_id)
  ON CONFLICT (comment_id, post_author_id)
  DO UPDATE SET read_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_comment_as_read(uuid, uuid) TO authenticated;
