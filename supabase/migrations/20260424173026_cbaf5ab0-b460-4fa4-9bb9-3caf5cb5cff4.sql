-- Adiciona coluna public_token (UUID) com default automático
ALTER TABLE public.proposal_links
  ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid();

-- Garante unicidade do token público
CREATE UNIQUE INDEX IF NOT EXISTS proposal_links_public_token_key
  ON public.proposal_links (public_token);
