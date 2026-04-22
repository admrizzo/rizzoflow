import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Column, Department } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useColumns(boardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: columns = [], isLoading } = useQuery({
    queryKey: ['columns', boardId],
    queryFn: async () => {
      let query = supabase
        .from('columns')
        .select('*')
        .order('position');
      
      if (boardId) {
        query = query.eq('board_id', boardId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Column[];
    },
    enabled: !!boardId,
    staleTime: 120000, // Cache columns for 2 minutes
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const createColumn = useMutation({
    mutationFn: async (column: { name: string; color?: string; department?: Department; board_id: string; review_deadline_days?: number | null }) => {
      const maxPosition = columns.length > 0 
        ? Math.max(...columns.map(c => c.position)) + 1 
        : 0;

      const { data, error } = await supabase
        .from('columns')
        .insert({ ...column, position: maxPosition })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns'] });
      toast({ title: 'Coluna criada com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar coluna', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateColumn = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Column> & { id: string }) => {
      const { data, error } = await supabase
        .from('columns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns'] });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar coluna', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteColumn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('columns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns'] });
      toast({ title: 'Coluna excluída com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao excluir coluna', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const reorderColumns = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase.from('columns').update({ position: index }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns'] });
    },
  });

  return {
    columns,
    isLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
  };
}
