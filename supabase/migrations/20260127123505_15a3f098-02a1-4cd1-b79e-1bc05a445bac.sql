-- Create board_config table for dynamic flow configuration
CREATE TABLE public.board_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  
  -- Standard fields visibility (default true = show)
  show_guarantee_type boolean DEFAULT true,
  show_contract_type boolean DEFAULT true,
  show_robust_code boolean DEFAULT true,
  show_building_name boolean DEFAULT true,
  show_address boolean DEFAULT true,
  show_superlogica_id boolean DEFAULT true,
  show_proposal_responsible boolean DEFAULT true,
  show_document_deadline boolean DEFAULT true,
  show_negotiation_details boolean DEFAULT true,
  show_due_date boolean DEFAULT true,
  
  -- Card identification pattern
  -- Format tokens: {robust_code}, {building_name}, {address}, {superlogica_id}, {party:vendedor}, {party:comprador}, etc.
  title_pattern text DEFAULT '{title}',
  
  -- Which fields are required for card creation
  creation_required_fields text[] DEFAULT ARRAY[]::text[],
  
  -- Show financing type toggle on card creation (for Venda/DEV flows)
  show_financing_toggle boolean DEFAULT false,
  
  -- Auto-create party types on card creation (e.g., ['vendedor', 'comprador'])
  auto_create_parties text[] DEFAULT ARRAY[]::text[],
  
  -- Auto-apply checklist templates on card creation (template IDs)
  auto_apply_checklist_templates uuid[] DEFAULT ARRAY[]::uuid[],
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(board_id)
);

-- Enable RLS
ALTER TABLE public.board_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins podem gerenciar board_config" 
ON public.board_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Board admins podem gerenciar config dos seus boards" 
ON public.board_config 
FOR ALL 
USING (is_board_admin(auth.uid(), board_id));

CREATE POLICY "Membros da equipe podem ver board_config" 
ON public.board_config 
FOR SELECT 
USING (is_team_member(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_board_config_updated_at
BEFORE UPDATE ON public.board_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configs for existing boards
INSERT INTO public.board_config (board_id)
SELECT id FROM public.boards
ON CONFLICT (board_id) DO NOTHING;