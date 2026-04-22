-- Adicionar colunas de configuração de subcampos à tabela card_template_checklist_items
ALTER TABLE card_template_checklist_items 
ADD COLUMN IF NOT EXISTS requires_date boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_status boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_observation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status_options jsonb DEFAULT '[]'::jsonb;