/*
  # Fix notifications table RLS policy

  1. Security Updates
    - Add INSERT policy for notifications table to allow trigger functions to create notifications
    - The trigger functions run with elevated privileges and need to insert notifications
    - Add policy to allow service role and authenticated users to insert notifications

  2. Changes
    - Add INSERT policy for notifications table
    - Ensure triggers can create notifications when users like posts or comment
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;

-- Add INSERT policy that allows both authenticated users and service role to insert notifications
CREATE POLICY "Service can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Also ensure the trigger functions have proper permissions
-- Grant necessary permissions to the trigger functions
GRANT INSERT ON notifications TO authenticated;
GRANT INSERT ON notifications TO service_role;