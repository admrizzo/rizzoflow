-- Add fields to track vacancy deadline confirmation on cards
ALTER TABLE public.cards
ADD COLUMN vacancy_deadline_met boolean DEFAULT false,
ADD COLUMN vacancy_deadline_met_at timestamp with time zone,
ADD COLUMN vacancy_deadline_met_by uuid;

-- Add comments for documentation
COMMENT ON COLUMN public.cards.vacancy_deadline_met IS 'Se a entrega do imóvel foi confirmada para o prazo de desocupação';
COMMENT ON COLUMN public.cards.vacancy_deadline_met_at IS 'Data/hora que a entrega foi confirmada';
COMMENT ON COLUMN public.cards.vacancy_deadline_met_by IS 'Usuário que confirmou a entrega';