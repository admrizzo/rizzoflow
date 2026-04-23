-- Create properties table for CRM synced data
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_robust integer NOT NULL UNIQUE,
  titulo text,
  tipo_imovel text,
  finalidade text,
  logradouro text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  numero text,
  complemento text,
  valor_aluguel numeric,
  valor_venda numeric,
  condominio numeric,
  iptu numeric,
  seguro_incendio numeric,
  status_imovel integer DEFAULT 1,
  foto_principal text,
  raw_data jsonb,
  last_synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Team members can view properties
CREATE POLICY "Team members can view properties"
  ON public.properties FOR SELECT
  USING (is_team_member(auth.uid()));

-- Admins can manage properties (for manual edits if needed)
CREATE POLICY "Admins can manage properties"
  ON public.properties FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index on codigo_robust for fast lookups
CREATE INDEX idx_properties_codigo_robust ON public.properties (codigo_robust);

-- Trigger for updated_at
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
