-- Create a new enum for checklist item operational nature
DO $$ BEGIN
    CREATE TYPE operational_nature AS ENUM ('obrigatorio', 'condicional', 'conferencia', 'evidencia', 'informativo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add the nature column to checklist_items
ALTER TABLE public.checklist_items 
ADD COLUMN IF NOT EXISTS operational_nature operational_nature DEFAULT 'obrigatorio' NOT NULL;

-- Also add to checklist_item_templates for future use
ALTER TABLE public.checklist_item_templates
ADD COLUMN IF NOT EXISTS operational_nature operational_nature DEFAULT 'obrigatorio' NOT NULL;
