ALTER TABLE public.maintenance_providers
  ADD COLUMN payment_status_changed_by uuid DEFAULT NULL,
  ADD COLUMN payment_status_changed_at timestamptz DEFAULT NULL,
  ADD COLUMN reimbursement_status_changed_by uuid DEFAULT NULL,
  ADD COLUMN reimbursement_status_changed_at timestamptz DEFAULT NULL;