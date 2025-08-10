/*
  # HelloChicago Initial Schema - Complete

  1. Core Tables
    - profiles: ユーザープロフィール
    - categories: カテゴリ
    - posts: 投稿
    - comments: コメント
    - likes: いいね
    - profile_details: プロフィール詳細
    - notification_settings: 通知設定
    - notifications: 通知

  2. Features
    - User authentication and approval system
    - Post management with categories
    - Like and comment system
    - Notification system
    - Profile management
    - Row Level Security (RLS)

  3. Security
    - RLS enabled on all tables
    - Proper policies for data access
    - Trigger functions for automatic updates
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  avatar_url text,
  is_approved boolean DEFAULT false,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_ja text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  summary text,
  type text NOT NULL CHECK (type IN ('post', 'consultation', 'transfer')),
  status text CHECK (status IN ('open', 'in_progress', 'closed')),
  category_id text REFERENCES categories(id),
  location_lat numeric NOT NULL,
  location_lng numeric NOT NULL,
  location_address text NOT NULL,
  images text[] DEFAULT '{}',
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  likes integer DEFAULT 0,
  replies integer DEFAULT 0,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Create profile_details table
CREATE TABLE IF NOT EXISTS profile_details (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bio text,
  location_area text,
  interests text[],
  languages text[],
  arrival_date date,
  family_structure text,
  privacy_settings jsonb DEFAULT '{"profile_visible": true, "posts_visible": true, "activity_visible": true, "contact_allowed": true}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  push_likes boolean DEFAULT true,
  push_comments boolean DEFAULT true,
  push_mentions boolean DEFAULT true,
  email_likes boolean DEFAULT false,
  email_comments boolean DEFAULT true,
  email_mentions boolean DEFAULT false,
  weekly_digest boolean DEFAULT false,
  important_updates boolean DEFAULT true,
  system_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'mention', 'system', 'weekly_digest')),
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  related_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  related_comment_id uuid REFERENCES comments(id) ON DELETE SET NULL,
  is_read boolean DEFAULT false,
  is_pushed boolean DEFAULT false,
  is_emailed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  pushed_at timestamptz,
  emailed_at timestamptz
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read all approved profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Categories policies (public read)
CREATE POLICY "Anyone can read categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Posts policies
CREATE POLICY "Users can read approved posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (approved = true);

CREATE POLICY "Users can read own posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Users can create posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- Comments policies
CREATE POLICY "Users can read approved comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (approved = true);

CREATE POLICY "Users can read their own comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Users can create comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments"
  ON comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Likes policies
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

-- Profile details policies
CREATE POLICY "Users can read own profile details"
  ON profile_details
  FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can create own profile details"
  ON profile_details
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own profile details"
  ON profile_details
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id);

-- Notification settings policies
CREATE POLICY "Users can read own notification settings"
  ON notification_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notification settings"
  ON notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Service can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Insert initial categories
INSERT INTO categories (id, name, name_ja, icon, color) VALUES
  ('hospital', 'Hospital', '病院', 'Heart', '#FF6B6B'),
  ('beauty', 'Beauty', '美容院', 'Scissors', '#4ECDC4'),
  ('shopping', 'Shopping', '買い物', 'ShoppingBag', '#FFE66D'),
  ('restaurant', 'Restaurant', 'レストラン', 'UtensilsCrossed', '#95E1D3'),
  ('kids', 'Kids', '子ども', 'Baby', '#F38BA8'),
  ('park', 'Park', '公園', 'Trees', '#A8E6CF')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ja = EXCLUDED.name_ja,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_details_updated_at
  BEFORE UPDATE ON profile_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET likes = COALESCE(likes, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update post replies count
CREATE OR REPLACE FUNCTION update_post_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET replies = replies + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET replies = replies - 1 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic count updates
CREATE TRIGGER update_post_likes_trigger
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

CREATE TRIGGER update_post_replies_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_replies_count();

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

-- Function to sync all post replies counts
CREATE OR REPLACE FUNCTION sync_all_post_replies()
RETURNS void AS $$
BEGIN
  UPDATE posts 
  SET replies = (
    SELECT COUNT(*) 
    FROM comments 
    WHERE comments.post_id = posts.id
  );
END;
$$ LANGUAGE plpgsql;

-- Sync existing counts
SELECT sync_all_post_likes();
SELECT sync_all_post_replies();

-- Set the first user as admin and approved
UPDATE profiles 
SET 
  role = 'admin',
  is_approved = true,
  updated_at = now()
WHERE id = (
  SELECT id 
  FROM profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
