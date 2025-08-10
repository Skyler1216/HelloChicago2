/*
  # Add notification triggers for likes and comments

  1. Purpose
    - Automatically create notifications when users like posts or comment
    - Ensure real-time notification delivery
    - Maintain data consistency between actions and notifications

  2. Triggers
    - Like notification: When someone likes a post
    - Comment notification: When someone comments on a post
    - Reply notification: When someone replies to a comment

  3. Functions
    - create_like_notification: Creates notification for post likes
    - create_comment_notification: Creates notification for post comments
    - create_reply_notification: Creates notification for comment replies
*/

-- Function to create notification when someone likes a post
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  post_title text;
BEGIN
  -- Get post author and title
  SELECT author_id, title INTO post_author_id, post_title
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Don't create notification if user likes their own post
  IF NEW.user_id = post_author_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    metadata,
    related_post_id
  ) VALUES (
    post_author_id,
    NEW.user_id,
    'like',
    '新しいいいね',
    post_title || ' にいいねが付きました',
    jsonb_build_object('post_id', NEW.post_id, 'post_title', post_title),
    NEW.post_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when someone comments on a post
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  post_title text;
  commenter_name text;
BEGIN
  -- Get post author and title
  SELECT author_id, title INTO post_author_id, post_title
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Get commenter name
  SELECT name INTO commenter_name
  FROM profiles
  WHERE id = NEW.author_id;
  
  -- Don't create notification if user comments on their own post
  IF NEW.author_id = post_author_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    metadata,
    related_post_id,
    related_comment_id
  ) VALUES (
    post_author_id,
    NEW.author_id,
    'comment',
    '新しいコメント',
    post_title || ' にコメントが付きました',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'post_title', post_title,
      'comment_id', NEW.id,
      'commenter_name', commenter_name
    ),
    NEW.post_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when someone replies to a comment
CREATE OR REPLACE FUNCTION create_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_author_id uuid;
  post_title text;
  replier_name text;
BEGIN
  -- Only process if this is a reply (has parent_id)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get parent comment author
  SELECT author_id INTO parent_comment_author_id
  FROM comments
  WHERE id = NEW.parent_id;
  
  -- Get post title
  SELECT title INTO post_title
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Get replier name
  SELECT name INTO replier_name
  FROM profiles
  WHERE id = NEW.author_id;
  
  -- Don't create notification if user replies to their own comment
  IF NEW.author_id = parent_comment_author_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    metadata,
    related_post_id,
    related_comment_id
  ) VALUES (
    parent_comment_author_id,
    NEW.author_id,
    'comment',
    '新しい返信',
    post_title || ' のコメントに返信が付きました',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'post_title', post_title,
      'comment_id', NEW.id,
      'parent_comment_id', NEW.parent_id,
      'replier_name', replier_name
    ),
    NEW.post_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_create_like_notification ON likes;
CREATE TRIGGER trigger_create_like_notification
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

DROP TRIGGER IF EXISTS trigger_create_comment_notification ON comments;
CREATE TRIGGER trigger_create_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

DROP TRIGGER IF EXISTS trigger_create_reply_notification ON comments;
CREATE TRIGGER trigger_create_reply_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_reply_notification();

-- Grant execute permissions on trigger functions
GRANT EXECUTE ON FUNCTION create_like_notification TO authenticated;
GRANT EXECUTE ON FUNCTION create_comment_notification TO authenticated;
GRANT EXECUTE ON FUNCTION create_reply_notification TO authenticated;
