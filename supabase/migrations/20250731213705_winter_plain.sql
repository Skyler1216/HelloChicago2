/*
  # Add notification triggers

  1. Functions
    - Create notifications for likes
    - Create notifications for comments
    - Create notifications for follows

  2. Triggers
    - Trigger on likes table
    - Trigger on comments table
    - Trigger on follows table
*/

-- Function to create like notification
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  liker_name text;
  post_title text;
BEGIN
  -- Get post author and details
  SELECT author_id, title INTO post_author_id, post_title
  FROM posts WHERE id = NEW.post_id;
  
  -- Get liker name
  SELECT name INTO liker_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if user likes their own post
  IF post_author_id != NEW.user_id THEN
    PERFORM create_notification(
      post_author_id,
      'like',
      'いいねされました',
      liker_name || 'さんがあなたの投稿「' || post_title || '」にいいねしました',
      jsonb_build_object('post_id', NEW.post_id, 'user_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create comment notification
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  commenter_name text;
  post_title text;
BEGIN
  -- Get post author and details
  SELECT author_id, title INTO post_author_id, post_title
  FROM posts WHERE id = NEW.post_id;
  
  -- Get commenter name
  SELECT name INTO commenter_name
  FROM profiles WHERE id = NEW.author_id;
  
  -- Don't notify if user comments on their own post
  IF post_author_id != NEW.author_id THEN
    PERFORM create_notification(
      post_author_id,
      'comment',
      'コメントされました',
      commenter_name || 'さんがあなたの投稿「' || post_title || '」にコメントしました',
      jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'user_id', NEW.author_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create follow notification
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
  follower_name text;
BEGIN
  -- Get follower name
  SELECT name INTO follower_name
  FROM profiles WHERE id = NEW.follower_id;
  
  PERFORM create_notification(
    NEW.following_id,
    'follow',
    'フォローされました',
    follower_name || 'さんがあなたをフォローしました',
    jsonb_build_object('user_id', NEW.follower_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER like_notification_trigger
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

CREATE TRIGGER comment_notification_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

CREATE TRIGGER follow_notification_trigger
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();