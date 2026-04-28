-- =========================================================
-- Permitir uploads e registros de documentos de proposta
-- vindos de qualquer sessão (anon OU autenticado) DESDE QUE
-- estejam vinculados a um proposal_link válido (público).
-- Causa do bug: corretor autenticado não conseguia inserir
-- em proposal_documents nem subir no bucket porque as policies
-- só cobriam {anon} ou admin.
-- =========================================================

-- 1) Tabela proposal_documents: INSERT permitido a authenticated
--    quando o registro referencia um proposal_link existente
CREATE POLICY "Authenticated pode inserir docs vinculados a proposal_link"
ON public.proposal_documents
FOR INSERT
TO authenticated
WITH CHECK (
  proposal_link_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.proposal_links pl WHERE pl.id = proposal_link_id)
);

-- SELECT já está permitido a anon e team members; garantir que
-- authenticated possa ver documentos de cards visíveis (para corretor)
CREATE POLICY "Authenticated pode ver docs de cards visíveis"
ON public.proposal_documents
FOR SELECT
TO authenticated
USING (
  -- registro tem card e o usuário pode ver esse card
  (card_id IS NOT NULL AND public.can_view_card(auth.uid(), card_id))
  OR
  -- registro só tem proposal_link, mas há um card vinculado e visível
  (proposal_link_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.proposal_link_id = proposal_documents.proposal_link_id
      AND public.can_view_card(auth.uid(), c.id)
  ))
);

-- 2) Storage: permitir upload (INSERT) e leitura (SELECT) por
--    authenticated no bucket 'proposal-documents'.
--    Isso libera o corretor logado para subir arquivos pelo link público,
--    e também permite que corretores vinculados visualizem docs do card.
CREATE POLICY "Authenticated pode subir arquivos de proposta"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proposal-documents');

CREATE POLICY "Authenticated pode ver arquivos de proposta"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'proposal-documents');
