import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Board } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useBoards() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('is_active', true)
        .order('position');
      
      if (error) throw error;
      return data as Board[];
    },
    staleTime: 60000, // Cache boards for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const createBoard = useMutation({
    mutationFn: async (board: { name: string; description?: string; color?: string; icon?: string }) => {
      const maxPosition = boards.length > 0 
        ? Math.max(...boards.map(b => b.position)) + 1 
        : 0;

      const { data, error } = await supabase
        .from('boards')
        .insert({ ...board, position: maxPosition })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast({ title: 'Fluxo criado com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar fluxo', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateBoard = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Board> & { id: string }) => {
      const { data, error } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar fluxo', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('boards')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast({ title: 'Fluxo arquivado com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao arquivar fluxo', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    boards,
    isLoading,
    createBoard,
    updateBoard,
    deleteBoard,
  };
}
