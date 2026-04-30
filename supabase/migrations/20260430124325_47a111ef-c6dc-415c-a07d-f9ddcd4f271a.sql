-- Permitir que qualquer membro com acesso ao card possa criar comentários
-- (inclui corretor, que antes ficava bloqueado pela política admin/editor).
DROP POLICY IF EXISTS "Admins e editores podem criar comments" ON public.comments;

CREATE POLICY "Membros com acesso ao card podem criar comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.can_view_card(auth.uid(), card_id)
);

-- Mesma flexibilização para menções: qualquer autor de comentário no card pode mencionar.
DROP POLICY IF EXISTS "Editores e admins podem criar menções" ON public.comment_mentions;

CREATE POLICY "Membros com acesso ao card podem criar menções"
ON public.comment_mentions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = mentioned_by
  AND public.can_view_card(auth.uid(), card_id)
);