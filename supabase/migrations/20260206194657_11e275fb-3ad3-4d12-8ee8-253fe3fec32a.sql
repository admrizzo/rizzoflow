
-- Table to track mentions in comments
CREATE TABLE public.comment_mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL,
  mentioned_by uuid NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_comment_mentions_mentioned_user ON public.comment_mentions(mentioned_user_id);
CREATE INDEX idx_comment_mentions_card ON public.comment_mentions(card_id);
CREATE INDEX idx_comment_mentions_comment ON public.comment_mentions(comment_id);

-- Enable RLS
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Membros da equipe podem ver menções"
ON public.comment_mentions FOR SELECT
USING (is_team_member(auth.uid()));

CREATE POLICY "Editores e admins podem criar menções"
ON public.comment_mentions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Usuários podem marcar próprias menções como lidas"
ON public.comment_mentions FOR UPDATE
USING (auth.uid() = mentioned_user_id);

CREATE POLICY "Admins podem deletar menções"
ON public.comment_mentions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = mentioned_by);
