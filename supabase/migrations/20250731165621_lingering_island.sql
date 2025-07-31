/*
  # Add INSERT policy for profiles table

  1. Security
    - Add policy for authenticated users to insert their own profile data
    - This allows users to create their profile during sign up process

  2. Changes
    - Create INSERT policy on `profiles` table
    - Policy allows users to insert only their own profile (where auth.uid() = id)
*/

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);