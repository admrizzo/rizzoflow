
-- Add slug column to provider_registry for friendly URLs
ALTER TABLE public.provider_registry ADD COLUMN slug text;

-- Generate slugs from existing names (lowercase, accents removed, spaces to hyphens)
UPDATE public.provider_registry SET slug = lower(
  regexp_replace(
    translate(name, 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'),
    '[^a-zA-Z0-9]+', '-', 'g'
  )
);

-- Make slug unique and not null
ALTER TABLE public.provider_registry ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_provider_registry_slug ON public.provider_registry(slug);
