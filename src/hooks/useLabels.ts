import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useLabels(boardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: labels = [], isLoading } = useQuery({
    queryKey: ['labels', boardId],
    queryFn: async () => {
      let query = supabase
        .from('labels')
        .select('*')
        .order('name');
      
      // Filter by board if provided
      if (boardId) {
        query = query.eq('board_id', boardId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Label[];
    },
    staleTime: 120000, // Cache for 2 minutes
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const createLabel = useMutation({
    mutationFn: async (label: { name: string; color: string; board_id?: string }) => {
      // Check for duplicate label with same name and color in the target board
      const { data: existing } = await supabase
        .from('labels')
        .select('id')
        .eq('name', label.name)
        .eq('color', label.color)
        .eq('board_id', label.board_id || '')
        .maybeSingle();
      
      if (existing) {
        throw new Error('Já existe uma etiqueta com este nome e cor neste fluxo.');
      }

      const { data, error } = await supabase
        .from('labels')
        .insert(label)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast({ title: 'Etiqueta criada com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar etiqueta', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateLabel = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { data, error } = await supabase
        .from('labels')
        .update({ name, color })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      invalidateCardQueries(queryClient);
      toast({ title: 'Etiqueta atualizada com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar etiqueta', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      invalidateCardQueries(queryClient);
      toast({ title: 'Etiqueta excluída com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao excluir etiqueta', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const addLabelToCard = useMutation({
    mutationFn: async ({ cardId, labelId }: { cardId: string; labelId: string }) => {
      const { error } = await supabase
        .from('card_labels')
        .insert({ card_id: cardId, label_id: labelId });
      
      if (error) throw error;
      return { cardId, labelId };
    },
    onMutate: async ({ cardId, labelId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cards'] });
      
      // Snapshot previous value
      const previousCards = queryClient.getQueryData(['cards', boardId]);
      
      // Optimistically update the cache
      queryClient.setQueriesData({ queryKey: ['cards'] }, (old: any) => {
        if (!old) return old;
        return old.map((card: any) => {
          if (card.id === cardId) {
            const label = labels.find(l => l.id === labelId);
            return {
              ...card,
              labels: [...(card.labels || []), label].filter(Boolean)
            };
          }
          return card;
        });
      });
      
      return { previousCards };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousCards) {
        queryClient.setQueryData(['cards', boardId], context.previousCards);
      }
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      invalidateCardQueries(queryClient);
    },
  });

  const removeLabelFromCard = useMutation({
    mutationFn: async ({ cardId, labelId }: { cardId: string; labelId: string }) => {
      const { error } = await supabase
        .from('card_labels')
        .delete()
        .eq('card_id', cardId)
        .eq('label_id', labelId);
      
      if (error) throw error;
      return { cardId, labelId };
    },
    onMutate: async ({ cardId, labelId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cards'] });
      
      // Snapshot previous value
      const previousCards = queryClient.getQueryData(['cards', boardId]);
      
      // Optimistically update the cache
      queryClient.setQueriesData({ queryKey: ['cards'] }, (old: any) => {
        if (!old) return old;
        return old.map((card: any) => {
          if (card.id === cardId) {
            return {
              ...card,
              labels: (card.labels || []).filter((l: any) => l.id !== labelId)
            };
          }
          return card;
        });
      });
      
      return { previousCards };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousCards) {
        queryClient.setQueryData(['cards', boardId], context.previousCards);
      }
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      invalidateCardQueries(queryClient);
    },
  });

  return {
    labels,
    isLoading,
    createLabel,
    updateLabel,
    deleteLabel,
    addLabelToCard,
    removeLabelFromCard,
  };
}
