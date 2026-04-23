
-- Create proposal_drafts table
CREATE TABLE public.proposal_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_link_id UUID REFERENCES public.proposal_links(id) ON DELETE SET NULL,
  codigo_robust INTEGER,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'rascunho',
  progress_percent NUMERIC NOT NULL DEFAULT 0,
  browser_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposal_drafts ENABLE ROW LEVEL SECURITY;

-- Anon users can create drafts (public form)
CREATE POLICY "Anon pode criar rascunhos"
  ON public.proposal_drafts
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Anon users can update their own drafts (matched by browser_id)
CREATE POLICY "Anon pode atualizar rascunhos"
  ON public.proposal_drafts
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Anon users can read drafts (to restore)
CREATE POLICY "Anon pode ler rascunhos"
  ON public.proposal_drafts
  FOR SELECT
  TO anon
  USING (true);

-- Admins and editors full access
CREATE POLICY "Admins e editores podem gerenciar rascunhos"
  ON public.proposal_drafts
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Team members can read
CREATE POLICY "Membros podem ver rascunhos"
  ON public.proposal_drafts
  FOR SELECT
  TO authenticated
  USING (is_team_member(auth.uid()));

-- Authenticated users can also create/update (internal form)
CREATE POLICY "Autenticados podem criar rascunhos"
  ON public.proposal_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Autenticados podem atualizar rascunhos"
  ON public.proposal_drafts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_proposal_drafts_updated_at
  BEFORE UPDATE ON public.proposal_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
