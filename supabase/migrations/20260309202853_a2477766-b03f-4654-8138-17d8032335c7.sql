ALTER TABLE maintenance_providers 
  ADD COLUMN service_category text DEFAULT null,
  ADD COLUMN budget_deadline date DEFAULT null,
  ADD COLUMN agreed_value numeric DEFAULT null;