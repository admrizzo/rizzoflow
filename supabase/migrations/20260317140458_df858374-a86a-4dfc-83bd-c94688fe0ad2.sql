
-- Add unique public token to provider_registry for portal links
ALTER TABLE public.provider_registry 
ADD COLUMN public_token uuid NOT NULL DEFAULT gen_random_uuid();

-- Create unique index on the token
CREATE UNIQUE INDEX idx_provider_registry_public_token ON public.provider_registry(public_token);

-- Generate tokens for existing providers
UPDATE public.provider_registry SET public_token = gen_random_uuid() WHERE public_token IS NULL;
