ALTER TABLE public.maintenance_providers 
  ADD COLUMN service_completed_at timestamptz,
  ADD COLUMN service_completed_by uuid;