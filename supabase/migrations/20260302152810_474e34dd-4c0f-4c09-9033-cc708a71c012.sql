
CREATE TABLE public.card_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id uuid,
  from_column_id uuid,
  to_column_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e editores podem inserir activity_log"
  ON public.card_activity_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Membros podem ver activity_log"
  ON public.card_activity_log FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE INDEX idx_card_activity_log_card_id ON public.card_activity_log(card_id);
CREATE INDEX idx_card_activity_log_created_at ON public.card_activity_log(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.card_activity_log;
