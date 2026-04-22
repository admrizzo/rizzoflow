-- Add deadline fields to cards table
ALTER TABLE public.cards
ADD COLUMN document_deadline timestamp with time zone,
ADD COLUMN deadline_met boolean DEFAULT false,
ADD COLUMN deadline_met_at timestamp with time zone,
ADD COLUMN deadline_met_by uuid;

-- Add comment for documentation
COMMENT ON COLUMN public.cards.document_deadline IS 'Prazo para envio dos documentos';
COMMENT ON COLUMN public.cards.deadline_met IS 'Se o prazo foi cumprido';
COMMENT ON COLUMN public.cards.deadline_met_at IS 'Data/hora que o prazo foi marcado como cumprido';
COMMENT ON COLUMN public.cards.deadline_met_by IS 'Usuário que marcou o prazo como cumprido';