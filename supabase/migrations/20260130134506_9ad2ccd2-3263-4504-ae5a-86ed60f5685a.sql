-- Add field to track who moved the card
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS last_moved_by uuid;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS last_moved_at timestamp with time zone;