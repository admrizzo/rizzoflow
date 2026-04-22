-- Fase 1.1: Adicionar review_deadline_days na tabela columns
ALTER TABLE public.columns 
ADD COLUMN IF NOT EXISTS review_deadline_days integer DEFAULT NULL;

-- Fase 1.2: Adicionar novos campos na tabela cards
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS column_entered_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_reviewed_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_reviewed_by uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS card_type text DEFAULT NULL;

-- Fase 1.3: Criar tabela card_parties
CREATE TABLE IF NOT EXISTS public.card_parties (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  party_type text NOT NULL CHECK (party_type IN ('vendedor', 'comprador', 'procurador', 'vendedor_anterior')),
  party_number integer NOT NULL DEFAULT 1,
  name text,
  checklist_id uuid REFERENCES public.checklists(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid DEFAULT NULL
);

-- Habilitar RLS
ALTER TABLE public.card_parties ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para card_parties
CREATE POLICY "Admins e editores podem gerenciar card_parties"
ON public.card_parties FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Membros da equipe podem ver card_parties"
ON public.card_parties FOR SELECT
USING (is_team_member(auth.uid()));