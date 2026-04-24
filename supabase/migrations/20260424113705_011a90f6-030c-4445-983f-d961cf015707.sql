-- Adiciona vínculo entre cards e proposal_links
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS proposal_link_id uuid REFERENCES public.proposal_links(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cards_proposal_link_id ON public.cards(proposal_link_id);

-- Adiciona estado de submissão da proposta no card
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS proposal_submitted_at timestamptz;

-- Permite ao público (anon) atualizar APENAS cards vinculados a um proposal_link
-- (necessário para o fluxo de submissão pública atualizar o card pré-criado)
CREATE POLICY "Public can update cards from their proposal link"
ON public.cards
FOR UPDATE
TO anon
USING (proposal_link_id IS NOT NULL)
WITH CHECK (proposal_link_id IS NOT NULL);

-- Vincular cards já existentes aos seus respectivos proposal_links pelo robust_code
-- (apenas casos 1-para-1 sem ambiguidade — dedup posterior fica como tarefa manual)
UPDATE public.cards c
SET proposal_link_id = pl.id
FROM public.proposal_links pl
WHERE c.proposal_link_id IS NULL
  AND c.robust_code IS NOT NULL
  AND c.robust_code = pl.codigo_robust::text
  AND c.created_by = pl.broker_user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.cards c2 
    WHERE c2.id <> c.id 
      AND c2.robust_code = c.robust_code 
      AND c2.created_by = c.created_by
      AND c2.created_at > c.created_at
  );