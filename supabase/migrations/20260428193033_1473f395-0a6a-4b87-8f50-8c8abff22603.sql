-- Permitir inserir partes vinculadas a um proposal_link existente (corretor logado, etc.)
CREATE POLICY "Authenticated pode inserir partes de proposal_link"
ON public.proposal_parties
FOR INSERT
TO authenticated
WITH CHECK (
  proposal_link_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.proposal_links pl
    WHERE pl.id = proposal_parties.proposal_link_id
  )
);

-- Permitir atualizar partes de um proposal_link existente
CREATE POLICY "Authenticated pode atualizar partes de proposal_link"
ON public.proposal_parties
FOR UPDATE
TO authenticated
USING (
  proposal_link_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.proposal_links pl
    WHERE pl.id = proposal_parties.proposal_link_id
  )
)
WITH CHECK (
  proposal_link_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.proposal_links pl
    WHERE pl.id = proposal_parties.proposal_link_id
  )
);

-- Permitir deletar partes de um proposal_link existente
CREATE POLICY "Authenticated pode deletar partes de proposal_link"
ON public.proposal_parties
FOR DELETE
TO authenticated
USING (
  proposal_link_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.proposal_links pl
    WHERE pl.id = proposal_parties.proposal_link_id
  )
);
