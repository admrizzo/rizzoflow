-- Add DELETE policy to notifications table so users can manage their own notification history
CREATE POLICY "Usuários podem deletar próprias notificações"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);