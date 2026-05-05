import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateCardQueries } from '@/lib/queryInvalidation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logCardActivity } from '@/hooks/useCardActivityLogs';

export function useChecklists() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const createChecklist = useMutation({
    mutationFn: async ({ cardId, name, columnId, isGlobalBlocker }: { cardId: string; name: string; columnId?: string | null; isGlobalBlocker?: boolean; }) => {
      const { data, error } = await supabase
        .from('checklists')
        .insert({ card_id: cardId, name, column_id: columnId || null, is_global_blocker: isGlobalBlocker || false })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
      toast({ title: 'Checklist criado!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar checklist', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteChecklist = useMutation({
    mutationFn: async (checklistId: string) => {
      const { error } = await supabase
        .from('checklists')
        .delete()
        .eq('id', checklistId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
      toast({ title: 'Checklist excluído!' });
    },
  });

  const addChecklistItem = useMutation({
    mutationFn: async ({ checklistId, content }: { checklistId: string; content: string }) => {
      const { data, error } = await supabase
        .from('checklist_items')
        .insert({ checklist_id: checklistId, content })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
  });

  const toggleChecklistItem = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      // Buscar item + checklist + card para log humano
      const { data: item } = await supabase
        .from('checklist_items')
        .select('content, checklist_id, checklists(card_id, name)')
        .eq('id', itemId)
        .maybeSingle();

      const { error } = await supabase
        .from('checklist_items')
        .update({ 
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          completed_by: isCompleted ? user?.id : null
        })
        .eq('id', itemId);
      
      if (error) throw error;

      const cardId = (item as any)?.checklists?.card_id as string | undefined;
      const checklistName = (item as any)?.checklists?.name as string | undefined;
      if (cardId) {
        void logCardActivity({
          cardId,
          actorUserId: user?.id,
          eventType: isCompleted ? 'checklist_item_completed' : 'checklist_item_reopened',
          title: isCompleted
            ? `Concluiu: ${item?.content || 'item do checklist'}`
            : `Reabriu: ${item?.content || 'item do checklist'}`,
          description: checklistName || null,
          metadata: { checklist_id: item?.checklist_id, item_id: itemId },
        });
      }
    },
    // No onMutate - we handle optimistic updates in ChecklistSection with local state
    // This prevents double updates and race conditions
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar item', 
        description: error.message,
        variant: 'destructive' 
      });
    },
    onSettled: () => {
      // Sync with server - short delay to avoid blocking UI
      setTimeout(() => {
        invalidateCardQueries(queryClient);
      }, 800);
    },
  });

  const updateChecklistItem = useMutation({
    mutationFn: async ({ itemId, content }: { itemId: string; content: string }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update({ content })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
  });

  const deleteChecklistItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
  });

  const dismissChecklistItem = useMutation({
    mutationFn: async ({ 
      itemId, 
      isDismissed, 
      reason 
    }: { 
      itemId: string; 
      isDismissed: boolean; 
      reason: string | null;
    }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update({ 
          is_dismissed: isDismissed,
          dismissed_reason: reason,
          dismissed_at: isDismissed ? new Date().toISOString() : null,
          dismissed_by: isDismissed ? user?.id : null
        })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao dispensar item', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update issue date for document items
  const updateItemIssueDate = useMutation({
    mutationFn: async ({ itemId, issueDate }: { itemId: string; issueDate: string | null }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update({ issue_date: issueDate })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao salvar data de emissão', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update certificate status for certidão items
  const updateCertificateStatus = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: 'positive' | 'negative' | null }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update({ certificate_status: status })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao salvar status da certidão', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update creditor info for saldo devedor items
  const updateCreditorInfo = useMutation({
    mutationFn: async ({ 
      itemId, 
      creditorName, 
      creditorValue 
    }: { 
      itemId: string; 
      creditorName: string | null; 
      creditorValue: string | null;
    }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update({ 
          creditor_name: creditorName,
          creditor_value: creditorValue
        })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao salvar informações do credor', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update civil status info
  const updateCivilStatus = useMutation({
    mutationFn: async ({ 
      itemId, 
      civilStatusType, 
      civilStatusOther 
    }: { 
      itemId: string; 
      civilStatusType: string | null;
      civilStatusOther: string | null;
    }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update({ 
          civil_status_type: civilStatusType,
          civil_status_other: civilStatusOther
        })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao salvar estado civil', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update administrator name for condomínio items
  const updateAdministratorName = useMutation({
    mutationFn: async ({ itemId, administratorName }: { itemId: string; administratorName: string | null }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update({ administrator_name: administratorName })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao salvar nome da administradora', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update observation text for items with requires_observation
  const updateObservationText = useMutation({
    mutationFn: async ({ itemId, observationText }: { itemId: string; observationText: string | null }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update({ observation_text: observationText })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao salvar observação', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update custom status (from status_options) for items with requires_status
  const updateCustomStatus = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string | null }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update({ certificate_status: status })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao salvar status', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Dismiss entire checklist (all items)
  const dismissChecklist = useMutation({
    mutationFn: async ({ 
      checklistId, 
      isDismissed, 
      reason 
    }: { 
      checklistId: string; 
      isDismissed: boolean; 
      reason: string | null;
    }) => {
      // Get all items in the checklist
      const { data: items, error: fetchError } = await supabase
        .from('checklist_items')
        .select('id')
        .eq('checklist_id', checklistId);
      
      if (fetchError) throw fetchError;
      if (!items || items.length === 0) return;

      // Update all items at once
      const { error } = await supabase
        .from('checklist_items')
        .update({ 
          is_dismissed: isDismissed,
          dismissed_reason: reason,
          dismissed_at: isDismissed ? new Date().toISOString() : null,
          dismissed_by: isDismissed ? user?.id : null
        })
        .eq('checklist_id', checklistId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
      toast({ title: 'Checklist dispensado com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao dispensar checklist', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    createChecklist,
    deleteChecklist,
    addChecklistItem,
    updateChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    dismissChecklistItem,
    dismissChecklist,
    updateItemIssueDate,
    updateCertificateStatus,
    updateCreditorInfo,
    updateCivilStatus,
    updateAdministratorName,
    updateObservationText,
    updateCustomStatus,
  };
}
