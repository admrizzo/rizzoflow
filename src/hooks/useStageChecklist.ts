import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCardQueries } from '@/lib/queryInvalidation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Column } from '@/types/database';
import { logCardActivity } from '@/hooks/useCardActivityLogs';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Parse the default_checklist_items JSON field from a column into a safe array.
 */
export function parseStageDefaultItems(column?: Column | null): { title: string }[] {
  if (!column?.default_checklist_items) return [];
  const raw = column.default_checklist_items;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it: any) => {
      if (!it) return null;
      if (typeof it === 'string') return { title: it.trim() };
      if (typeof it === 'object' && typeof it.title === 'string') return { title: it.title.trim() };
      return null;
    })
    .filter((it): it is { title: string } => !!it && it.title.length > 0);
}

export function useStageChecklist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  /**
   * Creates a checklist on the given card using the column's default items.
   * Skips creation if a checklist with the same name already exists on the card.
   */
  const createStageChecklist = useMutation({
    mutationFn: async ({ cardId, column }: { cardId: string; column: Column }) => {
      const items = parseStageDefaultItems(column);
      if (items.length === 0) {
        throw new Error('Esta etapa ainda não tem itens padrão configurados.');
      }

      const checklistName = `Checklist da etapa: ${column.name}`;

      // Avoid duplicates: check if a checklist with this name already exists
      const { data: existing, error: existingErr } = await supabase
        .from('checklists')
        .select('id')
        .eq('card_id', cardId)
        .eq('name', checklistName)
        .maybeSingle();

      if (existingErr) throw existingErr;
      if (existing) {
        return { skipped: true, checklistId: existing.id };
      }

      const { data: checklist, error: clErr } = await supabase
        .from('checklists')
        .insert({ card_id: cardId, name: checklistName })
        .select('id')
        .single();

      if (clErr) throw clErr;

      const itemRows = items.map((it, idx) => ({
        checklist_id: checklist.id,
        content: it.title,
        position: idx,
        source: 'stage_default',
      }));

      // Drop `source` if column doesn't exist — we keep it inline; the insert below
      // tolerates extra fields only if they exist. To avoid coupling, omit `source`.
      const safeRows = itemRows.map(({ source, ...rest }) => rest);

      const { error: itemsErr } = await supabase
        .from('checklist_items')
        .insert(safeRows);

      if (itemsErr) throw itemsErr;

      // Histórico
      void logCardActivity({
        cardId,
        actorUserId: user?.id,
        eventType: 'checklist_created',
        title: `Criou checklist da etapa: ${column.name}`,
        description: `${items.length} ${items.length === 1 ? 'item criado' : 'itens criados'}`,
        metadata: { checklist_id: checklist.id, stage: column.name, item_count: items.length },
      });

      return { skipped: false, checklistId: checklist.id };
    },
    onSuccess: (result) => {
      invalidateCardQueries(queryClient);
      if (result?.skipped) {
        toast({ title: 'Checklist da etapa já existe', description: 'Nenhum item duplicado foi criado.' });
      } else {
        toast({ title: 'Checklist da etapa criado!' });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar checklist da etapa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return { createStageChecklist };
}