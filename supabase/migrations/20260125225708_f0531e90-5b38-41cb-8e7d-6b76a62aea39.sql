-- Create table for checklist templates per board
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create table for checklist item templates
CREATE TABLE public.checklist_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.checklist_templates(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_item_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins podem gerenciar checklist_templates"
  ON public.checklist_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver checklist_templates"
  ON public.checklist_templates FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE POLICY "Admins podem gerenciar checklist_item_templates"
  ON public.checklist_item_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver checklist_item_templates"
  ON public.checklist_item_templates FOR SELECT
  USING (is_team_member(auth.uid()));