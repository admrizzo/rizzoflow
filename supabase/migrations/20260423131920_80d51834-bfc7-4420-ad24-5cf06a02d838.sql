
CREATE TABLE public.proposal_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_robust integer NOT NULL,
  property_name text,
  address_summary text,
  rent_value numeric,
  broker_name text,
  broker_user_id uuid,
  status text NOT NULL DEFAULT 'nao_acessado',
  accessed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.proposal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view proposal_links"
ON public.proposal_links FOR SELECT
USING (is_team_member(auth.uid()));

CREATE POLICY "Admins and editors can manage proposal_links"
ON public.proposal_links FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
