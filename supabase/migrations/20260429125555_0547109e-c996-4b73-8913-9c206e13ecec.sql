ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS capturing_broker_id uuid NULL,
  ADD COLUMN IF NOT EXISTS service_broker_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_cards_capturing_broker_id ON public.cards(capturing_broker_id);
CREATE INDEX IF NOT EXISTS idx_cards_service_broker_id ON public.cards(service_broker_id);

COMMENT ON COLUMN public.cards.capturing_broker_id IS 'Corretor que captou o imóvel (referencia profiles.user_id)';
COMMENT ON COLUMN public.cards.service_broker_id IS 'Corretor de atendimento da locação (referencia profiles.user_id)';