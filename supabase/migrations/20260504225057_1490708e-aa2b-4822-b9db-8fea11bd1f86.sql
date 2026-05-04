-- 1. Backfill service_broker_id from proposal_links for existing cards
UPDATE public.cards c
SET service_broker_id = pl.broker_user_id
FROM public.proposal_links pl
WHERE c.proposal_link_id = pl.id
  AND c.service_broker_id IS NULL;

-- 2. Cleanup responsible_user_id where next_action is empty or null
UPDATE public.cards
SET 
  responsible_user_id = NULL,
  next_action_due_date = NULL
WHERE (next_action IS NULL OR trim(next_action) = '');

-- Note: We don't touch cards that have next_action, preserving manual assignments.
