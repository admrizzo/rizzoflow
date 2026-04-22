-- Create table for user-board access permissions
CREATE TABLE public.user_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID,
  UNIQUE(user_id, board_id)
);

-- Enable RLS
ALTER TABLE public.user_boards ENABLE ROW LEVEL SECURITY;

-- Only admins can manage user_boards
CREATE POLICY "Admins podem gerenciar user_boards"
  ON public.user_boards FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Team members can see their own board assignments
CREATE POLICY "Usuários podem ver próprias permissões"
  ON public.user_boards FOR SELECT
  USING (auth.uid() = user_id);

-- Create security definer function to check if user has access to a board
CREATE OR REPLACE FUNCTION public.has_board_access(_user_id uuid, _board_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_boards
    WHERE user_id = _user_id
      AND board_id = _board_id
  ) OR has_role(_user_id, 'admin'::app_role)
$$;

-- Update boards RLS policy to filter by user access
DROP POLICY IF EXISTS "Membros da equipe podem ver boards" ON public.boards;

CREATE POLICY "Usuários podem ver boards com acesso"
  ON public.boards FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_board_access(auth.uid(), id)
  );

-- Update cards RLS policy to respect board access
DROP POLICY IF EXISTS "Membros da equipe podem ver cards" ON public.cards;

CREATE POLICY "Usuários podem ver cards dos boards com acesso"
  ON public.cards FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_board_access(auth.uid(), board_id)
  );

-- Update columns RLS policy
DROP POLICY IF EXISTS "Membros da equipe podem ver colunas" ON public.columns;

CREATE POLICY "Usuários podem ver colunas dos boards com acesso"
  ON public.columns FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_board_access(auth.uid(), board_id)
  );