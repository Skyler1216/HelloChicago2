/*
  # Add user statistics view

  1. Views
    - `user_stats`: Aggregated user statistics
      - user_id
      - posts_count
      - likes_received
      - comments_received
      - followers_count
      - following_count

  2. Security
    - Grant SELECT permission to authenticated users
*/

CREATE OR REPLACE VIEW user_stats AS
SELECT 
  p.id as user_id,
  p.name,
  p.avatar_url,
  COALESCE(posts.count, 0) as posts_count,
  COALESCE(likes_received.count, 0) as likes_received,
  COALESCE(comments_received.count, 0) as comments_received,
  COALESCE(followers.count, 0) as followers_count,
  COALESCE(following.count, 0) as following_count
FROM profiles p
LEFT JOIN (
  SELECT author_id, COUNT(*) as count
  FROM posts
  WHERE approved = true
  GROUP BY author_id
) posts ON p.id = posts.author_id
LEFT JOIN (
  SELECT posts.author_id, COUNT(*) as count
  FROM likes
  JOIN posts ON likes.post_id = posts.id
  GROUP BY posts.author_id
) likes_received ON p.id = likes_received.author_id
LEFT JOIN (
  SELECT posts.author_id, COUNT(*) as count
  FROM comments
  JOIN posts ON comments.post_id = posts.id
  WHERE comments.approved = true
  GROUP BY posts.author_id
) comments_received ON p.id = comments_received.author_id
LEFT JOIN (
  SELECT following_id, COUNT(*) as count
  FROM follows
  GROUP BY following_id
) followers ON p.id = followers.following_id
LEFT JOIN (
  SELECT follower_id, COUNT(*) as count
  FROM follows
  GROUP BY follower_id
) following ON p.id = following.follower_id
WHERE p.is_approved = true;

-- Grant access to authenticated users
GRANT SELECT ON user_stats TO authenticated;