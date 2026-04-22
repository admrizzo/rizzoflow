-- Add is_board_admin column to user_boards table
-- This allows users to be admins of specific boards without being super admins
ALTER TABLE public.user_boards 
ADD COLUMN is_board_admin boolean NOT NULL DEFAULT false;

-- Create a function to check if user is admin of a specific board
CREATE OR REPLACE FUNCTION public.is_board_admin(_user_id uuid, _board_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_boards
    WHERE user_id = _user_id
      AND board_id = _board_id
      AND is_board_admin = true
  ) OR has_role(_user_id, 'admin'::app_role)
$$;

-- Create a function to check if user can manage any board (is super admin or board admin of at least one)
CREATE OR REPLACE FUNCTION public.can_manage_boards(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'admin'::app_role) OR EXISTS (
    SELECT 1
    FROM public.user_boards
    WHERE user_id = _user_id
      AND is_board_admin = true
  )
$$;

-- Add comment explaining the permission levels
COMMENT ON COLUMN public.user_boards.is_board_admin IS 
'When true, user is an admin for this specific board. Super admins (role=admin) have admin access to all boards.';