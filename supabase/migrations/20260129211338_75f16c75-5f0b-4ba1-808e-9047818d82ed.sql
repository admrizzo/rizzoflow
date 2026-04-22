-- Add subfield configuration columns to checklist_items (the actual items in cards)
-- These will be copied from templates when a card is created
ALTER TABLE public.checklist_items
ADD COLUMN IF NOT EXISTS requires_date boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_status boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_observation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status_options jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS observation_text text;

COMMENT ON COLUMN public.checklist_items.requires_date IS 'Whether this item requires a date when completed (copied from template)';
COMMENT ON COLUMN public.checklist_items.requires_status IS 'Whether this item requires a status selection when completed (copied from template)';
COMMENT ON COLUMN public.checklist_items.requires_observation IS 'Whether this item requires an observation when completed (copied from template)';
COMMENT ON COLUMN public.checklist_items.status_options IS 'JSON array of status options (copied from template)';
COMMENT ON COLUMN public.checklist_items.observation_text IS 'The observation text entered by the user';