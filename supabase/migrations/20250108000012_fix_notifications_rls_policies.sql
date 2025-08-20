-- Migration: Fix notifications table RLS policies
-- Description: Add proper RLS policies for system notifications and user access
-- Date: 2025-01-10
-- Environment: Production

-- Step 1: Enable RLS on notifications table if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "System can manage all notifications" ON notifications;

-- Step 3: Create comprehensive RLS policies

-- Policy 1: Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT USING (
  auth.uid() = recipient_id OR 
  auth.uid() = sender_id OR
  -- Allow viewing system notifications (where sender_id is null)
  sender_id IS NULL
);

-- Policy 2: Users can update their own notifications (mark as read, etc.)
CREATE POLICY "Users can update their own notifications" ON notifications
FOR UPDATE USING (
  auth.uid() = recipient_id OR 
  auth.uid() = sender_id
);

-- Policy 3: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON notifications
FOR DELETE USING (
  auth.uid() = recipient_id OR 
  auth.uid() = sender_id
);

-- Policy 4: Allow system to create notifications (for system notifications)
CREATE POLICY "System can create notifications" ON notifications
FOR INSERT WITH CHECK (
  -- Allow if recipient_id is set (required)
  recipient_id IS NOT NULL AND
  -- Allow if sender_id is null (system notifications) OR if sender is authenticated user
  (sender_id IS NULL OR auth.uid() = sender_id)
);

-- Policy 5: Allow system to manage all notifications (for admin functions)
CREATE POLICY "System can manage all notifications" ON notifications
FOR ALL USING (
  -- Check if user has admin role
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 4: Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON notifications TO authenticated;

-- Step 6: Verify the policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;
