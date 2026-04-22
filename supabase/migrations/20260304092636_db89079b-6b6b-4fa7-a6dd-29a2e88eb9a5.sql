
ALTER TABLE public.maintenance_providers 
  ADD COLUMN reimbursement_status text DEFAULT NULL;

COMMENT ON COLUMN public.maintenance_providers.reimbursement_status IS 'For imobiliaria payments: reembolsado, assumido, descontar_repasse';
