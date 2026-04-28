-- Adiciona vínculo entre partes (cônjuge → titular/fiador)
ALTER TABLE public.proposal_parties
  ADD COLUMN IF NOT EXISTS related_party_id uuid NULL
  REFERENCES public.proposal_parties(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_proposal_parties_related ON public.proposal_parties(related_party_id);