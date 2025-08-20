-- Migration: Fix send_system_notification function to remove priority parameter
-- Description: Remove priority parameter from send_system_notification function
-- Date: 2025-01-09
-- Environment: Production

-- Step 1: Drop the existing function
DROP FUNCTION IF EXISTS send_system_notification(
  text, text, text, text, timestamptz, text, text, text[]
);

-- Step 2: Recreate function without priority parameter
CREATE OR REPLACE FUNCTION send_system_notification(
  p_title text,
  p_message text,
  p_type text,
  p_expires_at timestamptz DEFAULT NULL,
  p_action_url text DEFAULT NULL,
  p_action_text text DEFAULT NULL,
  p_target_users text[] DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  v_system_notification_id uuid;
  v_user_id uuid;
  v_user_notification_id uuid;
  v_delivery_id uuid;
BEGIN
  -- Create system notification record
  INSERT INTO system_notifications (
    title, message, type, expires_at, 
    action_url, action_text, target_users, status, created_by
  ) VALUES (
    p_title, p_message, p_type, p_expires_at,
    p_action_url, p_action_text, p_target_users, 'sending', auth.uid()
  ) RETURNING id INTO v_system_notification_id;
  
  -- Get target users
  IF array_length(p_target_users, 1) > 0 THEN
    -- Specific users
    FOR v_user_id IN 
      SELECT unnest(p_target_users)::uuid
    LOOP
      -- Create user notification
      INSERT INTO notifications (
        recipient_id, sender_id, type, title, message, 
        expires_at, action_url, action_text,
        metadata
      ) VALUES (
        v_user_id, NULL, p_type, p_title, p_message,
        p_expires_at, p_action_url, p_action_text,
        jsonb_build_object(
          'system_notification_id', v_system_notification_id,
          'created_by', 'system'
        )
      ) RETURNING id INTO v_user_notification_id;
      
      -- Create delivery record
      INSERT INTO notification_deliveries (
        system_notification_id, recipient_id, user_notification_id, status
      ) VALUES (
        v_system_notification_id, v_user_id, v_user_notification_id, 'delivered'
      );
    END LOOP;
  ELSE
    -- All approved users
    FOR v_user_id IN 
      SELECT id FROM profiles WHERE is_approved = true
    LOOP
      -- Create user notification
      INSERT INTO notifications (
        recipient_id, sender_id, type, title, message, 
        expires_at, action_url, action_text,
        metadata
      ) VALUES (
        v_user_id, NULL, p_type, p_title, p_message,
        p_expires_at, p_action_url, p_action_text,
        jsonb_build_object(
          'system_notification_id', v_system_notification_id,
          'created_by', 'system'
        )
      ) RETURNING id INTO v_user_notification_id;
      
      -- Create delivery record
      INSERT INTO notification_deliveries (
        system_notification_id, recipient_id, user_notification_id, status
      ) VALUES (
        v_system_notification_id, v_user_id, v_user_notification_id, 'delivered'
      );
    END LOOP;
  END IF;
  
  -- Update system notification status to sent
  UPDATE system_notifications 
  SET status = 'sent', updated_at = now()
  WHERE id = v_system_notification_id;
  
  RETURN v_system_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION send_system_notification TO authenticated;
