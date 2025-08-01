-- Fix admin access to all profiles including unapproved ones
-- This migration allows admins to read all profiles for approval management

-- Drop the restrictive policy that only allows reading approved profiles
DROP POLICY IF EXISTS "Users can read all approved profiles" ON profiles;

-- Create new policy that allows admins to read all profiles
CREATE POLICY "Users can read approved profiles or admins can read all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    is_approved = true OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add policy for admins to update profiles (for approval/rejection)
CREATE POLICY "Admins can update profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add policy for admins to delete profiles (for rejection)
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  ); 