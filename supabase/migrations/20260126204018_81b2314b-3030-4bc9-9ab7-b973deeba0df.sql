
-- Drop existing SELECT policy for user_boards
DROP POLICY IF EXISTS "Usuários podem ver próprias permissões" ON public.user_boards;

-- Create new SELECT policy that allows admins to see all and users to see their own
CREATE POLICY "Admins veem todos, usuários veem próprias permissões"
ON public.user_boards
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR auth.uid() = user_id
);
