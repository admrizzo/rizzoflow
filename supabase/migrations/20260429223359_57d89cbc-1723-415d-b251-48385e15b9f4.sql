
-- Tabela de anexos de comentários
CREATE TABLE IF NOT EXISTS public.comment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  card_id uuid NOT NULL,
  uploaded_by uuid,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment_id ON public.comment_attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_attachments_card_id ON public.comment_attachments(card_id);

ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer membro da equipe que possa ver o card
CREATE POLICY "Membros podem ver comment_attachments"
  ON public.comment_attachments
  FOR SELECT
  TO authenticated
  USING (public.can_view_card(auth.uid(), card_id));

-- INSERT: o autor do comentário insere o anexo
CREATE POLICY "Autor do comentário pode anexar"
  ON public.comment_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_attachments.comment_id
        AND c.user_id = auth.uid()
    )
  );

-- DELETE: dono do comentário ou admin
CREATE POLICY "Dono ou admin pode remover comment_attachments"
  ON public.comment_attachments
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR auth.uid() = uploaded_by
  );

-- Bucket privado dedicado (separado de proposal-documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-attachments', 'comment-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: apenas membros autenticados; usamos o caminho {card_id}/{comment_id}/...
CREATE POLICY "Membros podem ver anexos de comentários"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'comment-attachments' AND public.is_team_member(auth.uid()));

CREATE POLICY "Membros podem enviar anexos de comentários"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'comment-attachments' AND public.is_team_member(auth.uid()));

CREATE POLICY "Dono ou admin pode remover anexos do storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'comment-attachments'
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  );
