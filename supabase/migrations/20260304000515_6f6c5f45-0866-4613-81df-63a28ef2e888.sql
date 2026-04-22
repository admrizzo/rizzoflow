
-- Create maintenance_providers table
CREATE TABLE public.maintenance_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  provider_phone text,
  budget_value numeric,
  budget_status text NOT NULL DEFAULT 'pendente',
  budget_sent_at timestamptz,
  budget_received_at timestamptz,
  is_selected boolean NOT NULL DEFAULT false,
  payment_status text NOT NULL DEFAULT 'pendente',
  payment_value numeric,
  paid_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_providers ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other tables)
CREATE POLICY "Admins e editores podem gerenciar maintenance_providers"
  ON public.maintenance_providers
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Membros da equipe podem ver maintenance_providers"
  ON public.maintenance_providers
  FOR SELECT
  TO authenticated
  USING (is_team_member(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_maintenance_providers_updated_at
  BEFORE UPDATE ON public.maintenance_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
