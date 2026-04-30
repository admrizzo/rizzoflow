ALTER TABLE public.proposal_documents
  ADD COLUMN IF NOT EXISTS correction_request_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_proposal_documents_correction_request_id
  ON public.proposal_documents(correction_request_id);