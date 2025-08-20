-- Migration: Create system notifications management tables
-- Description: Separate system notifications from user notifications for better admin management
-- Date: 2025-01-10
-- Environment: Production

-- Step 1: Create system_notifications table for admin management
CREATE TABLE IF NOT EXISTS system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('app_update', 'system_maintenance', 'feature_release', 'community_event', 'system')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at timestamptz,
  action_url text,
  action_text text,
  target_users text[] DEFAULT '{}', -- 特定ユーザーのみ（空の場合は全ユーザー）
  total_recipients integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  read_count integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'cancelled')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create notification_deliveries table to track delivery status
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_notification_id uuid REFERENCES system_notifications(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  user_notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'read', 'failed')),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(system_notification_id, recipient_id)
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_notifications_status ON system_notifications(status);
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON system_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_system_id ON notification_deliveries(system_notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_recipient ON notification_deliveries(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status);

-- Step 4: Enable RLS on new tables
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for system_notifications
CREATE POLICY "Admins can manage system notifications" ON system_notifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Users can view public system notifications" ON system_notifications
FOR SELECT USING (
  status = 'sent' OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 6: Create RLS policies for notification_deliveries
CREATE POLICY "Users can view their own delivery status" ON notification_deliveries
FOR SELECT USING (
  recipient_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage all delivery statuses" ON notification_deliveries
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 7: Create function to update delivery counts
CREATE OR REPLACE FUNCTION update_system_notification_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update delivered count
    UPDATE system_notifications 
    SET delivered_count = (
      SELECT COUNT(*) 
      FROM notification_deliveries 
      WHERE system_notification_id = NEW.system_notification_id 
      AND status = 'delivered'
    )
    WHERE id = NEW.system_notification_id;
    
    -- Update total recipients if this is the first delivery
    UPDATE system_notifications 
    SET total_recipients = (
      SELECT COUNT(*) 
      FROM notification_deliveries 
      WHERE system_notification_id = NEW.system_notification_id
    )
    WHERE id = NEW.system_notification_id;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Update read count when status changes to 'read'
    IF NEW.status = 'read' AND OLD.status != 'read' THEN
      UPDATE system_notifications 
      SET read_count = (
        SELECT COUNT(*) 
        FROM notification_deliveries 
        WHERE system_notification_id = NEW.system_notification_id 
        AND status = 'read'
      )
      WHERE id = NEW.system_notification_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for automatic count updates
CREATE TRIGGER trigger_update_notification_counts
  AFTER INSERT OR UPDATE ON notification_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_system_notification_counts();

-- Step 9: Create function to send system notification
CREATE OR REPLACE FUNCTION send_system_notification(
  p_title text,
  p_message text,
  p_type text,
  p_priority text DEFAULT 'normal',
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
    title, message, type, priority, expires_at, 
    action_url, action_text, target_users, status, created_by
  ) VALUES (
    p_title, p_message, p_type, p_priority, p_expires_at,
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
        priority, expires_at, action_url, action_text,
        metadata
      ) VALUES (
        v_user_id, NULL, p_type, p_title, p_message,
        p_priority, p_expires_at, p_action_url, p_action_text,
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
        priority, expires_at, action_url, action_text,
        metadata
      ) VALUES (
        v_user_id, NULL, p_type, p_title, p_message,
        p_priority, p_expires_at, p_action_url, p_action_text,
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

-- Step 10: Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON system_notifications TO authenticated;
GRANT ALL ON notification_deliveries TO authenticated;
GRANT EXECUTE ON FUNCTION send_system_notification TO authenticated;

-- Step 11: Verify the migration
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('system_notifications', 'notification_deliveries')
ORDER BY table_name, ordinal_position;
