-- Add new fields to checklist_items for Saldo Devedor and Estado Civil
ALTER TABLE public.checklist_items
ADD COLUMN IF NOT EXISTS creditor_name text,
ADD COLUMN IF NOT EXISTS creditor_value text,
ADD COLUMN IF NOT EXISTS civil_status_type text,
ADD COLUMN IF NOT EXISTS civil_status_other text;