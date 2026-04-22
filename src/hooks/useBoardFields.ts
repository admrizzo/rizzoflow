import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BoardField, FieldType } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useBoardFields(boardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['board-fields', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      
      const { data, error } = await supabase
        .from('board_fields')
        .select('*')
        .eq('board_id', boardId)
        .order('position');
      
      if (error) throw error;
      return data.map(field => ({
        ...field,
        field_options: Array.isArray(field.field_options) ? field.field_options : []
      })) as BoardField[];
    },
    enabled: !!boardId,
    staleTime: 120000, // Cache for 2 minutes
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const createField = useMutation({
    mutationFn: async (field: { 
      board_id: string; 
      field_name: string; 
      field_type: FieldType;
      field_options?: string[];
      is_required?: boolean;
    }) => {
      const maxPosition = fields.length > 0 
        ? Math.max(...fields.map(f => f.position)) + 1 
        : 0;

      const { data, error } = await supabase
        .from('board_fields')
        .insert({ 
          ...field, 
          position: maxPosition,
          field_options: field.field_options || []
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-fields', boardId] });
      toast({ title: 'Campo criado com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar campo', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateField = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BoardField> & { id: string }) => {
      const { data, error } = await supabase
        .from('board_fields')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-fields', boardId] });
      toast({ title: 'Campo atualizado!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar campo', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('board_fields')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-fields', boardId] });
      toast({ title: 'Campo removido!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao remover campo', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const reorderFields = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        position: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('board_fields')
          .update({ position: update.position })
          .eq('id', update.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-fields', boardId] });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao reordenar campos', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    fields,
    isLoading,
    createField,
    updateField,
    deleteField,
    reorderFields,
  };
}
