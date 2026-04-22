-- Add issue_date and certificate_status to checklist_items
ALTER TABLE public.checklist_items 
ADD COLUMN IF NOT EXISTS issue_date date,
ADD COLUMN IF NOT EXISTS certificate_status text CHECK (certificate_status IN ('positive', 'negative'));

-- Add comments to document the columns
COMMENT ON COLUMN public.checklist_items.issue_date IS 'Issue date for document items (items with xx/xxxx pattern)';
COMMENT ON COLUMN public.checklist_items.certificate_status IS 'Status of certificate items (certidão): positive (problematic) or negative (clear)';