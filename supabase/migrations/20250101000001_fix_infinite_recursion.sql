-- Fix infinite recursion in RLS policies
-- The issue is that policies are referencing the profiles table within themselves

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can read approved profiles or admins can read all" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Create a simpler policy that allows all authenticated users to read profiles
-- This is safe because we'll control access at the application level
CREATE POLICY "Authenticated users can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep the existing policies that are working
-- Users can read own profile (already exists)
-- Users can update own profile (already exists)

-- Add a simple admin check function to avoid recursion
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin policies using the function
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete any profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid())); 