-- Add tracking columns for next_action completion
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS next_action_completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS next_action_completed_by uuid,
  ADD COLUMN IF NOT EXISTS last_completed_action text,
  ADD COLUMN IF NOT EXISTS last_completed_action_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_completed_action_by uuid;