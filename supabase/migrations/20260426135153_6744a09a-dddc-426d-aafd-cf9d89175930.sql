ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid,
  ADD COLUMN IF NOT EXISTS next_action_due_date date;

CREATE INDEX IF NOT EXISTS idx_cards_responsible_user_id ON public.cards(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_cards_next_action_due_date ON public.cards(next_action_due_date);