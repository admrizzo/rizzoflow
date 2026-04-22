-- Add subfield configuration columns to checklist_item_templates
ALTER TABLE public.checklist_item_templates
ADD COLUMN IF NOT EXISTS requires_date boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_status boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_observation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status_options jsonb DEFAULT '[]'::jsonb;

-- Also add these fields to checklist_items so they carry over when templates are applied
-- These already exist partially, let's make sure we have good defaults
COMMENT ON COLUMN public.checklist_item_templates.requires_date IS 'Whether this item requires a date when completed';
COMMENT ON COLUMN public.checklist_item_templates.requires_status IS 'Whether this item requires a status selection when completed';
COMMENT ON COLUMN public.checklist_item_templates.requires_observation IS 'Whether this item requires an observation/note when completed';
COMMENT ON COLUMN public.checklist_item_templates.status_options IS 'JSON array of status options like ["Positiva", "Negativa"]';