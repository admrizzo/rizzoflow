-- Add administrator_name column for condomínio items
ALTER TABLE public.checklist_items
ADD COLUMN IF NOT EXISTS administrator_name text;

-- Update existing checklist_items to remove 2023 from IPTU
UPDATE public.checklist_items
SET content = REGEXP_REPLACE(content, 'Espelho do IPTU 2023', 'Espelho do IPTU', 'gi')
WHERE content ILIKE '%Espelho do IPTU 2023%';

-- Update checklist_item_templates to remove 2023 from IPTU
UPDATE public.checklist_item_templates
SET content = REGEXP_REPLACE(content, 'Espelho do IPTU 2023', 'Espelho do IPTU', 'gi')
WHERE content ILIKE '%Espelho do IPTU 2023%';

-- Clean up condomínio text in templates (remove xxxxx placeholder)
UPDATE public.checklist_item_templates
SET content = 'Condomínio - administradora'
WHERE content ILIKE '%condomínio%administradora%xxxxx%' 
   OR content ILIKE '%condomínio - administradora - xxxxx%';

-- Clean up condomínio text in existing items
UPDATE public.checklist_items
SET content = 'Condomínio - administradora'
WHERE content ILIKE '%condomínio%administradora%xxxxx%'
   OR content ILIKE '%condomínio - administradora - xxxxx%';