-- Add archive columns to cards table
ALTER TABLE public.cards 
  ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN archive_reason TEXT;

-- Add constraint for archive reason length
ALTER TABLE public.cards ADD CONSTRAINT card_archive_reason_length 
  CHECK (archive_reason IS NULL OR (length(archive_reason) > 0 AND length(archive_reason) <= 500));

-- Create index for filtering archived cards
CREATE INDEX idx_cards_is_archived ON public.cards(is_archived);