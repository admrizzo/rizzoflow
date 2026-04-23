
CREATE TABLE public.proposal_page_config (
  id text NOT NULL DEFAULT 'main' PRIMARY KEY,
  config_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_page_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar proposal_page_config"
ON public.proposal_page_config
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public pode ler proposal_page_config"
ON public.proposal_page_config
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Membros podem ver proposal_page_config"
ON public.proposal_page_config
FOR SELECT
TO authenticated
USING (is_team_member(auth.uid()));

CREATE TRIGGER update_proposal_page_config_updated_at
BEFORE UPDATE ON public.proposal_page_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
