-- Tabela de solicitações de correção de proposta
CREATE TABLE public.proposal_correction_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_link_id uuid NOT NULL REFERENCES public.proposal_links(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  requested_by uuid,
  status text NOT NULL DEFAULT 'pending',
  requested_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  canceled_at timestamptz,
  CONSTRAINT proposal_correction_status_chk
    CHECK (status IN ('pending','responded','canceled'))
);

CREATE INDEX idx_pcr_proposal_link ON public.proposal_correction_requests(proposal_link_id);
CREATE INDEX idx_pcr_card ON public.proposal_correction_requests(card_id);
CREATE INDEX idx_pcr_status ON public.proposal_correction_requests(status);

ALTER TABLE public.proposal_correction_requests ENABLE ROW LEVEL SECURITY;

-- Equipe operacional (admin/gestor/administrativo/editor) pode gerenciar
CREATE POLICY "Operacional gerencia correction_requests"
  ON public.proposal_correction_requests
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'administrativo'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'administrativo'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  );

-- Membros (inclui corretor) podem visualizar correções dos cards que conseguem ver
CREATE POLICY "Membros veem correction_requests por card"
  ON public.proposal_correction_requests
  FOR SELECT
  TO authenticated
  USING (
    card_id IS NULL
    OR can_view_card(auth.uid(), card_id)
  );

-- Anon (link público) pode ler solicitações pendentes do seu link
CREATE POLICY "Anon le correction_requests"
  ON public.proposal_correction_requests
  FOR SELECT
  TO anon
  USING (true);

-- Anon (link público) pode marcar como respondida
CREATE POLICY "Anon atualiza correction_requests"
  ON public.proposal_correction_requests
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
