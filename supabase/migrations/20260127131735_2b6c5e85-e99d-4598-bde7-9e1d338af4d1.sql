-- Allow Flow Admins (board admins) to manage custom fields for their own boards
-- First drop if exists to avoid duplicate policy error
DROP POLICY IF EXISTS "Board admins podem gerenciar board_fields dos seus boards" ON public.board_fields;

CREATE POLICY "Board admins podem gerenciar board_fields dos seus boards"
ON public.board_fields
FOR ALL
USING (public.is_board_admin(auth.uid(), board_id))
WITH CHECK (public.is_board_admin(auth.uid(), board_id));