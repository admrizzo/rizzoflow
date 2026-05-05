-- Add stage/column linking to checklists and items
ALTER TABLE public.checklists 
ADD COLUMN IF NOT EXISTS column_id TEXT,
ADD COLUMN IF NOT EXISTS is_global_blocker BOOLEAN DEFAULT false;

ALTER TABLE public.checklist_items
ADD COLUMN IF NOT EXISTS column_id TEXT,
ADD COLUMN IF NOT EXISTS is_global_blocker BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.checklists.column_id IS 'ID of the kanban column this checklist belongs to';
COMMENT ON COLUMN public.checklists.is_global_blocker IS 'If true, pending items in this checklist block any forward movement in the process';
COMMENT ON COLUMN public.checklist_items.column_id IS 'ID of the kanban column this specific item belongs to';
COMMENT ON COLUMN public.checklist_items.is_global_blocker IS 'If true, this specific item blocks any forward movement in the process';

-- Index for filtering by column
CREATE INDEX IF NOT EXISTS idx_checklists_column_id ON public.checklists(column_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_column_id ON public.checklist_items(column_id);
