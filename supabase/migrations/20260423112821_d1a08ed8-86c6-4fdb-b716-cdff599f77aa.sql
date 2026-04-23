
-- Add default responsible and SLA hours to columns
ALTER TABLE public.columns 
ADD COLUMN IF NOT EXISTS default_responsible_id uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sla_hours integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.columns.default_responsible_id IS 'Default user assigned as responsible when a card enters this column';
COMMENT ON COLUMN public.columns.sla_hours IS 'SLA in hours for this column - used for green/yellow/red status indicators';
