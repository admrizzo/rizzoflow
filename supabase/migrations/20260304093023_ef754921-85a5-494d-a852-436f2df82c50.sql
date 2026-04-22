
CREATE TABLE public.provider_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e editores podem gerenciar provider_registry"
  ON public.provider_registry FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Membros da equipe podem ver provider_registry"
  ON public.provider_registry FOR SELECT
  TO authenticated
  USING (is_team_member(auth.uid()));
