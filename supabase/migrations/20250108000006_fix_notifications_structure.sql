/*
  # Fix notifications table structure to match frontend types

  1. Problem
    - Current notifications table structure doesn't match frontend TypeScript types
    - Missing fields: sender_id, related_post_id, related_comment_id, is_pushed, is_emailed, read_at, pushed_at, emailed_at
    - Field name mismatch: user_id vs recipient_id, read vs is_read, data vs metadata
    - Type mismatch: type enum values don't match

  2. Solution
    - Drop existing notifications table
    - Recreate with correct structure matching frontend types
    - Update notification creation function
    - Ensure all triggers and policies work correctly

  3. Changes
    - Recreate notifications table with correct schema
    - Update create_notification function
    - Add missing RLS policies
*/

-- Drop existing notifications table and related objects
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table with correct structure
CREATE TABLE notifications (
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

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create indexes for better performance
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Drop all existing functions with this name
DROP FUNCTION IF EXISTS create_notification CASCADE;

-- Create notification creation function
CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_sender_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_related_post_id uuid DEFAULT NULL,
  p_related_comment_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (
    recipient_id, sender_id, type, title, message,
    metadata, related_post_id, related_comment_id
  )
  VALUES (
    p_recipient_id, p_sender_id, p_type, p_title, p_message,
    p_metadata, p_related_post_id, p_related_comment_id
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND recipient_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id uuid)
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = now()
  WHERE recipient_id = user_id AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
