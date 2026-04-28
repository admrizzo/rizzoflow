-- Permitir que o submit público (anon) registre uma atividade no card vinculado à proposta.
-- Restringe a inserção a cards que tenham proposal_link_id (vindo do formulário público).
CREATE POLICY "Anon pode registrar atividade em card de proposta pública"
ON public.card_activity_logs
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cards c
    WHERE c.id = card_activity_logs.card_id
      AND c.proposal_link_id IS NOT NULL
  )
);