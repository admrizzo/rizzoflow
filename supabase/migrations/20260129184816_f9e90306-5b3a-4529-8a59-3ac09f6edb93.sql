-- Create enum for administrative task categories
CREATE TYPE public.admin_task_category AS ENUM ('financeiro', 'cadastral', 'operacional');

-- Create table for administrative task types (templates/models)
CREATE TABLE public.admin_task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category admin_task_category NOT NULL,
  has_checklist BOOLEAN DEFAULT false,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  estimated_minutes INTEGER,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create table for administrative cards (user tasks)
CREATE TABLE public.admin_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type_id UUID REFERENCES public.admin_task_types(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category admin_task_category NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'cancelado')),
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_admin_cards_user_id ON public.admin_cards(user_id);
CREATE INDEX idx_admin_cards_status ON public.admin_cards(status);
CREATE INDEX idx_admin_cards_category ON public.admin_cards(category);
CREATE INDEX idx_admin_cards_started_at ON public.admin_cards(started_at);
CREATE INDEX idx_admin_cards_completed_at ON public.admin_cards(completed_at);

-- Enable RLS
ALTER TABLE public.admin_task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_cards ENABLE ROW LEVEL SECURITY;

-- RLS for admin_task_types
CREATE POLICY "Admins podem gerenciar tipos de tarefas"
ON public.admin_task_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros podem ver tipos de tarefas"
ON public.admin_task_types
FOR SELECT
USING (is_team_member(auth.uid()));

-- RLS for admin_cards
CREATE POLICY "Admins podem ver todos os cards administrativos"
ON public.admin_cards
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários podem ver próprios cards administrativos"
ON public.admin_cards
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Membros podem criar cards administrativos"
ON public.admin_cards
FOR INSERT
WITH CHECK (is_team_member(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprios cards"
ON public.admin_cards
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem atualizar qualquer card"
ON public.admin_cards
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create view for productivity reports (monthly aggregation)
CREATE OR REPLACE VIEW public.admin_productivity_report AS
SELECT 
  ac.user_id,
  p.full_name as user_name,
  DATE_TRUNC('month', ac.started_at) as month,
  ac.category,
  COUNT(*) FILTER (WHERE ac.status = 'concluido') as completed_count,
  COUNT(*) FILTER (WHERE ac.status = 'em_andamento') as in_progress_count,
  COUNT(*) FILTER (WHERE ac.status = 'cancelado') as cancelled_count,
  COUNT(*) as total_count,
  ROUND(
    (COUNT(*) FILTER (WHERE ac.status = 'concluido')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 
    2
  ) as completion_rate,
  AVG(
    EXTRACT(EPOCH FROM (ac.completed_at - ac.started_at)) / 60
  ) FILTER (WHERE ac.status = 'concluido') as avg_completion_minutes
FROM public.admin_cards ac
JOIN public.profiles p ON p.user_id = ac.user_id
GROUP BY ac.user_id, p.full_name, DATE_TRUNC('month', ac.started_at), ac.category;

-- Trigger to update updated_at
CREATE TRIGGER update_admin_task_types_updated_at
BEFORE UPDATE ON public.admin_task_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_cards_updated_at
BEFORE UPDATE ON public.admin_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();