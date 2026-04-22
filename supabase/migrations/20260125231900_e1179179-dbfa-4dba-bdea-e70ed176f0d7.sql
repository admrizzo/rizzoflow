
-- Adicionar colunas para dispensa de itens do checklist
ALTER TABLE checklist_items 
ADD COLUMN is_dismissed boolean DEFAULT false,
ADD COLUMN dismissed_reason text,
ADD COLUMN dismissed_at timestamp with time zone,
ADD COLUMN dismissed_by uuid;
