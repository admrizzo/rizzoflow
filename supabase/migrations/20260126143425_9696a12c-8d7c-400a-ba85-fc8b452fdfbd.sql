-- Create table for proposal responsibles
CREATE TABLE public.proposal_responsibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  position integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.proposal_responsibles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins podem gerenciar proposal_responsibles"
ON public.proposal_responsibles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros da equipe podem ver proposal_responsibles"
ON public.proposal_responsibles
FOR SELECT
TO authenticated
USING (is_team_member(auth.uid()));

-- Add unique constraint for name
ALTER TABLE public.proposal_responsibles ADD CONSTRAINT proposal_responsibles_name_unique UNIQUE (name);