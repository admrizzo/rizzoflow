ALTER TABLE public.proposal_documents
  ADD COLUMN IF NOT EXISTS is_complementary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_file_name text,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid;

CREATE INDEX IF NOT EXISTS idx_proposal_documents_card_owner
  ON public.proposal_documents (card_id, owner_type);