-- Permite que o cliente público remova partes vinculadas a um proposal_link válido,
-- para que o reenvio/finalize_public_proposal não duplique registros em proposal_parties.
CREATE POLICY "Anon pode deletar proposal_parties"
ON public.proposal_parties
FOR DELETE
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.proposal_links pl
    WHERE pl.id = proposal_parties.proposal_link_id
  )
);