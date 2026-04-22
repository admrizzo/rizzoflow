-- Add board_id to labels to make them board-specific
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS board_id uuid REFERENCES public.boards(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_labels_board_id ON public.labels(board_id);

-- Update existing labels to be associated with appropriate boards based on their names
-- Fluxo de Venda labels
UPDATE public.labels 
SET board_id = '04ab7bde-6142-4644-a158-a3a232486b30'
WHERE name IN ('Crédito aprovado', 'Atenção especial', 'Custo de documento pago', 'Esther', 'Dayan', 'Isabelle');

-- Fluxo de Rescisão labels
UPDATE public.labels 
SET board_id = (SELECT id FROM public.boards WHERE name = 'Fluxo de Rescisão' LIMIT 1)
WHERE name IN ('Relocação', 'Débora', 'Patrick', 'Felipe', 'Rafael', 'Pierre');

-- Update RLS policies to include board access check
DROP POLICY IF EXISTS "Admins e editores podem gerenciar labels" ON public.labels;
DROP POLICY IF EXISTS "Membros da equipe podem ver labels" ON public.labels;

CREATE POLICY "Admins e editores podem gerenciar labels" 
ON public.labels 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Membros da equipe podem ver labels" 
ON public.labels 
FOR SELECT 
USING (is_team_member(auth.uid()));