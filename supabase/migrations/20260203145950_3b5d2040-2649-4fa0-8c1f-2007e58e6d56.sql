-- Remove the check constraint that only allows 'positive' or 'negative'
-- Now certificate_status can contain any custom status from templates
ALTER TABLE public.checklist_items DROP CONSTRAINT IF EXISTS checklist_items_certificate_status_check;