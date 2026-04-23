
CREATE TABLE public.proposal_stage_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES public.proposal_stages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_stage_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar proposal_stage_faqs"
ON public.proposal_stage_faqs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver proposal_stage_faqs"
ON public.proposal_stage_faqs FOR SELECT
USING (is_team_member(auth.uid()));

CREATE POLICY "Publico pode ler proposal_stage_faqs"
ON public.proposal_stage_faqs FOR SELECT TO anon
USING (true);

CREATE INDEX idx_proposal_stage_faqs_stage ON public.proposal_stage_faqs(stage_id);

CREATE TRIGGER update_proposal_stage_faqs_updated_at
BEFORE UPDATE ON public.proposal_stage_faqs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
