
-- Etapas configuráveis do processo de proposta
CREATE TABLE public.proposal_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  position integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  icon text DEFAULT 'file-text',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar proposal_stages"
  ON public.proposal_stages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver proposal_stages"
  ON public.proposal_stages FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE POLICY "Publico pode ler proposal_stages"
  ON public.proposal_stages FOR SELECT TO anon
  USING (true);

-- Campos configuráveis de cada etapa
CREATE TABLE public.proposal_stage_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id uuid NOT NULL REFERENCES public.proposal_stages(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  is_required boolean NOT NULL DEFAULT false,
  placeholder text,
  validation_rules jsonb DEFAULT '{}',
  field_options jsonb DEFAULT '[]',
  conditional_on jsonb,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_stage_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar proposal_stage_fields"
  ON public.proposal_stage_fields FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver proposal_stage_fields"
  ON public.proposal_stage_fields FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE POLICY "Publico pode ler proposal_stage_fields"
  ON public.proposal_stage_fields FOR SELECT TO anon
  USING (true);

-- Regras de negócio do processo
CREATE TABLE public.proposal_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  rule_type text NOT NULL DEFAULT 'validation',
  condition_config jsonb NOT NULL DEFAULT '{}',
  action_config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar proposal_rules"
  ON public.proposal_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver proposal_rules"
  ON public.proposal_rules FOR SELECT
  USING (is_team_member(auth.uid()));

-- Seed com etapas padrão
INSERT INTO public.proposal_stages (name, slug, position, is_required, icon) VALUES
  ('Dados Pessoais', 'dados-pessoais', 0, true, 'user'),
  ('Cônjuge / Sócios', 'conjuge-socios', 1, false, 'users'),
  ('Documentos', 'documentos', 2, true, 'file-text'),
  ('Moradores', 'moradores', 3, false, 'home'),
  ('Garantia', 'garantia', 4, true, 'shield'),
  ('Negociação', 'negociacao', 5, false, 'handshake'),
  ('Revisão', 'revisao', 6, true, 'check-circle');
