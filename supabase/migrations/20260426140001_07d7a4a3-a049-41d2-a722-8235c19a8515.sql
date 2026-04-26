-- Add configurable default checklist items per column (stage)
ALTER TABLE public.columns
ADD COLUMN IF NOT EXISTS default_checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.columns.default_checklist_items IS
'Array of {title: string} objects used as the default operational checklist items when creating a stage checklist on a card.';