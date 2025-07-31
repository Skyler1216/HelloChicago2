/*
  # Set admin role for first user

  1. Changes
    - Update the first registered user to have admin role and approved status
    - This allows the first user to access admin functions immediately

  2. Security
    - Only affects users who are not yet approved
    - Sets both admin role and approved status
*/

-- Set the first user (oldest created_at) as admin and approved
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