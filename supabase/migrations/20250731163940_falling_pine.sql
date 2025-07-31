/*
  # HelloChicago Initial Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `name` (text)
      - `email` (text)
      - `avatar_url` (text, optional)
      - `is_approved` (boolean, default false)
      - `role` (text, default 'user')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `categories`
      - `id` (text, primary key)
      - `name` (text)
      - `name_ja` (text)
      - `icon` (text)
      - `color` (text)
    
    - `posts`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `summary` (text, optional)
      - `type` (text, 'post' | 'consultation' | 'transfer')
      - `status` (text, optional, 'open' | 'in_progress' | 'closed')
      - `category_id` (text, references categories)
      - `location_lat` (numeric)
      - `location_lng` (numeric)
      - `location_address` (text)
      - `images` (text array)
      - `author_id` (uuid, references profiles)
      - `likes` (integer, default 0)
      - `replies` (integer, default 0)
      - `approved` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read approved content
    - Add policies for users to manage their own data
    - Add policies for admins to approve content
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

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

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

-- Insert initial categories
INSERT INTO categories (id, name, name_ja, icon, color) VALUES
  ('hospital', 'Hospital', '病院', 'Heart', '#FF6B6B'),
  ('beauty', 'Beauty', '美容院', 'Scissors', '#4ECDC4'),
  ('shopping', 'Shopping', '買い物', 'ShoppingBag', '#FFE66D'),
  ('restaurant', 'Restaurant', 'レストラン', 'UtensilsCrossed', '#95E1D3'),
  ('kids', 'Kids', '子ども', 'Baby', '#F38BA8'),
  ('park', 'Park', '公園', 'Trees', '#A8E6CF')
ON CONFLICT (id) DO NOTHING;

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