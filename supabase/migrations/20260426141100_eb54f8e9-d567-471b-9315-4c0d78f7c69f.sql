-- Tabela de histórico de andamentos por card
CREATE TABLE IF NOT EXISTS public.card_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_activity_logs_card_id ON public.card_activity_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_card_activity_logs_actor_user_id ON public.card_activity_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_card_activity_logs_event_type ON public.card_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_card_activity_logs_created_at_desc ON public.card_activity_logs(created_at DESC);

ALTER TABLE public.card_activity_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer membro da equipe que tenha acesso ao card (corretor incluso, conforme can_view_card)
CREATE POLICY "Equipe pode ver histórico dos cards acessíveis"
ON public.card_activity_logs
FOR SELECT
TO authenticated
USING (public.can_view_card(auth.uid(), card_id));

-- INSERT: apenas papéis operacionais (admin, gestor, administrativo, editor legado)
CREATE POLICY "Operacional pode registrar histórico"
ON public.card_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR public.has_role(auth.uid(), 'administrativo'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
  )
  AND public.can_view_card(auth.uid(), card_id)
);

-- UPDATE/DELETE: somente admin (manutenção excepcional)
CREATE POLICY "Admin pode atualizar histórico"
ON public.card_activity_logs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode deletar histórico"
ON public.card_activity_logs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));