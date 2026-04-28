-- Tabela de partes da proposta
CREATE TABLE IF NOT EXISTS public.proposal_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_link_id uuid NOT NULL REFERENCES public.proposal_links(id) ON DELETE CASCADE,
  card_id uuid NULL REFERENCES public.cards(id) ON DELETE SET NULL,
  role text NOT NULL,
  person_type text NOT NULL DEFAULT 'pf',
  name text,
  cpf text,
  cnpj text,
  rg text,
  email text,
  phone text,
  marital_status text,
  profession text,
  income numeric,
  address text,
  position integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_proposal_parties_link ON public.proposal_parties(proposal_link_id);
CREATE INDEX IF NOT EXISTS idx_proposal_parties_card ON public.proposal_parties(card_id);
CREATE INDEX IF NOT EXISTS idx_proposal_parties_role ON public.proposal_parties(role);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_proposal_parties_updated_at ON public.proposal_parties;
CREATE TRIGGER trg_proposal_parties_updated_at
BEFORE UPDATE ON public.proposal_parties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.proposal_parties ENABLE ROW LEVEL SECURITY;

-- Anon: pode inserir/ler partes vinculadas a um proposal_link existente
-- (a posse do public_token já restringe o acesso prático no fluxo público)
CREATE POLICY "Anon pode inserir proposal_parties"
ON public.proposal_parties FOR INSERT TO anon
WITH CHECK (
  proposal_link_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.proposal_links pl WHERE pl.id = proposal_parties.proposal_link_id)
);

CREATE POLICY "Anon pode atualizar proposal_parties"
ON public.proposal_parties FOR UPDATE TO anon
USING (
  EXISTS (SELECT 1 FROM public.proposal_links pl WHERE pl.id = proposal_parties.proposal_link_id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.proposal_links pl WHERE pl.id = proposal_parties.proposal_link_id)
);

CREATE POLICY "Anon pode ver proposal_parties"
ON public.proposal_parties FOR SELECT TO anon
USING (
  EXISTS (SELECT 1 FROM public.proposal_links pl WHERE pl.id = proposal_parties.proposal_link_id)
);

-- Authenticated: pode ver partes de cards visíveis ou via proposal_link de cards visíveis
CREATE POLICY "Authenticated pode ver partes de cards visíveis"
ON public.proposal_parties FOR SELECT TO authenticated
USING (
  ((card_id IS NOT NULL) AND public.can_view_card(auth.uid(), card_id))
  OR ((proposal_link_id IS NOT NULL) AND EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.proposal_link_id = proposal_parties.proposal_link_id
      AND public.can_view_card(auth.uid(), c.id)
  ))
);

CREATE POLICY "Membros podem ver proposal_parties"
ON public.proposal_parties FOR SELECT TO authenticated
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Operacional pode gerenciar proposal_parties"
ON public.proposal_parties FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'administrativo'::app_role)
  OR public.has_role(auth.uid(), 'editor'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'administrativo'::app_role)
  OR public.has_role(auth.uid(), 'editor'::app_role)
);

-- Adiciona party_id em proposal_documents (fallback continua ativo)
ALTER TABLE public.proposal_documents
  ADD COLUMN IF NOT EXISTS party_id uuid NULL
  REFERENCES public.proposal_parties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposal_documents_party ON public.proposal_documents(party_id);
