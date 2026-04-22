import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ProposalResponsible {
  id: string;
  name: string;
  is_active: boolean;
  position: number;
  created_at: string;
  created_by: string | null;
}

export function useProposalResponsibles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: responsibles = [], isLoading } = useQuery({
    queryKey: ['proposal-responsibles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_responsibles')
        .select('*')
        .eq('is_active', true)
        .order('position');
      
      if (error) throw error;
      return data as ProposalResponsible[];
    },
    staleTime: 300000, // Cache for 5 minutes
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });

  const createResponsible = useMutation({
    mutationFn: async (name: string) => {
      const maxPosition = responsibles.length > 0 
        ? Math.max(...responsibles.map(r => r.position || 0)) + 1 
        : 0;

      const { data, error } = await supabase
        .from('proposal_responsibles')
        .insert({ 
          name, 
          position: maxPosition,
          created_by: user?.id 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-responsibles'] });
      toast({ title: 'Responsável adicionado!' });
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast({ 
          title: 'Erro', 
          description: 'Este nome já existe',
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Erro ao adicionar responsável', 
          description: error.message,
          variant: 'destructive' 
        });
      }
    },
  });

  const updateResponsible = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('proposal_responsibles')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-responsibles'] });
      toast({ title: 'Responsável atualizado!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar responsável', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteResponsible = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposal_responsibles')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-responsibles'] });
      toast({ title: 'Responsável removido!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao remover responsável', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    responsibles,
    isLoading,
    createResponsible,
    updateResponsible,
    deleteResponsible,
  };
}
