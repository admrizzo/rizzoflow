-- Create card_templates table for administrative board templates
CREATE TABLE public.card_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_description text,
  icon text DEFAULT 'file-text',
  position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create card_template_checklists table
CREATE TABLE public.card_template_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.card_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create card_template_checklist_items table
CREATE TABLE public.card_template_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.card_template_checklists(id) ON DELETE CASCADE,
  content text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create card_template_labels table (to auto-apply labels)
CREATE TABLE public.card_template_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.card_templates(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, label_id)
);

-- Enable RLS on all tables
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_template_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_template_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_template_labels ENABLE ROW LEVEL SECURITY;

-- RLS policies for card_templates
CREATE POLICY "Admins podem gerenciar card_templates" ON public.card_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver card_templates" ON public.card_templates
  FOR SELECT USING (is_team_member(auth.uid()));

-- RLS policies for card_template_checklists
CREATE POLICY "Admins podem gerenciar card_template_checklists" ON public.card_template_checklists
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver card_template_checklists" ON public.card_template_checklists
  FOR SELECT USING (is_team_member(auth.uid()));

-- RLS policies for card_template_checklist_items
CREATE POLICY "Admins podem gerenciar card_template_checklist_items" ON public.card_template_checklist_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver card_template_checklist_items" ON public.card_template_checklist_items
  FOR SELECT USING (is_team_member(auth.uid()));

-- RLS policies for card_template_labels
CREATE POLICY "Admins podem gerenciar card_template_labels" ON public.card_template_labels
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver card_template_labels" ON public.card_template_labels
  FOR SELECT USING (is_team_member(auth.uid()));