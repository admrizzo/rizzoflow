
ALTER TABLE public.maintenance_providers 
  ADD COLUMN payment_responsible text NOT NULL DEFAULT 'imobiliaria',
  ADD COLUMN payment_method text,
  ADD COLUMN payment_notes text;

COMMENT ON COLUMN public.maintenance_providers.payment_responsible IS 'Who pays: imobiliaria or proprietario';
COMMENT ON COLUMN public.maintenance_providers.payment_method IS 'Payment method: pix, boleto, dinheiro';
COMMENT ON COLUMN public.maintenance_providers.payment_notes IS 'Additional payment notes';
