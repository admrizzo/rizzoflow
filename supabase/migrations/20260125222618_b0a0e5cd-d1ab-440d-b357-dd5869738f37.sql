-- Tabela de boards/fluxos
CREATE TABLE public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#f97316',
  icon TEXT DEFAULT 'clipboard-list',
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para boards
CREATE POLICY "Membros da equipe podem ver boards"
  ON public.boards FOR SELECT
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Admins podem gerenciar boards"
  ON public.boards FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Adicionar coluna board_id na tabela columns
ALTER TABLE public.columns ADD COLUMN board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;

-- Adicionar coluna board_id na tabela cards
ALTER TABLE public.cards ADD COLUMN board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;

-- Trigger para atualizar updated_at em boards
CREATE TRIGGER update_boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir boards padrão
INSERT INTO public.boards (name, description, color, icon, position) VALUES
  ('Fluxo de Locação', 'Processo completo de locação de imóveis', '#f97316', 'home', 0),
  ('Fluxo de Rescisão', 'Processo de rescisão contratual', '#ef4444', 'file-x', 1),
  ('Fluxo de Captação', 'Captação de novos imóveis para carteira', '#10b981', 'search', 2),
  ('Fluxo de Venda', 'Processo de venda de imóveis', '#3b82f6', 'dollar-sign', 3);

-- Atualizar colunas existentes para o board de Locação
UPDATE public.columns 
SET board_id = (SELECT id FROM public.boards WHERE name = 'Fluxo de Locação' LIMIT 1);

-- Habilitar realtime para boards
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;