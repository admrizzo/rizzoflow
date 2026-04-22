
ALTER TABLE public.maintenance_providers
ADD COLUMN approved_by uuid,
ADD COLUMN approved_at timestamptz;
