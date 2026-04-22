-- Allow admins to update any profile (for avatar uploads)
CREATE POLICY "Admins podem atualizar qualquer perfil"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));