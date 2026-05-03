-- Adiciona novos campos à tabela labels
ALTER TABLE public.labels 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('prioridade', 'risco', 'dependencia_externa', 'tipo_processo', 'documento_cadastro', 'informacao_interna')),
ADD COLUMN IF NOT EXISTS show_on_card BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_on_modal_header BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS counts_as_alert BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS criticality INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';

-- Atualiza etiquetas existentes para uma categoria padrão caso necessário
UPDATE public.labels SET category = 'informacao_interna' WHERE category IS NULL;
